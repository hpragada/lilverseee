/**
 * Non-Destructive Firestore Two-Way Sync Service
 *
 * Mandatory Principles:
 * 1. ZERO DATA LOSS: Never delete, reset, or overwrite local storage on sign-in, sign-out, or sync.
 * 2. Strict UID Isolation: All operations scoped to `/users/{userId}/...`
 * 3. Idempotent Merge & Conflict Resolution:
 *    - Reconciles local items and cloud items by unique ID.
 *    - Uses timestamps (updatedAt / createdAt) to resolve conflicts without discarding non-conflicting items.
 * 4. Offline First: Multi-tab persistence handles offline queuing; local state always responds instantly.
 * 5. Loop Prevention: Ignores snapshots with `metadata.hasPendingWrites` to prevent listener-write cycles.
 * 6. Scoped Collections: UserProfile, Tasks, Journal, Dreams, FutureLetters, CalendarEvents, Schedules, FlirtFavorites, Memories, Folders, Files.
 * 7. Defensive Payload Sanitization: Strips all undefined fields recursively so Firestore setDoc never throws.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  getDocFromServer,
} from 'firebase/firestore';
import { db } from './config';
import {
  UserProfile,
  Task,
  JournalEntry,
  Note,
  Dream,
  FutureLetter,
  CalendarEvent,
  Memory,
  FileItem,
  FolderItem,
  TombstoneRecord,
  FlirtFavorite,
  ScheduleItem,
} from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  errorCode?: string | null;
  errorReason?: 'network' | 'quota' | 'auth' | 'permission' | 'general' | null;
  retryAttempt?: number;
  nextRetryMs?: number | null;
}

export interface CloudSyncListeners {
  onProfileUpdated?: (profile: UserProfile) => void;
  onTasksUpdated?: (tasks: Task[]) => void;
  onJournalUpdated?: (entries: JournalEntry[]) => void;
  onNotesUpdated?: (notes: Note[]) => void;
  onDreamsUpdated?: (dreams: Dream[]) => void;
  onLettersUpdated?: (letters: FutureLetter[]) => void;
  onEventsUpdated?: (events: CalendarEvent[]) => void;
  onSchedulesUpdated?: (schedules: ScheduleItem[]) => void;
  onMemoriesMetaUpdated?: (memories: Memory[]) => void;
  onFoldersUpdated?: (folders: FolderItem[]) => void;
  onFilesMetaUpdated?: (files: FileItem[]) => void;
  onFlirtFavoritesUpdated?: (favorites: FlirtFavorite[]) => void;
  onSyncStateChange?: (state: SyncState) => void;
}

const TOMBSTONE_STORAGE_PREFIX = 'mlw_tombstones_';

/**
 * Recursively removes all `undefined` values and serializes dates/objects safely for Firestore.
 * Firestore strictly rejects payloads containing any `undefined` values.
 */
function sanitizeFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestorePayload(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirestorePayload(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

class FirestoreSyncService {
  private activeUnsubscribers: Unsubscribe[] = [];
  private currentUserId: string | null = null;
  private isApplyingRemoteUpdate = false;
  private isSyncInProgress = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private lastLocalState: {
    userId: string;
    localState: any;
  } | null = null;
  private syncState: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    errorMessage: null,
    errorCode: null,
    errorReason: null,
    retryAttempt: 0,
    nextRetryMs: null,
  };
  private listeners: CloudSyncListeners = {};
  private tombstones: Map<string, TombstoneRecord> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Firestore Sync] Device connection restored, attempting auto-sync...');
        if (this.currentUserId && this.lastLocalState) {
          this.startSync(this.lastLocalState.userId, this.lastLocalState.localState, true);
        }
      });
      window.addEventListener('offline', () => {
        this.updateSyncState({
          status: 'offline',
          errorMessage: 'Offline mode active. Local changes will synchronize when reconnected.',
          errorReason: 'network',
        });
      });
    }
  }

  private loadTombstones(userId: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      this.tombstones.clear();
      const raw = localStorage.getItem(`${TOMBSTONE_STORAGE_PREFIX}${userId}`);
      if (raw) {
        const parsed: Record<string, TombstoneRecord> = JSON.parse(raw);
        for (const [id, record] of Object.entries(parsed)) {
          this.tombstones.set(id, record);
        }
      }
    } catch (err) {
      console.warn('[Firestore Sync] Failed to load durable tombstones:', err);
    }
  }

  private saveTombstones(userId: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const obj: Record<string, TombstoneRecord> = {};
      this.tombstones.forEach((record, id) => {
        obj[id] = record;
      });
      localStorage.setItem(`${TOMBSTONE_STORAGE_PREFIX}${userId}`, JSON.stringify(obj));
    } catch (err) {
      console.warn('[Firestore Sync] Failed to save durable tombstones:', err);
    }
  }

  public recordTombstone(record: TombstoneRecord): void {
    this.tombstones.set(record.id, record);
    if (this.currentUserId) {
      this.saveTombstones(this.currentUserId);
    }
  }

  public isTombstoned(id: string): boolean {
    return this.tombstones.has(id);
  }

  public isFolderTombstoned(folderId: string): boolean {
    return this.tombstones.has(folderId);
  }

  public getTombstone(id: string): TombstoneRecord | undefined {
    return this.tombstones.get(id);
  }

  /**
   * Reconcile durable tombstones with Firestore
   */
  private async reconcileTombstones(userId: string): Promise<void> {
    this.loadTombstones(userId);
    try {
      const tombstonesCol = collection(db, 'users', userId, 'tombstones');
      const snap = await getDocs(tombstonesCol);
      let changed = false;
      snap.forEach((d) => {
        const data = d.data() as TombstoneRecord;
        const id = data.id || d.id;
        const existing = this.tombstones.get(id);
        if (!existing || data.deletedAtMs > existing.deletedAtMs) {
          this.tombstones.set(id, { ...data, id });
          changed = true;
        }
      });
      if (changed) {
        this.saveTombstones(userId);
      }
    } catch (err) {
      console.warn('[Firestore Sync] Tombstone reconciliation notice (offline cache active):', err);
    }
  }

  public setListeners(listeners: CloudSyncListeners) {
    this.listeners = listeners;
  }

  public getSyncState(): SyncState {
    return { ...this.syncState };
  }

  private updateSyncState(updates: Partial<SyncState>) {
    this.syncState = { ...this.syncState, ...updates };
    if (this.listeners.onSyncStateChange) {
      this.listeners.onSyncStateChange(this.syncState);
    }
  }

  private isNewer(itemA: any, itemB: any): boolean {
    const timeA = new Date(itemA.updatedAt || itemA.createdAt || 0).getTime();
    const timeB = new Date(itemB.updatedAt || itemB.createdAt || 0).getTime();
    return timeA > timeB;
  }

  private stopListenersOnly(): void {
    this.activeUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        console.warn('[Firestore Sync] Unsubscribe error:', e);
      }
    });
    this.activeUnsubscribers = [];
  }

  /**
   * Test Firestore connection on boot
   */
  public async testConnection(): Promise<boolean> {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('[Firestore Sync] Firestore test connection: Client is offline.');
      }
      return false;
    }
  }

  /**
   * Start two-way synchronization for authenticated user
   */
  public async startSync(
    userId: string,
    localState: {
      profile: UserProfile;
      tasks: Task[];
      journal: JournalEntry[];
      notes?: Note[];
      dreams: Dream[];
      letters: FutureLetter[];
      events: CalendarEvent[];
      schedules?: ScheduleItem[];
      flirtFavorites?: FlirtFavorite[];
      memories?: Memory[];
      folders?: FolderItem[];
      files?: FileItem[];
    },
    forceManual: boolean = false
  ): Promise<void> {
    // 1. Prevent overlapping concurrent runs
    if (this.isSyncInProgress && !forceManual) {
      console.log('[Firestore Sync] Sync currently running, request coalesced.');
      return;
    }

    // 2. Skip redundant initial sync if already synced and healthy
    if (
      !forceManual &&
      this.currentUserId === userId &&
      this.activeUnsubscribers.length > 0 &&
      this.syncState.status === 'synced'
    ) {
      return;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.stopListenersOnly();
    this.currentUserId = userId;
    this.isSyncInProgress = true;
    this.lastLocalState = { userId, localState };

    this.updateSyncState({
      status: 'syncing',
      errorMessage: null,
      errorCode: null,
      errorReason: null,
      nextRetryMs: null,
    });

    try {
      // Phase 0: Reconcile durable tombstones first
      await this.reconcileTombstones(userId);

      // Phase 1: Reconcile core collections safely
      await this.reconcileProfile(userId, localState.profile);
      await this.reconcileTasks(userId, localState.tasks);
      await this.reconcileJournal(userId, localState.journal);
      await this.reconcileNotes(userId, localState.notes || []);
      await this.reconcileDreams(userId, localState.dreams);
      await this.reconcileLetters(userId, localState.letters);
      await this.reconcileEvents(userId, localState.events);
      await this.reconcileSchedules(userId, localState.schedules || []);
      await this.reconcileFlirtFavorites(userId, localState.flirtFavorites || []);

      // Phase 1B: Reconcile metadata for memories, folders, files
      if (localState.memories && localState.memories.length > 0) {
        await this.reconcileMemories(userId, localState.memories);
      }
      if (localState.folders && localState.folders.length > 0) {
        await this.reconcileFolders(userId, localState.folders);
      }
      if (localState.files && localState.files.length > 0) {
        await this.reconcileFiles(userId, localState.files);
      }

      // Phase 2: Attach realtime snapshot listeners
      this.attachRealtimeListeners(userId);

      this.retryCount = 0;
      this.updateSyncState({
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        errorMessage: null,
        errorCode: null,
        errorReason: null,
        retryAttempt: 0,
        nextRetryMs: null,
      });
    } catch (err: any) {
      console.warn('[Firestore Sync] Sync error encountered:', err);

      const code = err?.code || '';
      const rawMessage = err?.message || String(err);

      const isNetwork =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        code === 'unavailable' ||
        code === 'deadline-exceeded' ||
        rawMessage.includes('offline') ||
        rawMessage.includes('network') ||
        rawMessage.includes('Failed to fetch');

      const isQuota =
        code === 'resource-exhausted' ||
        rawMessage.includes('quota') ||
        rawMessage.includes('RESOURCE_EXHAUSTED') ||
        rawMessage.includes('429');

      const isPermission =
        code === 'permission-denied' ||
        rawMessage.includes('permission-denied') ||
        rawMessage.includes('Missing or insufficient permissions');

      const isAuth =
        code === 'unauthenticated' ||
        rawMessage.includes('unauthenticated') ||
        rawMessage.includes('unauthorized');

      const errorReason: 'network' | 'quota' | 'auth' | 'permission' | 'general' = isNetwork
        ? 'network'
        : isQuota
        ? 'quota'
        : isAuth
        ? 'auth'
        : isPermission
        ? 'permission'
        : 'general';

      let friendlyMessage = 'Sync encountered a temporary issue.';
      if (isNetwork) {
        friendlyMessage = 'Network connection offline. Changes saved locally; will sync when reconnected.';
      } else if (isQuota) {
        friendlyMessage = 'Firestore database quota limit reached. Sync paused; will automatically retry.';
      } else if (isPermission) {
        friendlyMessage = 'Firestore permission check: Ensure you are authenticated with the account matching this UID.';
      } else if (isAuth) {
        friendlyMessage = 'Authentication session expired. Please sign in again.';
      } else if (rawMessage) {
        friendlyMessage = rawMessage;
      }

      // Exponential backoff for retryable errors
      const isRetryable = isNetwork || isQuota || (!isAuth && !isPermission && this.retryCount < 5);
      let nextRetryMs: number | null = null;

      if (isRetryable && this.lastLocalState) {
        const delay = Math.min(2000 * Math.pow(2, this.retryCount), 60000) + Math.random() * 500;
        this.retryCount++;
        nextRetryMs = Date.now() + delay;

        this.retryTimer = setTimeout(() => {
          if (this.lastLocalState && this.currentUserId) {
            this.startSync(this.lastLocalState.userId, this.lastLocalState.localState, true);
          }
        }, delay);
      }

      this.updateSyncState({
        status: isNetwork ? 'offline' : 'error',
        errorMessage: friendlyMessage,
        errorCode: code || (err?.name ?? 'UNKNOWN_ERROR'),
        errorReason,
        retryAttempt: this.retryCount,
        nextRetryMs,
      });
    } finally {
      this.isSyncInProgress = false;
    }
  }

  public stopSync(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryCount = 0;
    this.lastLocalState = null;
    this.isSyncInProgress = false;

    this.stopListenersOnly();
    this.currentUserId = null;
    this.tombstones.clear();
    this.updateSyncState({
      status: 'idle',
      errorMessage: null,
      errorCode: null,
      errorReason: null,
      retryAttempt: 0,
      nextRetryMs: null,
    });
  }

  // ================= RECONCILIATION METHODS =================

  private async reconcileProfile(userId: string, localProfile: UserProfile): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const remoteData = snap.data() as Partial<UserProfile> & { updatedAt?: string };
      const merged: UserProfile = {
        ...localProfile,
        ...remoteData,
        name: remoteData.name || localProfile.name,
        subtitle: remoteData.subtitle || localProfile.subtitle,
        currentMood: remoteData.currentMood || localProfile.currentMood,
        lowEnergyMode: remoteData.lowEnergyMode ?? localProfile.lowEnergyMode,
        journalAwareAI: remoteData.journalAwareAI ?? localProfile.journalAwareAI,
      };

      this.isApplyingRemoteUpdate = true;
      if (this.listeners.onProfileUpdated) {
        this.listeners.onProfileUpdated(merged);
      }
      this.isApplyingRemoteUpdate = false;

      const hasChanges =
        remoteData.name !== merged.name ||
        remoteData.subtitle !== merged.subtitle ||
        remoteData.currentMood !== merged.currentMood ||
        remoteData.lowEnergyMode !== merged.lowEnergyMode ||
        remoteData.avatarSeed !== merged.avatarSeed ||
        remoteData.journalAwareAI !== merged.journalAwareAI;

      if (hasChanges) {
        const payload = sanitizeFirestorePayload({
          ...merged,
          uid: userId,
          updatedAt: new Date().toISOString(),
        });
        await setDoc(userDocRef, payload, { merge: true });
      }
    } else {
      const payload = sanitizeFirestorePayload({
        uid: userId,
        name: localProfile.name || 'Eleanor',
        subtitle: localProfile.subtitle || 'Welcome to your little world.',
        currentMood: localProfile.currentMood || 'calm',
        lowEnergyMode: localProfile.lowEnergyMode ?? false,
        avatarSeed: localProfile.avatarSeed || '',
        journalAwareAI: localProfile.journalAwareAI ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await setDoc(userDocRef, payload, { merge: true });
    }
  }

  private async reconcileTasks(userId: string, localTasks: Task[]): Promise<void> {
    const tasksCol = collection(db, 'users', userId, 'tasks');
    const snap = await getDocs(tasksCol);
    const remoteMap = new Map<string, Task>();

    snap.forEach((d) => {
      const data = d.data() as Task;
      remoteMap.set(data.id || d.id, { ...data, id: data.id || d.id });
    });

    const mergedMap = new Map<string, Task>();
    remoteMap.forEach((remoteItem, id) => {
      mergedMap.set(id, remoteItem);
    });

    for (const localItem of localTasks) {
      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: (localItem as any).updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(tasksCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(tasksCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onTasksUpdated) {
      this.listeners.onTasksUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileJournal(userId: string, localEntries: JournalEntry[]): Promise<void> {
    const journalCol = collection(db, 'users', userId, 'journal');
    const snap = await getDocs(journalCol);
    const remoteMap = new Map<string, JournalEntry>();

    snap.forEach((d) => {
      const data = d.data() as JournalEntry;
      remoteMap.set(data.id || d.id, { ...data, id: data.id || d.id });
    });

    const mergedMap = new Map<string, JournalEntry>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localEntries) {
      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: (localItem as any).updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(journalCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(journalCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onJournalUpdated) {
      this.listeners.onJournalUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileNotes(userId: string, localNotes: Note[]): Promise<void> {
    const notesCol = collection(db, 'users', userId, 'notes');
    const snap = await getDocs(notesCol);
    const remoteMap = new Map<string, Note>();

    snap.forEach((d) => {
      const data = d.data() as Note;
      const id = data.id || d.id;
      if (this.isTombstoned(id)) return;
      remoteMap.set(id, { ...data, id });
    });

    const mergedMap = new Map<string, Note>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localNotes) {
      if (this.isTombstoned(localItem.id)) continue;
      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: localItem.updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(notesCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(notesCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onNotesUpdated) {
      this.listeners.onNotesUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileDreams(userId: string, localDreams: Dream[]): Promise<void> {
    const dreamsCol = collection(db, 'users', userId, 'dreams');
    const snap = await getDocs(dreamsCol);
    const remoteMap = new Map<string, Dream>();

    snap.forEach((d) => {
      const data = d.data() as Dream;
      remoteMap.set(data.id || d.id, { ...data, id: data.id || d.id });
    });

    const mergedMap = new Map<string, Dream>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localDreams) {
      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: (localItem as any).updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(dreamsCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(dreamsCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onDreamsUpdated) {
      this.listeners.onDreamsUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileLetters(userId: string, localLetters: FutureLetter[]): Promise<void> {
    const lettersCol = collection(db, 'users', userId, 'letters');
    const snap = await getDocs(lettersCol);
    const remoteMap = new Map<string, FutureLetter>();

    snap.forEach((d) => {
      const data = d.data() as FutureLetter;
      remoteMap.set(data.id || d.id, { ...data, id: data.id || d.id });
    });

    const mergedMap = new Map<string, FutureLetter>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localLetters) {
      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: (localItem as any).updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(lettersCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(lettersCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onLettersUpdated) {
      this.listeners.onLettersUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileFlirtFavorites(userId: string, localFavorites: FlirtFavorite[]): Promise<void> {
    const flirtCol = collection(db, 'users', userId, 'flirt_favorites');
    const snap = await getDocs(flirtCol);
    const remoteMap = new Map<string, FlirtFavorite>();

    snap.forEach((d) => {
      const data = d.data() as FlirtFavorite;
      remoteMap.set(data.id || d.id, { ...data, id: data.id || d.id });
    });

    const mergedMap = new Map<string, FlirtFavorite>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localFavorites) {
      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: localItem.updatedAt || localItem.savedAt || new Date().toISOString(),
        });
        await setDoc(doc(flirtCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(flirtCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onFlirtFavoritesUpdated) {
      this.listeners.onFlirtFavoritesUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileEvents(userId: string, localEvents: CalendarEvent[]): Promise<void> {
    const eventsCol = collection(db, 'users', userId, 'events');
    const snap = await getDocs(eventsCol);
    const remoteMap = new Map<string, CalendarEvent>();
    const deletePromises: Promise<void>[] = [];

    snap.forEach((d) => {
      const data = d.data() as CalendarEvent;
      const id = data.id || d.id;

      if (this.isTombstoned(id)) {
        deletePromises.push(
          deleteDoc(doc(eventsCol, id)).catch((err) =>
            console.warn('[Firestore Sync] Cloud tombstone cleanup warning:', err)
          )
        );
        return;
      }

      remoteMap.set(id, { ...data, id });
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    const mergedMap = new Map<string, CalendarEvent>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localEvents) {
      if (this.isTombstoned(localItem.id)) {
        continue;
      }

      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: (localItem as any).updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(eventsCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(eventsCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onEventsUpdated) {
      this.listeners.onEventsUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileSchedules(userId: string, localSchedules: ScheduleItem[]): Promise<void> {
    const schedulesCol = collection(db, 'users', userId, 'schedules');
    const snap = await getDocs(schedulesCol);
    const remoteMap = new Map<string, ScheduleItem>();
    const deletePromises: Promise<void>[] = [];

    snap.forEach((d) => {
      const data = d.data() as ScheduleItem;
      const id = data.id || d.id;

      if (this.isTombstoned(id)) {
        deletePromises.push(
          deleteDoc(doc(schedulesCol, id)).catch((err) =>
            console.warn('[Firestore Sync] Cloud schedule tombstone cleanup warning:', err)
          )
        );
        return;
      }

      remoteMap.set(id, { ...data, id });
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    const mergedMap = new Map<string, ScheduleItem>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localSchedules) {
      if (this.isTombstoned(localItem.id)) {
        continue;
      }

      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: localItem.updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(schedulesCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(schedulesCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onSchedulesUpdated) {
      this.listeners.onSchedulesUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileMemories(userId: string, localMemories: Memory[]): Promise<void> {
    const memoriesCol = collection(db, 'users', userId, 'memories');
    const snap = await getDocs(memoriesCol);
    const remoteMap = new Map<string, Memory>();

    snap.forEach((d) => {
      const data = d.data() as Partial<Memory>;
      const id = data.id || d.id;
      if (this.isTombstoned(id)) return;

      remoteMap.set(id, {
        id,
        title: data.title || '',
        caption: data.caption || '',
        date: data.date || '',
        location: data.location || '',
        category: data.category || 'General',
        aspect: data.aspect || 'square',
        imageSrc: '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        driveFileId: data.driveFileId,
        driveSyncedAt: data.driveSyncedAt,
        driveStatus: data.driveStatus,
      });
    });

    const mergedMap = new Map<string, Memory>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localMemories) {
      if (this.isTombstoned(localItem.id)) {
        continue;
      }

      const remoteItem = mergedMap.get(localItem.id);
      const { imageSrc, ...metadataOnly } = localItem;

      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...metadataOnly,
          updatedAt: metadataOnly.updatedAt || metadataOnly.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(memoriesCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...metadataOnly,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(memoriesCol, localItem.id), payload, { merge: true });
        } else {
          mergedMap.set(localItem.id, {
            ...remoteItem,
            imageSrc: localItem.imageSrc || remoteItem.imageSrc,
          });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onMemoriesMetaUpdated) {
      this.listeners.onMemoriesMetaUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileFolders(userId: string, localFolders: FolderItem[]): Promise<void> {
    const foldersCol = collection(db, 'users', userId, 'folders');
    const snap = await getDocs(foldersCol);
    const remoteMap = new Map<string, FolderItem>();

    snap.forEach((d) => {
      const data = d.data() as FolderItem;
      const id = data.id || d.id;
      if (this.isTombstoned(id)) return;

      remoteMap.set(id, { ...data, id });
    });

    const mergedMap = new Map<string, FolderItem>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localFolders) {
      if (this.isTombstoned(localItem.id)) {
        continue;
      }

      const remoteItem = mergedMap.get(localItem.id);
      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...localItem,
          updatedAt: localItem.updatedAt || localItem.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(foldersCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...localItem,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(foldersCol, localItem.id), payload, { merge: true });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onFoldersUpdated) {
      this.listeners.onFoldersUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  private async reconcileFiles(userId: string, localFiles: FileItem[]): Promise<void> {
    const filesCol = collection(db, 'users', userId, 'files');
    const snap = await getDocs(filesCol);
    const remoteMap = new Map<string, FileItem>();

    snap.forEach((d) => {
      const data = d.data() as Partial<FileItem>;
      const id = data.id || d.id;
      if (this.isTombstoned(id) || (data.folderId && this.isFolderTombstoned(data.folderId))) {
        return;
      }

      remoteMap.set(id, {
        id,
        name: data.name || 'Untitled',
        folderId: data.folderId || 'folder-documents',
        size: data.size || 0,
        mimeType: data.mimeType || 'application/octet-stream',
        extension: data.extension || 'bin',
        dataUrl: undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        driveFileId: data.driveFileId,
        driveSyncedAt: data.driveSyncedAt,
        driveStatus: data.driveStatus,
      });
    });

    const mergedMap = new Map<string, FileItem>();
    remoteMap.forEach((item, id) => mergedMap.set(id, item));

    for (const localItem of localFiles) {
      if (this.isTombstoned(localItem.id) || (localItem.folderId && this.isFolderTombstoned(localItem.folderId))) {
        continue;
      }

      const remoteItem = mergedMap.get(localItem.id);
      const { dataUrl, ...metadataOnly } = localItem;

      if (!remoteItem) {
        mergedMap.set(localItem.id, localItem);
        const payload = sanitizeFirestorePayload({
          ...metadataOnly,
          updatedAt: metadataOnly.updatedAt || metadataOnly.createdAt || new Date().toISOString(),
        });
        await setDoc(doc(filesCol, localItem.id), payload, { merge: true });
      } else {
        if (this.isNewer(localItem, remoteItem)) {
          mergedMap.set(localItem.id, localItem);
          const payload = sanitizeFirestorePayload({
            ...metadataOnly,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(filesCol, localItem.id), payload, { merge: true });
        } else {
          mergedMap.set(localItem.id, {
            ...remoteItem,
            dataUrl: localItem.dataUrl,
          });
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    this.isApplyingRemoteUpdate = true;
    if (this.listeners.onFilesMetaUpdated) {
      this.listeners.onFilesMetaUpdated(mergedList);
    }
    this.isApplyingRemoteUpdate = false;
  }

  // ================= REALTIME SNAPSHOT LISTENERS =================

  private handleListenerError(name: string, err: any): void {
    console.warn(`[Firestore Sync] ${name} listener issue:`, err);
    const code = err?.code || '';
    const rawMessage = err?.message || String(err);

    const isNetwork =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      code === 'unavailable' ||
      code === 'deadline-exceeded' ||
      rawMessage.includes('offline') ||
      rawMessage.includes('network');

    const isQuota =
      code === 'resource-exhausted' ||
      rawMessage.includes('quota') ||
      rawMessage.includes('RESOURCE_EXHAUSTED') ||
      rawMessage.includes('429');

    const isPermission =
      code === 'permission-denied' ||
      rawMessage.includes('permission-denied') ||
      rawMessage.includes('Missing or insufficient permissions');

    const isAuth = code === 'unauthenticated' || rawMessage.includes('unauthenticated');

    const errorReason: 'network' | 'quota' | 'auth' | 'permission' | 'general' = isNetwork
      ? 'network'
      : isQuota
      ? 'quota'
      : isAuth
      ? 'auth'
      : isPermission
      ? 'permission'
      : 'general';

    const errorMessage = isQuota
      ? 'Firestore database quota limit reached. Realtime updates paused.'
      : isPermission
      ? 'Security permission mismatch on realtime listener.'
      : isAuth
      ? 'Cloud access session expired. Please sign in again.'
      : isNetwork
      ? 'Network connection offline. Realtime updates paused.'
      : (err?.message || 'Realtime sync connection interrupted.');

    this.updateSyncState({
      status: isNetwork ? 'offline' : 'error',
      errorMessage,
      errorCode: code || 'LISTENER_ERROR',
      errorReason,
    });
  }

  private onSnapshotSuccess(): void {
    if (this.syncState.status !== 'synced' && this.currentUserId) {
      this.updateSyncState({
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        errorMessage: null,
        errorCode: null,
        errorReason: null,
        nextRetryMs: null,
      });
    }
  }

  private attachRealtimeListeners(userId: string): void {
    // 1. User Profile listener
    const userDocRef = doc(db, 'users', userId);
    const unsubProfile = onSnapshot(
      userDocRef,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        if (snap.exists() && this.listeners.onProfileUpdated) {
          const data = snap.data() as Partial<UserProfile>;
          this.isApplyingRemoteUpdate = true;
          this.listeners.onProfileUpdated(data as UserProfile);
          this.isApplyingRemoteUpdate = false;
        }
      },
      (err) => this.handleListenerError('Profile', err)
    );
    this.activeUnsubscribers.push(unsubProfile);

    // 2. Tasks listener
    const tasksCol = collection(db, 'users', userId, 'tasks');
    const unsubTasks = onSnapshot(
      tasksCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const tasks: Task[] = [];
        snap.forEach((d) => tasks.push(d.data() as Task));
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onTasksUpdated) {
          this.listeners.onTasksUpdated(tasks);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Tasks', err)
    );
    this.activeUnsubscribers.push(unsubTasks);

    // 3. Journal listener
    const journalCol = collection(db, 'users', userId, 'journal');
    const unsubJournal = onSnapshot(
      journalCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const entries: JournalEntry[] = [];
        snap.forEach((d) => entries.push(d.data() as JournalEntry));
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onJournalUpdated) {
          this.listeners.onJournalUpdated(entries);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Journal', err)
    );
    this.activeUnsubscribers.push(unsubJournal);

    // 3B. Notes listener
    const notesCol = collection(db, 'users', userId, 'notes');
    const unsubNotes = onSnapshot(
      notesCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const notes: Note[] = [];
        snap.forEach((d) => {
          const item = d.data() as Note;
          const id = item.id || d.id;
          if (!this.isTombstoned(id)) {
            notes.push({ ...item, id });
          }
        });
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onNotesUpdated) {
          this.listeners.onNotesUpdated(notes);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Notes', err)
    );
    this.activeUnsubscribers.push(unsubNotes);

    // 4. Dreams listener
    const dreamsCol = collection(db, 'users', userId, 'dreams');
    const unsubDreams = onSnapshot(
      dreamsCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const dreams: Dream[] = [];
        snap.forEach((d) => dreams.push(d.data() as Dream));
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onDreamsUpdated) {
          this.listeners.onDreamsUpdated(dreams);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Dreams', err)
    );
    this.activeUnsubscribers.push(unsubDreams);

    // 5. Future Letters listener
    const lettersCol = collection(db, 'users', userId, 'letters');
    const unsubLetters = onSnapshot(
      lettersCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const letters: FutureLetter[] = [];
        snap.forEach((d) => letters.push(d.data() as FutureLetter));
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onLettersUpdated) {
          this.listeners.onLettersUpdated(letters);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Letters', err)
    );
    this.activeUnsubscribers.push(unsubLetters);

    // 6. Events listener
    const eventsCol = collection(db, 'users', userId, 'events');
    const unsubEvents = onSnapshot(
      eventsCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const events: CalendarEvent[] = [];
        snap.forEach((d) => {
          const item = d.data() as CalendarEvent;
          const id = item.id || d.id;
          if (!this.isTombstoned(id)) {
            events.push({ ...item, id });
          }
        });
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onEventsUpdated) {
          this.listeners.onEventsUpdated(events);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Events', err)
    );
    this.activeUnsubscribers.push(unsubEvents);

    // 7. Memories metadata listener
    const memoriesCol = collection(db, 'users', userId, 'memories');
    const unsubMemories = onSnapshot(
      memoriesCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const memories: Memory[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<Memory>;
          const id = data.id || d.id;
          if (this.isTombstoned(id)) return;
          memories.push({
            id,
            title: data.title || '',
            caption: data.caption || '',
            date: data.date || '',
            location: data.location || '',
            category: data.category || 'General',
            aspect: data.aspect || 'square',
            imageSrc: '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            driveFileId: data.driveFileId,
            driveSyncedAt: data.driveSyncedAt,
            driveStatus: data.driveStatus,
          });
        });
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onMemoriesMetaUpdated) {
          this.listeners.onMemoriesMetaUpdated(memories);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Memories', err)
    );
    this.activeUnsubscribers.push(unsubMemories);

    // 8. Folders listener
    const foldersCol = collection(db, 'users', userId, 'folders');
    const unsubFolders = onSnapshot(
      foldersCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const folders: FolderItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as FolderItem;
          const id = data.id || d.id;
          if (this.isTombstoned(id)) return;
          folders.push({ ...data, id });
        });
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onFoldersUpdated) {
          this.listeners.onFoldersUpdated(folders);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Folders', err)
    );
    this.activeUnsubscribers.push(unsubFolders);

    // 9. Files metadata listener
    const filesCol = collection(db, 'users', userId, 'files');
    const unsubFiles = onSnapshot(
      filesCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const files: FileItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<FileItem>;
          const id = data.id || d.id;
          if (this.isTombstoned(id) || (data.folderId && this.isFolderTombstoned(data.folderId))) {
            return;
          }
          files.push({
            id,
            name: data.name || 'Untitled',
            folderId: data.folderId || 'folder-documents',
            size: data.size || 0,
            mimeType: data.mimeType || 'application/octet-stream',
            extension: data.extension || 'bin',
            dataUrl: undefined,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            driveFileId: data.driveFileId,
            driveSyncedAt: data.driveSyncedAt,
            driveStatus: data.driveStatus,
          });
        });
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onFilesMetaUpdated) {
          this.listeners.onFilesMetaUpdated(files);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Files', err)
    );
    this.activeUnsubscribers.push(unsubFiles);

    // 10. Flirt Favorites listener
    const flirtCol = collection(db, 'users', userId, 'flirt_favorites');
    const unsubFlirt = onSnapshot(
      flirtCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const favorites: FlirtFavorite[] = [];
        snap.forEach((d) => favorites.push(d.data() as FlirtFavorite));
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onFlirtFavoritesUpdated) {
          this.listeners.onFlirtFavoritesUpdated(favorites);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('FlirtFavorites', err)
    );
    this.activeUnsubscribers.push(unsubFlirt);

    // 11. Schedules listener
    const schedulesCol = collection(db, 'users', userId, 'schedules');
    const unsubSchedules = onSnapshot(
      schedulesCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
        const schedules: ScheduleItem[] = [];
        snap.forEach((d) => schedules.push(d.data() as ScheduleItem));
        this.isApplyingRemoteUpdate = true;
        if (this.listeners.onSchedulesUpdated) {
          this.listeners.onSchedulesUpdated(schedules);
        }
        this.isApplyingRemoteUpdate = false;
      },
      (err) => this.handleListenerError('Schedules', err)
    );
    this.activeUnsubscribers.push(unsubSchedules);

    // 12. Tombstones listener
    const tombstonesCol = collection(db, 'users', userId, 'tombstones');
    const unsubTombstones = onSnapshot(
      tombstonesCol,
      { includeMetadataChanges: true },
      (snap) => {
        this.onSnapshotSuccess();
        if (snap.metadata.hasPendingWrites) return;
        let changed = false;
        snap.forEach((d) => {
          const data = d.data() as TombstoneRecord;
          const id = data.id || d.id;
          if (!this.tombstones.has(id)) {
            this.tombstones.set(id, { ...data, id });
            changed = true;
          }
        });
        if (changed && this.currentUserId) {
          this.saveTombstones(this.currentUserId);
        }
      },
      (err) => this.handleListenerError('Tombstones', err)
    );
    this.activeUnsubscribers.push(unsubTombstones);
  }

  // ================= MUTATION SYNC DISPATCHERS =================

  public async syncProfileUpdate(updates: Partial<UserProfile>): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const userRef = doc(db, 'users', this.currentUserId);
      const payload = sanitizeFirestorePayload({
        ...updates,
        uid: this.currentUserId,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(userRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push profile update:', e);
    }
  }

  public async syncTaskUpsert(task: Task): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const taskRef = doc(db, 'users', this.currentUserId, 'tasks', task.id);
      const payload = sanitizeFirestorePayload({
        ...task,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(taskRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push task upsert:', e);
    }
  }

  public async syncTaskDelete(taskId: string): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const taskRef = doc(db, 'users', this.currentUserId, 'tasks', taskId);
      await deleteDoc(taskRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push task delete:', e);
    }
  }

  public async syncJournalUpsert(entry: JournalEntry): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const entryRef = doc(db, 'users', this.currentUserId, 'journal', entry.id);
      const payload = sanitizeFirestorePayload({
        ...entry,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(entryRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push journal upsert:', e);
    }
  }

  public async syncJournalDelete(entryId: string): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const entryRef = doc(db, 'users', this.currentUserId, 'journal', entryId);
      await deleteDoc(entryRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push journal delete:', e);
    }
  }

  public async syncNoteUpsert(note: Note): Promise<void> {
    const existingTombstone = this.tombstones.get(note.id);
    if (existingTombstone) {
      const timeMs = new Date(note.updatedAt || note.createdAt || 0).getTime();
      if (timeMs <= existingTombstone.deletedAtMs) {
        return;
      }
      this.tombstones.delete(note.id);
      if (this.currentUserId) {
        this.saveTombstones(this.currentUserId);
        deleteDoc(doc(db, 'users', this.currentUserId, 'tombstones', note.id)).catch(console.warn);
      }
    }

    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const ref = doc(db, 'users', this.currentUserId, 'notes', note.id);
      const payload = sanitizeFirestorePayload({
        ...note,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(ref, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push note upsert:', e);
    }
  }

  public async syncNoteDelete(noteId: string): Promise<void> {
    if (!this.currentUserId) return;
    const tombstone: TombstoneRecord = {
      id: noteId,
      itemType: 'note',
      deletedAt: new Date().toISOString(),
      deletedAtMs: Date.now(),
      uid: this.currentUserId,
    };
    this.recordTombstone(tombstone);

    try {
      const tombstoneRef = doc(db, 'users', this.currentUserId, 'tombstones', noteId);
      await setDoc(tombstoneRef, sanitizeFirestorePayload(tombstone), { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push note tombstone:', e);
    }

    try {
      const ref = doc(db, 'users', this.currentUserId, 'notes', noteId);
      await deleteDoc(ref);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push note delete:', e);
    }
  }

  public async syncDreamUpsert(dream: Dream): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const dreamRef = doc(db, 'users', this.currentUserId, 'dreams', dream.id);
      const payload = sanitizeFirestorePayload({
        ...dream,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(dreamRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push dream upsert:', e);
    }
  }

  public async syncDreamDelete(dreamId: string): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const dreamRef = doc(db, 'users', this.currentUserId, 'dreams', dreamId);
      await deleteDoc(dreamRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push dream delete:', e);
    }
  }

  public async syncLetterUpsert(letter: FutureLetter): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const letterRef = doc(db, 'users', this.currentUserId, 'letters', letter.id);
      const payload = sanitizeFirestorePayload({
        ...letter,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(letterRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push letter upsert:', e);
    }
  }

  public async syncLetterDelete(letterId: string): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const letterRef = doc(db, 'users', this.currentUserId, 'letters', letterId);
      await deleteDoc(letterRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push letter delete:', e);
    }
  }

  public async syncFlirtFavoriteUpsert(favorite: FlirtFavorite): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const favRef = doc(db, 'users', this.currentUserId, 'flirt_favorites', favorite.id);
      const payload = sanitizeFirestorePayload({
        ...favorite,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(favRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push flirt favorite upsert:', e);
    }
  }

  public async syncFlirtFavoriteDelete(favId: string): Promise<void> {
    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const favRef = doc(db, 'users', this.currentUserId, 'flirt_favorites', favId);
      await deleteDoc(favRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push flirt favorite delete:', e);
    }
  }

  public async syncEventUpsert(event: CalendarEvent): Promise<void> {
    const existingTombstone = this.tombstones.get(event.id);
    if (existingTombstone) {
      const eventTime = new Date(event.updatedAt || event.createdAt || 0).getTime();
      if (eventTime <= existingTombstone.deletedAtMs) {
        return;
      }
      this.tombstones.delete(event.id);
      if (this.currentUserId) {
        this.saveTombstones(this.currentUserId);
        deleteDoc(doc(db, 'users', this.currentUserId, 'tombstones', event.id)).catch(console.warn);
      }
    }

    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const eventRef = doc(db, 'users', this.currentUserId, 'events', event.id);
      const payload = sanitizeFirestorePayload({
        ...event,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(eventRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push event upsert:', e);
    }
  }

  public async syncEventDelete(eventId: string): Promise<void> {
    if (!this.currentUserId) return;
    const tombstone: TombstoneRecord = {
      id: eventId,
      itemType: 'event',
      deletedAt: new Date().toISOString(),
      deletedAtMs: Date.now(),
      uid: this.currentUserId,
    };
    this.recordTombstone(tombstone);

    try {
      const tombstoneRef = doc(db, 'users', this.currentUserId, 'tombstones', eventId);
      await setDoc(tombstoneRef, sanitizeFirestorePayload(tombstone), { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push event tombstone:', e);
    }

    try {
      const eventRef = doc(db, 'users', this.currentUserId, 'events', eventId);
      await deleteDoc(eventRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push event delete:', e);
    }
  }

  public async syncScheduleUpsert(schedule: ScheduleItem): Promise<void> {
    const existingTombstone = this.tombstones.get(schedule.id);
    if (existingTombstone) {
      const scheduleTime = new Date(schedule.updatedAt || schedule.createdAt || 0).getTime();
      if (scheduleTime <= existingTombstone.deletedAtMs) {
        return;
      }
      this.tombstones.delete(schedule.id);
      if (this.currentUserId) {
        this.saveTombstones(this.currentUserId);
        deleteDoc(doc(db, 'users', this.currentUserId, 'tombstones', schedule.id)).catch(console.warn);
      }
    }

    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const scheduleRef = doc(db, 'users', this.currentUserId, 'schedules', schedule.id);
      const payload = sanitizeFirestorePayload({
        ...schedule,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(scheduleRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push schedule upsert:', e);
    }
  }

  public async syncScheduleDelete(scheduleId: string): Promise<void> {
    if (!this.currentUserId) return;
    const tombstone: TombstoneRecord = {
      id: scheduleId,
      itemType: 'schedule',
      deletedAt: new Date().toISOString(),
      deletedAtMs: Date.now(),
      uid: this.currentUserId,
    };
    this.recordTombstone(tombstone);

    try {
      const tombstoneRef = doc(db, 'users', this.currentUserId, 'tombstones', scheduleId);
      await setDoc(tombstoneRef, sanitizeFirestorePayload(tombstone), { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push schedule tombstone:', e);
    }

    try {
      const scheduleRef = doc(db, 'users', this.currentUserId, 'schedules', scheduleId);
      await deleteDoc(scheduleRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push schedule delete:', e);
    }
  }

  public async syncMemoryMetaUpsert(memory: Memory): Promise<void> {
    const existingTombstone = this.tombstones.get(memory.id);
    if (existingTombstone) {
      const memTime = new Date(memory.updatedAt || memory.createdAt || 0).getTime();
      if (memTime <= existingTombstone.deletedAtMs) {
        return;
      }
      this.tombstones.delete(memory.id);
      if (this.currentUserId) {
        this.saveTombstones(this.currentUserId);
        deleteDoc(doc(db, 'users', this.currentUserId, 'tombstones', memory.id)).catch(console.warn);
      }
    }

    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const { imageSrc, ...metadataOnly } = memory;
      const memoryRef = doc(db, 'users', this.currentUserId, 'memories', memory.id);
      const payload = sanitizeFirestorePayload({
        ...metadataOnly,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(memoryRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push memory metadata upsert:', e);
    }
  }

  public async syncMemoryDelete(memoryId: string): Promise<void> {
    if (!this.currentUserId) return;
    const tombstone: TombstoneRecord = {
      id: memoryId,
      itemType: 'memory',
      deletedAt: new Date().toISOString(),
      deletedAtMs: Date.now(),
      uid: this.currentUserId,
    };
    this.recordTombstone(tombstone);

    try {
      const tombstoneRef = doc(db, 'users', this.currentUserId, 'tombstones', memoryId);
      await setDoc(tombstoneRef, sanitizeFirestorePayload(tombstone), { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push memory tombstone:', e);
    }

    try {
      const memoryRef = doc(db, 'users', this.currentUserId, 'memories', memoryId);
      await deleteDoc(memoryRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push memory delete:', e);
    }
  }

  public async syncFolderUpsert(folder: FolderItem): Promise<void> {
    const existingTombstone = this.tombstones.get(folder.id);
    if (existingTombstone) {
      const folderTime = new Date(folder.updatedAt || folder.createdAt || 0).getTime();
      if (folderTime <= existingTombstone.deletedAtMs) {
        return;
      }
      this.tombstones.delete(folder.id);
      if (this.currentUserId) {
        this.saveTombstones(this.currentUserId);
        deleteDoc(doc(db, 'users', this.currentUserId, 'tombstones', folder.id)).catch(console.warn);
      }
    }

    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const folderRef = doc(db, 'users', this.currentUserId, 'folders', folder.id);
      const payload = sanitizeFirestorePayload({
        ...folder,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(folderRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push folder upsert:', e);
    }
  }

  public async syncFolderDelete(
    folderId: string,
    childFolderIds: string[] = [],
    childFileIds: string[] = []
  ): Promise<void> {
    if (!this.currentUserId) return;
    const now = Date.now();
    const nowIso = new Date().toISOString();

    const allFolderIds = Array.from(new Set([folderId, ...childFolderIds]));
    for (const fId of allFolderIds) {
      const fTombstone: TombstoneRecord = {
        id: fId,
        itemType: 'folder',
        deletedAt: nowIso,
        deletedAtMs: now,
        uid: this.currentUserId,
      };
      this.recordTombstone(fTombstone);
      setDoc(doc(db, 'users', this.currentUserId, 'tombstones', fId), sanitizeFirestorePayload(fTombstone), { merge: true }).catch(console.warn);
      deleteDoc(doc(db, 'users', this.currentUserId, 'folders', fId)).catch(console.warn);
    }

    for (const fileId of childFileIds) {
      const fileTombstone: TombstoneRecord = {
        id: fileId,
        itemType: 'file',
        deletedAt: nowIso,
        deletedAtMs: now,
        uid: this.currentUserId,
        parentFolderId: folderId,
      };
      this.recordTombstone(fileTombstone);
      setDoc(doc(db, 'users', this.currentUserId, 'tombstones', fileId), sanitizeFirestorePayload(fileTombstone), { merge: true }).catch(console.warn);
      deleteDoc(doc(db, 'users', this.currentUserId, 'files', fileId)).catch(console.warn);
    }
  }

  public async syncFileMetaUpsert(file: FileItem): Promise<void> {
    const existingTombstone = this.tombstones.get(file.id);
    if (existingTombstone) {
      const fileTime = new Date(file.updatedAt || file.createdAt || 0).getTime();
      if (fileTime <= existingTombstone.deletedAtMs) {
        return;
      }
      this.tombstones.delete(file.id);
      if (this.currentUserId) {
        this.saveTombstones(this.currentUserId);
        deleteDoc(doc(db, 'users', this.currentUserId, 'tombstones', file.id)).catch(console.warn);
      }
    }

    if (file.folderId && this.isFolderTombstoned(file.folderId)) {
      return;
    }

    if (!this.currentUserId || this.isApplyingRemoteUpdate) return;
    try {
      const { dataUrl, ...metadataOnly } = file;
      const fileRef = doc(db, 'users', this.currentUserId, 'files', file.id);
      const payload = sanitizeFirestorePayload({
        ...metadataOnly,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(fileRef, payload, { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push file metadata upsert:', e);
    }
  }

  public async syncFileDelete(fileId: string, parentFolderId?: string): Promise<void> {
    if (!this.currentUserId) return;
    const tombstone: TombstoneRecord = {
      id: fileId,
      itemType: 'file',
      deletedAt: new Date().toISOString(),
      deletedAtMs: Date.now(),
      uid: this.currentUserId,
      parentFolderId,
    };
    this.recordTombstone(tombstone);

    try {
      const tombstoneRef = doc(db, 'users', this.currentUserId, 'tombstones', fileId);
      await setDoc(tombstoneRef, sanitizeFirestorePayload(tombstone), { merge: true });
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push file tombstone:', e);
    }

    try {
      const fileRef = doc(db, 'users', this.currentUserId, 'files', fileId);
      await deleteDoc(fileRef);
    } catch (e) {
      console.warn('[Firestore Sync] Failed to push file delete:', e);
    }
  }
}

export const syncService = new FirestoreSyncService();
