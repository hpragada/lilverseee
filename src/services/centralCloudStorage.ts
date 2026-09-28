/**
 * Centralized Cloud Storage Service (Client-Side)
 * 
 * Automatically synchronizes all Lilverse user data to the centralized cloud storage
 * (hosted on the administrator's Google Drive) in the background using verified Firebase Auth tokens.
 * 
 * Mandatory Guarantees:
 * 1. ZERO USER OAUTH: End-users never have to log into Google Drive or grant individual permissions.
 * 2. STRICT PRIVACY & UID ISOLATION: Data is scoped by Firebase UID on the server.
 * 3. NO VAULT LEAKS: Private Vault items, PIN hashes, and salts are strictly EXCLUDED from backup payloads.
 * 4. OFFLINE QUEUEING: Automatically catches up when internet connectivity resumes.
 */

import { auth } from '../firebase/config';

export type CentralSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'unconfigured';

export interface CentralSyncState {
  status: CentralSyncStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  isConfigured: boolean;
}

export const ADMIN_EMAIL = 'hpragada0508@gmail.com';

class CentralCloudStorageService {
  private syncState: CentralSyncState = {
    status: 'idle',
    lastSyncedAt: null,
    errorMessage: null,
    isConfigured: true,
  };
  private listeners: Set<(state: CentralSyncState) => void> = new Set();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private pendingPayload: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateState({ status: 'idle', errorMessage: null });
        if (this.pendingPayload) {
          this.triggerSync(this.pendingPayload);
        }
      });

      window.addEventListener('offline', () => {
        this.updateState({
          status: 'offline',
          errorMessage: 'Offline. Sync will automatically resume when connected.',
        });
      });

      // Fetch server status on init
      this.checkServerStatus();
    }
  }

  public getState(): CentralSyncState {
    return { ...this.syncState };
  }

  public subscribe(listener: (state: CentralSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<CentralSyncState>): void {
    this.syncState = { ...this.syncState, ...partial };
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('[CentralStorage] Listener error:', err);
      }
    });
  }

  public async checkServerStatus(): Promise<{ isConfigured: boolean }> {
    try {
      const res = await fetch('/api/cloud-backup/status');
      if (res.ok) {
        const data = await res.json();
        this.updateState({ isConfigured: data.isConfigured });
        return data;
      }
    } catch {
      // Offline or network error
    }
    return { isConfigured: true };
  }

  /**
   * Sanitizes payload by stripping any Private Vault data, salts, or PIN hashes
   */
  private sanitizePayload(data: any): any {
    if (!data || typeof data !== 'object') return {};

    const sanitized = { ...data };
    // Explicitly delete all Private Vault fields
    delete sanitized.vaultFolders;
    delete sanitized.vaultNotes;
    delete sanitized.vaultFiles;
    delete sanitized.pinHash;
    delete sanitized.salt;
    delete sanitized.encryptionKey;
    delete sanitized.isVaultLocked;
    delete sanitized.sessionVaultKey;

    return sanitized;
  }

  /**
   * Debounced sync trigger for state updates
   */
  public queueSync(appState: any, delayMs: number = 2500): void {
    this.pendingPayload = appState;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerSync(this.pendingPayload);
    }, delayMs);
  }

  /**
   * Performs the immediate synchronization to the centralized backend
   */
  public async triggerSync(appState: any): Promise<boolean> {
    if (!auth.currentUser) {
      return false;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateState({
        status: 'offline',
        errorMessage: 'Offline. Changes queued for sync when reconnected.',
      });
      return false;
    }

    if (this.isSyncing) {
      this.pendingPayload = appState;
      return false;
    }

    this.isSyncing = true;
    this.updateState({ status: 'syncing', errorMessage: null });

    try {
      const token = await auth.currentUser.getIdToken();
      const cleanData = this.sanitizePayload(appState);

      const res = await fetch('/api/cloud-backup/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.code === 'DRIVE_NOT_CONFIGURED') {
          this.updateState({
            status: 'unconfigured',
            isConfigured: false,
            errorMessage: 'Centralized cloud storage waiting for administrator setup.',
          });
          this.isSyncing = false;
          return false;
        }
        throw new Error(errJson.error || `Sync failed with status ${res.status}`);
      }

      const result = await res.json();
      this.pendingPayload = null;
      this.updateState({
        status: 'synced',
        lastSyncedAt: result.syncedAt || new Date().toISOString(),
        errorMessage: null,
      });

      this.isSyncing = false;
      return true;
    } catch (error: any) {
      console.warn('[CentralStorage Sync Warning]:', error?.message || error);
      this.updateState({
        status: 'error',
        errorMessage: error?.message || 'Unable to sync to cloud storage.',
      });
      this.isSyncing = false;
      return false;
    }
  }

  /**
   * Restores user data from the centralized cloud backup
   */
  public async restoreFromCloud(): Promise<any | null> {
    if (!auth.currentUser) return null;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/cloud-backup/restore', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to restore backup (Status ${res.status})`);
      }

      const json = await res.json();
      if (json.data) {
        this.updateState({
          status: 'synced',
          lastSyncedAt: json.syncedAt || new Date().toISOString(),
        });
        return json.data;
      }
      return null;
    } catch (err: any) {
      console.error('[CentralStorage Restore Error]:', err);
      return null;
    }
  }

  /**
   * Uploads an individual asset (photo, audio, attachment) to user's isolated Drive folder
   */
  public async uploadAsset(
    type: 'memory' | 'file',
    filename: string,
    mimeType: string,
    base64Data: string
  ): Promise<{ fileId: string; name: string } | null> {
    if (!auth.currentUser) return null;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/cloud-backup/upload-asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          filename,
          mimeType,
          base64Data,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload asset');
      }

      return await res.json();
    } catch (err: any) {
      console.warn('[CentralStorage Asset Upload Warning]:', err?.message || err);
      return null;
    }
  }

  // ==========================================
  // ADMINISTRATOR ONLY METHODS
  // ==========================================

  public isAdmin(): boolean {
    const userEmail = auth.currentUser?.email?.toLowerCase();
    return userEmail === ADMIN_EMAIL.toLowerCase();
  }

  public async getAdminStatus(): Promise<any> {
    if (!this.isAdmin() || !auth.currentUser) return null;

    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/admin/drive/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      return await res.json();
    }
    return null;
  }

  public async getAdminAuthUrl(): Promise<{ authUrl: string; stateToken: string } | null> {
    if (!this.isAdmin() || !auth.currentUser) return null;

    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/admin/drive/auth-url', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      return await res.json();
    }
    return null;
  }

  public async exchangeAdminCode(code: string, state: string): Promise<any> {
    if (!this.isAdmin() || !auth.currentUser) return null;

    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/admin/drive/exchange-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, state }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to authorize admin Google Drive');
    }

    const data = await res.json();
    this.updateState({ isConfigured: true, status: 'idle', errorMessage: null });
    return data;
  }
}

export const centralCloudStorage = new CentralCloudStorageService();
