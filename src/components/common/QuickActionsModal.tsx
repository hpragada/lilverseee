import React, { useState, useRef } from 'react';
import { X, Feather, Image as ImageIcon, CheckCircle, Sparkles, Upload, Camera } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MOOD_OPTIONS } from '../../data/initialData';
import { MoodType, Task } from '../../types';
import { processImageFile } from '../../services/photoStorage';
import { CameraCaptureModal, CapturedPhotoPayload } from './CameraCaptureModal';

import imgDeskJournal from '../../assets/images/aesthetic_desk_journal_1790344269761.jpg';
import imgMorningWindow from '../../assets/images/serene_morning_window_1790344288710.jpg';
import imgStarlitNight from '../../assets/images/starlit_night_sanctuary_1790344300613.jpg';
import imgLavenderDusk from '../../assets/images/lavender_field_dusk_1790344317059.jpg';

export const QuickActionsModal: React.FC = () => {
  const {
    quickActionModal,
    setQuickActionModal,
    addTask,
    addJournalEntry,
    addMemory,
    userProfile,
  } = useApp();

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<Task['category']>('gentle');

  // Journal form state
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState<MoodType>(userProfile.currentMood);
  const [journalTag, setJournalTag] = useState('Quiet Thoughts');

  // Memory form state
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryCaption, setMemoryCaption] = useState('');
  const [memoryLocation, setMemoryLocation] = useState('Personal Sanctuary');
  const [memoryImage, setMemoryImage] = useState(imgMorningWindow);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!quickActionModal) return null;

  const handleClose = () => {
    setQuickActionModal(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const { dataUrl } = await processImageFile(file);
      setMemoryImage(dataUrl);
      if (!memoryTitle.trim()) {
        setMemoryTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Unsupported image format');
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTask(taskTitle.trim(), taskCategory);
    setTaskTitle('');
    handleClose();
  };

  const handleCreateJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalTitle.trim() || !journalContent.trim()) return;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    addJournalEntry({
      title: journalTitle.trim(),
      content: journalContent.trim(),
      date: dateFormatted,
      mood: journalMood,
      tags: [journalTag],
      readTimeMinutes: Math.max(1, Math.round(journalContent.split(' ').length / 80)),
    });
    setJournalTitle('');
    setJournalContent('');
    handleClose();
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryTitle.trim()) return;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    await addMemory({
      title: memoryTitle.trim(),
      caption: memoryCaption.trim() || 'A cherished quiet memory.',
      date: dateFormatted,
      location: memoryLocation.trim() || 'Sanctuary',
      imageSrc: memoryImage,
      category: 'Quiet Moments',
      aspect: 'landscape',
    });
    setMemoryTitle('');
    setMemoryCaption('');
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div
        className="absolute inset-0"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-[#0D0D0D] border border-[#292929] rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#292929] mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[#C0C0C0] font-medium">
              Quick Action
            </span>
            <span className="text-[#999999]">·</span>
            <h3 className="text-sm font-normal text-[#F5F5F5]">
              {quickActionModal === 'task' && 'Add Today’s Intention'}
              {quickActionModal === 'journal' && 'Write a Gentle Reflection'}
              {quickActionModal === 'memory' && 'Capture a Quiet Memory'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[#999999] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Form */}
        {quickActionModal === 'task' && (
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-normal text-[#999999] mb-1.5">
                What gentle intention would you like to set?
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Sip herbal tea by the window..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-[#999999] mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['gentle', 'ritual', 'focus', 'rest'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTaskCategory(cat)}
                    className={`py-2 px-2 text-xs rounded-xl border capitalize transition-colors min-h-[44px] ${
                      taskCategory === cat
                        ? 'bg-[#141414] border-[#C0C0C0] text-[#F5F5F5]'
                        : 'bg-[#080808] border-[#292929] text-[#999999] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-normal text-[#999999] hover:text-[#F5F5F5] min-h-[44px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!taskTitle.trim()}
                className="px-5 py-2 rounded-xl silver-btn-primary text-black text-xs font-medium transition-all disabled:opacity-40 min-h-[44px]"
              >
                Add Intention
              </button>
            </div>
          </form>
        )}

        {/* Journal Form */}
        {quickActionModal === 'journal' && (
          <form onSubmit={handleCreateJournal} className="space-y-4">
            <div>
              <label className="block text-xs font-normal text-[#999999] mb-1.5">
                Title of your reflection
              </label>
              <input
                type="text"
                autoFocus
                placeholder="A quiet moment today..."
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-normal text-[#999999] mb-1.5">
                  Mood
                </label>
                <select
                  value={journalMood}
                  onChange={(e) => setJournalMood(e.target.value as MoodType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0] min-h-[44px]"
                >
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.symbol} {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-normal text-[#999999] mb-1.5">
                  Tag
                </label>
                <input
                  type="text"
                  value={journalTag}
                  onChange={(e) => setJournalTag(e.target.value)}
                  placeholder="e.g. Gratitude"
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-normal text-[#999999] mb-1.5">
                Your thoughts (unhurried and free)
              </label>
              <textarea
                rows={4}
                placeholder="Write whatever is on your heart today..."
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0] resize-none font-light leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-normal text-[#999999] hover:text-[#F5F5F5] min-h-[44px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!journalTitle.trim()}
                className="px-5 py-2 rounded-xl silver-btn-primary text-black text-xs font-medium transition-all disabled:opacity-40 min-h-[44px]"
              >
                Save Reflection
              </button>
            </div>
          </form>
        )}

        {/* Memory Form */}
        {quickActionModal === 'memory' && (
          <form onSubmit={handleCreateMemory} className="space-y-4">
            <div>
              <label className="block text-xs font-normal text-[#999999] mb-1.5">
                Memory Title
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Afternoon tea in the garden"
                value={memoryTitle}
                onChange={(e) => setMemoryTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-[#999999] mb-1.5">
                Caption or Feeling
              </label>
              <input
                type="text"
                placeholder="A gentle sentence describing this memory..."
                value={memoryCaption}
                onChange={(e) => setMemoryCaption(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-[#999999] mb-1.5">
                Location or Setting
              </label>
              <input
                type="text"
                placeholder="e.g. Home sanctuary, Kyoto, Balcony"
                value={memoryLocation}
                onChange={(e) => setMemoryLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-xs font-normal text-[#999999]">
                  Photo Choice
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="text-xs text-[#C0C0C0] hover:underline flex items-center gap-1 font-normal cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#C0C0C0] hover:underline flex items-center gap-1 font-normal cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />

              {uploadError && (
                <p className="text-[11px] text-rose-300 mb-2">{uploadError}</p>
              )}

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'desk', src: imgDeskJournal, label: 'Journal' },
                  { id: 'window', src: imgMorningWindow, label: 'Window' },
                  { id: 'night', src: imgStarlitNight, label: 'Starlight' },
                  { id: 'lavender', src: imgLavenderDusk, label: 'Lavender' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMemoryImage(item.src)}
                    className={`relative rounded-xl overflow-hidden border aspect-4/3 transition-all min-h-[44px] ${
                      memoryImage === item.src
                        ? 'border-[#C0C0C0] ring-2 ring-[#C0C0C0]/30'
                        : 'border-[#292929] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={item.src}
                      alt={item.label}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {memoryImage === item.src && (
                      <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#C0C0C0] text-black flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-normal text-[#999999] hover:text-[#F5F5F5] min-h-[44px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!memoryTitle.trim()}
                className="px-5 py-2 rounded-xl silver-btn-primary text-black text-xs font-medium transition-all disabled:opacity-40 min-h-[44px]"
              >
                Preserve Memory
              </button>
            </div>
          </form>
        )}
      </div>

      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onSave={(photo: CapturedPhotoPayload) => {
            setMemoryImage(photo.dataUrl);
            if (!memoryTitle.trim()) {
              setMemoryTitle(photo.title);
            }
            if (photo.location) {
              setMemoryLocation(photo.location);
            }
            if (photo.caption) {
              setMemoryCaption(photo.caption);
            }
            setIsCameraOpen(false);
          }}
          defaultCategory="Quiet Moments"
          defaultLocation={memoryLocation || 'Personal Sanctuary'}
        />
      )}
    </div>
  );
};
