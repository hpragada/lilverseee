import { CalendarEvent } from '../types';

export interface NotificationPreferences {
  enabled: boolean;
  focusTimer: boolean;
  taskReminders: boolean;
  taskReminderTime: string; // "HH:MM" e.g. "10:00"
  eventReminders: boolean;
  eventReminderLeadMinutes: number; // minutes before event (e.g. 15)
  sweetLoveNotes: boolean;
  sweetNoteTime: string; // "HH:MM" e.g. "14:00"
  soundEnabled: boolean;
  reminderBirthdays?: boolean;
  reminderAnniversaries?: boolean;
  reminderAppointments?: boolean;
  reminderTasks?: boolean;
  reminderRituals?: boolean;
  inAppPopups?: boolean;
  defaultSnoozeMinutes?: number;
}

export interface NotificationDispatchResult {
  success: boolean;
  nativeDispatched: boolean;
  inAppDispatched: boolean;
  error?: string;
  previewBlocked?: boolean;
}

export interface CuteReminderMessage {
  heading: string;
  body: string;
  emoji: string;
  badge: string;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: false,
  focusTimer: true,
  taskReminders: true,
  taskReminderTime: '10:00',
  eventReminders: true,
  eventReminderLeadMinutes: 15,
  sweetLoveNotes: true,
  sweetNoteTime: '14:00',
  soundEnabled: true,
  reminderBirthdays: true,
  reminderAnniversaries: true,
  reminderAppointments: true,
  reminderTasks: true,
  reminderRituals: true,
  inAppPopups: true,
  defaultSnoozeMinutes: 10,
};

const STORAGE_KEYS = {
  PREFS: 'mlw_notification_preferences',
  NOTIFIED_EVENTS: 'mlw_notified_event_keys',
  LAST_TASK_REMINDER_DATE: 'mlw_last_task_reminder_date',
  LAST_LOVE_NOTE_DATE: 'mlw_last_love_note_date',
};

const memoryStorageFallback: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStorageFallback[key] || null;
}

function safeSetItem(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      localStorage.setItem(key, val);
      return;
    }
  } catch {}
  memoryStorageFallback[key] = val;
}

// Play soothing melodic chime
export function playNotificationChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (warm harmonic bloom)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.9);
    });
  } catch (e) {
    console.warn('Audio chime notice failed', e);
  }
}

/**
 * Robust time string parser supporting both 24h ("14:30") and 12h AM/PM ("02:30 PM")
 */
export function parseEventTime(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numbersPart = clean.replace(/[^\d:]/g, '');
  const parts = numbersPart.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  let hour = parts[0];
  const minute = parts[1];
  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  return { hour, minute };
}

/**
 * Check if a calendar event is scheduled for today (supporting daily, weekly, and yearly repeats)
 */
export function isEventDueToday(event: CalendarEvent, targetDate: Date = new Date()): boolean {
  if (!event.date) return false;
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();
  const targetDayOfWeek = targetDate.getDay();

  const [evYear, evMonth, evDay] = event.date.split('-').map(Number);
  if (isNaN(evYear) || isNaN(evMonth) || isNaN(evDay)) return false;

  const evDateObj = new Date(evYear, evMonth - 1, evDay);
  const evDayOfWeek = evDateObj.getDay();

  const repeat = event.repeat || 'none';
  if (repeat === 'daily') return true;
  if (repeat === 'weekly') return targetDayOfWeek === evDayOfWeek;
  if (repeat === 'yearly') return targetMonth === evMonth && targetDay === evDay;
  return targetYear === evYear && targetMonth === evMonth && targetDay === evDay;
}

/**
 * Check if a calendar event is scheduled for or repeats on a specific date (YYYY-MM-DD)
 */
export function isEventOnDate(event: CalendarEvent, dateStr: string): boolean {
  if (!event || !event.date) return false;
  const [targetYear, targetMonth, targetDay] = dateStr.split('-').map(Number);
  if (isNaN(targetYear) || isNaN(targetMonth) || isNaN(targetDay)) return false;
  const targetDate = new Date(targetYear, targetMonth - 1, targetDay);
  return isEventDueToday(event, targetDate);
}

/**
 * Generate cute, personalized reminder messages tailored by event category
 */
export function getCuteReminderMessage(event: CalendarEvent): CuteReminderMessage {
  const category = (event.category || event.type || 'ritual').toLowerCase();
  const title = event.title;
  const time = event.time;

  switch (category) {
    case 'birthday':
      return {
        heading: `🎂 Birthday Celebration: ${title}! 💕`,
        body: `Wishing ${title} the most magical, love-filled day! Don't forget to celebrate and share warm smiles! 🥂✨`,
        emoji: '🎂',
        badge: 'Birthday Celebration',
      };
    case 'anniversary':
      return {
        heading: `💖 Anniversary Milestone: ${title}! 💕`,
        body: `Happy Anniversary! Celebrating love, treasured memories, and unforgettable moments together! 🥂💐`,
        emoji: '💖',
        badge: 'Anniversary Milestone',
      };
    case 'appointment':
      return {
        heading: `🩺 Appointment Reminder: ${title}`,
        body: `Scheduled for ${time}. You are prepared and completely capable. Take a slow, gentle breath! 🌸✨`,
        emoji: '🩺',
        badge: 'Scheduled Appointment',
      };
    case 'task':
      return {
        heading: `📝 Gentle Task: ${title}`,
        body: `Scheduled for ${time}. Take your time, step by step—zero pressure, only what feels good 💕`,
        emoji: '📝',
        badge: 'Gentle Task',
      };
    case 'important':
      return {
        heading: `🌟 Important Reminder: ${title}`,
        body: `Scheduled for ${time}. Sending you calm focus, clarity, and reassuring energy! ✨`,
        emoji: '🌟',
        badge: 'Important Date',
      };
    case 'personal':
      return {
        heading: `🌸 Personal Oasis: ${title}`,
        body: `Scheduled for ${time}. A special moment dedicated to you and whatever brings you peace 💕`,
        emoji: '🌸',
        badge: 'Personal Sanctuary',
      };
    case 'career':
      return {
        heading: `💼 Vision & Work: ${title}`,
        body: `Scheduled for ${time}. You bring such brilliance to everything you do! 🚀✨`,
        emoji: '💼',
        badge: 'Career Rhythm',
      };
    case 'rest':
      return {
        heading: `🛋️ Rest & Soft Pause: ${title}`,
        body: `Time to let go of doing. Cozy up, relax your shoulders, and enjoy this quiet oasis 🌿🕊️`,
        emoji: '🛋️',
        badge: 'Rest & Soft Pause',
      };
    case 'ritual':
    default:
      return {
        heading: `🌿 Sanctuary Ritual: ${title} 💕`,
        body: `Scheduled for ${time}. Step away from the noise, breathe deeply, and nourish your soul ✨`,
        emoji: '🌿',
        badge: 'Mindful Ritual',
      };
  }
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private inAppNotificationListeners: Set<(payload: { title: string; body: string }) => void> = new Set();
  private activeReminderListeners: Set<(event: CalendarEvent, message: CuteReminderMessage) => void> = new Set();

  constructor() {
    this.initServiceWorker();
  }

  // Register service worker for modern mobile (Android/iOS) and desktop background notifications
  public async initServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;
      } catch (err) {
        console.info('ServiceWorker not registered, falling back to desktop Notification API', err);
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public isInIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  public getPreferences(): NotificationPreferences {
    try {
      const saved = safeGetItem(STORAGE_KEYS.PREFS);
      if (saved) {
        return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(saved) };
      }
      const browserGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      return {
        ...DEFAULT_NOTIFICATION_PREFS,
        enabled: browserGranted,
      };
    } catch {
      return DEFAULT_NOTIFICATION_PREFS;
    }
  }

  public savePreferences(prefs: NotificationPreferences) {
    try {
      safeSetItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Could not save notification preferences', e);
    }
  }

  // Request browser permission explicitly when user clicks Enable Notifications
  public async requestPermission(): Promise<{ granted: boolean; error?: string }> {
    if (!this.isSupported()) {
      return { granted: false, error: 'Notifications API is not supported in this browser.' };
    }

    if (Notification.permission === 'granted') {
      return { granted: true };
    }

    if (Notification.permission === 'denied') {
      return {
        granted: false,
        error: 'Notifications are blocked in your browser settings. Please allow notifications in site settings.',
      };
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        return { granted: true };
      } else {
        const inIframe = this.isInIframe();
        return {
          granted: false,
          error: inIframe
            ? 'The Google AI Studio preview iframe cannot prompt for permissions. Open the app in a standalone tab.'
            : 'Notification permission was not granted.',
        };
      }
    } catch (e: any) {
      console.warn('Error requesting notification permission', e);
      const inIframe = this.isInIframe();
      return {
        granted: false,
        error: inIframe
          ? 'The Google AI Studio preview iframe blocked requesting notification permission. Open in a standalone tab.'
          : (e?.message || 'Error requesting notification permission.'),
      };
    }
  }

  // Send notification to device (works on desktop & mobile)
  public async sendNotification(
    title: string,
    options: {
      body: string;
      tag?: string;
      data?: any;
      silent?: boolean;
      forceNative?: boolean;
    }
  ): Promise<NotificationDispatchResult> {
    const prefs = this.getPreferences();

    if (!prefs.enabled && !options.forceNative) {
      return {
        success: false,
        nativeDispatched: false,
        inAppDispatched: false,
        error: 'Notifications are turned off in app settings.',
      };
    }

    if (prefs.soundEnabled && !options.silent) {
      playNotificationChime();
    }

    this.notifyInAppListeners({ title, body: options.body });

    if (!this.isSupported()) {
      return {
        success: false,
        nativeDispatched: false,
        inAppDispatched: true,
        error: 'Notifications API is not supported in this browser environment.',
      };
    }

    if (Notification.permission !== 'granted') {
      return {
        success: false,
        nativeDispatched: false,
        inAppDispatched: true,
        error: `Browser notification permission is currently "${Notification.permission}".`,
      };
    }

    let nativeDispatched = false;
    let previewBlocked = false;
    let dispatchError: string | undefined;

    if (this.swRegistration && 'showNotification' in this.swRegistration) {
      try {
        await this.swRegistration.showNotification(title, {
          body: options.body,
          tag: options.tag,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: options.data,
        });
        nativeDispatched = true;
      } catch (swErr: any) {
        console.info('ServiceWorker showNotification bypassed, falling back to window Notification', swErr);
      }
    }

    if (!nativeDispatched) {
      try {
        const n = new Notification(title, {
          body: options.body,
          tag: options.tag,
          icon: '/favicon.ico',
        });

        n.onclick = () => {
          try {
            window.focus();
            n.close();
          } catch {}
        };

        nativeDispatched = true;
      } catch (err: any) {
        console.warn('Native notification failed to instantiate:', err);
        if (this.isInIframe()) {
          previewBlocked = true;
          dispatchError =
            'Google AI Studio preview iframe blocked the notification popup. Open the standalone tab to see native system notifications.';
        } else {
          dispatchError = err?.message || 'Failed to dispatch browser notification.';
        }
      }
    }

    return {
      success: nativeDispatched,
      nativeDispatched,
      inAppDispatched: true,
      previewBlocked,
      error: dispatchError,
    };
  }

  // Send a cute welcome / test notification
  public async sendTestNotification(): Promise<NotificationDispatchResult> {
    return this.sendNotification('My Little World 💕', {
      body: 'Notifications are active! Gentle reminders, focus celebrations, and sweet notes are on their way ✨',
      tag: 'mlw_test_notification',
      forceNative: true,
    });
  }

  // Focus Timer Completion Notification
  public async sendFocusTimerNotification(mode: 'focus' | 'shortBreak' | 'longBreak', customMessage?: string) {
    const prefs = this.getPreferences();
    if (!prefs.enabled || !prefs.focusTimer) return;

    if (mode === 'focus') {
      const defaultMsg =
        customMessage ||
        'Focus session crushed! Step away, stretch, and let me send you a thousand warm kisses 😘💕';
      await this.sendNotification('Focus Session Complete 💕', {
        body: defaultMsg,
        tag: 'mlw_focus_timer',
      });
    } else {
      const defaultMsg =
        customMessage ||
        'Break time is up, sunshine! Ready to bring that brilliant energy back? 🌸✨';
      await this.sendNotification('Break Finished ☕', {
        body: defaultMsg,
        tag: 'mlw_focus_break',
      });
    }
  }

  // Check scheduled tasks, events, and sweet notes
  public checkScheduledReminders(
    tasks: { id: string; title?: string; text?: string; completed: boolean }[],
    events: CalendarEvent[]
  ) {
    const prefs = this.getPreferences();
    if (!prefs.enabled) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    // 1. Task Reminders at configured time
    if (prefs.taskReminders && prefs.taskReminderTime) {
      const lastTaskDate = safeGetItem(STORAGE_KEYS.LAST_TASK_REMINDER_DATE);
      if (lastTaskDate !== todayStr && currentTimeStr >= prefs.taskReminderTime) {
        const pendingTasks = tasks.filter((t) => !t.completed);
        if (pendingTasks.length > 0) {
          const taskCount = pendingTasks.length;
          const firstTaskName = pendingTasks[0].title || pendingTasks[0].text || 'a gentle task';
          const body =
            taskCount === 1
              ? `You have 1 gentle task waiting today: "${firstTaskName}". No stress, take your time 💕`
              : `You have ${taskCount} gentle tasks on your list today. Remember: zero guilt, only what feels good 🌸`;

          this.sendNotification('Gentle Sanctuary Reminder 🌸', {
            body,
            tag: `mlw_task_reminder_${todayStr}`,
          });
          safeSetItem(STORAGE_KEYS.LAST_TASK_REMINDER_DATE, todayStr);
        }
      }
    }

    // 2. Sweet Midday Love Note
    if (prefs.sweetLoveNotes && prefs.sweetNoteTime) {
      const lastNoteDate = safeGetItem(STORAGE_KEYS.LAST_LOVE_NOTE_DATE);
      if (lastNoteDate !== todayStr && currentTimeStr >= prefs.sweetNoteTime) {
        const sweetNotes = [
          'Just in case no one told you yet today: you are so deeply loved and cherished ❤️',
          'Halfway through the day and you’ve crossed my mind about a hundred times already 💭💕',
          'Sending you a midday refill of warm hugs, quiet comfort, and sweet energy 🧋✨',
          'Take a slow breath, darling. You are doing so well and I’m so proud of you 🌿',
        ];
        const randomNote = sweetNotes[Math.floor(Math.random() * sweetNotes.length)];
        this.sendNotification('A Sweet Whisper for You 💕', {
          body: randomNote,
          tag: `mlw_sweet_note_${todayStr}`,
        });
        safeSetItem(STORAGE_KEYS.LAST_LOVE_NOTE_DATE, todayStr);
      }
    }

    // 3. Smart Calendar Event & Reminder Check
    if (prefs.eventReminders && Array.isArray(events)) {
      let notifiedKeys: string[] = [];
      try {
        const savedKeys = safeGetItem(STORAGE_KEYS.NOTIFIED_EVENTS);
        notifiedKeys = savedKeys ? JSON.parse(savedKeys) : [];
      } catch {
        notifiedKeys = [];
      }

      events.forEach((ev) => {
        if (!ev || !ev.title || ev.isCompleted) return;

        // Check category filtering preferences
        const cat = (ev.category || ev.type || 'ritual').toLowerCase();
        if (cat === 'birthday' && prefs.reminderBirthdays === false) return;
        if (cat === 'anniversary' && prefs.reminderAnniversaries === false) return;
        if (cat === 'appointment' && prefs.reminderAppointments === false) return;
        if (cat === 'task' && prefs.reminderTasks === false) return;
        if (cat === 'ritual' && prefs.reminderRituals === false) return;

        // Check if currently snoozed
        if (ev.snoozedUntil) {
          const snoozeMs = new Date(ev.snoozedUntil).getTime();
          if (now.getTime() < snoozeMs) {
            // Still in snooze duration, do not notify yet
            return;
          }
          // Snooze expired! Trigger notification for this snooze instance
          const snoozeKey = `${ev.id}_snooze_${ev.snoozedUntil}`;
          if (!notifiedKeys.includes(snoozeKey)) {
            notifiedKeys.push(snoozeKey);
            safeSetItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify(notifiedKeys));

            const cuteMsg = getCuteReminderMessage(ev);
            this.sendNotification(cuteMsg.heading, {
              body: cuteMsg.body,
              tag: `mlw_reminder_${ev.id}`,
            });

            if (prefs.inAppPopups !== false) {
              this.notifyActiveReminderListeners(ev, cuteMsg);
            }
          }
          return;
        }

        // Standard scheduled check
        if (!isEventDueToday(ev, now)) return;

        const timeObj = parseEventTime(ev.time);
        if (!timeObj) return;

        const eventDateTime = new Date(now);
        eventDateTime.setHours(timeObj.hour, timeObj.minute, 0, 0);

        const diffMinutes = Math.round((eventDateTime.getTime() - now.getTime()) / 60000);
        const leadMins = prefs.eventReminderLeadMinutes ?? 15;

        // Trigger when within lead time window (from 10 mins past to leadMins before)
        if (diffMinutes >= -10 && diffMinutes <= leadMins) {
          const eventKey = `${ev.id}_${todayStr}`;
          if (!notifiedKeys.includes(eventKey)) {
            notifiedKeys.push(eventKey);
            if (notifiedKeys.length > 250) {
              notifiedKeys = notifiedKeys.slice(-150);
            }
            safeSetItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify(notifiedKeys));

            const cuteMsg = getCuteReminderMessage(ev);
            this.sendNotification(cuteMsg.heading, {
              body: cuteMsg.body,
              tag: `mlw_event_${ev.id}`,
            });

            if (prefs.inAppPopups !== false) {
              this.notifyActiveReminderListeners(ev, cuteMsg);
            }
          }
        }
      });
    }
  }

  // In-app listener registration for general notifications
  public onInAppNotification(listener: (payload: { title: string; body: string }) => void) {
    this.inAppNotificationListeners.add(listener);
    return () => {
      this.inAppNotificationListeners.delete(listener);
    };
  }

  private notifyInAppListeners(payload: { title: string; body: string }) {
    this.inAppNotificationListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.warn('Error in in-app notification listener', e);
      }
    });
  }

  // In-app active reminder popup listeners
  public onActiveReminder(listener: (event: CalendarEvent, message: CuteReminderMessage) => void) {
    this.activeReminderListeners.add(listener);
    return () => {
      this.activeReminderListeners.delete(listener);
    };
  }

  private notifyActiveReminderListeners(event: CalendarEvent, message: CuteReminderMessage) {
    this.activeReminderListeners.forEach((listener) => {
      try {
        listener(event, message);
      } catch (e) {
        console.warn('Error in active reminder listener', e);
      }
    });
  }
}

export const notificationService = new NotificationService();
