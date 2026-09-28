import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  File,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Download,
  Trash2,
  Edit3,
  Search,
  Check,
  X,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
  UploadCloud,
  FilePlus,
  Settings as SettingsIcon,
  Tag,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  VaultConfig,
  VaultDecryptedItem,
  VaultEncryptedRecord,
  VaultItemType,
} from '../../types';
import {
  setupVaultCredentials,
  verifyVaultPIN,
  encryptVaultItem,
  decryptVaultRecord,
  rekeyVault,
} from '../../services/vaultCrypto';
import {
  getVaultConfig,
  saveVaultConfig,
  getAllVaultEncryptedRecords,
  saveVaultEncryptedRecord,
  saveMultipleVaultRecords,
  deleteVaultEncryptedRecord,
  formatFileSize,
  readFileAsDataURL,
  triggerFileDownload,
} from '../../services/fileStorage';

export const VaultView: React.FC = () => {
  // Vault Meta State
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<VaultDecryptedItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Setup / Unlock Inputs
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Current folder inside vault
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'note' | 'file' | 'folder'>('all');

  // Modals inside vault
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<VaultDecryptedItem | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTagInput, setNoteTagInput] = useState('');

  const [previewItem, setPreviewItem] = useState<VaultDecryptedItem | null>(null);
  const [editingItemName, setEditingItemName] = useState<VaultDecryptedItem | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deletingItem, setDeletingItem] = useState<VaultDecryptedItem | null>(null);

  // Vault Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [autoLockDuration, setAutoLockDuration] = useState<number>(5);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Inactivity Auto-Lock
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  // Lock Now handler
  const handleLockNow = useCallback(() => {
    setIsUnlocked(false);
    setCryptoKey(null);
    setDecryptedItems([]);
    setPinInput('');
    setAuthError(null);
    setPreviewItem(null);
    setShowNoteModal(false);
    setShowSettingsModal(false);
  }, []);

  // Fetch initial Vault configuration from IndexedDB
  useEffect(() => {
    async function loadConfig() {
      try {
        const storedConfig = await getVaultConfig();
        if (storedConfig && storedConfig.isConfigured) {
          setConfig(storedConfig);
          setIsConfigured(true);
          setAutoLockDuration(storedConfig.autoLockMinutes || 5);
        } else {
          setIsConfigured(false);
        }
      } catch (err) {
        console.error('Failed to load vault config:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  // Inactivity auto-lock listener
  useEffect(() => {
    if (!isUnlocked || !config) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));

    const intervalMinutes = config.autoLockMinutes || 5;
    const maxInactiveMs = intervalMinutes * 60 * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const leftMs = Math.max(0, maxInactiveMs - elapsed);
      setSecondsRemaining(Math.ceil(leftMs / 1000));

      if (elapsed >= maxInactiveMs) {
        handleLockNow();
      }
    }, 1000);

    timerRef.current = interval;

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetActivity));
      clearInterval(interval);
    };
  }, [isUnlocked, config, handleLockNow]);

  // First-time Vault Setup
  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (pinInput.length < 4) {
      setAuthError('PIN or password must be at least 4 characters.');
      return;
    }

    if (pinInput !== confirmPinInput) {
      setAuthError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsUnlocking(true);
      const { config: newCfg, key } = await setupVaultCredentials(pinInput, 5);
      await saveVaultConfig(newCfg);
      setConfig(newCfg);
      setIsConfigured(true);
      setCryptoKey(key);
      setIsUnlocked(true);
      setDecryptedItems([]);
      setPinInput('');
      setConfirmPinInput('');
    } catch (err) {
      console.error('Setup failed:', err);
      setAuthError('Encryption setup failed. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Unlock Vault
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !pinInput) return;
    setAuthError(null);
    setIsUnlocking(true);

    try {
      const key = await verifyVaultPIN(pinInput, config);
      if (!key) {
        setAuthError('Incorrect PIN or password. Access denied.');
        setIsUnlocking(false);
        return;
      }

      setCryptoKey(key);

      // Decrypt stored records in memory
      const records = await getAllVaultEncryptedRecords();
      const items: VaultDecryptedItem[] = [];
      for (const rec of records) {
        const dec = await decryptVaultRecord(rec, key);
        if (dec) items.push(dec);
      }

      setDecryptedItems(items);
      setIsUnlocked(true);
      setPinInput('');
      lastActivityRef.current = Date.now();
      setSecondsRemaining((config.autoLockMinutes || 5) * 60);
    } catch (err) {
      console.error('Unlock error:', err);
      setAuthError('Decryption error. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Save / Update Decrypted Item (Encrypts and saves to DB)
  const saveAndEncryptItem = async (item: VaultDecryptedItem) => {
    if (!cryptoKey) return;
    const record = await encryptVaultItem(item, cryptoKey);
    await saveVaultEncryptedRecord(record);

    setDecryptedItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = item;
        return copy;
      }
      return [...prev, item];
    });
  };

  // Create Vault Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const folderItem: VaultDecryptedItem = {
      id: `v_folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newFolderName.trim(),
      itemType: 'folder',
      folderId: currentFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveAndEncryptItem(folderItem);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  // Save / Update Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const tags = noteTagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const now = new Date().toISOString();
    const noteItem: VaultDecryptedItem = editingNote
      ? {
          ...editingNote,
          name: noteTitle.trim(),
          content: noteContent,
          tags,
          updatedAt: now,
        }
      : {
          id: `v_note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: noteTitle.trim(),
          itemType: 'note',
          folderId: currentFolderId,
          content: noteContent,
          tags,
          createdAt: now,
          updatedAt: now,
        };

    await saveAndEncryptItem(noteItem);
    setShowNoteModal(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTagInput('');
  };

  // Upload Encrypted Files to Vault
  const handleUploadVaultFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !cryptoKey) return;

    const newRecords: VaultEncryptedRecord[] = [];
    const newItems: VaultDecryptedItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      try {
        const dataUrl = await readFileAsDataURL(f);
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        const item: VaultDecryptedItem = {
          id: `v_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`,
          name: f.name,
          itemType: 'file',
          folderId: currentFolderId,
          mimeType: f.type || 'application/octet-stream',
          extension: ext,
          size: f.size,
          content: dataUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const encRecord = await encryptVaultItem(item, cryptoKey);
        newRecords.push(encRecord);
        newItems.push(item);
      } catch (err) {
        console.error(`Vault file encryption error for ${f.name}:`, err);
      }
    }

    if (newRecords.length > 0) {
      await saveMultipleVaultRecords(newRecords);
      setDecryptedItems((prev) => [...prev, ...newItems]);
    }
  };

  // Delete Vault Item
  const handleDeleteItemConfirm = async () => {
    if (!deletingItem) return;

    // If deleting folder, also delete child items
    const idsToDelete = new Set<string>([deletingItem.id]);
    if (deletingItem.itemType === 'folder') {
      let addedMore = true;
      while (addedMore) {
        addedMore = false;
        for (const item of decryptedItems) {
          if (item.folderId && idsToDelete.has(item.folderId) && !idsToDelete.has(item.id)) {
            idsToDelete.add(item.id);
            addedMore = true;
          }
        }
      }
    }

    for (const id of idsToDelete) {
      await deleteVaultEncryptedRecord(id);
    }

    setDecryptedItems((prev) => prev.filter((i) => !idsToDelete.has(i.id)));
    if (previewItem && idsToDelete.has(previewItem.id)) {
      setPreviewItem(null);
    }
    setDeletingItem(null);
  };

  // Rename Vault Item
  const handleRenameConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemName || !renameInput.trim() || !cryptoKey) return;

    const updated: VaultDecryptedItem = {
      ...editingItemName,
      name: renameInput.trim(),
      updatedAt: new Date().toISOString(),
    };

    await saveAndEncryptItem(updated);
    setEditingItemName(null);
    setRenameInput('');
  };

  // Change PIN / Auto-lock Settings
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSettingsMessage(null);

    // If updating auto-lock only
    if (!oldPinInput && !newPinInput) {
      const updatedConfig: VaultConfig = {
        ...config,
        autoLockMinutes: autoLockDuration,
      };
      await saveVaultConfig(updatedConfig);
      setConfig(updatedConfig);
      setSettingsMessage({ type: 'success', text: 'Auto-lock duration updated successfully.' });
      return;
    }

    if (newPinInput.length < 4) {
      setSettingsMessage({ type: 'error', text: 'New PIN/password must be at least 4 characters.' });
      return;
    }

    if (newPinInput !== confirmNewPinInput) {
      setSettingsMessage({ type: 'error', text: 'New PIN/passwords do not match.' });
      return;
    }

    try {
      const { newConfig, newRecords, newKey } = await rekeyVault(
        oldPinInput,
        newPinInput,
        { ...config, autoLockMinutes: autoLockDuration },
        decryptedItems
      );

      await saveVaultConfig(newConfig);
      await saveMultipleVaultRecords(newRecords);

      setConfig(newConfig);
      setCryptoKey(newKey);
      setOldPinInput('');
      setNewPinInput('');
      setConfirmNewPinInput('');
      setSettingsMessage({ type: 'success', text: 'Vault PIN successfully updated and re-encrypted!' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err?.message || 'Failed to update credentials.' });
    }
  };

  // Breadcrumbs
  const currentFolder = decryptedItems.find((i) => i.id === currentFolderId) || null;
  const getBreadcrumbs = (): VaultDecryptedItem[] => {
    const crumbs: VaultDecryptedItem[] = [];
    let cur = currentFolder;
    while (cur) {
      crumbs.unshift(cur);
      cur = cur.folderId ? decryptedItems.find((i) => i.id === cur?.folderId) || null : null;
    }
    return crumbs;
  };

  // Sub-items
  const currentItems = decryptedItems.filter((i) => {
    if (searchQuery.trim()) {
      const matchesSearch =
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.content && i.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.tags && i.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      if (!matchesSearch) return false;
    } else {
      if (currentFolderId === null) {
        if (i.folderId !== null && i.folderId !== undefined) return false;
      } else {
        if (i.folderId !== currentFolderId) return false;
      }
    }

    if (filterType !== 'all') {
      if (i.itemType !== filterType) return false;
    }
    return true;
  });

  const foldersList = currentItems.filter((i) => i.itemType === 'folder');
  const notesList = currentItems.filter((i) => i.itemType === 'note');
  const filesList = currentItems.filter((i) => i.itemType === 'file');

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loadingConfig) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-6 h-6 text-[#C0C0C0] animate-spin mx-auto mb-3" />
        <p className="text-xs text-[#999999] font-light">Loading secure sanctuary...</p>
      </div>
    );
  }

  // ================= LOCKED SCREEN =================
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="rounded-3xl bg-[#0D0D0D] border border-[#292929] p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
          {/* Subtle glow effect */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#C0C0C0]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Shield Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#292929] flex items-center justify-center mx-auto mb-4 text-[#C0C0C0] shadow-inner">
            <Shield className="w-7 h-7" />
          </div>

          <h1 className="text-xl sm:text-2xl font-light tracking-wide text-[#F5F5F5]">
            {isConfigured ? 'Private Vault' : 'Setup Private Vault'}
          </h1>

          <p className="text-xs text-[#999999] font-light mt-2 leading-relaxed">
            {isConfigured
              ? 'Your private files and notes are encrypted with client-side AES-256 GCM. Enter your PIN or password to unlock.'
              : 'Create a dedicated PIN or password. All vault items will be encrypted locally using browser Web Crypto before storage.'}
          </p>

          {/* Form */}
          <form
            onSubmit={isConfigured ? handleUnlock : handleInitialSetup}
            className="mt-6 space-y-4 text-left"
          >
            <div>
              <label className="block text-xs font-light text-[#999999] mb-1.5">
                {isConfigured ? 'Vault PIN / Password' : 'Choose Vault PIN / Password'}
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder={isConfigured ? 'Enter your PIN or password' : 'Min 4 characters or digits'}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isConfigured && (
              <div>
                <label className="block text-xs font-light text-[#999999] mb-1.5">
                  Confirm Vault PIN / Password
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="Re-enter your PIN or password"
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>
            )}

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full min-h-[42px] mt-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity cursor-pointer shadow-[0_2px_12px_rgba(192,192,192,0.15)] disabled:opacity-50"
            >
              {isUnlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#000000]" />
                  <span>Decrypting Vault...</span>
                </>
              ) : isConfigured ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Vault</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Initialize & Lock Vault</span>
                </>
              )}
            </button>
          </form>

          {/* Security Badge */}
          <div className="mt-6 pt-5 border-t border-[#292929] flex items-center justify-center gap-2 text-[11px] text-[#999999] font-light">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span>Web Crypto PBKDF2 (100k) · AES-GCM 256</span>
          </div>
        </div>
      </div>
    );
  }

  // ================= UNLOCKED VAULT =================
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#292929]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-light tracking-wide text-[#F5F5F5]">
              Private Vault
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-light flex items-center gap-1">
              <Unlock className="w-3 h-3" /> Unlocked
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#999999] font-light mt-1">
            Zero-knowledge encrypted storage. Notes and files decrypt in browser memory only.
          </p>
        </div>

        {/* Top Controls: Auto-lock countdown + Lock Now + Settings */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto lock timer indicator */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D0D0D] border border-[#292929] text-xs font-light text-[#999999]"
            title="Auto-locks when idle"
          >
            <Clock className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span>Auto-lock: {formatTimer(secondsRemaining)}</span>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] text-[#999999] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            title="Vault Security Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          <button
            onClick={handleLockNow}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-light flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Now</span>
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decrypted vault items..."
            className="w-full bg-[#141414] border border-[#292929] rounded-xl pl-9 pr-8 py-2 text-xs font-light text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Buttons: Folder, Note, Upload */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Pills */}
          <div className="flex items-center bg-[#111111] border border-[#292929] rounded-xl p-1 text-xs">
            {(['all', 'note', 'file', 'folder'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  filterType === t
                    ? 'bg-[#0D0D0D] text-[#C0C0C0] font-normal border border-[#292929]'
                    : 'text-[#999999] hover:text-[#F5F5F5]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-3 py-2 rounded-xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] text-xs font-light text-[#F5F5F5] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span>Folder</span>
          </button>

          <button
            onClick={() => {
              setEditingNote(null);
              setNoteTitle('');
              setNoteContent('');
              setNoteTagInput('');
              setShowNoteModal(true);
            }}
            className="px-3 py-2 rounded-xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] text-xs font-light text-[#F5F5F5] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span>Private Note</span>
          </button>

          <label className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] hover:opacity-95 text-[#000000] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
            <UploadCloud className="w-3.5 h-3.5 text-[#000000]" />
            <span>Encrypt & Upload</span>
            <input
              ref={fileUploadInputRef}
              type="file"
              multiple
              onChange={(e) => handleUploadVaultFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="mt-4 flex items-center gap-1.5 text-xs text-[#999999] overflow-x-auto py-1">
        <button
          onClick={() => {
            setCurrentFolderId(null);
            setSearchQuery('');
          }}
          className={`hover:text-[#F5F5F5] transition-colors whitespace-nowrap cursor-pointer ${
            currentFolderId === null ? 'text-[#F5F5F5] font-normal' : ''
          }`}
        >
          Vault Root
        </button>

        {getBreadcrumbs().map((folder, index, arr) => (
          <React.Fragment key={folder.id}>
            <ChevronRight className="w-3.5 h-3.5 text-[#292929] shrink-0" />
            <button
              onClick={() => {
                setCurrentFolderId(folder.id);
                setSearchQuery('');
              }}
              className={`hover:text-[#F5F5F5] transition-colors whitespace-nowrap cursor-pointer ${
                index === arr.length - 1 ? 'text-[#F5F5F5] font-normal' : ''
              }`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Empty State */}
      {currentItems.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-[#0D0D0D] border border-dashed border-[#292929] my-6">
          <Shield className="w-10 h-10 text-[#999999] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-normal text-[#F5F5F5]">Your Vault is Empty</h3>
          <p className="text-xs text-[#999999] font-light mt-1.5 max-w-sm mx-auto leading-relaxed">
            Create an encrypted folder, write a private note (passwords, journals, finances), or upload personal documents.
          </p>
        </div>
      )}

      {/* Folders Section */}
      {foldersList.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-light uppercase tracking-wider text-[#999999] mb-3">
            Vault Folders ({foldersList.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {foldersList.map((folder) => {
              const childCount = decryptedItems.filter((i) => i.folderId === folder.id).length;
              return (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="group p-3.5 rounded-2xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#141414] text-[#C0C0C0] border border-[#292929] flex items-center justify-center">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        onClick={() => {
                          setEditingItemName(folder);
                          setRenameInput(folder.name);
                        }}
                        className="p-1 text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(folder)}
                        className="p-1 text-[#999999] hover:text-rose-400 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xs font-light text-[#F5F5F5] truncate group-hover:text-[#C0C0C0]">
                      {folder.name}
                    </h3>
                    <p className="text-[11px] text-[#999999] font-light mt-0.5">
                      {childCount} {childCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Private Notes Section */}
      {notesList.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-light uppercase tracking-wider text-[#999999] mb-3">
            Encrypted Notes ({notesList.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {notesList.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setEditingNote(note);
                  setNoteTitle(note.name);
                  setNoteContent(note.content || '');
                  setNoteTagInput((note.tags || []).join(', '));
                  setShowNoteModal(true);
                }}
                className="group p-4 rounded-2xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141414] text-[#C0C0C0] border border-[#292929] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Note
                    </span>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        onClick={() => setDeletingItem(note)}
                        className="p-1 text-[#999999] hover:text-rose-400 cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xs font-normal text-[#F5F5F5] group-hover:text-[#C0C0C0] transition-colors truncate">
                    {note.name}
                  </h3>

                  <p className="text-[11px] text-[#999999] font-light mt-1.5 line-clamp-3 leading-relaxed">
                    {note.content || '(Empty note)'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#292929] flex items-center justify-between text-[10px] text-[#999999]">
                  <div className="flex items-center gap-1 flex-wrap">
                    {note.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#292929]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span>
                    {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encrypted Files Section */}
      {filesList.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-light uppercase tracking-wider text-[#999999] mb-3">
            Encrypted Files ({filesList.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filesList.map((file) => {
              const isImg = file.mimeType?.startsWith('image/') || false;
              return (
                <div
                  key={file.id}
                  onClick={() => setPreviewItem(file)}
                  className="group p-3.5 rounded-2xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="w-full h-28 rounded-xl bg-[#141414] border border-[#292929]/60 flex items-center justify-center overflow-hidden relative">
                    {isImg && file.content ? (
                      <img
                        src={file.content}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center p-2">
                        <FileText className="w-6 h-6 text-[#C0C0C0]" />
                        <span className="text-[10px] font-mono uppercase text-[#999999]">
                          .{file.extension || 'file'}
                        </span>
                      </div>
                    )}

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#000000]/80 backdrop-blur-sm p-1 rounded-lg border border-[#292929]"
                    >
                      <button
                        onClick={() => triggerFileDownload(file.name, file.content || '')}
                        title="Download Decrypted"
                        className="p-1 hover:text-[#C0C0C0] text-[#999999] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItemName(file);
                          setRenameInput(file.name);
                        }}
                        title="Rename"
                        className="p-1 hover:text-[#F5F5F5] text-[#999999] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(file)}
                        title="Delete"
                        className="p-1 hover:text-rose-400 text-[#999999] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-xs font-light text-[#F5F5F5] truncate group-hover:text-[#C0C0C0]">
                      {file.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-[#999999] font-light mt-1">
                      <span>{formatFileSize(file.size || 0)}</span>
                      <span>
                        {new Date(file.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Create Vault Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <h3 className="text-sm font-normal text-[#F5F5F5]">New Encrypted Folder</h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-light text-[#999999] mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Bank Statements, Legal, Secret Project..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#C0C0C0] hover:bg-[#E8E8E8] text-[#000000] font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#0D0D0D] border border-[#292929] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-[#292929] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C0C0C0]" />
                <h3 className="text-sm font-normal text-[#F5F5F5]">
                  {editingNote ? 'Edit Private Note' : 'Create Encrypted Note'}
                </h3>
              </div>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-5 flex-1 flex flex-col space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-light text-[#999999] mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Master Passwords, Confidential Strategy..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#999999] mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. finances, private, security"
                  value={noteTagInput}
                  onChange={(e) => setNoteTagInput(e.target.value)}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div className="flex-1 flex flex-col min-h-[220px]">
                <label className="block text-xs font-light text-[#999999] mb-1">
                  Secret Content
                </label>
                <textarea
                  required
                  placeholder="Type anything safely. This is encrypted before being stored..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full flex-1 min-h-[200px] bg-[#141414] border border-[#292929] rounded-2xl p-3.5 text-xs text-[#F5F5F5] font-mono leading-relaxed placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#292929]">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-[#C0C0C0] hover:bg-[#E8E8E8] text-[#000000] font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Encrypt & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-[#0D0D0D] border border-[#292929] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-[#292929] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Lock className="w-4 h-4 text-[#C0C0C0] shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-normal text-[#F5F5F5] truncate">
                    {previewItem.name}
                  </h3>
                  <p className="text-[11px] text-[#999999] font-light">
                    Decrypted in memory · {formatFileSize(previewItem.size || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => triggerFileDownload(previewItem.name, previewItem.content || '')}
                  className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#292929] text-xs text-[#F5F5F5] font-light flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-[#999999] hover:text-[#F5F5F5] rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 min-h-[300px] flex items-center justify-center">
              {previewItem.mimeType?.startsWith('image/') ? (
                <img
                  src={previewItem.content}
                  alt={previewItem.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-xl"
                />
              ) : previewItem.itemType === 'note' ? (
                <div className="w-full">
                  <pre className="p-4 rounded-2xl bg-[#000000] border border-[#292929] text-xs font-mono text-[#F5F5F5] whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto leading-relaxed">
                    {previewItem.content}
                  </pre>
                </div>
              ) : (
                <div className="text-center p-8 max-w-md">
                  <FileText className="w-10 h-10 text-[#C0C0C0] mx-auto mb-3" />
                  <h4 className="text-sm font-normal text-[#F5F5F5]">Decrypted Binary File</h4>
                  <p className="text-xs text-[#999999] font-light mt-1.5 leading-relaxed">
                    Download this file to your device to inspect and open it securely with native applications.
                  </p>
                  <button
                    onClick={() => triggerFileDownload(previewItem.name, previewItem.content || '')}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#C0C0C0] hover:bg-[#E8E8E8] text-[#000000] text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {previewItem.name}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename Item Modal */}
      {editingItemName && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <h3 className="text-sm font-normal text-[#F5F5F5]">Rename Item</h3>
              <button
                onClick={() => setEditingItemName(null)}
                className="text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameConfirm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-light text-[#999999] mb-1">
                  New Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItemName(null)}
                  className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#C0C0C0] hover:bg-[#E8E8E8] text-[#000000] font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-normal text-[#F5F5F5]">Delete Vault Item?</h3>
            </div>
            <p className="text-xs text-[#999999] font-light leading-relaxed">
              Are you sure you want to permanently destroy <strong className="text-[#F5F5F5]">"{deletingItem.name}"</strong>? This encrypted data cannot be recovered.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItemConfirm}
                className="px-4 py-1.5 text-xs bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-colors cursor-pointer"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vault Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D0D0D] border border-[#292929] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-[#C0C0C0]" />
                <h3 className="text-sm font-normal text-[#F5F5F5]">Vault Security Settings</h3>
              </div>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setSettingsMessage(null);
                }}
                className="text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeCredentials} className="mt-4 space-y-4">
              {/* Inactivity duration setting */}
              <div>
                <label className="block text-xs font-light text-[#999999] mb-1.5">
                  Auto-Lock Inactivity Period
                </label>
                <select
                  value={autoLockDuration}
                  onChange={(e) => setAutoLockDuration(Number(e.target.value))}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] font-light focus:outline-none focus:border-[#C0C0C0] cursor-pointer"
                >
                  <option value={1} className="bg-[#0D0D0D]">1 Minute</option>
                  <option value={5} className="bg-[#0D0D0D]">5 Minutes (Recommended)</option>
                  <option value={15} className="bg-[#0D0D0D]">15 Minutes</option>
                  <option value={30} className="bg-[#0D0D0D]">30 Minutes</option>
                </select>
              </div>

              <div className="pt-2 border-t border-[#292929]">
                <h4 className="text-xs font-medium text-[#F5F5F5] mb-2">Change Vault PIN / Password</h4>
                <p className="text-[11px] text-[#999999] font-light mb-3">
                  Re-encrypts all items under your new key using PBKDF2 & AES-256 GCM. Leave blank if only changing timer.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-[#999999] mb-1">Current PIN / Password</label>
                    <input
                      type="password"
                      value={oldPinInput}
                      onChange={(e) => setOldPinInput(e.target.value)}
                      placeholder="Verify existing credentials"
                      className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#999999] mb-1">New PIN / Password</label>
                    <input
                      type="password"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="Min 4 characters"
                      className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#999999] mb-1">Confirm New PIN / Password</label>
                    <input
                      type="password"
                      value={confirmNewPinInput}
                      onChange={(e) => setConfirmNewPinInput(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                    />
                  </div>
                </div>
              </div>

              {settingsMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    settingsMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}
                >
                  {settingsMessage.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{settingsMessage.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#292929]">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    setSettingsMessage(null);
                  }}
                  className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#C0C0C0] hover:bg-[#E8E8E8] text-[#000000] font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
