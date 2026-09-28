import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  X,
  Repeat,
  Heart,
  Tag,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent, EventCategory, ReminderRepeatOption } from '../../types';

interface EditReminderModalProps {
  event?: CalendarEvent | null;
  initialDate?: string;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { id: EventCategory; label: string; icon: string }[] = [
  { id: 'ritual', label: 'Mindful Ritual', icon: '🌿' },
  { id: 'birthday', label: 'Birthday Celebration', icon: '🎂' },
  { id: 'anniversary', label: 'Anniversary Milestone', icon: '💖' },
  { id: 'appointment', label: 'Appointment', icon: '🩺' },
  { id: 'task', label: 'Gentle Task', icon: '📝' },
  { id: 'important', label: 'Important Date', icon: '🌟' },
  { id: 'personal', label: 'Personal Oasis', icon: '🌸' },
  { id: 'career', label: 'Career / Vision', icon: '💼' },
  { id: 'rest', label: 'Rest & Soft Pause', icon: '🛋️' },
];

const REPEAT_OPTIONS: { id: ReminderRepeatOption; label: string }[] = [
  { id: 'none', label: 'Does not repeat' },
  { id: 'daily', label: 'Daily (Every day)' },
  { id: 'weekly', label: 'Weekly (Same day of week)' },
  { id: 'yearly', label: 'Yearly (Birthdays / Anniversaries)' },
];

export const EditReminderModal: React.FC<EditReminderModalProps> = ({ event, initialDate, onClose }) => {
  const { updateEvent, addEvent } = useApp();

  const isEditing = Boolean(event?.id);

  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(
    event?.date || initialDate || new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = useState(event?.time || '09:00 AM');
  const [category, setCategory] = useState<EventCategory>(
    event?.category || event?.type || 'ritual'
  );
  const [repeat, setRepeat] = useState<ReminderRepeatOption>(
    event?.repeat || 'none'
  );
  const [notes, setNotes] = useState(event?.notes || event?.description || '');

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDate(event.date || new Date().toISOString().split('T')[0]);
      setTime(event.time || '09:00 AM');
      setCategory(event.category || event.type || 'ritual');
      setRepeat(event.repeat || 'none');
      setNotes(event.notes || event.description || '');
    }
  }, [event]);

  if (!event) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEditing && event.id) {
      updateEvent(event.id, {
        title: title.trim(),
        date,
        time,
        type: category,
        category,
        repeat,
        notes: notes.trim() || undefined,
        description: notes.trim() || undefined,
      });
    } else {
      addEvent({
        title: title.trim(),
        date,
        time,
        type: category,
        category,
        repeat,
        notes: notes.trim() || undefined,
        description: notes.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0D0D0D] border border-[#292929] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-normal text-[#F5F5F5]">
                {isEditing ? 'Edit Reminder or Ritual' : 'Create Smart Reminder'}
              </h3>
              <p className="text-[11px] text-[#999999] font-light">
                Syncs across devices with desktop & mobile alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#111111] hover:bg-[#1A1A1A] text-[#999999] hover:text-[#F5F5F5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-light text-[#999999] mb-1">
              Title or Intention *
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. Sarah's Birthday, Doctor appointment, Evening tea ritual"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0] min-h-[44px]"
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-light text-[#999999] mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span>Category</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2 rounded-xl border text-xs font-light text-left flex items-center gap-2 transition-all cursor-pointer min-h-[40px] ${
                    category === cat.id
                      ? 'bg-[#141414] border-[#C0C0C0] text-[#F5F5F5] shadow-sm'
                      : 'bg-[#080808] border-[#292929] text-[#999999] hover:text-[#F5F5F5] hover:bg-[#111111]'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-light text-[#999999] mb-1 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-light text-[#999999] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span>Time</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 09:00 AM or 14:30"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0] min-h-[44px]"
              />
            </div>
          </div>

          {/* Repeat Option */}
          <div>
            <label className="block text-xs font-light text-[#999999] mb-1 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span>Repeat Schedule</span>
            </label>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as ReminderRepeatOption)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0] min-h-[44px]"
            >
              {REPEAT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes / Details */}
          <div>
            <label className="block text-xs font-light text-[#999999] mb-1">
              Personal Notes or Gentle Reminder Details (optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Don't forget to wrap the gift, bring chamomile tea..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0] resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#292929]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-light text-[#999999] hover:text-[#F5F5F5] min-h-[44px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 rounded-xl silver-btn-primary text-black text-xs font-medium transition-all disabled:opacity-40 min-h-[44px] flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-black" />
              <span>{isEditing ? 'Save Changes' : 'Create Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
