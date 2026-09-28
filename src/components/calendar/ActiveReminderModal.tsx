import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Clock,
  CheckCircle,
  X,
  Sparkles,
  Calendar,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import {
  notificationService,
  CuteReminderMessage,
} from '../../services/notificationService';

export const ActiveReminderModal: React.FC = () => {
  const { snoozeEvent, toggleEventCompleted } = useApp();
  const [activeItem, setActiveItem] = useState<{
    event: CalendarEvent;
    message: CuteReminderMessage;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = notificationService.onActiveReminder((event, message) => {
      setActiveItem({ event, message });
    });
    return unsubscribe;
  }, []);

  if (!activeItem) return null;

  const { event, message } = activeItem;

  const handleSnooze = (minutes: number) => {
    snoozeEvent(event.id, minutes);
    setActiveItem(null);
  };

  const handleComplete = () => {
    toggleEventCompleted(event.id);
    setActiveItem(null);
  };

  const handleDismiss = () => {
    setActiveItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0D0D0D] border border-[#292929] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Soft silver background glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#C0C0C0]/10 to-transparent blur-xl pointer-events-none rounded-3xl" />

        {/* Top Bar: Category badge & Close */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#141414] border border-[#292929] flex items-center justify-center text-lg shadow-sm">
              {message.emoji}
            </span>
            <div>
              <span className="text-[11px] font-medium text-[#C0C0C0] uppercase tracking-wider block">
                {message.badge}
              </span>
              <span className="text-xs text-[#999999] font-light flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#C0C0C0]" />
                <span>{event.time}</span>
                {event.repeat && event.repeat !== 'none' && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{event.repeat}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-[#999999] hover:text-[#F5F5F5] flex items-center justify-center transition-colors cursor-pointer"
            title="Dismiss reminder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Personalized Note */}
        <div className="relative z-10 space-y-2">
          <h3 className="text-base sm:text-lg font-normal text-[#F5F5F5] leading-snug">
            {event.title}
          </h3>

          <div className="p-3.5 rounded-xl bg-[#141414] border border-[#292929] space-y-1">
            <p className="text-xs text-[#C0C0C0] italic font-light leading-relaxed">
              “{message.body}”
            </p>
          </div>

          {(event.notes || event.description) && (
            <p className="text-xs text-[#999999] font-light leading-relaxed pl-1">
              {event.notes || event.description}
            </p>
          )}
        </div>

        {/* Action Controls: Snooze & Mark Completed */}
        <div className="relative z-10 pt-2 border-t border-[#292929] space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#999999]">
            <span className="font-light">Snooze reminder:</span>
            <div className="flex items-center gap-1.5">
              {[5, 10, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleSnooze(mins)}
                  className="px-2.5 py-1 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-[11px] font-light text-[#C0C0C0] hover:text-white transition-all cursor-pointer"
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleDismiss}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-xs font-light text-[#999999] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={handleComplete}
              className="min-h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8] text-[#000000] text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shadow-[#C0C0C0]/20 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark as Completed 💕</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
