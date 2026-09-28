/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Heart,
  Plus,
  Image as ImageIcon,
  ArrowRight,
  Clock,
  X,
  GraduationCap,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Task,
  CalendarEvent,
  DreamCategory,
} from '../../types';
import { MOOD_OPTIONS } from '../../data/initialData';

export const LifeDashboardView: React.FC = () => {
  const {
    userProfile,
    setMood,
    tasks,
    toggleTask,
    addTask,
    events,
    addEvent,
    dreams,
    addDream,
    memories,
    setActiveTab,
  } = useApp();

  // Quick Action Modal States
  const [modalType, setModalType] = useState<
    'task' | 'event' | 'wishlist' | 'learning' | null
  >(null);

  // Form Fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<Task['category']>('focus');

  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('10:00 AM');
  const [eventCategory, setEventCategory] = useState<CalendarEvent['type']>('personal');

  const [wishlistTitle, setWishlistTitle] = useState('');
  const [wishlistCategory, setWishlistCategory] = useState<DreamCategory>('Personal');
  const [wishlistTimeframe, setWishlistTimeframe] = useState('This Year');

  const [learningTitle, setLearningTitle] = useState('');
  const [learningNotes, setLearningNotes] = useState('');
  const [learningTimeframe, setLearningTimeframe] = useState('This Season');

  // Greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = userProfile.name || 'Friend';
    if (hour < 12) return `Good morning, ${name} ☕`;
    if (hour < 17) return `Good afternoon, ${name} 🌿`;
    return `Good evening, ${name} 🌙`;
  }, [userProfile.name]);

  // Today's formatted date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Today's task metrics
  const completedTasksCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const taskProgressPercent = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasksCount / tasks.length) * 100);
  }, [tasks, completedTasksCount]);

  // Upcoming Events & Schedules
  const todayDateStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.date >= todayDateStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [events, todayDateStr]);

  // Wishlist Items (Non-Learning Dreams)
  const wishlistItems = useMemo(() => {
    return dreams
      .filter((d) => d.category !== 'Learning' && d.category !== 'Career')
      .slice(0, 4);
  }, [dreams]);

  // Learning Hub Items (Learning & Career Dreams)
  const learningItems = useMemo(() => {
    return dreams
      .filter((d) => d.category === 'Learning' || d.category === 'Career')
      .slice(0, 4);
  }, [dreams]);

  // Recent Memories
  const recentMemories = useMemo(() => {
    return memories.slice(0, 3);
  }, [memories]);

  // Quick Action Handlers
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTask(taskTitle.trim(), taskCategory);
    setTaskTitle('');
    setModalType(null);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    addEvent({
      title: eventTitle.trim(),
      date: eventDate,
      time: eventTime,
      type: eventCategory,
      category: eventCategory,
    });
    setEventTitle('');
    setModalType(null);
  };

  const handleSaveWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishlistTitle.trim()) return;
    addDream({
      title: wishlistTitle.trim(),
      category: wishlistCategory,
      description: 'Nurtured in My Little Wishlist.',
      progressPercent: 20,
      timeframe: wishlistTimeframe,
      status: 'In Progress',
    });
    setWishlistTitle('');
    setModalType(null);
  };

  const handleSaveLearning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!learningTitle.trim()) return;
    addDream({
      title: learningTitle.trim(),
      category: 'Learning',
      description: learningNotes.trim() || 'Active learning path & skill cultivation.',
      progressPercent: 15,
      timeframe: learningTimeframe,
      status: 'In Progress',
    });
    setLearningTitle('');
    setLearningNotes('');
    setModalType(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-7 space-y-5 sm:space-y-6 animate-in fade-in duration-300 select-none bg-[#000000] text-[#F5F5F5]">
      {/* 1. Header & Sanctuary Greeting */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-light text-[#C0C0C0] tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span>Personal Sanctuary</span>
              <span>·</span>
              <span>{todayFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-[#F5F5F5] tracking-tight mt-0.5">
              {greeting}
            </h1>
            <p className="text-xs sm:text-sm font-light text-[#C0C0C0] mt-1 max-w-xl">
              Living overview — tasks, upcoming rhythm, wishlist goals, learning paths, and sweet moments.
            </p>
          </div>

          {/* Compact Mood Selector Pills */}
          <div className="bg-[#0A0A0A] p-2.5 rounded-2xl border border-[#222222] backdrop-blur-md self-start sm:self-auto shrink-0 shadow-sm">
            <div className="text-[10px] text-[#808080] font-light uppercase tracking-wider mb-1.5 px-1">
              Current Feeling
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {MOOD_OPTIONS.map((m) => {
                const isSelected = userProfile.currentMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    title={`${m.label}: ${m.description}`}
                    className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] font-medium shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                        : 'bg-[#121212] text-[#808080] hover:text-[#F5F5F5] border border-[#222222] hover:border-[#C0C0C0]/30'
                    }`}
                  >
                    <span>{m.symbol}</span>
                    <span className="capitalize">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Living Pulse Metric Capsules (2x2 on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Metric 1: Tasks Progress */}
        <div
          onClick={() => setActiveTab('home')}
          className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#222222] hover:border-[#C0C0C0]/40 transition-all cursor-pointer backdrop-blur-md group"
        >
          <div className="flex items-center justify-between text-[#C0C0C0]">
            <div className="w-8 h-8 rounded-xl bg-[#C0C0C0]/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#C0C0C0]" />
            </div>
            <span className="text-[10px] text-[#808080] group-hover:text-[#C0C0C0] transition-colors">
              {taskProgressPercent}% done
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-[10px] text-[#808080] uppercase tracking-wider block font-light">
              Today's Intentions
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-medium text-[#F5F5F5]">
                {completedTasksCount}/{tasks.length}
              </span>
              <span className="text-[10px] text-[#808080] font-light">tasks</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Next Event */}
        <div
          onClick={() => setActiveTab('calendar')}
          className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#222222] hover:border-[#C0C0C0]/40 transition-all cursor-pointer backdrop-blur-md group"
        >
          <div className="flex items-center justify-between text-[#D9D9D9]">
            <div className="w-8 h-8 rounded-xl bg-[#D9D9D9]/15 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#D9D9D9]" />
            </div>
            <span className="text-[10px] text-[#808080] group-hover:text-[#D9D9D9] transition-colors">
              {upcomingEvents.length} upcoming
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-[10px] text-[#808080] uppercase tracking-wider block font-light">
              Calendar Rhythm
            </span>
            <div className="text-xs font-normal text-[#F5F5F5] truncate mt-0.5">
              {upcomingEvents[0]?.title || 'No upcoming events'}
            </div>
          </div>
        </div>

        {/* Metric 3: Wishlist Goals */}
        <div
          onClick={() => setActiveTab('dreams')}
          className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#222222] hover:border-[#C0C0C0]/40 transition-all cursor-pointer backdrop-blur-md group"
        >
          <div className="flex items-center justify-between text-[#FFFFFF]">
            <div className="w-8 h-8 rounded-xl bg-[#FFFFFF]/15 flex items-center justify-center">
              <Heart className="w-4 h-4 text-[#FFFFFF]" />
            </div>
            <span className="text-[10px] text-[#808080] group-hover:text-[#FFFFFF] transition-colors">
              {dreams.length} goals
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-[10px] text-[#808080] uppercase tracking-wider block font-light">
              Wishlist Goals
            </span>
            <div className="text-xs font-normal text-[#F5F5F5] truncate mt-0.5">
              {wishlistItems[0]?.title || 'All aspirations active'}
            </div>
          </div>
        </div>

        {/* Metric 4: Learning Hub */}
        <div
          onClick={() => setActiveTab('career')}
          className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#222222] hover:border-[#C0C0C0]/40 transition-all cursor-pointer backdrop-blur-md group"
        >
          <div className="flex items-center justify-between text-[#A6A6A6]">
            <div className="w-8 h-8 rounded-xl bg-[#A6A6A6]/15 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-[#A6A6A6]" />
            </div>
            <span className="text-[10px] text-[#808080] group-hover:text-[#A6A6A6] transition-colors">
              {learningItems.length} active
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-[10px] text-[#808080] uppercase tracking-wider block font-light">
              Learning Flow
            </span>
            <div className="text-xs font-normal text-[#F5F5F5] truncate mt-0.5">
              {learningItems[0]?.title || 'Lifelong curiosity'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Dock */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#222222] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-[#808080] font-light px-1">
          <Plus className="w-3.5 h-3.5 text-[#C0C0C0]" />
          <span>Quick Actions:</span>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <button
            onClick={() => setModalType('task')}
            className="px-3 py-1.5 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-light text-[#F5F5F5] hover:text-[#C0C0C0] hover:border-[#C0C0C0]/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span>+ Task</span>
          </button>

          <button
            onClick={() => setModalType('event')}
            className="px-3 py-1.5 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-light text-[#F5F5F5] hover:text-[#D9D9D9] hover:border-[#D9D9D9]/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-[#D9D9D9]" />
            <span>+ Event</span>
          </button>

          <button
            onClick={() => setModalType('wishlist')}
            className="px-3 py-1.5 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-light text-[#F5F5F5] hover:text-[#FFFFFF] hover:border-[#FFFFFF]/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Heart className="w-3.5 h-3.5 text-[#FFFFFF]" />
            <span>+ Wishlist</span>
          </button>

          <button
            onClick={() => setModalType('learning')}
            className="px-3 py-1.5 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-light text-[#F5F5F5] hover:text-[#A6A6A6] hover:border-[#A6A6A6]/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#A6A6A6]" />
            <span>+ Learning</span>
          </button>
        </div>
      </div>

      {/* 4. Creative Visual Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* SECTION A: TODAY'S INTENTIONS & TASKS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0A] border border-[#222222] shadow-md space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C0C0C0]" />
              <h2 className="text-sm font-medium text-[#F5F5F5] tracking-tight">Today's Tasks</h2>
              <span className="text-[11px] text-[#808080] font-light">
                ({completedTasksCount}/{tasks.length})
              </span>
            </div>

            <button
              onClick={() => setActiveTab('home')}
              className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] font-light flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress Bar */}
          {tasks.length > 0 && (
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] transition-all duration-500 rounded-full"
                  style={{ width: `${taskProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Task Items */}
          {tasks.length === 0 ? (
            <div className="text-center py-6 space-y-2 text-[#808080]">
              <p className="text-xs font-light">No active tasks for today.</p>
              <button
                onClick={() => setModalType('task')}
                className="text-xs text-[#C0C0C0] underline hover:text-[#FFFFFF] cursor-pointer"
              >
                + Add a gentle intention
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 scrollbar-none">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    task.completed
                      ? 'bg-[#060606] border-[#1C1C1C] text-[#808080]'
                      : 'bg-[#0E0E0E] border-[#222222] text-[#F5F5F5] hover:border-[#C0C0C0]/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        task.completed
                          ? 'bg-[#C0C0C0] border-[#C0C0C0] text-[#000000]'
                          : 'border-[#333333] bg-[#141414] text-transparent hover:border-[#C0C0C0]'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span
                      className={`text-xs font-light truncate ${
                        task.completed ? 'line-through text-[#808080]' : 'text-[#F5F5F5]'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  {task.category && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#141414] border border-[#222222] text-[#808080] capitalize shrink-0 font-light">
                      {task.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION B: UPCOMING EVENTS & CALENDAR RHYTHM */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0A] border border-[#222222] shadow-md space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C0C0C0]" />
              <h2 className="text-sm font-medium text-[#F5F5F5] tracking-tight">Calendar Rhythm</h2>
            </div>

            <button
              onClick={() => setActiveTab('calendar')}
              className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] font-light flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-6 space-y-2 text-[#808080]">
              <p className="text-xs font-light">No upcoming events scheduled.</p>
              <button
                onClick={() => setModalType('event')}
                className="text-xs text-[#C0C0C0] underline hover:text-[#FFFFFF] cursor-pointer"
              >
                + Schedule an event
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 scrollbar-none">
              {upcomingEvents.map((evt) => {
                const eventDateObj = new Date(evt.date);
                const monthStr = !isNaN(eventDateObj.getTime())
                  ? eventDateObj.toLocaleDateString('en-US', { month: 'short' })
                  : 'Date';
                const dayNum = !isNaN(eventDateObj.getTime())
                  ? eventDateObj.getDate()
                  : '';

                return (
                  <div
                    key={evt.id}
                    onClick={() => setActiveTab('calendar')}
                    className="p-2.5 rounded-xl bg-[#0E0E0E] border border-[#222222] hover:border-[#C0C0C0]/35 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Date Badge Mini Block */}
                      <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#262626] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] uppercase tracking-wider text-[#C0C0C0] font-medium leading-none">
                          {monthStr}
                        </span>
                        <span className="text-xs font-bold text-[#F5F5F5] leading-tight">
                          {dayNum}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-normal text-[#F5F5F5] truncate">{evt.title}</div>
                        <div className="text-[10px] text-[#808080] font-light flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-[#C0C0C0]" />
                          <span>{evt.time || 'All Day'}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#141414] border border-[#222222] text-[#C0C0C0] capitalize shrink-0 font-light">
                      {evt.type || 'personal'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION C: WISHLIST GOALS & ASPIRATIONS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0A] border border-[#222222] shadow-md space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#C0C0C0]" />
              <h2 className="text-sm font-medium text-[#F5F5F5] tracking-tight">Wishlist Goals</h2>
            </div>

            <button
              onClick={() => setActiveTab('dreams')}
              className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] font-light flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View Wishlist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="text-center py-6 space-y-2 text-[#808080]">
              <p className="text-xs font-light">No goals in your wishlist yet.</p>
              <button
                onClick={() => setModalType('wishlist')}
                className="text-xs text-[#C0C0C0] underline hover:text-[#FFFFFF] cursor-pointer"
              >
                + Add a wishlist goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {wishlistItems.map((dream) => (
                <div
                  key={dream.id}
                  onClick={() => setActiveTab('dreams')}
                  className="p-3 rounded-xl bg-[#0E0E0E] border border-[#222222] hover:border-[#C0C0C0]/35 transition-all cursor-pointer space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-normal text-[#F5F5F5] truncate">{dream.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#141414] text-[#C0C0C0] shrink-0 font-medium">
                        {dream.progressPercent}%
                      </span>
                    </div>

                    <div className="w-full h-1 rounded-full bg-[#1A1A1A] overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] rounded-full"
                        style={{ width: `${dream.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-[#808080] font-light pt-1">
                    <span className="capitalize">{dream.category}</span>
                    <span>{dream.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION D: LEARNING HUB & COURSES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0A] border border-[#222222] shadow-md space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#C0C0C0]" />
              <h2 className="text-sm font-medium text-[#F5F5F5] tracking-tight">Learning Hub</h2>
            </div>

            <button
              onClick={() => setActiveTab('career')}
              className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] font-light flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {learningItems.length === 0 ? (
            <div className="text-center py-6 space-y-2 text-[#808080]">
              <p className="text-xs font-light">No active learning goals yet.</p>
              <button
                onClick={() => setModalType('learning')}
                className="text-xs text-[#C0C0C0] underline hover:text-[#FFFFFF] cursor-pointer"
              >
                + Add a learning path
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {learningItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveTab('career')}
                  className="p-3 rounded-xl bg-[#0E0E0E] border border-[#222222] hover:border-[#C0C0C0]/35 transition-all cursor-pointer space-y-1.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-normal text-[#F5F5F5] truncate">{item.title}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#141414] text-[#C0C0C0] border border-[#C0C0C0]/30 shrink-0 font-light">
                        In Flow
                      </span>
                    </div>

                    <p className="text-[10px] text-[#808080] font-light line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-[#808080] font-light pt-1">
                    <span className="capitalize">{item.category}</span>
                    <span>{item.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION E: RECENT CHERISHED MOMENTS (PHOTO STRIP / COLLAGE) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0A] border border-[#222222] shadow-md space-y-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#C0C0C0]" />
            <h2 className="text-sm font-medium text-[#F5F5F5] tracking-tight">Recent Cherished Moments</h2>
          </div>

          <button
            onClick={() => setActiveTab('memories')}
            className="text-xs text-[#C0C0C0] hover:text-[#C0C0C0] font-light flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Scrapbook</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMemories.length === 0 ? (
          <div className="text-center py-6 space-y-2 text-[#808080]">
            <p className="text-xs font-light">No photo memories added yet.</p>
            <button
              onClick={() => setActiveTab('memories')}
              className="text-xs text-[#C0C0C0] underline hover:text-[#FFFFFF] cursor-pointer"
            >
              + Upload a memory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentMemories.map((mem) => (
              <div
                key={mem.id}
                onClick={() => setActiveTab('memories')}
                className="group p-2.5 rounded-xl bg-[#0E0E0E] border border-[#222222] hover:border-[#C0C0C0]/35 transition-all cursor-pointer space-y-2"
              >
                {mem.imageSrc ? (
                  <div className="w-full aspect-16/10 rounded-lg overflow-hidden bg-[#141414]">
                    <img
                      src={mem.imageSrc}
                      alt={mem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-16/10 rounded-lg bg-[#141414] flex items-center justify-center text-[#C0C0C0]">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <div className="text-xs font-normal text-[#F5F5F5] truncate">{mem.title}</div>
                  <div className="text-[9px] text-[#808080] font-light flex items-center justify-between mt-0.5">
                    <span>{mem.date}</span>
                    {mem.location && <span>📍 {mem.location}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK ACTION MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0A0A0A] border border-[#C0C0C0]/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-sm font-medium text-[#F5F5F5] capitalize">
                Quick Add {modalType}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-7 h-7 rounded-full bg-[#141414] border border-[#222222] flex items-center justify-center text-[#808080] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* TASK FORM */}
            {modalType === 'task' && (
              <form onSubmit={handleSaveTask} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-[#808080] block mb-1">Task Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Read 20 pages, Watering plants..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] placeholder-[#808080] focus:outline-none focus:border-[#C0C0C0]/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#808080] block mb-1">Category</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as Task['category'])}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5]"
                  >
                    <option value="focus">Focus</option>
                    <option value="gentle">Gentle</option>
                    <option value="ritual">Ritual</option>
                    <option value="rest">Rest</option>
                  </select>
                </div>
                <div className="pt-3 border-t border-[#222222] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 rounded-xl bg-[#141414] text-[#F5F5F5] border border-[#262626] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] font-medium cursor-pointer"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            )}

            {/* EVENT FORM */}
            {modalType === 'event' && (
              <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-[#808080] block mb-1">Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Afternoon tea, Design review..."
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] placeholder-[#808080] focus:outline-none focus:border-[#C0C0C0]/50"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-[#808080] block mb-1">Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#808080] block mb-1">Time</label>
                    <input
                      type="text"
                      placeholder="10:00 AM"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5]"
                    />
                  </div>
                </div>
                <div className="pt-3 border-t border-[#222222] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 rounded-xl bg-[#141414] text-[#F5F5F5] border border-[#262626] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] font-medium cursor-pointer"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            )}

            {/* WISHLIST FORM */}
            {modalType === 'wishlist' && (
              <form onSubmit={handleSaveWishlist} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-[#808080] block mb-1">Wishlist Goal</label>
                  <input
                    type="text"
                    placeholder="e.g. Learn pottery, Travel to Kyoto..."
                    value={wishlistTitle}
                    onChange={(e) => setWishlistTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] placeholder-[#808080] focus:outline-none focus:border-[#C0C0C0]/50"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-[#808080] block mb-1">Category</label>
                    <select
                      value={wishlistCategory}
                      onChange={(e) => setWishlistCategory(e.target.value as DreamCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5]"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Travel">Travel</option>
                      <option value="Experiences">Experiences</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#808080] block mb-1">Timeframe</label>
                    <input
                      type="text"
                      value={wishlistTimeframe}
                      onChange={(e) => setWishlistTimeframe(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5]"
                    />
                  </div>
                </div>
                <div className="pt-3 border-t border-[#222222] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 rounded-xl bg-[#141414] text-[#F5F5F5] border border-[#262626] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] font-medium cursor-pointer"
                  >
                    Save Wishlist Goal
                  </button>
                </div>
              </form>
            )}

            {/* LEARNING FORM */}
            {modalType === 'learning' && (
              <form onSubmit={handleSaveLearning} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-[#808080] block mb-1">Course / Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Master Typography & Design Systems..."
                    value={learningTitle}
                    onChange={(e) => setLearningTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] placeholder-[#808080] focus:outline-none focus:border-[#C0C0C0]/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#808080] block mb-1">Focus Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Studying layout math, color harmony..."
                    value={learningNotes}
                    onChange={(e) => setLearningNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-[#F5F5F5] placeholder-[#808080]"
                  />
                </div>
                <div className="pt-3 border-t border-[#222222] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 rounded-xl bg-[#141414] text-[#F5F5F5] border border-[#262626] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] font-medium cursor-pointer"
                  >
                    Save Learning Path
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
