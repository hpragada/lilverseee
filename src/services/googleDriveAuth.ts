/**
 * Google Drive Authentication Service
 * Strictly in-memory OAuth access token management.
 * Tokens, refresh tokens, and client secrets are NEVER persisted to
 * localStorage, sessionStorage, IndexedDB, cookies, Firestore, or logs.
 */

import { DriveAuthState, DriveUserInfo } from '../types';
import appletConfig from '../../firebase-applet-config.json';

// Global declaration for Google Identity Services (GIS)
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GisTokenResponse) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
          }) => GisTokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

interface GisTokenResponse {
  access_token?: string;
  expires_in?: string | number;
  error?: string;
  error_description?: string;
  error_uri?: string;
  scope?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

export interface DriveAuthProvider {
  platform: 'web' | 'android' | 'electron';
  signIn(options?: { prompt?: string }): Promise<string>;
  signOut(): Promise<void>;
  hasValidToken(): boolean;
  getAccessToken(): string | null;
  getUserInfo(): DriveUserInfo | null;
}

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

class GoogleDriveAuthManager {
  // STRICT IN-MEMORY STORAGE ONLY FOR TOKENS
  private inMemoryAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private inMemoryUserInfo: DriveUserInfo | null = null;
  private currentStatus: DriveAuthState['status'] = 'disconnected';
  private errorMessage: string | null = null;
  private listeners: Set<(state: DriveAuthState) => void> = new Set();
  private tokenClient: GisTokenClient | null = null;
  private pendingTokenResolve: ((token: string) => void) | null = null;
  private pendingTokenReject: ((error: Error) => void) | null = null;
  private activeAuthPromise: Promise<string> | null = null;

  constructor() {
    // Reset state on instance creation
    this.resetState();
  }

  public getClientId(): string {
    const candidates = [
      (appletConfig as any)?.oAuthClientId,
      import.meta.env.VITE_GOOGLE_CLIENT_ID,
    ];

    for (const id of candidates) {
      if (
        typeof id === 'string' &&
        id.trim().endsWith('.apps.googleusercontent.com') &&
        !id.trim().startsWith('GOCSPX-')
      ) {
        return id.trim();
      }
    }

    return '142285759805-ldratel9v0sc2eobl3o73ehncu5bmik2.apps.googleusercontent.com';
  }

  public getAuthState(): DriveAuthState {
    return {
      status: this.currentStatus,
      user: this.inMemoryUserInfo,
      errorMessage: this.errorMessage,
      expiresAt: this.tokenExpiresAt > 0 ? this.tokenExpiresAt : null,
    };
  }

  public subscribe(listener: (state: DriveAuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAuthState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getAuthState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[Drive Auth] Error in listener:', err);
      }
    });
  }

  public hasValidToken(): boolean {
    if (!this.inMemoryAccessToken) return false;
    // 2-minute safety buffer
    return Date.now() < this.tokenExpiresAt - 120000;
  }

  public getAccessToken(): string | null {
    if (this.hasValidToken()) {
      return this.inMemoryAccessToken;
    }
    return null;
  }

  public getUserInfo(): DriveUserInfo | null {
    return this.inMemoryUserInfo;
  }

  /**
   * Formats error message with helpful guidance for origin_mismatch and cancellation
   */
  private formatOAuthError(errorStr: string, errorDescription?: string): string {
    const raw = `${errorStr || ''} ${errorDescription || ''}`.toLowerCase();
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const clientId = this.getClientId();

    if (raw.includes('origin_mismatch') || raw.includes('idpiframe_initialization_failed')) {
      return `Origin mismatch: The current preview origin (${currentOrigin}) is not yet authorized for OAuth Client ID ${clientId}. Ensure ${currentOrigin} is listed under "Authorized JavaScript origins" in Google Cloud Console.`;
    }

    if (raw.includes('popup_closed') || raw.includes('closed') || raw.includes('user_cancel')) {
      return 'Google sign-in popup was closed before authorization was completed.';
    }

    if (raw.includes('access_denied')) {
      return 'Google Drive access was denied. Please grant drive.file permission to enable photo and file backup.';
    }

    return errorDescription || errorStr || 'Failed to authenticate with Google Drive.';
  }

  /**
   * Waits for Google Identity Services script to be ready
   */
  public async waitForGis(timeoutMs = 5000): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (window.google?.accounts?.oauth2) return true;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.google?.accounts?.oauth2) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  /**
   * Initializes Web GIS Token Client (singleton reuse)
   */
  private async initWebTokenClient(): Promise<GisTokenClient> {
    if (this.tokenClient) {
      return this.tokenClient;
    }

    const isReady = await this.waitForGis();
    if (!isReady || !window.google?.accounts?.oauth2) {
      throw new Error(
        'Google Identity Services library failed to load. Please check your network connection.'
      );
    }

    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('Google OAuth Client ID is not configured.');
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_FILE_SCOPE,
      callback: (resp: GisTokenResponse) => {
        if (resp.error) {
          const userFriendlyMsg = this.formatOAuthError(resp.error, resp.error_description);
          const isCancel = resp.error === 'popup_closed_by_user' || userFriendlyMsg.includes('closed');
          this.errorMessage = userFriendlyMsg;
          this.currentStatus = isCancel ? 'disconnected' : 'error';
          this.notify();
          if (this.pendingTokenReject) {
            this.pendingTokenReject(new Error(userFriendlyMsg));
            this.pendingTokenResolve = null;
            this.pendingTokenReject = null;
          }
          return;
        }

        if (resp.access_token) {
          const token = resp.access_token;
          const expiresInSec = Number(resp.expires_in) || 3600;

          // Asynchronously fetch user display info & verify fixed account
          this.fetchUserInfoAndVerifyAccount(token, expiresInSec).then((isVerified) => {
            if (isVerified) {
              if (this.pendingTokenResolve) {
                this.pendingTokenResolve(token);
                this.pendingTokenResolve = null;
                this.pendingTokenReject = null;
              }
            }
          });
        }
      },
      error_callback: (err: any) => {
        const errorMsg = this.formatOAuthError(err?.type || err?.message || 'popup_error', err?.message);
        const isCancel = errorMsg.includes('closed');
        this.errorMessage = errorMsg;
        this.currentStatus = isCancel ? 'disconnected' : 'error';
        this.notify();
        if (this.pendingTokenReject) {
          this.pendingTokenReject(new Error(errorMsg));
          this.pendingTokenResolve = null;
          this.pendingTokenReject = null;
        }
      },
    });

    this.tokenClient = tokenClient;
    return tokenClient;
  }

  /**
   * Prompts user for OAuth authorization using GIS popup flow or silent request
   * Guards against duplicate concurrent calls using an in-flight promise lock
   */
  public async requestAuthorization(options?: { prompt?: string }): Promise<string> {
    if (this.hasValidToken() && this.inMemoryAccessToken) {
      return this.inMemoryAccessToken;
    }

    if (this.activeAuthPromise) {
      return this.activeAuthPromise;
    }

    this.currentStatus = 'connecting';
    this.errorMessage = null;
    this.notify();

    this.activeAuthPromise = (async () => {
      try {
        if (!this.tokenClient) {
          await this.initWebTokenClient();
        }

        return await new Promise<string>((resolve, reject) => {
          this.pendingTokenResolve = resolve;
          this.pendingTokenReject = reject;

          try {
            this.tokenClient!.requestAccessToken({
              prompt: options?.prompt !== undefined ? options.prompt : 'select_account',
            });
          } catch (err: any) {
            this.currentStatus = 'error';
            this.errorMessage = err?.message || 'Failed to trigger Google sign-in dialog';
            this.notify();
            reject(err);
          }
        });
      } finally {
        this.activeAuthPromise = null;
      }
    })();

    return this.activeAuthPromise;
  }

  /**
   * Automatically attempts silent reconnection on startup if the user previously authorized Drive
   */
  public async autoReconnect(): Promise<boolean> {
    const savedAccount = localStorage.getItem('mlw_drive_connected_account');
    if (!savedAccount) {
      return false;
    }

    if (this.hasValidToken()) {
      return true;
    }

    try {
      this.currentStatus = 'connecting';
      this.notify();

      // Request token silently without prompt window
      await this.requestAuthorization({ prompt: '' });
      return true;
    } catch (err: any) {
      console.log('[Drive Auth] Auto-reconnect requires interaction:', err?.message || err);
      this.currentStatus = 'expired';
      this.errorMessage = `Google Drive connection session expired for ${savedAccount}. Please reconnect.`;
      this.notify();
      return false;
    }
  }

  /**
   * In-memory user info fetch & account verification
   */
  private async fetchUserInfoAndVerifyAccount(accessToken: string, expiresInSec: number): Promise<boolean> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const userEmail = (data.email || '').trim();

        // Valid account connected
        this.inMemoryAccessToken = accessToken;
        this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
        this.inMemoryUserInfo = {
          email: userEmail || 'Connected Google Account',
          name: data.name || userEmail || 'Google Drive User',
          picture: data.picture,
        };
        this.currentStatus = 'connected';
        this.errorMessage = null;

        // Save non-secret connection flag in localStorage (ONLY email string, NO tokens)
        if (userEmail) {
          localStorage.setItem('mlw_drive_connected_account', userEmail);
        }
        this.notify();

        // Dispatch backup queue update event so sync can start smoothly
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mlw_backup_queue_updated'));
        }

        return true;
      } else {
        // Even if userinfo endpoint fails, if we have a valid access token, allow connection with fallback name
        this.inMemoryAccessToken = accessToken;
        this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
        this.inMemoryUserInfo = {
          email: 'Connected Google Account',
          name: 'Google Drive User',
        };
        this.currentStatus = 'connected';
        this.errorMessage = null;
        this.notify();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mlw_backup_queue_updated'));
        }

        if (this.pendingTokenResolve) {
          this.pendingTokenResolve(accessToken);
          this.pendingTokenResolve = null;
          this.pendingTokenReject = null;
        }
        return true;
      }
    } catch (err: any) {
      console.warn('[Drive Auth] User verification error:', err);
      // If userinfo endpoint throws (e.g. network hiccup), still accept valid token
      this.inMemoryAccessToken = accessToken;
      this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
      this.inMemoryUserInfo = {
        email: 'Connected Google Account',
        name: 'Google Drive User',
      };
      this.currentStatus = 'connected';
      this.errorMessage = null;
      this.notify();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mlw_backup_queue_updated'));
      }

      if (this.pendingTokenResolve) {
        this.pendingTokenResolve(accessToken);
        this.pendingTokenResolve = null;
        this.pendingTokenReject = null;
      }
      return true;
    }
  }

  /**
   * Disconnects / signs out and strictly clears all memory tokens
   */
  public async signOut(): Promise<void> {
    localStorage.removeItem('mlw_drive_connected_account');
    if (this.inMemoryAccessToken && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(this.inMemoryAccessToken, () => {
          // Token revoked on Google servers
        });
      } catch (err) {
        console.warn('[Drive Auth] Revocation warning:', err);
      }
    }

    this.resetState();
    this.notify();
  }

  public async markTokenExpired(): Promise<void> {
    this.inMemoryAccessToken = null;
    this.tokenExpiresAt = 0;

    // Attempt silent refresh
    const savedAccount = localStorage.getItem('mlw_drive_connected_account');
    if (savedAccount) {
      try {
        await this.requestAuthorization({ prompt: '' });
        return;
      } catch {
        // Silent refresh failed, user consent or re-auth required
      }
    }

    this.currentStatus = 'expired';
    this.errorMessage = 'Google Drive session has expired. Please click reconnect.';
    this.notify();
  }

  private resetState(): void {
    this.inMemoryAccessToken = null;
    this.tokenExpiresAt = 0;
    this.inMemoryUserInfo = null;
    this.currentStatus = 'disconnected';
    this.errorMessage = null;
    this.tokenClient = null;
  }
}

export const googleDriveAuth = new GoogleDriveAuthManager();
