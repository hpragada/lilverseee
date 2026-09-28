/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  ArrowLeft,
  Check,
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Note } from '../../types';

type ViewMode = 'list' | 'view' | 'edit' | 'create';

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, togglePinNote } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for creating / editing
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);

  // Delete modal state
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Active note currently being viewed or edited
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.isPinned),
    [filteredNotes]
  );

  const unpinnedNotes = useMemo(
    () => filteredNotes.filter((n) => !n.isPinned),
    [filteredNotes]
  );

  // Handlers
  const handleStartCreate = () => {
    setEditTitle('');
    setEditContent('');
    setEditIsPinned(false);
    setSelectedNoteId(null);
    setViewMode('create');
  };

  const handleStartEdit = (note: Note) => {
    setSelectedNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditIsPinned(!!note.isPinned);
    setViewMode('edit');
  };

  const handleOpenNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setViewMode('view');
  };

  const handleSaveNote = () => {
    const trimmedTitle = editTitle.trim() || 'Untitled Note';
    if (viewMode === 'create') {
      const created = addNote(trimmedTitle, editContent);
      if (editIsPinned) {
        togglePinNote(created.id);
      }
      setSelectedNoteId(created.id);
      setViewMode('view');
    } else if (viewMode === 'edit' && selectedNoteId) {
      updateNote(selectedNoteId, {
        title: trimmedTitle,
        content: editContent,
        isPinned: editIsPinned,
      });
      setViewMode('view');
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const ConfirmDeleteModal = () => {
    if (!noteToDelete) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-sm rounded-3xl bg-[#0E0E0E] border border-[#222222] p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="p-2.5 rounded-2xl bg-rose-950/40 border border-rose-800/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#F5F5F5]">Delete Note?</h3>
              <p className="text-[11px] text-[#808080]">This action cannot be undone.</p>
            </div>
          </div>

          <p className="text-xs text-[#C0C0C0] font-light bg-[#141414] p-3 rounded-2xl border border-[#222222] truncate font-mono">
            "{noteToDelete.title}"
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNoteToDelete(null)}
              className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] text-xs text-[#808080] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                deleteNote(noteToDelete.id);
                setNoteToDelete(null);
                if (selectedNoteId === noteToDelete.id) {
                  setSelectedNoteId(null);
                  setViewMode('list');
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-900 border border-rose-800 text-xs text-white font-medium transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Editor Mode (Create / Edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 animate-in fade-in duration-300 bg-[#000000] text-[#F5F5F5]">
        {ConfirmDeleteModal()}

        {/* Editor Top Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <button
            type="button"
            onClick={() => setViewMode(selectedNoteId ? 'view' : 'list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#222222] text-xs text-[#808080] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditIsPinned(!editIsPinned)}
              className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                editIsPinned
                  ? 'bg-[#C0C0C0]/20 border-[#C0C0C0]/50 text-[#FFFFFF]'
                  : 'bg-[#141414] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{editIsPinned ? 'Pinned' : 'Pin'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveNote}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs font-medium flex items-center gap-1.5 shadow-[0_0_14px_rgba(212,175,55,0.25)] hover:scale-102 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </div>

        {/* Note Editor Fields */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#0A0A0A] border border-[#222222] shadow-xl space-y-4 backdrop-blur-xl">
          <input
            type="text"
            placeholder="Note Title..."
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-transparent text-lg sm:text-xl font-medium text-[#F5F5F5] placeholder-[#808080] focus:outline-none border-b border-[#222222] pb-3"
            autoFocus
          />

          <textarea
            placeholder="Write your thoughts, memos, lists, or gentle reflections here..."
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={14}
            className="w-full bg-transparent text-sm text-[#F5F5F5]/90 placeholder-[#808080]/60 leading-relaxed focus:outline-none resize-none selection:bg-[#C0C0C0]/20"
          />
        </div>
      </div>
    );
  }

  // Render Note Detail / View Mode
  if (viewMode === 'view' && selectedNote) {
    return (
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 animate-in fade-in duration-300 bg-[#000000] text-[#F5F5F5]">
        {ConfirmDeleteModal()}

        {/* Detail Top Navigation */}
        <div className="flex items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#222222] hover:border-[#C0C0C0]/40 text-xs text-[#808080] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Notes</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePinNote(selectedNote.id)}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                selectedNote.isPinned
                  ? 'bg-[#C0C0C0]/20 border-[#C0C0C0]/50 text-[#FFFFFF]'
                  : 'bg-[#141414] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
              }`}
              title={selectedNote.isPinned ? 'Unpin Note' : 'Pin Note'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleStartEdit(selectedNote)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#C0C0C0]/35 text-xs text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => setNoteToDelete(selectedNote)}
              className="p-2 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300 hover:bg-rose-900/40 transition-colors cursor-pointer"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Saved Note Card Display */}
        <div className="p-5 sm:p-8 rounded-3xl bg-[#0A0A0A] border border-[#222222] shadow-xl space-y-5 backdrop-blur-xl relative overflow-hidden">
          <div className="space-y-2 border-b border-[#222222] pb-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-lg sm:text-2xl font-normal text-[#F5F5F5] tracking-tight">
                {selectedNote.title}
              </h1>
              {selectedNote.isPinned && (
                <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 text-[#C0C0C0] text-[10px] font-medium flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  Pinned
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-[#808080] font-light">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span>Created {formatDate(selectedNote.createdAt)}</span>
              </div>
              {selectedNote.updatedAt && selectedNote.updatedAt !== selectedNote.createdAt && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span>Updated {formatDate(selectedNote.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Note Body */}
          <div className="text-sm text-[#F5F5F5]/90 leading-relaxed whitespace-pre-wrap min-h-[160px] selection:bg-[#C0C0C0]/20">
            {selectedNote.content || (
              <span className="italic text-[#808080]/60">This note is empty.</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Notes List View (Default)
  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 animate-in fade-in duration-300 pb-24 md:pb-12 bg-[#000000] text-[#F5F5F5]">
      {ConfirmDeleteModal()}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#111111] via-[#0D0D0D] to-[#080808] border border-[#C0C0C0]/25 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0]">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-normal text-[#F5F5F5] tracking-wide">
              My Notes
            </h1>
            <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
          </div>
          <p className="text-xs text-[#808080] font-light">
            Your private thoughts, quiet memos, and gentle ideas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartCreate}
          className="relative z-10 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs font-medium shadow-[0_0_16px_rgba(212,175,55,0.25)] hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Note</span>
        </button>
      </div>

      {/* Search Bar */}
      {notes.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#808080] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search in notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#0A0A0A] border border-[#222222] text-xs text-[#F5F5F5] placeholder-[#808080] focus:outline-none focus:border-[#C0C0C0]/50 backdrop-blur-md"
          />
        </div>
      )}

      {/* Notes Stream Cards */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#0A0A0A] border border-[#222222] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] mx-auto">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-normal text-[#F5F5F5]">
            {searchQuery ? 'No matching notes found' : 'No notes written yet'}
          </h3>
          <p className="text-xs text-[#808080] font-light max-w-sm mx-auto">
            Capture thoughts, gentle inspirations, or personal checklists anytime.
          </p>
          <div className="pt-2">
            <button
              onClick={handleStartCreate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs font-medium cursor-pointer shadow-sm"
            >
              Write First Note ✦
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 px-1">
                <Pin className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span className="text-[11px] font-medium text-[#C0C0C0] uppercase tracking-wider">
                  Pinned Notes
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pinnedNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => handleOpenNote(note)}
                    className="group p-4 rounded-2xl bg-[#0E0E0E] border border-[#C0C0C0]/30 hover:border-[#C0C0C0]/60 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 relative overflow-hidden"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-normal text-[#F5F5F5] group-hover:text-[#C0C0C0] transition-colors truncate">
                          {note.title}
                        </h3>
                        <Pin className="w-3 h-3 text-[#C0C0C0] shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-[#808080] font-light line-clamp-2 leading-relaxed">
                        {note.content || 'Empty note...'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#222222] flex items-center justify-between text-[10px] text-[#808080] font-light">
                      <span>{formatDate(note.createdAt)}</span>
                      <span className="text-[#C0C0C0] group-hover:translate-x-1 transition-transform">
                        Read →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All / Unpinned Notes Section */}
          <div className="space-y-2.5">
            {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
              <span className="text-[11px] font-light text-[#808080] uppercase tracking-wider px-1 block">
                Other Notes
              </span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unpinnedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleOpenNote(note)}
                  className="group p-4 rounded-2xl bg-[#0A0A0A] border border-[#222222] hover:border-[#C0C0C0]/40 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 backdrop-blur-md"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-normal text-[#F5F5F5] group-hover:text-[#C0C0C0] transition-colors truncate">
                      {note.title}
                    </h3>
                    <p className="text-xs text-[#808080] font-light line-clamp-2 leading-relaxed">
                      {note.content || 'Empty note...'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#222222] flex items-center justify-between text-[10px] text-[#808080] font-light">
                    <span>{formatDate(note.createdAt)}</span>
                    <span className="text-[#C0C0C0] group-hover:translate-x-1 transition-transform">
                      Read →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
