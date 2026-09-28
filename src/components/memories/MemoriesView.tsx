/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Calendar,
  MapPin,
  Trash2,
  X,
  Plus,
  Check,
  Search,
  Edit3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  History,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Memory } from '../../types';
import { processImageFile } from '../../services/photoStorage';
import { CameraCaptureModal, CapturedPhotoPayload } from '../common/CameraCaptureModal';

interface StagedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  caption: string;
  date: string;
  location: string;
  category: string;
}

export const MemoriesView: React.FC = () => {
  const {
    memories,
    addMultipleMemories,
    updateMemory,
    deleteMemory,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox / Full-screen Viewer with Next/Prev
  const [selectedMemoryIndex, setSelectedMemoryIndex] = useState<number | null>(null);

  // Edit Memory Details State
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSaveNotice, setEditSaveNotice] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Upload & Staging state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Common staging date & location
  const todayStr = new Date().toISOString().split('T')[0];
  const [batchDate] = useState(todayStr);
  const [batchLocation] = useState('Personal Sanctuary');
  const [batchCategory] = useState('Quiet Moments');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  useEffect(() => {
    const handleBack = (e: Event) => {
      if (selectedMemoryIndex !== null) {
        setSelectedMemoryIndex(null);
        e.preventDefault();
      }
    };
    window.addEventListener('mlw_handle_back_button', handleBack);
    return () => window.removeEventListener('mlw_handle_back_button', handleBack);
  }, [selectedMemoryIndex]);

  const [randomDiscovered, setRandomDiscovered] = useState<Memory | null>(null);

  const startCamera = () => {
    setIsCameraModalOpen(true);
  };

  const handleCameraSave = async (payload: CapturedPhotoPayload) => {
    try {
      const res = await fetch(payload.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `moment-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const { dataUrl, width, height } = await processImageFile(file);
      const newMemory: Memory = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: payload.title || `Moment ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        caption: payload.caption || 'A quiet, unhurried instant captured in your sanctuary.',
        date: payload.date || new Date().toISOString().split('T')[0],
        location: payload.location || 'Personal Sanctuary',
        category: payload.category || 'Quiet Moments',
        imageSrc: dataUrl,
        aspect: width >= height ? 'landscape' : 'portrait',
        createdAt: new Date().toISOString(),
      };

      addMultipleMemories([newMemory]);
    } catch (err: any) {
      console.warn('Optimized processing fallback:', err);
      const newMemory: Memory = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: payload.title || `Moment ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        caption: payload.caption || 'A quiet, unhurried instant captured in your sanctuary.',
        date: payload.date || new Date().toISOString().split('T')[0],
        location: payload.location || 'Personal Sanctuary',
        category: payload.category || 'Quiet Moments',
        imageSrc: payload.dataUrl,
        aspect: 'landscape',
        createdAt: new Date().toISOString(),
      };
      addMultipleMemories([newMemory]);
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newStaged: StagedPhoto[] = [];
    Array.from(files).forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      newStaged.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl,
        title: cleanTitle || 'Cherished Moment',
        caption: 'A treasured moment in your sanctuary.',
        date: batchDate,
        location: batchLocation,
        category: batchCategory,
      });
    });

    setStagedPhotos((prev) => [...prev, ...newStaged]);
    setIsUploadModalOpen(true);
  };

  const removeStagedPhoto = (id: string) => {
    setStagedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleConfirmUpload = async () => {
    if (stagedPhotos.length === 0) return;
    setIsProcessing(true);

    try {
      const processedList: Memory[] = [];

      for (const staged of stagedPhotos) {
        const { dataUrl, width, height } = await processImageFile(staged.file);
        const newMemory: Memory = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: staged.title || 'Cherished Moment',
          caption: staged.caption || 'A treasured moment in your sanctuary.',
          date: staged.date || batchDate,
          location: staged.location || batchLocation,
          category: staged.category || batchCategory,
          imageSrc: dataUrl,
          aspect: width >= height ? 'landscape' : 'portrait',
          createdAt: new Date().toISOString(),
        };
        processedList.push(newMemory);
      }

      addMultipleMemories(processedList);

      stagedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setStagedPhotos([]);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      console.error('Failed to process photos:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickRandomMemory = () => {
    if (memories.length === 0) return;
    const randomIndex = Math.floor(Math.random() * memories.length);
    setRandomDiscovered(memories[randomIndex]);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ['All', ...Array.from(set)];
  }, [memories]);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.caption && m.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [memories, selectedCategory, searchQuery]);

  const onThisDayMemories = useMemo(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const targetPattern = `-${mm}-${dd}`;

    return memories.filter((m) => {
      return m.date && m.date.includes(targetPattern);
    });
  }, [memories]);

  const handleOpenEdit = (memory: Memory) => {
    setEditingMemory(memory);
    setEditTitle(memory.title);
    setEditCaption(memory.caption || '');
    setEditDate(memory.date || '');
    setEditLocation(memory.location || '');
    setEditCategory(memory.category || 'Quiet Moments');
    setEditSaveNotice(null);
  };

  const handleSaveEdit = () => {
    if (!editingMemory) return;
    updateMemory(editingMemory.id, {
      title: editTitle.trim() || 'Untitled Moment',
      caption: editCaption.trim(),
      date: editDate,
      location: editLocation.trim(),
      category: editCategory.trim(),
    });
    setEditSaveNotice('Memory saved ✦');
    setTimeout(() => {
      setEditingMemory(null);
      setEditSaveNotice(null);
    }, 600);
  };

  const handleDeleteMemoryConfirm = (id: string) => {
    deleteMemory(id);
    setConfirmDeleteId(null);
    if (selectedMemoryIndex !== null) {
      setSelectedMemoryIndex(null);
    }
  };

  const activeLightboxMemory =
    selectedMemoryIndex !== null && filteredMemories[selectedMemoryIndex]
      ? filteredMemories[selectedMemoryIndex]
      : null;

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6 animate-in fade-in duration-300 select-none pb-24 md:pb-12 bg-[#000000] text-[#F5F5F5]">
      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* 1. Header & Capture Bar (Luxury Pure Black & Gold Banner) */}
      <div className="relative rounded-[2rem] bg-gradient-to-br from-[#111111] via-[#0D0D0D] to-[#080808] border border-[#C0C0C0]/30 p-5 sm:p-7 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#C0C0C0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#D9D9D9]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-light text-[#C0C0C0] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span>Visual Scrapbook</span>
              <span>·</span>
              <span className="text-[#C0C0C0]">{memories.length} moments</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-light text-[#F5F5F5] tracking-tight">
              My Life in Little Moments
            </h1>
            <p className="text-xs sm:text-sm font-light text-[#C0C0C0] leading-relaxed max-w-xl">
              Little moments, timeless memories. Collecting life's quiet treasures and unhurried snapshots in your private sanctuary.
            </p>
          </div>

          {/* Quick Capture Pill (Take Photo / Upload) */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={startCamera}
              disabled={isProcessing}
              className="min-h-[40px] px-4 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#D9D9D9] to-[#A6A6A6] text-[#000000] text-xs font-medium flex items-center gap-2 shadow-[0_0_16px_rgba(212,175,55,0.25)] hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-[#000000]" />
              <span>Take Photo</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="min-h-[40px] px-4 rounded-xl bg-[#141414] border border-[#262626] hover:border-[#C0C0C0]/40 text-[#F5F5F5] text-xs font-light flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-[#C0C0C0]" />
              <span>Upload Photos</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Rediscovery & On-This-Day Capsules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* On This Day */}
        {onThisDayMemories.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#222222] flex items-center gap-3 relative overflow-hidden backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-[#C0C0C0] font-medium block">
                On This Day in Past Years 🌿
              </span>
              <p className="text-xs text-[#F5F5F5] font-normal truncate mt-0.5">
                {onThisDayMemories[0].title}
              </p>
              <p className="text-[10px] text-[#808080] font-light truncate">
                {onThisDayMemories[0].date}
              </p>
            </div>
            <button
              onClick={() => {
                const idx = filteredMemories.findIndex((m) => m.id === onThisDayMemories[0].id);
                setSelectedMemoryIndex(idx >= 0 ? idx : 0);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] text-xs font-light text-[#F5F5F5] cursor-pointer shrink-0"
            >
              View
            </button>
          </div>
        )}

        {/* Random Rediscovery */}
        <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#222222] flex items-center gap-3 relative overflow-hidden backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] shrink-0">
            <Shuffle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-[#C0C0C0] font-medium block">
              Remember this moment? ✦
            </span>
            <p className="text-xs text-[#F5F5F5] font-normal truncate mt-0.5">
              {randomDiscovered ? randomDiscovered.title : 'Tap to rediscover a moment'}
            </p>
            <p className="text-[10px] text-[#808080] font-light truncate">
              {randomDiscovered ? randomDiscovered.date : 'A gentle look back'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {randomDiscovered && (
              <button
                onClick={() => {
                  const idx = filteredMemories.findIndex((m) => m.id === randomDiscovered.id);
                  setSelectedMemoryIndex(idx >= 0 ? idx : 0);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#141414] border border-[#222222] text-xs font-light text-[#F5F5F5] cursor-pointer"
              >
                View
              </button>
            )}
            <button
              onClick={handlePickRandomMemory}
              disabled={memories.length === 0}
              className="px-3 py-1.5 rounded-xl bg-[#C0C0C0]/20 hover:bg-[#C0C0C0]/30 border border-[#C0C0C0]/40 text-[#FFFFFF] text-xs font-medium cursor-pointer disabled:opacity-40"
            >
              Discover
            </button>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
        {/* Category Scroll Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] font-medium shadow-sm'
                  : 'bg-[#121212] text-[#808080] hover:text-[#F5F5F5] border border-[#222222]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#808080] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search moments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-48 pl-8 pr-3 py-1 rounded-xl bg-[#121212] border border-[#222222] text-xs text-[#F5F5F5] placeholder-[#808080] focus:outline-none focus:border-[#C0C0C0]/50"
          />
        </div>
      </div>

      {/* 4. VISUALLY STUNNING EDITORIAL PHOTO COLLAGE & MASONRY GALLERY */}
      {filteredMemories.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#0A0A0A] border border-[#222222] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] mx-auto shadow-sm">
            <Camera className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-normal text-[#F5F5F5]">No moments captured in this space</h3>
            <p className="text-xs text-[#808080] font-light max-w-sm mx-auto">
              Capture a live photo or upload memories from your device to enrich your personal scrapbook.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2.5">
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs font-medium cursor-pointer shadow-sm"
            >
              Take First Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-[#141414] border border-[#222222] text-[#F5F5F5] text-xs font-light cursor-pointer"
            >
              Upload Photo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Featured Hero Moment */}
          {filteredMemories.length > 0 && (
            <div
              onClick={() => setSelectedMemoryIndex(0)}
              className="group relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-[2rem] overflow-hidden border border-[#222222] hover:border-[#C0C0C0]/50 shadow-xl cursor-pointer bg-[#0A0A0A] transition-all duration-300"
            >
              <img
                src={filteredMemories[0].imageSrc}
                alt={filteredMemories[0].title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />

              {/* Floating Badges */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-black/75 backdrop-blur-md border border-[#C0C0C0]/30 text-[#C0C0C0]">
                  Featured Memory ✦
                </span>
                {filteredMemories[0].category && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-light bg-black/60 backdrop-blur-md border border-white/10 text-[#F5F5F5]">
                    {filteredMemories[0].category}
                  </span>
                )}
              </div>

              {/* Edit trigger */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(filteredMemories[0]);
                }}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Edit caption"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 space-y-1">
                <div className="flex items-center gap-3 text-xs text-[#C0C0C0] font-light">
                  <span>{filteredMemories[0].date}</span>
                  {filteredMemories[0].location && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#C0C0C0]" />
                        <span>{filteredMemories[0].location}</span>
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-base sm:text-xl font-normal text-white group-hover:text-[#FFFFFF] tracking-tight">
                  {filteredMemories[0].title}
                </h2>
                {filteredMemories[0].caption && (
                  <p className="text-xs text-white/80 font-light line-clamp-1 max-w-xl">
                    {filteredMemories[0].caption}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Staggered Photo Grid */}
          {filteredMemories.length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
              {filteredMemories.slice(1).map((memory, sliceIdx) => {
                const actualIndex = sliceIdx + 1;
                const isTall = actualIndex % 5 === 0;
                const isWide = actualIndex % 7 === 0;

                return (
                  <div
                    key={memory.id}
                    onClick={() => setSelectedMemoryIndex(actualIndex)}
                    className={`group relative rounded-2xl overflow-hidden border border-[#222222] hover:border-[#C0C0C0]/45 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-[#0A0A0A] flex flex-col ${
                      isTall ? 'aspect-[3/4] sm:row-span-2' : isWide ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
                    }`}
                  >
                    <img
                      src={memory.imageSrc}
                      alt={memory.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-light bg-black/70 backdrop-blur-md border border-[#C0C0C0]/25 text-[#C0C0C0]">
                        {memory.category || 'Moments'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(memory);
                      }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <p className="text-xs font-normal text-white truncate drop-shadow-sm">
                        {memory.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#C0C0C0] font-light mt-0.5">
                        <span>{memory.date}</span>
                        {memory.location && (
                          <span className="truncate max-w-[90px] text-white/70">
                            {memory.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. FULL-SCREEN IMMERSIVE LIGHTBOX VIEWER */}
      {activeLightboxMemory && selectedMemoryIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
          {selectedMemoryIndex > 0 && (
            <button
              onClick={() => setSelectedMemoryIndex(selectedMemoryIndex - 1)}
              className="absolute left-3 sm:left-6 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/15 transition-all cursor-pointer"
              title="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {selectedMemoryIndex < filteredMemories.length - 1 && (
            <button
              onClick={() => setSelectedMemoryIndex(selectedMemoryIndex + 1)}
              className="absolute right-3 sm:right-6 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/15 transition-all cursor-pointer"
              title="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0A0A0A] border border-[#222222] rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-2xl">
            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px]">
              <img
                src={activeLightboxMemory.imageSrc}
                alt={activeLightboxMemory.title}
                className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain"
              />
            </div>

            <div className="w-full md:w-80 p-5 sm:p-6 bg-[#0E0E0E] border-t md:border-t-0 md:border-l border-[#222222] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 text-[#C0C0C0]">
                    {activeLightboxMemory.category || 'Quiet Moments'}
                  </span>
                  <button
                    onClick={() => setSelectedMemoryIndex(null)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-normal text-[#F5F5F5]">
                    {activeLightboxMemory.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#808080] font-light mt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#C0C0C0]" />
                    <span>{activeLightboxMemory.date}</span>
                  </div>
                  {activeLightboxMemory.location && (
                    <div className="flex items-center gap-2 text-xs text-[#808080] font-light mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#C0C0C0]" />
                      <span>{activeLightboxMemory.location}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#C0C0C0] font-light leading-relaxed pt-2 border-t border-[#222222]">
                  {activeLightboxMemory.caption || 'No caption written.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#222222]">
                <button
                  onClick={() => handleOpenEdit(activeLightboxMemory)}
                  className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] text-xs text-[#F5F5F5] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span>Edit Details</span>
                </button>

                <button
                  onClick={() => setConfirmDeleteId(activeLightboxMemory.id)}
                  className="w-10 h-[38px] rounded-xl bg-rose-950/20 hover:bg-rose-900/40 border border-rose-900/40 text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Edit Details Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0A0A0A] border border-[#222222] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="text-sm font-medium text-[#F5F5F5]">Edit Memory Details</h3>
              <button
                onClick={() => setEditingMemory(null)}
                className="text-[#808080] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[#808080] font-light block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#808080] font-light block mb-1">Caption / Notes</label>
                <textarea
                  rows={3}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#808080] font-light block mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#808080] font-light block mb-1">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
              </div>
            </div>

            {editSaveNotice && (
              <p className="text-xs text-[#C0C0C0] font-light text-center">{editSaveNotice}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
              <button
                onClick={() => setEditingMemory(null)}
                className="px-4 py-2 rounded-xl bg-[#141414] text-xs text-[#808080] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs font-medium cursor-pointer shadow-sm shadow-[#C0C0C0]/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Dedicated Native & Web Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSave={handleCameraSave}
        defaultCategory={selectedCategory !== 'All' ? selectedCategory : 'Quiet Moments'}
        defaultLocation="Personal Sanctuary"
      />

      {/* 8. Upload Staging Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#0A0A0A] border border-[#222222] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div>
                <h3 className="text-sm font-medium text-[#F5F5F5]">
                  Add {stagedPhotos.length} Moment{stagedPhotos.length > 1 ? 's' : ''} to Scrapbook
                </h3>
                <p className="text-[11px] text-[#808080] font-light">
                  Set batch tags or details before saving to your sanctuary.
                </p>
              </div>
              <button
                onClick={() => {
                  stagedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                  setStagedPhotos([]);
                  setIsUploadModalOpen(false);
                }}
                className="text-[#808080] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stagedPhotos.map((p) => (
                <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border border-[#222222] group">
                  <img src={p.previewUrl} alt={p.title} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeStagedPhoto(p.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222222]">
              <button
                onClick={() => {
                  stagedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                  setStagedPhotos([]);
                  setIsUploadModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#141414] text-xs text-[#808080] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs font-medium cursor-pointer shadow-sm shadow-[#C0C0C0]/20"
              >
                {isProcessing ? 'Saving to Vault...' : `Save ${stagedPhotos.length} Moment${stagedPhotos.length > 1 ? 's' : ''} ✦`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-[#0A0A0A] border border-rose-900/40 rounded-3xl p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-medium text-rose-300">Delete this moment?</h3>
            <p className="text-xs text-[#808080] font-light leading-relaxed">
              This will remove this memory snapshot from your local and cloud sanctuary.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-[#141414] text-xs text-[#808080] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMemoryConfirm(confirmDeleteId)}
                className="px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-900 border border-rose-800 text-xs text-white font-medium cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
