/**
 * Server-Side Centralized Google Drive Storage Manager
 * 
 * Securely manages centralized cloud backups on the administrator's Google Drive (hpragada0508)
 * for all authenticated Lilverse / My Little World app users.
 * 
 * Strict Security Rules:
 * 1. Tokens and credentials NEVER leave the server and are NEVER sent to clients or embedded in the APK.
 * 2. Strict Firebase UID Isolation: Users can ONLY read and write to `My Little World/users/{uid}/...`.
 * 3. Private Vault Records, PIN hashes, encryption salts, and vault files are strictly EXCLUDED.
 * 4. Admin endpoints are strictly restricted to the verified administrator email (hpragada0508@gmail.com).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ADMIN_EMAIL = 'hpragada0508@gmail.com';
const TOKEN_STORE_PATH = path.resolve(__dirname, '../../.drive_admin_token.json');
const APPLET_CONFIG_PATH = path.resolve(__dirname, '../../firebase-applet-config.json');

interface StoredAdminTokens {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number;
  adminEmail: string;
  connectedAt: string;
  clientEmail?: string;
}

class CentralDriveStorageManager {
  private inMemoryAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private rootFolderId: string | null = null;
  private userFoldersCache: Map<string, { folderId: string; memoriesFolderId?: string; filesFolderId?: string }> = new Map();

  public getClientId(): string {
    let fileConfigClientId = '';
    try {
      if (fs.existsSync(APPLET_CONFIG_PATH)) {
        const raw = JSON.parse(fs.readFileSync(APPLET_CONFIG_PATH, 'utf8'));
        if (raw.oAuthClientId) fileConfigClientId = raw.oAuthClientId;
      }
    } catch {
      // ignore
    }

    const candidates = [
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      fileConfigClientId,
      process.env.VITE_GOOGLE_CLIENT_ID,
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

  public getClientSecret(): string {
    if (process.env.GOOGLE_DRIVE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_CLIENT_SECRET.trim()) {
      return process.env.GOOGLE_DRIVE_CLIENT_SECRET.trim();
    }
    // Automatically detect if Client Secret was placed in VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET
    if (process.env.VITE_GOOGLE_CLIENT_ID && process.env.VITE_GOOGLE_CLIENT_ID.trim().startsWith('GOCSPX-')) {
      return process.env.VITE_GOOGLE_CLIENT_ID.trim();
    }
    if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim()) {
      return process.env.GOOGLE_CLIENT_SECRET.trim();
    }
    return '';
  }

  public getStoredTokens(): StoredAdminTokens | null {
    // 1. Check environment variable first
    if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      return {
        refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
        adminEmail: ADMIN_EMAIL,
        connectedAt: new Date().toISOString(),
      };
    }

    // 2. Check server-side protected token file
    try {
      if (fs.existsSync(TOKEN_STORE_PATH)) {
        const raw = fs.readFileSync(TOKEN_STORE_PATH, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[CentralDrive] Failed to read token store:', err);
    }

    return null;
  }

  public saveTokens(tokens: StoredAdminTokens): void {
    try {
      const dir = path.dirname(TOKEN_STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(TOKEN_STORE_PATH, JSON.stringify(tokens, null, 2), {
        mode: 0o600, // Read/write only by owner
      });
      this.inMemoryAccessToken = tokens.accessToken || null;
      this.tokenExpiresAt = tokens.expiresAt || 0;
      console.log('[CentralDrive] Admin Drive tokens saved securely on server.');
    } catch (err) {
      console.error('[CentralDrive] Failed to save tokens to server store:', err);
      throw new Error('Failed to save admin credentials to server file store.');
    }
  }

  public isConfigured(): boolean {
    const tokens = this.getStoredTokens();
    return !!(tokens && tokens.refreshToken);
  }

  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.inMemoryAccessToken && now < this.tokenExpiresAt - 120000) {
      return this.inMemoryAccessToken;
    }

    const tokens = this.getStoredTokens();
    if (!tokens || !tokens.refreshToken) {
      throw new Error(
        'Centralized Google Drive storage is not yet connected. Administrator (hpragada0508) must authorize Drive access.'
      );
    }

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    const bodyParams = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    });

    if (clientSecret) {
      bodyParams.append('client_secret', clientSecret);
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[CentralDrive] Token refresh failed:', res.status, errorText);
      throw new Error(`Failed to refresh Google Drive access token: ${errorText}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.inMemoryAccessToken = data.access_token;
    this.tokenExpiresAt = now + data.expires_in * 1000;
    return this.inMemoryAccessToken;
  }

  /**
   * Searches for a folder by name inside a parent folder, or creates it.
   */
  public async ensureFolder(name: string, parentId?: string): Promise<string> {
    const accessToken = await this.getAccessToken();

    let query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    } else {
      query += ` and 'root' in parents`;
    }

    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (listRes.ok) {
      const listData = (await listRes.json()) as { files?: { id: string; name: string }[] };
      if (listData.files && listData.files.length > 0) {
        return listData.files[0].id;
      }
    }

    // Create folder
    const metadata: Record<string, any> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create Drive folder "${name}": ${err}`);
    }

    const createdData = (await createRes.json()) as { id: string; name: string };
    return createdData.id;
  }

  /**
   * Ensures root folder "My Little World" and subfolder "users" exist
   */
  public async getRootUsersFolder(): Promise<string> {
    if (this.rootFolderId) return this.rootFolderId;

    const rootId = await this.ensureFolder('My Little World');
    const usersFolderId = await this.ensureFolder('users', rootId);
    this.rootFolderId = usersFolderId;
    return usersFolderId;
  }

  /**
   * Retrieves or creates the isolated directory for a specific Firebase UID
   */
  public async getUserFolders(uid: string): Promise<{
    userFolderId: string;
    memoriesFolderId: string;
    filesFolderId: string;
  }> {
    const cached = this.userFoldersCache.get(uid);
    if (cached && cached.memoriesFolderId && cached.filesFolderId) {
      return {
        userFolderId: cached.folderId,
        memoriesFolderId: cached.memoriesFolderId,
        filesFolderId: cached.filesFolderId,
      };
    }

    const usersRoot = await this.getRootUsersFolder();
    // Create folder specific to UID
    const userFolderId = await this.ensureFolder(uid, usersRoot);
    const memoriesFolderId = await this.ensureFolder('memories', userFolderId);
    const filesFolderId = await this.ensureFolder('files', userFolderId);

    const folderMap = {
      folderId: userFolderId,
      memoriesFolderId,
      filesFolderId,
    };
    this.userFoldersCache.set(uid, folderMap);

    return {
      userFolderId,
      memoriesFolderId,
      filesFolderId,
    };
  }

  /**
   * Uploads or updates a JSON/text or binary file in a parent folder
   */
  public async uploadOrUpdateFile(options: {
    name: string;
    mimeType: string;
    parentId: string;
    content: Buffer | string;
  }): Promise<{ fileId: string; name: string; size: number }> {
    const accessToken = await this.getAccessToken();

    // Check if file already exists in parent
    const query = `name = '${options.name.replace(/'/g, "\\'")}' and '${options.parentId}' in parents and trashed = false`;
    const checkRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let existingFileId: string | null = null;
    if (checkRes.ok) {
      const checkData = (await checkRes.json()) as { files?: { id: string }[] };
      if (checkData.files && checkData.files.length > 0) {
        existingFileId = checkData.files[0].id;
      }
    }

    const boundary = `-------314159265358979323846_${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: options.name,
      mimeType: options.mimeType,
      ...(!existingFileId ? { parents: [options.parentId] } : {}),
    };

    const isBuffer = Buffer.isBuffer(options.content);
    const contentBuffer = isBuffer ? (options.content as Buffer) : Buffer.from(options.content as string, 'utf8');

    const multipartHeader = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `${delimiter}Content-Type: ${options.mimeType}\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(multipartHeader, 'utf8'),
      contentBuffer,
      Buffer.from(closeDelimiter, 'utf8'),
    ]);

    const uploadUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,size`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size`;

    const uploadRes = await fetch(uploadUrl, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(bodyBuffer.length),
      },
      body: bodyBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Failed to upload file "${options.name}" to Drive: ${err}`);
    }

    const result = (await uploadRes.json()) as { id: string; name: string; size?: string };
    return {
      fileId: result.id,
      name: result.name,
      size: result.size ? parseInt(result.size, 10) : contentBuffer.length,
    };
  }

  /**
   * Reads file content by file ID
   */
  public async getFileContent(fileId: string): Promise<string> {
    const accessToken = await this.getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to download file (${fileId}) from Drive: ${err}`);
    }

    return await res.text();
  }

  /**
   * Finds a file in a specific folder
   */
  public async findFile(name: string, parentId: string): Promise<{ fileId: string; name: string; modifiedTime?: string } | null> {
    const accessToken = await this.getAccessToken();
    const query = `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&spaces=drive`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as { files?: { id: string; name: string; modifiedTime?: string }[] };
    if (data.files && data.files.length > 0) {
      return {
        fileId: data.files[0].id,
        name: data.files[0].name,
        modifiedTime: data.files[0].modifiedTime,
      };
    }
    return null;
  }
}

export const centralDriveStorage = new CentralDriveStorageManager();
