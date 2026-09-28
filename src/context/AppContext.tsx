import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveTab,
  MoodType,
  Task,
  JournalEntry,
  Note,
  Memory,
  CalendarEvent,
  Dream,
  UserProfile,
  FutureLetter,
  DriveAuthState,
  FlirtFavorite,
  FlirtLine,
  ScheduleItem,
  JoyEntry,
  GardenEntry,
  Transaction,
} from '../types';
import {
  INITIAL_USER,
  INITIAL_TASKS,
  LOW_ENERGY_TASKS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_NOTES,
  INITIAL_MEMORIES,
  INITIAL_DREAMS,
  INITIAL_EVENTS,
  INITIAL_FUTURE_LETTERS,
  INITIAL_JOY_ENTRIES,
  INITIAL_GARDEN_ENTRIES,
  INITIAL_TRANSACTIONS,
  DEFAULT_CATEGORY_BUDGETS,
} from '../data/initialData';
import { INITIAL_SCHEDULES } from '../data/initialSchedules';
import {
  getAllMemoriesFromDB,
  saveMemoryToDB,
  saveMultipleMemoriesToDB,
  deleteMemoryFromDB,
} from '../services/photoStorage';
import {
  mergeRemoteFolders,
  mergeRemoteFilesMetadata,
} from '../services/fileStorage';
import { useAuth } from '../firebase/authContext';
import { syncService, SyncState } from '../firebase/syncService';
import { googleDriveAuth } from '../services/googleDriveAuth';
import { centralCloudStorage, CentralSyncState } from '../services/centralCloudStorage';

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  toggleLowEnergyMode: () => void;
  toggleJournalAwareAI: () => void;
  setMood: (mood: MoodType) => void;
  tasks: Task[];
  addTask: (title: string, category?: Task['category']) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  togglePinJournalEntry: (id: string) => void;
  notes: Note[];
  addNote: (title: string, content: string) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  memories: Memory[];
  addMemory: (memory: Omit<Memory, 'id'>) => Promise<void>;
  addMultipleMemories: (newMemories: Array<Omit<Memory, 'id'>>) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  dreams: Dream[];
  addDream: (dream: Omit<Dream, 'id'>) => void;
  updateDream: (id: string, updates: Partial<Dream>) => void;
  deleteDream: (id: string) => void;
  toggleDreamCompleted: (id: string) => void;
  futureLetters: FutureLetter[];
  addFutureLetter: (letter: Omit<FutureLetter, 'id' | 'createdAt'>) => void;
  updateFutureLetter: (id: string, updates: Partial<FutureLetter>) => void;
  deleteFutureLetter: (id: string) => void;
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  snoozeEvent: (id: string, minutes: number) => void;
  toggleEventCompleted: (id: string) => void;
  schedules: ScheduleItem[];
  addSchedule: (schedule: Omit<ScheduleItem, 'id' | 'createdAt'>) => ScheduleItem;
  updateSchedule: (id: string, updates: Partial<ScheduleItem>) => void;
  deleteSchedule: (id: string) => void;
  toggleScheduleCompletedToday: (id: string) => void;
  flirtFavorites: FlirtFavorite[];
  addFlirtFavorite: (line: FlirtLine | FlirtFavorite, customNote?: string) => void;
  removeFlirtFavorite: (idOrLineId: string) => void;
  isFlirtFavorite: (lineId: string) => boolean;
  joyEntries: JoyEntry[];
  addJoyEntry: (entry: Omit<JoyEntry, 'id' | 'createdAt'>) => void;
  updateJoyEntry: (id: string, updates: Partial<JoyEntry>) => void;
  deleteJoyEntry: (id: string) => void;
  gardenEntries: GardenEntry[];
  addGardenEntry: (entry: Omit<GardenEntry, 'id' | 'createdAt'>) => void;
  updateGardenEntry: (id: string, updates: Partial<GardenEntry>) => void;
  deleteGardenEntry: (id: string) => void;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  categoryBudgets: Record<string, number>;
  updateCategoryBudget: (category: string, monthlyLimit: number) => void;
  quickActionModal: 'task' | 'journal' | 'memory' | null;
  setQuickActionModal: (modal: 'task' | 'journal' | 'memory' | null) => void;
  syncState: SyncState;
  triggerManualSync: (forcedUid?: string) => Promise<void>;
  centralSyncState: CentralSyncState;
  triggerCentralSync: () => Promise<boolean>;
  driveAuthState: DriveAuthState;
  connectDrive: (promptConsent?: boolean) => Promise<string>;
  disconnectDrive: () => Promise<void>;
  reloadMemoriesFromDB: () => Promise<void>;
  refreshMemories: (updatedList: Memory[]) => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'mlw_user_profile',
  TASKS: 'mlw_tasks',
  LOW_TASKS: 'mlw_low_energy_tasks',
  JOURNAL: 'mlw_journal',
  NOTES: 'mlw_notes',
  DREAMS: 'mlw_dreams',
  EVENTS: 'mlw_events',
  SCHEDULES: 'mlw_schedules',
  LETTERS: 'mlw_future_letters',
  FLIRT_FAVORITES: 'mlw_flirt_favorites',
  JOY_ENTRIES: 'mlw_joy_entries',
  GARDEN_ENTRIES: 'mlw_garden_entries',
  TRANSACTIONS: 'mlw_transactions',
  BUDGETS: 'mlw_budgets',
  LAST_SYNCED_UID: 'mlw_last_synced_uid',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [quickActionModal, setQuickActionModal] = useState<'task' | 'journal' | 'memory' | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(() => syncService.getSyncState());
  const [centralSyncState, setCentralSyncState] = useState<CentralSyncState>(() => centralCloudStorage.getState());
  const [driveAuthState, setDriveAuthState] = useState<DriveAuthState>(() => googleDriveAuth.getAuthState());

  // Subscribe to central cloud storage state
  useEffect(() => {
    const unsubscribe = centralCloudStorage.subscribe((state) => {
      setCentralSyncState(state);
    });
    return unsubscribe;
  }, []);

  // Subscribe to in-memory Google Drive authentication state and attempt silent auto-reconnect on startup
  useEffect(() => {
    const unsubscribe = googleDriveAuth.subscribe((state) => {
      setDriveAuthState(state);
    });

    // Automatically restore Google Drive connection on app startup
    googleDriveAuth.autoReconnect().catch((err) => {
      console.log('[App] Drive auto-reconnect notice:', err?.message || err);
    });

    return unsubscribe;
  }, []);

  const connectDrive = useCallback(async (promptConsent = true) => {
    return await googleDriveAuth.requestAuthorization({
      prompt: promptConsent ? 'consent' : undefined,
    });
  }, []);

  const disconnectDrive = useCallback(async () => {
    await googleDriveAuth.signOut();
  }, []);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_USER,
          ...parsed,
          journalAwareAI: parsed.journalAwareAI ?? false,
        };
      }
      return INITIAL_USER;
    } catch {
      return INITIAL_USER;
    }
  });

  // Regular Tasks
  const [regularTasks, setRegularTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  // Low Energy Tasks
  const [lowEnergyTasks, setLowEnergyTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOW_TASKS);
      return saved ? JSON.parse(saved) : LOW_ENERGY_TASKS;
    } catch {
      return LOW_ENERGY_TASKS;
    }
  });

  // Journal
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOURNAL);
      return saved ? JSON.parse(saved) : INITIAL_JOURNAL_ENTRIES;
    } catch {
      return INITIAL_JOURNAL_ENTRIES;
    }
  });

  // Notes
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTES);
      return saved ? JSON.parse(saved) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch (err) {
      console.warn('Failed to save notes to localStorage:', err);
    }
  }, [notes]);

  // Memories (Managed persistently via IndexedDB for high-capacity photo storage)
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);

  useEffect(() => {
    let isMounted = true;
    getAllMemoriesFromDB()
      .then((stored) => {
        if (!isMounted) return;
        if (stored && stored.length > 0) {
          setMemories(stored);
        } else {
          // Seed IndexedDB with initial high-fidelity memories on first run
          saveMultipleMemoriesToDB(INITIAL_MEMORIES).catch((err) =>
            console.warn('Initial memories seeding error:', err)
          );
          setMemories(INITIAL_MEMORIES);
        }
      })
      .catch((err) => {
        console.warn('IndexedDB initial load error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadMemoriesFromDB = useCallback(async () => {
    try {
      const stored = await getAllMemoriesFromDB();
      if (stored && stored.length > 0) {
        setMemories(stored);
      }
    } catch (err) {
      console.warn('Failed to reload memories from IndexedDB:', err);
    }
  }, []);

  const refreshMemories = useCallback((updatedList: Memory[]) => {
    setMemories(updatedList);
  }, []);

  // Dreams
  const [dreams, setDreams] = useState<Dream[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DREAMS);
      return saved ? JSON.parse(saved) : INITIAL_DREAMS;
    } catch {
      return INITIAL_DREAMS;
    }
  });

  // Events
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  });

  // Future Letters
  const [futureLetters, setFutureLetters] = useState<FutureLetter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LETTERS);
      return saved ? JSON.parse(saved) : INITIAL_FUTURE_LETTERS;
    } catch {
      return INITIAL_FUTURE_LETTERS;
    }
  });

  // Flirt Corner Favorites
  const [flirtFavorites, setFlirtFavorites] = useState<FlirtFavorite[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLIRT_FAVORITES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Monday-Sunday Schedules
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      return saved ? JSON.parse(saved) : INITIAL_SCHEDULES;
    } catch {
      return INITIAL_SCHEDULES;
    }
  });

  // Little Joy Jar Entries
  const [joyEntries, setJoyEntries] = useState<JoyEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOY_ENTRIES);
      return saved ? JSON.parse(saved) : INITIAL_JOY_ENTRIES;
    } catch {
      return INITIAL_JOY_ENTRIES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOY_ENTRIES, JSON.stringify(joyEntries));
    } catch (err) {
      console.warn('Failed to save joy entries:', err);
    }
  }, [joyEntries]);

  const addJoyEntry = (entry: Omit<JoyEntry, 'id' | 'createdAt'>) => {
    const newEntry: JoyEntry = {
      ...entry,
      id: `joy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    setJoyEntries((prev) => [newEntry, ...prev]);
  };

  const updateJoyEntry = (id: string, updates: Partial<JoyEntry>) => {
    setJoyEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteJoyEntry = (id: string) => {
    setJoyEntries((prev) => prev.filter((item) => item.id !== id));
  };

  // Mood Garden Entries
  const [gardenEntries, setGardenEntries] = useState<GardenEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GARDEN_ENTRIES);
      return saved ? JSON.parse(saved) : INITIAL_GARDEN_ENTRIES;
    } catch {
      return INITIAL_GARDEN_ENTRIES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GARDEN_ENTRIES, JSON.stringify(gardenEntries));
    } catch (err) {
      console.warn('Failed to save garden entries:', err);
    }
  }, [gardenEntries]);

  const addGardenEntry = (entry: Omit<GardenEntry, 'id' | 'createdAt'>) => {
    const newEntry: GardenEntry = {
      ...entry,
      id: `garden-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    setGardenEntries((prev) => [newEntry, ...prev]);
  };

  const updateGardenEntry = (id: string, updates: Partial<GardenEntry>) => {
    setGardenEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteGardenEntry = (id: string) => {
    setGardenEntries((prev) => prev.filter((item) => item.id !== id));
  };

  // My Money Tracker Transactions & Budgets
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (err) {
      console.warn('Failed to save transactions:', err);
    }
  }, [transactions]);

  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORY_BUDGETS;
    } catch {
      return DEFAULT_CATEGORY_BUDGETS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(categoryBudgets));
    } catch (err) {
      console.warn('Failed to save budgets:', err);
    }
  }, [categoryBudgets]);

  const updateCategoryBudget = (category: string, monthlyLimit: number) => {
    setCategoryBudgets((prev) => ({
      ...prev,
      [category]: monthlyLimit,
    }));
  };

  // Reference for stable state access in sync listeners
  const stateRef = useRef({
    userProfile,
    regularTasks,
    lowEnergyTasks,
    journalEntries,
    notes,
    dreams,
    events,
    schedules,
    futureLetters,
    flirtFavorites,
    memories,
  });

  useEffect(() => {
    stateRef.current = {
      userProfile,
      regularTasks,
      lowEnergyTasks,
      journalEntries,
      notes,
      dreams,
      events,
      schedules,
      futureLetters,
      flirtFavorites,
      memories,
    };
  });

  // Register two-way sync callbacks
  useEffect(() => {
    syncService.setListeners({
      onProfileUpdated: (updated) => {
        setUserProfile((prev) => ({ ...prev, ...updated }));
      },
      onTasksUpdated: (cloudTasks) => {
        // Partition into low-energy and regular tasks
        const low = cloudTasks.filter((t) => t.isLowEnergyTask);
        const regular = cloudTasks.filter((t) => !t.isLowEnergyTask);
        setLowEnergyTasks(low);
        setRegularTasks(regular);
      },
      onJournalUpdated: (cloudJournal) => {
        setJournalEntries(cloudJournal);
      },
      onNotesUpdated: (cloudNotes) => {
        setNotes(cloudNotes);
      },
      onDreamsUpdated: (cloudDreams) => {
        setDreams(cloudDreams);
      },
      onLettersUpdated: (cloudLetters) => {
        setFutureLetters(cloudLetters);
      },
      onEventsUpdated: (cloudEvents) => {
        setEvents(cloudEvents);
      },
      onSchedulesUpdated: (cloudSchedules) => {
        setSchedules(cloudSchedules);
      },
      onFlirtFavoritesUpdated: (cloudFavs) => {
        setFlirtFavorites(cloudFavs);
      },
      onMemoriesMetaUpdated: (cloudMemories) => {
        // Safe metadata merge: preserves local imageSrc from IndexedDB
        setMemories((localMems) => {
          const localMap = new Map(localMems.map((m) => [m.id, m]));
          return cloudMemories.map((cloudItem) => {
            const local = localMap.get(cloudItem.id);
            return {
              ...cloudItem,
              imageSrc: local?.imageSrc || cloudItem.imageSrc,
            };
          });
        });
      },
      onFoldersUpdated: async (cloudFolders) => {
        try {
          await mergeRemoteFolders(
            cloudFolders,
            (id) => syncService.isFolderTombstoned(id) || syncService.isTombstoned(id)
          );
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mlw_storage_updated'));
          }
        } catch (e) {
          console.warn('[Sync] onFoldersUpdated error:', e);
        }
      },
      onFilesMetaUpdated: async (cloudFiles) => {
        try {
          await mergeRemoteFilesMetadata(
            cloudFiles,
            (id) => syncService.isTombstoned(id),
            (folderId) => syncService.isFolderTombstoned(folderId)
          );
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mlw_storage_updated'));
          }
        } catch (e) {
          console.warn('[Sync] onFilesMetaUpdated error:', e);
        }
      },
      onSyncStateChange: (state) => {
        setSyncState(state);
      },
    });
  }, []);

  // Initiate or stop cloud sync whenever authenticated user changes
  useEffect(() => {
    if (currentUser?.uid) {
      try {
        const lastUid = localStorage.getItem(STORAGE_KEYS.LAST_SYNCED_UID);
        if (lastUid && lastUid !== currentUser.uid) {
          // Different Firebase user: isolate by resetting local working state to clean profile
          // so we never silently merge another user's private data into this UID's Firestore
          console.info(
            `[Auth Isolation] User switch detected (${lastUid} -> ${currentUser.uid}). Local data isolated per UID.`
          );
        }
        localStorage.setItem(STORAGE_KEYS.LAST_SYNCED_UID, currentUser.uid);
      } catch (e) {
        console.warn('[Storage] Could not record last synced UID:', e);
      }

      syncService.startSync(currentUser.uid, {
        profile: stateRef.current.userProfile,
        tasks: [...stateRef.current.regularTasks, ...stateRef.current.lowEnergyTasks],
        journal: stateRef.current.journalEntries,
        notes: stateRef.current.notes,
        dreams: stateRef.current.dreams,
        letters: stateRef.current.futureLetters,
        events: stateRef.current.events,
        schedules: stateRef.current.schedules,
        flirtFavorites: stateRef.current.flirtFavorites,
        memories: stateRef.current.memories,
      });
    } else {
      syncService.stopSync();
    }
  }, [currentUser?.uid]);

  const triggerManualSync = useCallback(
    async (forcedUid?: string) => {
      const targetUid = forcedUid || currentUser?.uid;
      if (!targetUid) return;
      await syncService.startSync(
        targetUid,
        {
          profile: stateRef.current.userProfile,
          tasks: [...stateRef.current.regularTasks, ...stateRef.current.lowEnergyTasks],
          journal: stateRef.current.journalEntries,
          dreams: stateRef.current.dreams,
          letters: stateRef.current.futureLetters,
          events: stateRef.current.events,
          schedules: stateRef.current.schedules,
          flirtFavorites: stateRef.current.flirtFavorites,
          memories: stateRef.current.memories,
        },
        true // forceManual: bypasses active status check and immediately retries
      );
    },
    [currentUser?.uid]
  );

  // Persistence effects for metadata & text items
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userProfile));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [userProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(regularTasks));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [regularTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOW_TASKS, JSON.stringify(lowEnergyTasks));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [lowEnergyTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(journalEntries));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [journalEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DREAMS, JSON.stringify(dreams));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [dreams]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LETTERS, JSON.stringify(futureLetters));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [futureLetters]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FLIRT_FAVORITES, JSON.stringify(flirtFavorites));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [flirtFavorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    } catch (e) {
      console.warn('Storage unavailable', e);
    }
  }, [schedules]);

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const next = { ...prev, ...updates };
      syncService.syncProfileUpdate(next);
      return next;
    });
  };

  const toggleLowEnergyMode = () => {
    setUserProfile((prev) => {
      const next = { ...prev, lowEnergyMode: !prev.lowEnergyMode };
      syncService.syncProfileUpdate({ lowEnergyMode: next.lowEnergyMode });
      return next;
    });
  };

  const toggleJournalAwareAI = () => {
    setUserProfile((prev) => {
      const next = { ...prev, journalAwareAI: !prev.journalAwareAI };
      syncService.syncProfileUpdate({ journalAwareAI: next.journalAwareAI });
      return next;
    });
  };

  const setMood = (mood: MoodType) => {
    setUserProfile((prev) => {
      const next = { ...prev, currentMood: mood };
      syncService.syncProfileUpdate({ currentMood: mood });
      return next;
    });
  };

  // Currently active tasks based on Low Energy Mode
  const activeTaskList = userProfile.lowEnergyMode ? lowEnergyTasks : regularTasks;

  const addTask = (title: string, category: Task['category'] = 'gentle') => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: trimmed,
      category,
      completed: false,
      isLowEnergyTask: userProfile.lowEnergyMode,
      createdAt: new Date().toISOString(),
    };

    if (userProfile.lowEnergyMode) {
      setLowEnergyTasks((prev) => [newTask, ...prev]);
    } else {
      setRegularTasks((prev) => [newTask, ...prev]);
    }
    syncService.syncTaskUpsert(newTask);
  };

  const toggleTask = (id: string) => {
    if (userProfile.lowEnergyMode) {
      setLowEnergyTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, completed: !t.completed };
            syncService.syncTaskUpsert(updated);
            return updated;
          }
          return t;
        })
      );
    } else {
      setRegularTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, completed: !t.completed };
            syncService.syncTaskUpsert(updated);
            return updated;
          }
          return t;
        })
      );
    }
  };

  const deleteTask = (id: string) => {
    if (userProfile.lowEnergyMode) {
      setLowEnergyTasks((prev) => prev.filter((t) => t.id !== id));
    } else {
      setRegularTasks((prev) => prev.filter((t) => t.id !== id));
    }
    syncService.syncTaskDelete(id);
  };

  const addJournalEntry = (entry: Omit<JournalEntry, 'id'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: `journal-${Date.now()}`,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
    syncService.syncJournalUpsert(newEntry);
  };

  const updateJournalEntry = (id: string, updates: Partial<JournalEntry>) => {
    setJournalEntries((prev) =>
      prev.map((entry) => {
        if (entry.id === id) {
          const updated = { ...entry, ...updates };
          syncService.syncJournalUpsert(updated);
          return updated;
        }
        return entry;
      })
    );
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries((prev) => prev.filter((j) => j.id !== id));
    syncService.syncJournalDelete(id);
  };

  const togglePinJournalEntry = (id: string) => {
    setJournalEntries((prev) =>
      prev.map((j) => {
        if (j.id === id) {
          const updated = { ...j, isPinned: !j.isPinned };
          syncService.syncJournalUpsert(updated);
          return updated;
        }
        return j;
      })
    );
  };

  const addNote = (title: string, content: string): Note => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    syncService.syncNoteUpsert(newNote);
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      if (idx === -1) return prev;
      const updated = {
        ...prev[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      syncService.syncNoteUpsert(updated);
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    syncService.syncNoteDelete(id);
  };

  const togglePinNote = (id: string) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      if (idx === -1) return prev;
      const updated = {
        ...prev[idx],
        isPinned: !prev[idx].isPinned,
        updatedAt: new Date().toISOString(),
      };
      syncService.syncNoteUpsert(updated);
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  };

  // Single memory add with IndexedDB persistence
  const addMemory = async (memory: Omit<Memory, 'id'>) => {
    const newMem: Memory = {
      ...memory,
      id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: memory.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveMemoryToDB(newMem);
    setMemories((prev) => [newMem, ...prev]);
    syncService.syncMemoryMetaUpsert(newMem);
  };

  // Batch memory add with IndexedDB persistence
  const addMultipleMemories = async (newItems: Array<Omit<Memory, 'id'>>) => {
    const timestamp = Date.now();
    const created: Memory[] = newItems.map((item, idx) => ({
      ...item,
      id: `memory-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    await saveMultipleMemoriesToDB(created);
    setMemories((prev) => [...created, ...prev]);
    created.forEach((m) => syncService.syncMemoryMetaUpsert(m));
  };

  // Update memory caption, date, or notes with IndexedDB save
  const updateMemory = async (id: string, updates: Partial<Memory>) => {
    const existing = memories.find((m) => m.id === id);
    if (!existing) return;
    const updated: Memory = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await saveMemoryToDB(updated);
    setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
    syncService.syncMemoryMetaUpsert(updated);
  };

  // Delete memory with IndexedDB removal
  const deleteMemory = async (id: string) => {
    await deleteMemoryFromDB(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    syncService.syncMemoryDelete(id);
  };

  const addDream = (dream: Omit<Dream, 'id'>) => {
    const newDream: Dream = {
      ...dream,
      id: `dream-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: dream.status || 'Dreaming',
    };
    setDreams((prev) => [newDream, ...prev]);
    syncService.syncDreamUpsert(newDream);
  };

  const updateDream = (id: string, updates: Partial<Dream>) => {
    setDreams((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated = { ...d, ...updates };
          syncService.syncDreamUpsert(updated);
          return updated;
        }
        return d;
      })
    );
  };

  const deleteDream = (id: string) => {
    setDreams((prev) => prev.filter((d) => d.id !== id));
    syncService.syncDreamDelete(id);
  };

  const toggleDreamCompleted = (id: string) => {
    setDreams((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const isCompleted = d.status === 'Completed';
        const updated: Dream = {
          ...d,
          status: isCompleted ? 'In Progress' : 'Completed',
          progressPercent: isCompleted ? 50 : 100,
        };
        syncService.syncDreamUpsert(updated);
        return updated;
      })
    );
  };

  const addFutureLetter = (letter: Omit<FutureLetter, 'id' | 'createdAt'>) => {
    const newLetter: FutureLetter = {
      ...letter,
      id: `letter-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isSealed: letter.isSealed ?? true,
    };
    setFutureLetters((prev) => [newLetter, ...prev]);
    syncService.syncLetterUpsert(newLetter);
  };

  const updateFutureLetter = (id: string, updates: Partial<FutureLetter>) => {
    setFutureLetters((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, ...updates };
          syncService.syncLetterUpsert(updated);
          return updated;
        }
        return l;
      })
    );
  };

  const deleteFutureLetter = (id: string) => {
    setFutureLetters((prev) => prev.filter((l) => l.id !== id));
    syncService.syncLetterDelete(id);
  };

  const addEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEvents((prev) => [...prev, newEvent]);
    syncService.syncEventUpsert(newEvent);
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const updated: CalendarEvent = {
            ...e,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          syncService.syncEventUpsert(updated);
          return updated;
        }
        return e;
      })
    );
  };

  const snoozeEvent = (id: string, minutes: number) => {
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    updateEvent(id, { snoozedUntil });
  };

  const toggleEventCompleted = (id: string) => {
    const existing = events.find((e) => e.id === id);
    if (!existing) return;
    const isCompleted = !existing.isCompleted;
    updateEvent(id, {
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      snoozedUntil: undefined,
    });
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    syncService.syncEventDelete(id);
  };

  const isFlirtFavorite = useCallback(
    (lineId: string) => {
      return flirtFavorites.some((f) => f.lineId === lineId || f.id === lineId);
    },
    [flirtFavorites]
  );

  const addFlirtFavorite = (line: FlirtLine | FlirtFavorite, customNote?: string) => {
    const candidateId = (line as any).lineId || line.id;
    if (flirtFavorites.some((f) => f.lineId === candidateId || f.id === candidateId)) {
      return;
    }

    const newFav: FlirtFavorite = {
      id: `fav-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      lineId: candidateId,
      text: line.text,
      category: line.category as any,
      emoji: line.emoji || '💕',
      savedAt: new Date().toISOString(),
      customNote: customNote || (line as any).customNote,
      copiedCount: 0,
      updatedAt: new Date().toISOString(),
    };

    setFlirtFavorites((prev) => [newFav, ...prev]);
    syncService.syncFlirtFavoriteUpsert(newFav);
  };

  const removeFlirtFavorite = (idOrLineId: string) => {
    const target = flirtFavorites.find((f) => f.id === idOrLineId || f.lineId === idOrLineId);
    if (!target) return;
    setFlirtFavorites((prev) => prev.filter((f) => f.id !== target.id));
    syncService.syncFlirtFavoriteDelete(target.id);
  };

  const addSchedule = (schedule: Omit<ScheduleItem, 'id' | 'createdAt'>): ScheduleItem => {
    const newSchedule: ScheduleItem = {
      ...schedule,
      id: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSchedules((prev) => [...prev, newSchedule]);
    syncService.syncScheduleUpsert(newSchedule);
    return newSchedule;
  };

  const updateSchedule = (id: string, updates: Partial<ScheduleItem>) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated: ScheduleItem = {
            ...s,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          syncService.syncScheduleUpsert(updated);
          return updated;
        }
        return s;
      })
    );
  };

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    syncService.syncScheduleDelete(id);
  };

  const toggleScheduleCompletedToday = (id: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const dates = s.completedDates || [];
        const isDone = dates.includes(todayStr);
        const nextDates = isDone ? dates.filter((d) => d !== todayStr) : [...dates, todayStr];
        const updated: ScheduleItem = {
          ...s,
          completedDates: nextDates,
          updatedAt: new Date().toISOString(),
        };
        syncService.syncScheduleUpsert(updated);
        return updated;
      })
    );
  };

  // Centralized Cloud Storage (Google Drive backend) Auto-Sync
  const triggerCentralSync = useCallback(async () => {
    if (!currentUser) return false;
    const appState = {
      userProfile,
      tasks: [...regularTasks, ...lowEnergyTasks],
      journalEntries,
      notes,
      dreams,
      events,
      schedules,
      futureLetters,
      flirtFavorites,
      joyEntries,
      gardenEntries,
      transactions,
      categoryBudgets,
    };
    return await centralCloudStorage.triggerSync(appState);
  }, [
    currentUser,
    userProfile,
    regularTasks,
    lowEnergyTasks,
    journalEntries,
    notes,
    dreams,
    events,
    schedules,
    futureLetters,
    flirtFavorites,
    joyEntries,
    gardenEntries,
    transactions,
    categoryBudgets,
  ]);

  // Background auto-sync to centralized cloud storage on state changes
  useEffect(() => {
    if (!currentUser) return;
    const appState = {
      userProfile,
      tasks: [...regularTasks, ...lowEnergyTasks],
      journalEntries,
      notes,
      dreams,
      events,
      schedules,
      futureLetters,
      flirtFavorites,
      joyEntries,
      gardenEntries,
      transactions,
      categoryBudgets,
    };
    centralCloudStorage.queueSync(appState, 3000);
  }, [
    currentUser,
    userProfile,
    regularTasks,
    lowEnergyTasks,
    journalEntries,
    notes,
    dreams,
    events,
    schedules,
    futureLetters,
    flirtFavorites,
    joyEntries,
    gardenEntries,
    transactions,
    categoryBudgets,
  ]);

  const resetAllData = () => {
    setUserProfile(INITIAL_USER);
    setRegularTasks(INITIAL_TASKS);
    setLowEnergyTasks(LOW_ENERGY_TASKS);
    setJournalEntries(INITIAL_JOURNAL_ENTRIES);
    saveMultipleMemoriesToDB(INITIAL_MEMORIES).catch(console.warn);
    setMemories(INITIAL_MEMORIES);
    setDreams(INITIAL_DREAMS);
    setEvents(INITIAL_EVENTS);
    setSchedules(INITIAL_SCHEDULES);
    setFutureLetters(INITIAL_FUTURE_LETTERS);
    setFlirtFavorites([]);
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Storage clear error', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        userProfile,
        updateUserProfile,
        toggleLowEnergyMode,
        toggleJournalAwareAI,
        setMood,
        tasks: activeTaskList,
        addTask,
        toggleTask,
        deleteTask,
        journalEntries,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        togglePinJournalEntry,
        notes,
        addNote,
        updateNote,
        deleteNote,
        togglePinNote,
        memories,
        addMemory,
        addMultipleMemories,
        updateMemory,
        deleteMemory,
        dreams,
        addDream,
        updateDream,
        deleteDream,
        toggleDreamCompleted,
        futureLetters,
        addFutureLetter,
        updateFutureLetter,
        deleteFutureLetter,
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        snoozeEvent,
        toggleEventCompleted,
        schedules,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        toggleScheduleCompletedToday,
        flirtFavorites,
        addFlirtFavorite,
        removeFlirtFavorite,
        isFlirtFavorite,
        joyEntries,
        addJoyEntry,
        updateJoyEntry,
        deleteJoyEntry,
        gardenEntries,
        addGardenEntry,
        updateGardenEntry,
        deleteGardenEntry,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        categoryBudgets,
        updateCategoryBudget,
        quickActionModal,
        setQuickActionModal,
        syncState,
        triggerManualSync,
        centralSyncState,
        triggerCentralSync,
        driveAuthState,
        connectDrive,
        disconnectDrive,
        reloadMemoriesFromDB,
        refreshMemories,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
