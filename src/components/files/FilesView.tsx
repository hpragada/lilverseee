import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  File,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Lock,
  Download,
  Trash2,
  Edit3,
  Search,
  Grid,
  List,
  ArrowUpDown,
  Check,
  X,
  AlertCircle,
  HardDrive,
  UploadCloud,
  ChevronRight,
  Eye,
  Copy,
  Clock,
  ExternalLink,
  Shield,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FileItem, FolderItem } from '../../types';
import { syncService } from '../../firebase/syncService';
import {
  initFilesStorage,
  getAllFolders,
  getAllFiles,
  saveFolder,
  renameFolder,
  deleteFolderAndContents,
  saveMultipleFiles,
  renameFile,
  deleteFile,
  formatFileSize,
  readFileAsDataURL,
  triggerFileDownload,
} from '../../services/fileStorage';
import {
  backupFilesToDrive,
  restoreFilesFromDrive,
  BackupProgress,
  BackupSummary,
  googleDriveBackupQueue,
  QueueStatus,
} from '../../services/googleDriveBackup';

type SortField = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';

export const FilesView: React.FC = () => {
  const { setActiveTab, driveAuthState, connectDrive, disconnectDrive } = useApp();

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);

  // Google Drive Sync State
  const [syncProgress, setSyncProgress] = useState<BackupProgress | null>(null);
  const [syncSummary, setSyncSummary] = useState<BackupSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Automatic Queue State
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(() =>
    googleDriveBackupQueue.getQueueStatus()
  );

  useEffect(() => {
    // Subscribe to queue status changes
    const unsubscribe = googleDriveBackupQueue.subscribe((status) => {
      setQueueStatus(status);
    });

    // Auto-trigger on mount
    googleDriveBackupQueue.triggerBackupQueue();

    // Listen for manual auth/connection status changes to auto-start backing up
    const handleQueueCheck = () => {
      googleDriveBackupQueue.triggerBackupQueue();
    };

    window.addEventListener('mlw_backup_queue_updated', handleQueueCheck as any);
    return () => {
      unsubscribe();
      window.removeEventListener('mlw_backup_queue_updated', handleQueueCheck as any);
    };
  }, [driveAuthState.status]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [folderRenameInput, setFolderRenameInput] = useState('');

  const [deletingFolder, setDeletingFolder] = useState<FolderItem | null>(null);

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [fileRenameInput, setFileRenameInput] = useState('');
  const [deletingFile, setDeletingFile] = useState<FileItem | null>(null);

  const [copiedPreview, setCopiedPreview] = useState(false);

  // Handle Android back button for files view overlays
  useEffect(() => {
    const handleBack = (e: Event) => {
      if (previewFile) {
        setPreviewFile(null);
        e.preventDefault();
      } else if (showNewFolderModal) {
        setShowNewFolderModal(false);
        e.preventDefault();
      } else if (editingFolder) {
        setEditingFolder(null);
        e.preventDefault();
      } else if (deletingFolder) {
        setDeletingFolder(null);
        e.preventDefault();
      } else if (editingFile) {
        setEditingFile(null);
        e.preventDefault();
      } else if (deletingFile) {
        setDeletingFile(null);
        e.preventDefault();
      }
    };
    window.addEventListener('mlw_handle_back_button', handleBack);
    return () => window.removeEventListener('mlw_handle_back_button', handleBack);
  }, [previewFile, showNewFolderModal, editingFolder, deletingFolder, editingFile, deletingFile]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drive Backup / Sync Actions
  const handleBackupSingleFile = async (file: FileItem) => {
    if (driveAuthState.status !== 'connected') {
      try {
        await connectDrive(true);
      } catch (err) {
        setSyncError('Please connect your Google Drive account first.');
        return;
      }
    }

    setSyncError(null);
    setIsSyncing(true);
    setSyncSummary(null);
    setSyncProgress({
      phase: 'uploading',
      current: 1,
      total: 1,
      itemName: file.name,
      percent: 10,
      message: `Uploading "${file.name}" to Google Drive...`,
    });

    try {
      // Temporarily mark the file as syncing in local files array to trigger visual feedback
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, driveStatus: 'syncing' } : f))
      );
      if (previewFile?.id === file.id) {
        setPreviewFile((prev) => (prev ? { ...prev, driveStatus: 'syncing' } : null));
      }

      const summary = await backupFilesToDrive([file], (prog) => {
        setSyncProgress(prog);
      });

      if (summary.failed > 0) {
        setSyncError(summary.errors[0] || `Upload failed for ${file.name}`);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, driveStatus: 'error' } : f))
        );
        if (previewFile?.id === file.id) {
          setPreviewFile((prev) => (prev ? { ...prev, driveStatus: 'error' } : null));
        }
      } else {
        setSyncSummary(summary);
      }
      await refreshStorage();
      
      // Sync preview window state with fresh storage
      const updatedFiles = await getAllFiles();
      const updatedFile = updatedFiles.find((f) => f.id === file.id);
      if (updatedFile && previewFile?.id === file.id) {
        setPreviewFile(updatedFile);
      }
    } catch (err: any) {
      console.error('Failed to backup file:', err);
      setSyncError(err?.message || 'Failed to upload file to Google Drive.');
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, driveStatus: 'error' } : f))
      );
      if (previewFile?.id === file.id) {
        setPreviewFile((prev) => (prev ? { ...prev, driveStatus: 'error' } : null));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackupAllFiles = async () => {
    if (driveAuthState.status !== 'connected') {
      try {
        await connectDrive(true);
      } catch (err) {
        setSyncError('Please connect your Google Drive account first.');
        return;
      }
    }

    const localOnlyFiles = files.filter((f) => !f.driveFileId);

    if (localOnlyFiles.length === 0) {
      setSyncError('All your files are already backed up to Google Drive!');
      return;
    }

    setSyncError(null);
    setIsSyncing(true);
    setSyncSummary(null);

    try {
      // Mark local items as syncing
      setFiles((prev) =>
        prev.map((f) => (!f.driveFileId ? { ...f, driveStatus: 'syncing' } : f))
      );
      if (previewFile && !previewFile.driveFileId) {
        setPreviewFile((prev) => (prev ? { ...prev, driveStatus: 'syncing' } : null));
      }

      const summary = await backupFilesToDrive(localOnlyFiles, (prog) => {
        setSyncProgress(prog);
      });
      setSyncSummary(summary);
      await refreshStorage();

      // Refresh current preview file if open
      if (previewFile) {
        const updatedFiles = await getAllFiles();
        const updatedFile = updatedFiles.find((f) => f.id === previewFile.id);
        if (updatedFile) {
          setPreviewFile(updatedFile);
        }
      }
    } catch (err: any) {
      console.error('Failed bulk backup:', err);
      setSyncError(err?.message || 'Failed to backup files to Google Drive.');
      await refreshStorage();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreAllFiles = async () => {
    if (driveAuthState.status !== 'connected') {
      try {
        await connectDrive(true);
      } catch (err) {
        setSyncError('Please connect your Google Drive account first.');
        return;
      }
    }

    setSyncError(null);
    setIsSyncing(true);
    setSyncSummary(null);

    try {
      const summary = await restoreFilesFromDrive((prog) => {
        setSyncProgress(prog);
      });
      await refreshStorage();
      
      // Refresh current preview file if open
      if (previewFile) {
        const updatedFiles = await getAllFiles();
        const updatedFile = updatedFiles.find((f) => f.id === previewFile.id);
        if (updatedFile) {
          setPreviewFile(updatedFile);
        }
      }
    } catch (err: any) {
      console.error('Failed restoration:', err);
      setSyncError(err?.message || 'Failed to restore files from Google Drive.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Load from IndexedDB
  const refreshStorage = async () => {
    try {
      const data = await initFilesStorage();
      setFolders(data.folders);
      setFiles(data.files);
    } catch (err) {
      console.error('Failed to load files storage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStorage();
    const handleStorageUpdate = () => {
      refreshStorage();
    };
    window.addEventListener('mlw_storage_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('mlw_storage_updated', handleStorageUpdate);
    };
  }, []);

  // Current folder object
  const currentFolder = folders.find((f) => f.id === currentFolderId) || null;

  // Breadcrumbs path
  const getBreadcrumbs = (): FolderItem[] => {
    const crumbs: FolderItem[] = [];
    let cur = currentFolder;
    while (cur) {
      crumbs.unshift(cur);
      cur = cur.parentId ? folders.find((f) => f.id === cur?.parentId) || null : null;
    }
    return crumbs;
  };

  // Subfolders in current folder
  const currentSubfolders = folders.filter((f) =>
    currentFolderId === null ? f.parentId === null : f.parentId === currentFolderId
  );

  // Files in current folder
  const currentFiles = files.filter((f) =>
    currentFolderId === null ? f.folderId === 'root' || !f.folderId : f.folderId === currentFolderId
  );

  // Filtered & sorted files
  const filteredFiles = files
    .filter((file) => {
      if (searchQuery.trim()) {
        return file.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return currentFolderId === null
        ? file.folderId === 'root' || !file.folderId
        : file.folderId === currentFolderId;
    })
    .sort((a, b) => {
      let result = 0;
      if (sortField === 'name') {
        result = a.name.localeCompare(b.name);
      } else if (sortField === 'date') {
        result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'size') {
        result = a.size - b.size;
      } else if (sortField === 'type') {
        result = (a.extension || '').localeCompare(b.extension || '');
      }
      return sortOrder === 'asc' ? result : -result;
    });

  // Calculate storage stats
  const totalFilesCount = files.length;
  const totalSizeBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Handle Multi-file Upload
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const targetFolderId = currentFolderId || 'folder-documents';

    const newFiles: FileItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      try {
        const dataUrl = await readFileAsDataURL(f);
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: f.name,
          folderId: targetFolderId,
          size: f.size,
          mimeType: f.type || 'application/octet-stream',
          extension: ext,
          dataUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`Error reading ${f.name}:`, err);
      }
    }

    if (newFiles.length > 0) {
      await saveMultipleFiles(newFiles);
      const allF = await getAllFiles();
      setFiles(allF);
      newFiles.forEach((f) => syncService.syncFileMetaUpsert(f));
      // Trigger automatic backup queue
      googleDriveBackupQueue.triggerBackupQueue();
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newF: FolderItem = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newFolderName.trim(),
      parentId: currentFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#C0C0C0',
    };

    await saveFolder(newF);
    const updated = await getAllFolders();
    setFolders(updated);
    setNewFolderName('');
    setShowNewFolderModal(false);
    syncService.syncFolderUpsert(newF);
  };

  // Rename Folder
  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !folderRenameInput.trim()) return;
    await renameFolder(editingFolder.id, folderRenameInput.trim());
    const updated = await getAllFolders();
    setFolders(updated);
    const updatedF = updated.find((f) => f.id === editingFolder.id);
    if (updatedF) {
      syncService.syncFolderUpsert(updatedF);
    }
    setEditingFolder(null);
  };

  // Delete Folder
  const handleDeleteFolderConfirm = async () => {
    if (!deletingFolder) return;
    const targetFolderId = deletingFolder.id;
    const { deletedFolderIds, deletedFileIds } = await deleteFolderAndContents(targetFolderId);
    const [updatedFolders, updatedFiles] = await Promise.all([getAllFolders(), getAllFiles()]);
    setFolders(updatedFolders);
    setFiles(updatedFiles);
    if (currentFolderId === targetFolderId) {
      setCurrentFolderId(deletingFolder.parentId);
    }
    syncService.syncFolderDelete(targetFolderId, deletedFolderIds, deletedFileIds);
    setDeletingFolder(null);
  };

  // Rename File
  const handleRenameFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile || !fileRenameInput.trim()) return;
    await renameFile(editingFile.id, fileRenameInput.trim());
    const updated = await getAllFiles();
    setFiles(updated);
    const updatedFile = updated.find((f) => f.id === editingFile.id);
    if (updatedFile) {
      syncService.syncFileMetaUpsert(updatedFile);
      // Trigger automatic backup queue
      googleDriveBackupQueue.triggerBackupQueue();
    }
    setEditingFile(null);
  };

  // Delete File
  const handleDeleteFileConfirm = async () => {
    if (!deletingFile) return;
    const fileId = deletingFile.id;
    const folderId = deletingFile.folderId;
    await deleteFile(fileId);
    const updated = await getAllFiles();
    setFiles(updated);
    if (previewFile?.id === fileId) {
      setPreviewFile(null);
    }
    syncService.syncFileDelete(fileId, folderId);
    setDeletingFile(null);
  };

  // File Icon Selector
  const getFileIcon = (mimeType: string, ext: string) => {
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-[#C0C0C0]" />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-rose-400" />;
    }
    if (['doc', 'docx', 'txt', 'rtf', 'md', 'markdown'].includes(ext)) {
      return <FileText className="w-5 h-5 text-[#C0C0C0]" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-zinc-400" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'sh'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-teal-300" />;
    }
    return <File className="w-5 h-5 text-[#999999]" />;
  };

  // Safe file preview text extraction
  const getPreviewText = (dataUrl?: string): string => {
    if (!dataUrl) return '';
    try {
      if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(',');
        if (parts.length > 1) {
          return atob(parts[1]);
        }
      }
      return '';
    } catch {
      return 'Preview unavailable for this format. You can download the file to open it safely.';
    }
  };

  const isTextPreviewable = (ext: string, mime: string) => {
    return (
      ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'csv', 'py', 'sh', 'xml', 'yaml', 'yml'].includes(ext) ||
      mime.startsWith('text/')
    );
  };

  const isImagePreviewable = (ext: string, mime: string) => {
    return mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`max-w-6xl mx-auto px-4 sm:px-6 py-6 transition-colors ${
        isDragging ? 'bg-[#111111]/80 ring-2 ring-[#C0C0C0] rounded-3xl' : ''
      }`}
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#292929]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-light tracking-wide text-[#F5F5F5]">
              My Files
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0D0D0D] border border-[#292929] text-[#C0C0C0] font-light flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-[#C0C0C0]" />
              <span>IndexedDB Storage</span>
            </span>

            {/* Google Drive Status Badge / Connect Button */}
            {driveAuthState.status === 'connected' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  Drive: {driveAuthState.user?.email || 'Connected'}
                </span>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await disconnectDrive();
                  }}
                  className="text-emerald-400 hover:text-emerald-200 ml-1 text-[11px] underline cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : driveAuthState.status === 'expired' ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsConnectingDrive(true);
                    await connectDrive(true);
                  } finally {
                    setIsConnectingDrive(false);
                  }
                }}
                disabled={isConnectingDrive}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-950/70 border border-zinc-800/60 text-zinc-200 text-xs hover:bg-zinc-900/50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isConnectingDrive ? 'animate-spin' : ''}`} />
                <span>Drive Session Expired (Re-auth)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsConnectingDrive(true);
                    await connectDrive(true);
                  } catch (e) {
                    // Handled by auth manager error state
                  } finally {
                    setIsConnectingDrive(false);
                  }
                }}
                disabled={isConnectingDrive}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 text-[#999999] hover:text-[#F5F5F5] text-xs cursor-pointer transition-colors"
              >
                <Cloud className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span>{isConnectingDrive ? 'Connecting...' : 'Connect Google Drive'}</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#999999] font-light mt-1">
            Organize personal documents, certificates, code, and project files with quiet ease.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {driveAuthState.status === 'connected' && (
            <>
              <button
                onClick={handleRestoreAllFiles}
                disabled={isSyncing}
                title="Restore files previously backed up to Google Drive"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 text-[#F5F5F5] text-xs font-light flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-[#C0C0C0]" />
                <span>Restore from Drive</span>
              </button>

              <button
                onClick={handleBackupAllFiles}
                disabled={isSyncing}
                title="Backup all local files to your Google Drive folder"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Cloud className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Backup to Drive</span>
              </button>
            </>
          )}

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 text-[#F5F5F5] text-xs font-light flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-[#C0C0C0]" />
            <span>New Folder</span>
          </button>

          <label className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] hover:opacity-95 text-[#000000] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-[0_2px_12px_rgba(192,192,192,0.15)]">
            <UploadCloud className="w-4 h-4 text-[#000000]" />
            <span>Upload Files</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleUploadFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Storage Information Bar & Search Controls */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all files and folders..."
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

        {/* Sort & View Mode */}
        <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-2 text-xs font-light">
          {/* Storage stats badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] border border-[#292929] text-[#999999] text-[11px]">
            <HardDrive className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span>
              {totalFilesCount} files · {formatFileSize(totalSizeBytes)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#111111] border border-[#292929] rounded-xl p-1">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-xs text-[#F5F5F5] font-light px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="date" className="bg-[#0D0D0D]">Date</option>
              <option value="name" className="bg-[#0D0D0D]">Name</option>
              <option value="size" className="bg-[#0D0D0D]">Size</option>
              <option value="type" className="bg-[#0D0D0D]">Type</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              className="p-1 hover:text-[#F5F5F5] text-[#999999] rounded transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#111111] border border-[#292929] rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#0D0D0D] text-[#C0C0C0]' : 'text-[#999999]'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-[#0D0D0D] text-[#C0C0C0]' : 'text-[#999999]'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
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
          My Files
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

      {/* Automatic Google Drive Backup Status Indicator */}
      <div className="mt-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className={`w-3.5 h-3.5 ${queueStatus.isProcessing ? 'text-emerald-400 animate-pulse' : 'text-[#C0C0C0]'}`} />
            <span className="text-xs font-normal text-[#F5F5F5]">
              Drive Auto-Backup
            </span>
          </div>
          {queueStatus.pendingCount > 0 && (
            <span className="text-[10px] bg-[#292929] text-[#C0C0C0] px-2 py-0.2 rounded-full">
              {queueStatus.pendingCount} pending
            </span>
          )}
        </div>

        <div className="text-xs font-light text-[#999999] space-y-2">
          {/* Main Status Text */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
            <span>
              {queueStatus.isProcessing ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-normal">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  Automatically backing up…
                </span>
              ) : !navigator.onLine ? (
                <span className="text-zinc-400 flex items-center gap-1.5 font-normal">
                  <CloudOff className="w-3.5 h-3.5 text-zinc-400" />
                  Waiting for internet
                </span>
              ) : driveAuthState.status !== 'connected' ? (
                <span className="text-zinc-300 flex items-center gap-1.5 font-normal">
                  <CloudOff className="w-3.5 h-3.5 text-zinc-300" />
                  Waiting for Google Drive connection
                </span>
              ) : queueStatus.pendingCount > 0 ? (
                <span className="text-[#A8A8A8] flex items-center gap-1.5 font-normal">
                  <Cloud className="w-3.5 h-3.5 text-[#A8A8A8] animate-pulse" />
                  Backup queued
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1.5 font-normal">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Backed up to Google Drive
                </span>
              )}
            </span>
            <span className="text-[10px] text-[#999999]">
              Backup Account: <strong className="text-[#F5F5F5] font-normal">hpragada0508@gmail.com</strong>
            </span>
          </div>

          {/* Progress bar when actively uploading */}
          {queueStatus.isProcessing && (
            <div className="space-y-1 bg-[#111111] p-2.5 rounded-xl border border-[#292929]">
              <div className="flex items-center justify-between text-[11px] text-[#999999]">
                <span className="truncate max-w-[70%] text-[#F5F5F5]">
                  {queueStatus.currentFileName || 'Processing...'}
                </span>
                <span>{queueStatus.percent}%</span>
              </div>
              <div className="w-full bg-[#050505] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${queueStatus.percent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-emerald-300 font-light italic truncate">
                {queueStatus.message}
              </p>
            </div>
          )}

          {/* Success Summary if manual/automatic sync finished with items */}
          {syncSummary && !isSyncing && (
            <div className="text-xs font-light text-[#999999] space-y-1 bg-[#0D0D0D] p-2.5 rounded-xl border border-[#292929]">
              <p className="text-emerald-400 font-normal">
                Sync operation completed!
              </p>
              <p>
                Total items processed: <span className="text-[#F5F5F5] font-normal">{syncSummary.total}</span> ·
                Successful: <span className="text-emerald-400 font-normal">{syncSummary.successful}</span> ·
                Skipped: <span className="text-[#A8A8A8] font-normal">{syncSummary.skipped}</span> ·
                Failed: <span className="text-rose-400 font-normal">{syncSummary.failed}</span>
              </p>
            </div>
          )}

          {/* Queue Errors or Account Mismatch */}
          {(queueStatus.error || syncError) && (
            <div className="text-[11px] font-light text-rose-400 flex items-start gap-2 bg-rose-950/20 p-3 rounded-xl border border-rose-900/40">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-normal text-rose-300">Synchronization Alert</p>
                <p className="mt-0.5">{queueStatus.error || syncError}</p>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => {
                      googleDriveBackupQueue.triggerBackupQueue();
                    }}
                    className="text-xs font-medium text-rose-300 hover:text-rose-100 underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry Backup
                  </button>
                  {driveAuthState.status !== 'connected' && (
                    <button
                      onClick={() => connectDrive(true)}
                      className="text-xs font-medium text-[#C0C0C0] hover:text-[#F5F5F5] underline cursor-pointer"
                    >
                      Connect hpragada0508@gmail.com
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Folders Section (Only show when not actively searching) */}
      {!searchQuery && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-light uppercase tracking-wider text-[#999999]">
              Folders ({currentSubfolders.length + (currentFolderId === null ? 1 : 0)})
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Private Vault Folder Card - Always displayed at Root */}
            {currentFolderId === null && (
              <div
                onClick={() => setActiveTab('vault')}
                className="group p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#292929] hover:border-[#C0C0C0] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0]">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141414] text-[#C0C0C0] border border-[#292929]">
                    Encrypted
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-xs font-normal text-[#F5F5F5] group-hover:text-[#C0C0C0] transition-colors truncate">
                    Private Vault
                  </h3>
                  <p className="text-[11px] text-[#999999] font-light mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#C0C0C0]" /> Separate PIN Lock
                  </p>
                </div>
              </div>
            )}

            {/* Normal Folders */}
            {currentSubfolders.map((folder) => {
              const fileCount = files.filter((f) => f.folderId === folder.id).length;
              return (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="group p-3.5 rounded-2xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 transition-all cursor-pointer relative flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-[#141414] text-[#C0C0C0] border border-[#292929]"
                    >
                      <Folder className="w-4 h-4" />
                    </div>

                    {/* Context menu for custom folders */}
                    {!folder.isDefault && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <button
                          onClick={() => {
                            setEditingFolder(folder);
                            setFolderRenameInput(folder.name);
                          }}
                          className="p-1 hover:text-[#F5F5F5] text-[#999999] cursor-pointer"
                          title="Rename Folder"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingFolder(folder)}
                          className="p-1 hover:text-rose-400 text-[#999999] cursor-pointer"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <h3 className="text-xs font-light text-[#F5F5F5] group-hover:text-[#C0C0C0] transition-colors truncate">
                      {folder.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-[#999999] font-light mt-0.5">
                      <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
                      {folder.driveFolderId ? (
                        <span className="text-emerald-400 text-[10px] flex items-center gap-0.5" title="Folder synced in Google Drive">
                          <Cloud className="w-2.5 h-2.5" /> Synced
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-light uppercase tracking-wider text-[#999999]">
            {searchQuery ? `Search Results (${filteredFiles.length})` : `Files (${filteredFiles.length})`}
          </h2>
          {currentFolder && (
            <span className="text-[11px] text-[#999999] font-light">
              in {currentFolder.name}
            </span>
          )}
        </div>

        {/* Empty State */}
        {filteredFiles.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-[#0D0D0D] border border-dashed border-[#292929] my-4">
            <UploadCloud className="w-8 h-8 text-[#999999] mx-auto mb-2 opacity-50" />
            <p className="text-xs font-light text-[#F5F5F5]">No files here yet</p>
            <p className="text-[11px] text-[#999999] font-light mt-1 max-w-sm mx-auto">
              Drag and drop files from your computer or Android device, or click "Upload Files" to store documents, notes, or archives.
            </p>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {filteredFiles.map((file) => {
              const isImg = isImagePreviewable(file.extension, file.mimeType);
              return (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="group p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0D0D0D] hover:bg-[#161616] border border-[#292929] hover:border-[#C0C0C0]/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Thumbnail / Icon */}
                  <div className="w-full h-20 sm:h-28 rounded-lg sm:rounded-xl bg-[#050505] border border-[#292929]/60 flex items-center justify-center overflow-hidden relative">
                    {isImg && file.dataUrl ? (
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center p-2">
                        {getFileIcon(file.mimeType, file.extension)}
                        <span className="text-[10px] font-mono uppercase text-[#999999]">
                          .{file.extension || 'file'}
                        </span>
                      </div>
                    )}

                    {/* Quick Action Overlay */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#000000]/80 backdrop-blur-sm p-1 rounded-lg border border-[#292929]"
                    >
                      <button
                        onClick={() => triggerFileDownload(file.name, file.dataUrl || '')}
                        title="Download"
                        className="p-1 hover:text-[#C0C0C0] text-[#999999] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFile(file);
                          setFileRenameInput(file.name);
                        }}
                        title="Rename"
                        className="p-1 hover:text-[#F5F5F5] text-[#999999] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingFile(file)}
                        title="Delete"
                        className="p-1 hover:text-rose-400 text-[#999999] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-3">
                    <h3
                      className="text-xs font-light text-[#F5F5F5] truncate group-hover:text-[#C0C0C0] transition-colors"
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-[#999999] font-light mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      {file.driveFileId ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[10px]" title="Backed Up to Google Drive">
                          <Cloud className="w-3 h-3 text-emerald-400" /> Backed Up
                        </span>
                      ) : file.driveStatus === 'syncing' ? (
                        <span className="text-[#C0C0C0] flex items-center gap-1 text-[10px]">
                          <RefreshCw className="w-3 h-3 animate-spin text-[#C0C0C0]" /> Syncing
                        </span>
                      ) : file.driveStatus === 'error' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBackupSingleFile(file);
                          }}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[10px] cursor-pointer"
                          title="Backup failed. Click to retry."
                        >
                          <AlertCircle className="w-3 h-3 text-rose-400" /> Retry Backup
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBackupSingleFile(file);
                          }}
                          className="text-[#999999] hover:text-[#C0C0C0] flex items-center gap-1 text-[10px] bg-[#111111] hover:bg-[#161616] border border-[#292929] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          title="Backup this file to Google Drive"
                        >
                          <UploadCloud className="w-3 h-3 text-[#C0C0C0]" /> Local Only
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredFiles.length > 0 && (
          <div className="rounded-2xl border border-[#292929] bg-[#0D0D0D] overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-light text-[#999999] border-b border-[#292929] uppercase tracking-wider">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Format</div>
              <div className="col-span-2">Size & Sync</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-[#292929]">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="grid grid-cols-12 px-4 py-3 items-center text-xs font-light text-[#F5F5F5] hover:bg-[#161616] transition-colors cursor-pointer group"
                >
                  <div className="col-span-6 flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="shrink-0">{getFileIcon(file.mimeType, file.extension)}</div>
                    <span className="truncate group-hover:text-[#C0C0C0] transition-colors">
                      {file.name}
                    </span>
                  </div>

                  <div className="col-span-2 text-[11px] text-[#999999] uppercase font-mono truncate">
                    {file.extension || 'file'}
                  </div>

                  <div className="col-span-2 text-[11px] text-[#999999] flex items-center gap-2">
                    <span>{formatFileSize(file.size)}</span>
                    {file.driveFileId ? (
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1" title="Backed Up to Google Drive">
                        <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Backed Up</span>
                      </span>
                    ) : file.driveStatus === 'syncing' ? (
                      <span className="text-[#C0C0C0] text-[10px] flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C0C0C0]" />
                        <span className="hidden sm:inline">Syncing</span>
                      </span>
                    ) : file.driveStatus === 'error' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBackupSingleFile(file);
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-1 cursor-pointer"
                        title="Click to retry backup"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span className="hidden sm:inline">Failed</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBackupSingleFile(file);
                        }}
                        className="text-[#999999] hover:text-[#C0C0C0] text-[10px] flex items-center gap-1 bg-[#111111] hover:bg-[#161616] border border-[#292929] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title="Backup this file to Google Drive"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[#C0C0C0]" />
                        <span className="hidden sm:inline">Local Only</span>
                      </button>
                    )}
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="col-span-2 flex items-center justify-end gap-2 text-[#999999]"
                  >
                    <button
                      onClick={() => triggerFileDownload(file.name, file.dataUrl || '')}
                      title="Download"
                      className="p-1 hover:text-[#C0C0C0] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingFile(file);
                        setFileRenameInput(file.name);
                      }}
                      title="Rename"
                      className="p-1 hover:text-[#F5F5F5] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingFile(file)}
                      title="Delete"
                      className="p-1 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* Create Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <h3 className="text-sm font-normal text-[#F5F5F5]">Create New Folder</h3>
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
                  placeholder="e.g. Travel Memories, Tax 2026..."
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
                  className="px-4 py-1.5 text-xs bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] font-semibold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <h3 className="text-sm font-normal text-[#F5F5F5]">Rename Folder</h3>
              <button
                onClick={() => setEditingFolder(null)}
                className="text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameFolder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-light text-[#999999] mb-1">
                  New Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={folderRenameInput}
                  onChange={(e) => setFolderRenameInput(e.target.value)}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] font-semibold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation */}
      {deletingFolder && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-normal text-[#F5F5F5]">Delete Folder?</h3>
            </div>
            <p className="text-xs text-[#999999] font-light leading-relaxed">
              Are you sure you want to delete <strong className="text-[#F5F5F5]">"{deletingFolder.name}"</strong>? All files and subfolders inside it will also be deleted.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingFolder(null)}
                className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFolderConfirm}
                className="px-4 py-1.5 text-xs bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-colors cursor-pointer"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <h3 className="text-sm font-normal text-[#F5F5F5]">Rename File</h3>
              <button
                onClick={() => setEditingFile(null)}
                className="text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameFile} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-light text-[#999999] mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={fileRenameInput}
                  onChange={(e) => setFileRenameInput(e.target.value)}
                  className="w-full bg-[#141414] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] font-semibold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete File Confirmation */}
      {deletingFile && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D0D0D] border border-[#292929] p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-normal text-[#F5F5F5]">Delete File?</h3>
            </div>
            <p className="text-xs text-[#999999] font-light leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#F5F5F5]">"{deletingFile.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingFile(null)}
                className="px-3.5 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFileConfirm}
                className="px-4 py-1.5 text-xs bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-colors cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-[#0D0D0D] border border-[#292929] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#292929] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {getFileIcon(previewFile.mimeType, previewFile.extension)}
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-normal text-[#F5F5F5] truncate">
                    {previewFile.name}
                  </h3>
                  <p className="text-[11px] text-[#999999] font-light">
                    {formatFileSize(previewFile.size)} · {previewFile.mimeType}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => triggerFileDownload(previewFile.name, previewFile.dataUrl || '')}
                  className="px-3 py-1.5 rounded-xl bg-[#111111] hover:bg-[#161616] border border-[#292929] text-xs text-[#F5F5F5] font-light flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-[#999999] hover:text-[#F5F5F5] rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Storage & Drive Metadata bar */}
            <div className="px-5 py-2 bg-[#111111] border-b border-[#292929] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#999999] font-light">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-[#C0C0C0]" />
                IndexedDB Local Storage: Preserved
              </span>
              <div className="flex items-center gap-2">
                {previewFile.driveFileId ? (
                  <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" /> Backed Up to Google Drive
                  </span>
                ) : previewFile.driveStatus === 'syncing' ? (
                  <span className="text-[#C0C0C0] flex items-center gap-1 px-2 py-0.5 rounded-full">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#C0C0C0]" /> Syncing...
                  </span>
                ) : previewFile.driveStatus === 'error' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Backup Failed
                    </span>
                    <button
                      onClick={() => handleBackupSingleFile(previewFile)}
                      className="text-[#F5F5F5] hover:text-[#C0C0C0] underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#999999]">Local Only</span>
                    <button
                      onClick={() => handleBackupSingleFile(previewFile)}
                      className="px-2.5 py-0.5 rounded-full bg-[#141414] hover:bg-[#1A1A1A] text-[#C0C0C0] hover:text-[#F5F5F5] font-medium border border-[#292929] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <UploadCloud className="w-3 h-3 text-[#C0C0C0]" />
                      <span>Backup to Drive</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 min-h-[300px] flex items-center justify-center">
              {isImagePreviewable(previewFile.extension, previewFile.mimeType) ? (
                <div className="w-full h-full max-h-[70vh] flex items-center justify-center">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.name}
                    className="max-h-[65vh] max-w-full object-contain rounded-xl"
                  />
                </div>
              ) : isTextPreviewable(previewFile.extension, previewFile.mimeType) ? (
                <div className="w-full h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-[#999999]">Safe Text Viewer</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getPreviewText(previewFile.dataUrl));
                        setCopiedPreview(true);
                        setTimeout(() => setCopiedPreview(false), 2000);
                      }}
                      className="text-[11px] text-[#999999] hover:text-[#F5F5F5] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPreview ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPreview ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-[#000000] border border-[#292929] text-xs font-mono text-[#F5F5F5] whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto leading-relaxed">
                    {getPreviewText(previewFile.dataUrl)}
                  </pre>
                </div>
              ) : (
                <div className="text-center p-8 max-w-md">
                  <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#292929] flex items-center justify-center mx-auto mb-3">
                    {getFileIcon(previewFile.mimeType, previewFile.extension)}
                  </div>
                  <h4 className="text-sm font-normal text-[#F5F5F5]">Binary File Format</h4>
                  <p className="text-xs text-[#999999] font-light mt-1.5 leading-relaxed">
                    This file is stored safely. To inspect or edit proprietary formats like spreadsheets, archives, or presentations, download it directly to your device.
                  </p>
                  <button
                    onClick={() => triggerFileDownload(previewFile.name, previewFile.dataUrl || '')}
                    className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] text-xs font-semibold inline-flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {previewFile.name}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
