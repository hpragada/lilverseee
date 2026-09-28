import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Check,
  Bell,
  Sparkles,
  AlertCircle,
  X,
  ChevronRight,
  Coffee,
  BookOpen,
  Briefcase,
  Heart,
  Feather,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DayOfWeek, ScheduleItem } from '../../types';

const DAYS_OF_WEEK: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const CATEGORIES: {
  id: NonNullable<ScheduleItem['category']>;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'routine', label: 'Routine', color: 'text-sky-300 border-sky-500/30 bg-sky-500/10', icon: Coffee },
  { id: 'wellness', label: 'Wellness', color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', icon: Heart },
  { id: 'ritual', label: 'Ritual', color: 'text-[#E8E8E8] border-[#C0C0C0]/30 bg-[#C0C0C0]/10', icon: Sparkles },
  { id: 'study', label: 'Study', color: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10', icon: BookOpen },
  { id: 'work', label: 'Work', color: 'text-[#C0C0C0] border-[#292929] bg-[#0D0D0D]', icon: Briefcase },
  { id: 'personal', label: 'Personal', color: 'text-[#D4D4D4] border-[#D4D4D4]/30 bg-[#D4D4D4]/10', icon: Feather },
];

// Determine today's day of week
function getTodayDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday, ...
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

export const ScheduleView: React.FC = () => {
  const {
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleScheduleCompletedToday,
    userProfile,
  } = useApp();

  const todayDay = useMemo(() => getTodayDayOfWeek(), []);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  // Form Fields
  const [formDay, setFormDay] = useState<DayOfWeek>(todayDay);
  const [formTitle, setFormTitle] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00 AM');
  const [formEndTime, setFormEndTime] = useState('10:00 AM');
  const [formCategory, setFormCategory] = useState<ScheduleItem['category']>('routine');
  const [formNotes, setFormNotes] = useState('');
  const [formHasReminder, setFormHasReminder] = useState(true);
  const [formReminderLead, setFormReminderLead] = useState<number>(10);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<ScheduleItem | null>(null);

  // Today's date string for completion check
  const todayDateStr = new Date().toISOString().slice(0, 10);

  // Filter items for selected day, sorted chronologically
  const dayItems = useMemo(() => {
    return schedules
      .filter((s) => s.day === selectedDay)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [schedules, selectedDay]);

  // Counts per day
  const countsByDay = useMemo(() => {
    const counts: Record<DayOfWeek, number> = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
    };
    schedules.forEach((s) => {
      if (counts[s.day] !== undefined) {
        counts[s.day]++;
      }
    });
    return counts;
  }, [schedules]);

  // Open modal for new entry
  const handleOpenAdd = (dayToSet?: DayOfWeek) => {
    setEditingItem(null);
    setFormDay(dayToSet || selectedDay);
    setFormTitle('');
    setFormStartTime('09:00 AM');
    setFormEndTime('10:00 AM');
    setFormCategory('routine');
    setFormNotes('');
    setFormHasReminder(true);
    setFormReminderLead(10);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormDay(item.day);
    setFormTitle(item.title);
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime || '');
    setFormCategory(item.category || 'routine');
    setFormNotes(item.notes || '');
    setFormHasReminder(Boolean(item.hasReminder));
    setFormReminderLead(item.reminderMinutesBefore ?? 10);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save entry
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please provide a title for this schedule entry.');
      return;
    }
    if (!formStartTime.trim()) {
      setFormError('Please enter a start time.');
      return;
    }

    if (editingItem) {
      updateSchedule(editingItem.id, {
        day: formDay,
        title: formTitle.trim(),
        startTime: formStartTime.trim(),
        endTime: formEndTime.trim() || undefined,
        category: formCategory,
        notes: formNotes.trim() || undefined,
        hasReminder: formHasReminder,
        reminderMinutesBefore: formHasReminder ? formReminderLead : undefined,
      });
    } else {
      addSchedule({
        day: formDay,
        title: formTitle.trim(),
        startTime: formStartTime.trim(),
        endTime: formEndTime.trim() || undefined,
        category: formCategory,
        notes: formNotes.trim() || undefined,
        hasReminder: formHasReminder,
        reminderMinutesBefore: formHasReminder ? formReminderLead : undefined,
        completedDates: [],
      });
    }

    setIsModalOpen(false);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (deletingItem) {
      deleteSchedule(deletingItem.id);
      setDeletingItem(null);
    }
  };

  const completedTodayCount = dayItems.filter((i) =>
    (i.completedDates || []).includes(todayDateStr)
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#0D0D0D] border border-[#292929] shadow-lg backdrop-blur-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-base sm:text-lg font-normal text-[#F5F5F5] tracking-tight">
              Weekly Schedule
            </h1>
            <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
          </div>
          <p className="text-xs text-[#999999] font-light">
            Plan your daily rhythm anchors from Monday through Sunday.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* View toggle (Day vs Week) */}
          <div className="flex items-center p-0.5 rounded-xl bg-[#141414] border border-[#292929]">
            <button
              onClick={() => setViewMode('day')}
              title="Daily Focused View"
              className={`px-2.5 py-1 rounded-lg text-xs font-light flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-[#1F1F1F] text-[#F5F5F5] shadow-sm'
                  : 'text-[#999999] hover:text-[#F5F5F5]'
              }`}
            >
              <List className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span className="hidden sm:inline">Day</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              title="Full Week Overview"
              className={`px-2.5 py-1 rounded-lg text-xs font-light flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-[#1F1F1F] text-[#F5F5F5] shadow-sm'
                  : 'text-[#999999] hover:text-[#F5F5F5]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span className="hidden sm:inline">Week</span>
            </button>
          </div>

          {/* Add New Schedule Button */}
          <button
            onClick={() => handleOpenAdd()}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8] text-[#000000] text-xs font-medium flex items-center gap-1.5 shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Anchor</span>
          </button>
        </div>
      </div>

      {/* Weekday Selector Bar (Monday - Sunday) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 p-1.5 rounded-2xl bg-[#0D0D0D] border border-[#292929] backdrop-blur-md">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDay === day.id;
          const isToday = todayDay === day.id;
          const count = countsByDay[day.id];

          return (
            <button
              key={day.id}
              onClick={() => {
                setSelectedDay(day.id);
                if (viewMode === 'week') setViewMode('day');
              }}
              className={`p-1.5 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer min-h-[52px] sm:min-h-[60px] ${
                isSelected
                  ? 'bg-[#181818] border-[#C0C0C0]/50 text-[#F5F5F5] shadow-sm scale-[1.02]'
                  : 'bg-[#111111] border-transparent text-[#999999] hover:text-[#F5F5F5] hover:bg-[#181818]'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-normal tracking-tight">
                  {day.short}
                </span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C0C0C0]" title="Today" />
                )}
              </div>

              <div className="mt-0.5 flex items-center gap-1">
                <span
                  className={`text-[9px] px-1.5 rounded-full font-mono ${
                    isSelected
                      ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]'
                      : 'bg-[#141414] text-[#999999]'
                  }`}
                >
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* VIEW MODE 1: DAY FOCUSED VIEW */}
      {viewMode === 'day' && (
        <section className="space-y-3">
          {/* Day Status Header */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0D0D] border border-[#292929] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C0C0C0]" />
              <h2 className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider capitalize">
                {selectedDay}’s Flow
              </h2>
              {selectedDay === todayDay && (
                <span className="px-2 py-0.2 rounded-full bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 text-[#C0C0C0] text-[10px] font-medium">
                  Today
                </span>
              )}
            </div>

            {selectedDay === todayDay && dayItems.length > 0 && (
              <span className="text-xs text-[#999999] font-light">
                {completedTodayCount} of {dayItems.length} completed
              </span>
            )}
          </div>

          {/* List of Schedule Items for Selected Day */}
          <div className="space-y-2">
            {dayItems.map((item) => {
              const isCompletedToday = (item.completedDates || []).includes(todayDateStr);
              const catObj = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[0];
              const CategoryIcon = catObj.icon;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCompletedToday
                      ? 'bg-[#0A0A0A] border-[#202020] text-[#777777]'
                      : 'bg-[#0D0D0D] border-[#292929] text-[#F5F5F5] hover:border-[#C0C0C0]/40 backdrop-blur-md shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Complete toggle & Content */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox button */}
                      <button
                        onClick={() => toggleScheduleCompletedToday(item.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isCompletedToday
                            ? 'bg-[#C0C0C0] border-[#C0C0C0] text-[#000000]'
                            : 'border-[#383838] bg-[#141414] text-transparent hover:border-[#C0C0C0]'
                        }`}
                        title={isCompletedToday ? 'Mark incomplete for today' : 'Mark completed today'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      <div className="space-y-1 flex-1 min-w-0">
                        {/* Meta tags: Time, Category, Reminder */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          {/* Time */}
                          <div className="flex items-center gap-1 font-mono text-[10px] text-[#C0C0C0] bg-[#141414] px-2 py-0.5 rounded-md border border-[#292929]">
                            <Clock className="w-2.5 h-2.5 text-[#C0C0C0]" />
                            <span>{item.startTime}</span>
                            {item.endTime && (
                              <>
                                <span className="text-[#999999]">–</span>
                                <span>{item.endTime}</span>
                              </>
                            )}
                          </div>

                          {/* Category Tag */}
                          <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md border capitalize font-light ${catObj.color}`}>
                            <CategoryIcon className="w-2.5 h-2.5" />
                            <span>{catObj.label}</span>
                          </div>

                          {/* Reminder Indicator */}
                          {item.hasReminder && (
                            <div className="flex items-center gap-1 text-[9px] text-[#C0C0C0] bg-[#C0C0C0]/10 border border-[#C0C0C0]/20 px-1.5 py-0.5 rounded-md">
                              <Bell className="w-2.5 h-2.5" />
                              <span>{item.reminderMinutesBefore ?? 10}m</span>
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <h3
                          className={`text-xs sm:text-sm font-normal tracking-tight transition-all ${
                            isCompletedToday ? 'line-through text-[#777777]' : 'text-[#F5F5F5]'
                          }`}
                        >
                          {item.title}
                        </h3>

                        {/* Notes */}
                        {item.notes && (
                          <p className="text-xs font-light text-[#999999] leading-relaxed pt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 rounded-lg text-[#999999] hover:text-[#F5F5F5] hover:bg-[#181818] transition-colors cursor-pointer"
                        title="Edit schedule entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-1 rounded-lg text-[#999999] hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                        title="Delete schedule entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty state for the day */}
            {dayItems.length === 0 && (
              <div className="py-12 px-4 rounded-2xl bg-[#0D0D0D] border border-dashed border-[#292929] text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#141414] border border-[#292929] mx-auto flex items-center justify-center text-[#C0C0C0]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-[#F5F5F5] capitalize">
                    No scheduled items for {selectedDay}
                  </h3>
                  <p className="text-xs font-light text-[#999999] mt-1 max-w-sm mx-auto">
                    Enjoy quiet relaxation, or add a gentle daily anchor like morning tea, study flow, or peaceful stretching.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAdd(selectedDay)}
                  className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] border border-[#292929] text-xs font-light text-[#C0C0C0] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="capitalize">Add Routine for {selectedDay}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* VIEW MODE 2: WEEKLY OVERVIEW (ALL 7 DAYS) */}
      {viewMode === 'week' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const itemsForDay = schedules
                .filter((s) => s.day === day.id)
                .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
              const isToday = todayDay === day.id;

              return (
                <div
                  key={day.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isToday
                      ? 'bg-[#0D0D0D] border-[#C0C0C0]/40 shadow-sm shadow-[#C0C0C0]/5'
                      : 'bg-[#0D0D0D] border-[#292929]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#292929]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#F5F5F5] capitalize">
                        {day.label}
                      </span>
                      {isToday && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#C0C0C0]/20 text-[#C0C0C0] font-medium">
                          Today
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenAdd(day.id)}
                      className="p-1 rounded-lg text-[#999999] hover:text-[#C0C0C0] hover:bg-[#141414] transition-colors cursor-pointer"
                      title={`Add entry for ${day.label}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {itemsForDay.length > 0 ? (
                    <div className="space-y-2">
                      {itemsForDay.map((item) => {
                        const isDone = (item.completedDates || []).includes(todayDateStr);
                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                              isDone
                                ? 'bg-[#0A0A0A] border-[#202020] text-[#777777]'
                                : 'bg-[#141414] border-[#292929] text-[#F5F5F5]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[11px] font-mono text-[#C0C0C0] shrink-0">
                                {item.startTime}
                              </span>
                              <span className={`truncate font-light ${isDone ? 'line-through text-[#777777]' : ''}`}>
                                {item.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeletingItem(item)}
                                className="p-1 text-[#999999] hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] font-light text-[#999999] italic py-2 text-center">
                      No anchors scheduled.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-[#0D0D0D] border border-[#292929] rounded-2xl p-6 space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#141414] flex items-center justify-center text-[#C0C0C0]">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-medium text-[#F5F5F5]">
                  {editingItem ? 'Edit Schedule Anchor' : 'New Schedule Anchor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#999999] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              {/* Day of Week */}
              <div>
                <label className="block text-[11px] font-light text-[#999999] mb-1">
                  Day of Week
                </label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value as DayOfWeek)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0] capitalize cursor-pointer"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#0D0D0D] capitalize">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-light text-[#999999] mb-1">
                  Title & Anchor
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Focus Flow Block, Morning Tea & Stretching"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/50 focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-light text-[#999999] mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="09:00 AM"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-light text-[#999999] mb-1">
                    End Time (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="10:30 AM"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-light text-[#999999] mb-1">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setFormCategory(cat.id)}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-light capitalize flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        formCategory === cat.id
                          ? `${cat.color} font-medium`
                          : 'bg-[#141414] border-[#292929] text-[#999999] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <cat.icon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-light text-[#999999] mb-1">
                  Gentle Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes, intentions, cozy mindset..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/50 focus:outline-none focus:border-[#C0C0C0] resize-none"
                />
              </div>

              {/* Reminders Toggle & Lead Time */}
              <div className="p-3 rounded-xl bg-[#141414] border border-[#292929] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-[#C0C0C0]" />
                    <span className="text-xs font-light text-[#F5F5F5]">
                      In-App & Browser Reminder
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormHasReminder(!formHasReminder)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      formHasReminder ? 'bg-[#C0C0C0]' : 'bg-[#292929]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#000000] transition-transform ${
                        formHasReminder ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formHasReminder && (
                  <div className="pt-2 border-t border-[#292929] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#999999] font-light">
                      Remind before start
                    </span>
                    <select
                      value={formReminderLead}
                      onChange={(e) => setFormReminderLead(parseInt(e.target.value, 10))}
                      className="px-2 py-1 rounded-lg bg-[#0D0D0D] border border-[#292929] text-[11px] text-[#F5F5F5] focus:outline-none cursor-pointer"
                    >
                      <option value={0}>At start time</option>
                      <option value={5}>5 minutes before</option>
                      <option value={10}>10 minutes before</option>
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] border border-[#292929] text-xs text-[#999999] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#C0C0C0] hover:bg-[#E8E8E8] text-[#000000] font-medium text-xs transition-colors cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Create Anchor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setDeletingItem(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-[#0D0D0D] border border-[#292929] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-medium">Delete Schedule Anchor?</h3>
            </div>
            <p className="text-xs font-light text-[#999999] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#F5F5F5]">"{deletingItem.title}"</strong> from your {deletingItem.day} schedule? This will sync across your devices.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] border border-[#292929] text-xs text-[#999999] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-900/80 border border-rose-700/50 text-rose-200 font-medium text-xs transition-colors cursor-pointer"
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
