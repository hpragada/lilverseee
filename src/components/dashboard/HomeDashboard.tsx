import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Check,
  Plus,
  Trash2,
  Moon,
  ArrowRight,
  Lock,
  Folder,
  Bell,
  CalendarClock,
  Clock,
  Heart,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  ChevronRight,
  BookOpen,
  FileText,
  Smile,
  Camera,
  Shield,
  CheckCircle2,
  Circle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MOOD_OPTIONS } from '../../data/initialData';
import { DayOfWeek, MoodType } from '../../types';
import { RomanticGreetingBanner } from './RomanticGreetingBanner';
import { FocusTimer } from './FocusTimer';
import { ReminderAlertsWidget } from '../calendar/ReminderAlertsWidget';
import { CompletionCelebration } from '../common/CompletionCelebration';
import { notificationService } from '../../services/notificationService';

function getTodayDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay();
  const map: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[dayIndex] || 'monday';
}

const CATEGORY_COLORS: Record<string, string> = {
  routine: 'text-[#999999] border-[#292929] bg-[#0D0D0D]',
  wellness: 'text-[#C0C0C0] border-[#292929] bg-[#0D0D0D]',
  ritual: 'text-[#C0C0C0] border-[#292929] bg-[#0D0D0D]',
  study: 'text-[#F5F5F5] border-[#292929] bg-[#0D0D0D]',
  work: 'text-[#A0A0A0] border-[#292929] bg-[#0D0D0D]',
  personal: 'text-[#C0C0C0] border-[#292929] bg-[#0D0D0D]',
};

export const HomeDashboard: React.FC = () => {
  const {
    userProfile,
    tasks,
    events,
    schedules,
    toggleScheduleCompletedToday,
    addTask,
    toggleTask,
    deleteTask,
    memories,
    journalEntries,
    notes,
    joyEntries,
    setActiveTab,
    setMood,
    setQuickActionModal,
  } = useApp();

  const [newTaskInput, setNewTaskInput] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Background check for scheduled reminders
  useEffect(() => {
    notificationService.checkScheduledReminders(tasks, events);
    const interval = setInterval(() => {
      notificationService.checkScheduledReminders(tasks, events);
    }, 30000);
    return () => clearInterval(interval);
  }, [tasks, events]);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const todayDateStr = today.toISOString().slice(0, 10);
  const todayDay = useMemo(() => getTodayDayOfWeek(), []);

  // Filter today's schedule items, sorted by time
  const todaySchedules = useMemo(() => {
    return schedules
      .filter((s) => s.day === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, todayDay]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentMoodObj = MOOD_OPTIONS.find((m) => m.id === userProfile.currentMood) || MOOD_OPTIONS[0];

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    addTask(newTaskInput.trim());
    setNewTaskInput('');
  };

  const handleMoodSelect = (moodId: MoodType) => {
    setMood(moodId);
  };

  return (
    <div className="relative max-w-5xl mx-auto px-3.5 sm:px-6 py-3 sm:py-6 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Completion Celebration Overlay */}
      <CompletionCelebration
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {/* 1. Welcoming Hero & Romantic Banner (Directly on ambient pure black background) */}
      <section className="space-y-3">
        <RomanticGreetingBanner />
      </section>

      {/* 2. Creative Asymmetrical Bento Spaces Hub */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#C0C0C0]/15 flex items-center justify-center text-[#C0C0C0]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider">
              Sanctuary Portals
            </h2>
          </div>
          <span className="text-xs text-[#808080] font-light">
            Quick Navigation
          </span>
        </div>

        {/* Bento Grid: Asymmetrical, Luxury Pure Black & Silver Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Main Feature Tile: Vault Files (Prominent Luxury Silver Accent) */}
          <div
            onClick={() => setActiveTab('files')}
            className="group relative col-span-2 sm:col-span-2 md:col-span-2 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#111111] via-[#0D0D0D] to-[#080808] border border-[#C0C0C0]/30 hover:border-[#C0C0C0]/65 shadow-[0_8px_24px_rgba(0,0,0,0.8),0_0_16px_rgba(192,192,192,0.08)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.9),0_0_24px_rgba(192,192,192,0.18)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl flex flex-col justify-between min-h-[140px] active:scale-[0.99]"
          >
            {/* Subtle soft silver background illumination */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#C0C0C0]/12 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#C0C0C0]/25 to-[#D9D9D9]/20 border border-[#C0C0C0]/45 flex items-center justify-center text-[#C0C0C0] shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Folder className="w-5 h-5 text-[#C0C0C0]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-[#F5F5F5] tracking-tight group-hover:text-[#FFFFFF] transition-colors">
                      Vault Files
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#C0C0C0]/15 text-[#C0C0C0] border border-[#C0C0C0]/30 font-medium">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Encrypted</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#C0C0C0] font-light mt-0.5">
                    Private documents, archives & cloud storage
                  </p>
                </div>
              </div>

              <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#C0C0C0] group-hover:text-[#F5F5F5] group-hover:bg-[#C0C0C0]/20 group-hover:border-[#C0C0C0]/40 transition-all">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-[#808080]">
              <span className="text-[11px] font-light text-[#C0C0C0] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Google Drive & Local Synced</span>
              </span>
              <span className="text-[11px] text-[#C0C0C0] font-medium group-hover:underline flex items-center gap-0.5">
                Open Files →
              </span>
            </div>
          </div>

          {/* Moments & Photos Tile */}
          <div
            onClick={() => setActiveTab('memories')}
            className="group relative p-4 rounded-3xl bg-[#0D0D0D] hover:bg-[#121212] border border-[#222222] hover:border-[#C0C0C0]/50 shadow-md transition-all duration-300 cursor-pointer backdrop-blur-md flex flex-col justify-between min-h-[140px] active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] group-hover:scale-105 transition-transform">
                <ImageIcon className="w-5 h-5 text-[#C0C0C0]" />
              </div>
              <ChevronRight className="w-4 h-4 text-[#808080] group-hover:text-[#C0C0C0] group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="pt-3">
              <h3 className="text-sm font-medium text-[#F5F5F5] group-hover:text-[#FFFFFF] transition-colors">
                Moments
              </h3>
              <p className="text-[11px] text-[#808080] font-light mt-0.5 line-clamp-1">
                {memories.length} scrapbook moments
              </p>
            </div>
          </div>

          {/* Quick Notes Tile */}
          <div
            onClick={() => setActiveTab('notes')}
            className="group relative p-4 rounded-3xl bg-[#0D0D0D] hover:bg-[#121212] border border-[#222222] hover:border-[#C0C0C0]/50 shadow-md transition-all duration-300 cursor-pointer backdrop-blur-md flex flex-col justify-between min-h-[140px] active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#D9D9D9]/15 border border-[#D9D9D9]/30 flex items-center justify-center text-[#D9D9D9] group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 text-[#D9D9D9]" />
              </div>
              <ChevronRight className="w-4 h-4 text-[#808080] group-hover:text-[#D9D9D9] group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="pt-3">
              <h3 className="text-sm font-medium text-[#F5F5F5] group-hover:text-[#FFFFFF] transition-colors">
                Quick Notes
              </h3>
              <p className="text-[11px] text-[#808080] font-light mt-0.5 line-clamp-1">
                {notes.length} memos & ideas
              </p>
            </div>
          </div>

          {/* Dedicated Personal Journal Tile */}
          <div
            onClick={() => setActiveTab('journal')}
            className="group relative p-4 rounded-3xl bg-[#0D0D0D] hover:bg-[#121212] border border-[#222222] hover:border-[#C0C0C0]/50 shadow-md transition-all duration-300 cursor-pointer backdrop-blur-md flex flex-col justify-between min-h-[120px] active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] group-hover:scale-105 transition-transform">
                <BookOpen className="w-4.5 h-4.5 text-[#C0C0C0]" />
              </div>
              <ChevronRight className="w-4 h-4 text-[#808080] group-hover:text-[#C0C0C0] group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="pt-2">
              <h3 className="text-xs font-medium text-[#F5F5F5] group-hover:text-[#C0C0C0] transition-colors">
                Personal Journal
              </h3>
              <p className="text-[10px] text-[#808080] font-light mt-0.5">
                {journalEntries.length} reflections written
              </p>
            </div>
          </div>

          {/* Rhythm & Routine Hub Tile */}
          <div
            onClick={() => setActiveTab('schedule')}
            className="group relative p-4 rounded-3xl bg-[#0D0D0D] hover:bg-[#121212] border border-[#222222] hover:border-[#C0C0C0]/50 shadow-md transition-all duration-300 cursor-pointer backdrop-blur-md flex flex-col justify-between min-h-[120px] active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] group-hover:scale-105 transition-transform">
                <CalendarClock className="w-4.5 h-4.5 text-[#C0C0C0]" />
              </div>
              <ChevronRight className="w-4 h-4 text-[#808080] group-hover:text-[#C0C0C0] group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="pt-2">
              <h3 className="text-xs font-medium text-[#F5F5F5] group-hover:text-[#C0C0C0] transition-colors">
                Weekly Rhythm
              </h3>
              <p className="text-[10px] text-[#808080] font-light mt-0.5">
                {todaySchedules.length} anchors today ({todayDay})
              </p>
            </div>
          </div>

          {/* Encrypted Vault Tile */}
          <div
            onClick={() => setActiveTab('vault')}
            className="group relative p-4 rounded-3xl bg-[#0D0D0D] hover:bg-[#121212] border border-[#222222] hover:border-[#C0C0C0]/50 shadow-md transition-all duration-300 cursor-pointer backdrop-blur-md flex flex-col justify-between min-h-[120px] active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#D9D9D9]/15 border border-[#D9D9D9]/30 flex items-center justify-center text-[#D9D9D9] group-hover:scale-105 transition-transform">
                <Shield className="w-4.5 h-4.5 text-[#D9D9D9]" />
              </div>
              <ChevronRight className="w-4 h-4 text-[#808080] group-hover:text-[#D9D9D9] group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="pt-2">
              <h3 className="text-xs font-medium text-[#F5F5F5] group-hover:text-[#D9D9D9] transition-colors">
                Private Vault
              </h3>
              <p className="text-[10px] text-[#808080] font-light mt-0.5">
                PIN-locked secrets
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cherished Photo Moments Scrapbook Gallery */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#C0C0C0]/15 flex items-center justify-center text-[#C0C0C0]">
              <ImageIcon className="w-3.5 h-3.5 text-[#C0C0C0]" />
            </div>
            <h2 className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider">
              Cherished Moments
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickActionModal('memory')}
              className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] flex items-center gap-1 font-light cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <Camera className="w-3 h-3 text-[#C0C0C0]" />
              <span>Snap Photo</span>
            </button>
            <span className="text-[#808080]">·</span>
            <button
              onClick={() => setActiveTab('memories')}
              className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] flex items-center gap-1 font-light cursor-pointer transition-colors"
            >
              <span>View All ({memories.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {memories.length > 0 ? (
          <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-none snap-x">
            {memories.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveTab('memories')}
                className="group relative shrink-0 w-40 sm:w-52 aspect-4/3 rounded-2xl overflow-hidden border border-[#222222] shadow-md hover:shadow-xl hover:border-[#C0C0C0]/50 transition-all duration-300 cursor-pointer snap-start bg-[#0D0D0D]"
              >
                <img
                  src={item.imageSrc}
                  alt={item.title || 'Memory photo'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 space-y-0.5">
                  <p className="text-xs font-medium text-white truncate drop-shadow-md">
                    {item.title || 'Untitled Moment'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#C0C0C0] font-light">
                    <span>{item.date}</span>
                    {item.location && (
                      <>
                        <span>·</span>
                        <span className="truncate">{item.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => setQuickActionModal('memory')}
            className="p-6 rounded-3xl border border-dashed border-[#222222] hover:border-[#C0C0C0]/40 bg-[#0A0A0A] hover:bg-[#111111] transition-all text-center cursor-pointer space-y-2 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] mx-auto group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5 text-[#C0C0C0]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#F5F5F5]">No photos yet</p>
              <p className="text-[11px] text-[#808080] font-light">
                Capture your first gentle moment or upload a photo to start your scrapbook ✨
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 4. Asymmetrical 2-Column Living Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Span 7): Daily Intentions & Task Flow */}
        <section className="lg:col-span-7 space-y-4 p-4 sm:p-6 rounded-3xl bg-[#0A0A0A] border border-[#222222] shadow-xl backdrop-blur-xl">
          {/* Header with Circular / Pill Progress Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C0C0C0]/20 to-transparent border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0]">
                <Check className="w-4 h-4 text-[#C0C0C0]" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#F5F5F5] tracking-tight">
                  {userProfile.lowEnergyMode
                    ? 'Gentle Daily Intentions'
                    : 'Today’s Intentions & Tasks'}
                </h2>
                <p className="text-[11px] text-[#808080] font-light">
                  {formattedDate} · {completedCount} of {totalCount} fulfilled
                </p>
              </div>
            </div>

            {totalCount > 0 && (
              <div className="flex items-center gap-2 bg-[#121212] px-3 py-1.5 rounded-2xl border border-[#222222]">
                <span className="text-xs font-semibold text-[#C0C0C0] tabular-nums">
                  {progressPercent}%
                </span>
                <div className="w-12 h-1.5 bg-[#222222] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    task.completed
                      ? 'bg-[#060606] border-[#1C1C1C] text-[#808080]'
                      : 'bg-[#0E0E0E] border-[#222222] text-[#F5F5F5] hover:border-[#C0C0C0]/30'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (!task.completed) setShowCelebration(true);
                      toggleTask(task.id);
                    }}
                    className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                        task.completed
                          ? 'bg-[#C0C0C0] border-[#C0C0C0] text-[#000000]'
                          : 'border-[#333333] bg-[#141414] text-transparent hover:border-[#C0C0C0]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-xs font-light transition-all ${
                          task.completed ? 'line-through text-[#808080]' : 'text-[#F5F5F5]'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.category && (
                        <span className="text-[9px] text-[#808080] capitalize font-light">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="w-7 h-7 rounded-lg hover:bg-rose-950/30 text-[#808080] hover:text-rose-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title="Delete intention"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs font-light text-[#808080]">
                No intentions set for today. Take a gentle breath and start fresh ✦
              </div>
            )}
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddTaskSubmit} className="pt-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Add a gentle intention for today..."
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              className="flex-1 min-h-[42px] px-4 rounded-2xl bg-[#121212] border border-[#222222] text-xs text-[#F5F5F5] placeholder-[#808080] focus:outline-none focus:border-[#C0C0C0]/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!newTaskInput.trim()}
              className="min-h-[42px] px-4 rounded-2xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-102 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#C0C0C0]/15"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>
        </section>

        {/* Right Column (Span 5): Living Rhythm, Mood Selector & Reminders */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Interactive Mood Selector */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0A0A0A] border border-[#222222] shadow-lg backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{currentMoodObj.symbol}</span>
                <span className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider">
                  Current Feeling
                </span>
              </div>
              <span className="text-xs text-[#C0C0C0] font-light capitalize">
                {currentMoodObj.label}
              </span>
            </div>

            {/* Interactive Mood Pills */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {MOOD_OPTIONS.map((m) => {
                const isSelected = userProfile.currentMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMoodSelect(m.id as MoodType)}
                    className={`min-h-[38px] p-1.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-[#C0C0C0]/20 border-[#C0C0C0]/60 text-[#F5F5F5] shadow-[0_0_12px_rgba(192,192,192,0.2)]'
                        : 'bg-[#0E0E0E] border-[#222222] text-[#808080] hover:text-[#F5F5F5] hover:border-[#C0C0C0]/35'
                    }`}
                  >
                    <span className="text-sm">{m.symbol}</span>
                    <span className="text-[10px] font-light mt-0.5 capitalize truncate w-full">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today's Schedule Stream */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0A0A0A] border border-[#222222] shadow-lg backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#C0C0C0]" />
                <h3 className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider">
                  Today's Rhythm Anchors
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('schedule')}
                className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] font-light flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Full Schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {todaySchedules.length > 0 ? (
                todaySchedules.slice(0, 3).map((item) => {
                  const isCompletedToday = (item.completedDates || []).includes(todayDateStr);
                  const badgeClass = item.category
                    ? CATEGORY_COLORS[item.category] || CATEGORY_COLORS.personal
                    : CATEGORY_COLORS.personal;

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                        isCompletedToday
                          ? 'bg-[#060606] border-[#1C1C1C] text-[#808080]'
                          : 'bg-[#0E0E0E] border-[#222222] hover:border-[#C0C0C0]/35 text-[#F5F5F5]'
                      }`}
                    >
                      <button
                        onClick={() => toggleScheduleCompletedToday(item.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                            isCompletedToday
                              ? 'bg-[#C0C0C0] border-[#C0C0C0] text-[#000000]'
                              : 'border-[#333333] bg-[#141414] text-transparent hover:border-[#C0C0C0]'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className={`text-xs font-light truncate ${
                              isCompletedToday ? 'line-through text-[#808080]' : 'text-[#F5F5F5]'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10px] text-[#808080] font-light flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-[#C0C0C0]" />
                            <span>{item.startTime}</span>
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-3 text-center text-xs font-light text-[#808080]">
                  No rhythm anchors scheduled for {todayDay} 🌿
                </div>
              )}
            </div>
          </div>

          {/* Active Reminders Mini-Widget */}
          <ReminderAlertsWidget
            title="Active Reminders"
            subtitle="Appointments & alerts"
          />
        </div>
      </div>

      {/* 5. Focus Sanctuary Timer */}
      <FocusTimer compact={true} />
    </div>
  );
};
