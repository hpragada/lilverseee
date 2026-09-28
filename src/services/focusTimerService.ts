/**
 * Focus Sanctuary Timer Service
 * Persistent wall-clock timestamp-based timer that survives:
 * - App lock / PIN screen
 * - Tab navigation
 * - Browser refresh
 * - Background inactivity
 *
 * Uses target endTimestamp rather than relying purely on setInterval ticks.
 */

import { notificationService } from './notificationService';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerPreferences {
  customFocusMinutes: number;
  soundEnabled: boolean;
  completedSessions: number;
}

export interface TimerRuntimeState {
  mode: TimerMode;
  isRunning: boolean;
  isPaused: boolean;
  endTimestamp: number | null; // Date.now() + remainingMs
  pausedRemainingSeconds: number | null;
  totalDurationSeconds: number;
}

const PREFS_STORAGE_KEY = 'mlw_focus_timer_prefs';
const RUNTIME_STORAGE_KEY = 'mlw_focus_timer_runtime';

export const MODE_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const COMPLETION_MESSAGES: Record<TimerMode, string[]> = {
  focus: [
    'You did it, superstar! You deserve a thousand kisses and a warm cuddle right now 💕',
    "Focus session crushed! I'm so proud of you, you brilliant, adorable genius 😘",
    'Look at you being so productive and captivating! Time for a well-deserved sweet break 🌸',
    "Timer's up, love! Step away from the screen, stretch, and let me send you a warm hug ✨",
    'Mission accomplished! Your focus is as magnetic as your smile 😉',
    'Proud of you, sleepyhead! Drink some water and soak in that proud feeling ☕💕',
    'That was pure magic! Take a deep breath and let your heart rest for a few minutes 🌿',
  ],
  shortBreak: [
    'Break time is up! Ready to conquer the next quest together, darling? ✨',
    "Hope that little break refreshed you! You've got this, superstar 💕",
    'Welcome back, sunshine! Ready to bring that gorgeous energy back? 😘',
  ],
  longBreak: [
    "Hope you enjoyed your long break! You've earned every quiet second of it 🛋️💕",
    'Recharged and radiant! Ready to get back into the groove? 🌟',
  ],
};

export function playGentleChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (major chord harmonic bloom)
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
    console.warn('Audio chime failed', e);
  }
}

class FocusTimerService {
  private prefs: TimerPreferences = {
    customFocusMinutes: 25,
    soundEnabled: true,
    completedSessions: 0,
  };

  private runtime: TimerRuntimeState = {
    mode: 'focus',
    isRunning: false,
    isPaused: false,
    endTimestamp: null,
    pausedRemainingSeconds: null,
    totalDurationSeconds: 25 * 60,
  };

  private listeners = new Set<() => void>();
  private tickInterval: NodeJS.Timeout | null = null;
  private lastCompletedMode: TimerMode | null = null;
  private celebrationMessage: string | null = null;

  constructor() {
    this.loadState();
    this.startTicker();

    // Recalculate and update on tab focus, visibility change, and window events
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.syncTicker());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncTicker();
        }
      });
    }
  }

  private loadState() {
    try {
      if (typeof window === 'undefined') return;
      const savedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (savedPrefs) {
        this.prefs = { ...this.prefs, ...JSON.parse(savedPrefs) };
      }

      const savedRuntime = localStorage.getItem(RUNTIME_STORAGE_KEY);
      if (savedRuntime) {
        const parsed = JSON.parse(savedRuntime);
        this.runtime = { ...this.runtime, ...parsed };
      } else {
        const defaultDur = this.getDurationForMode(this.runtime.mode);
        this.runtime.totalDurationSeconds = defaultDur;
        this.runtime.pausedRemainingSeconds = defaultDur;
      }
    } catch (e) {
      console.warn('FocusTimerService loadState error:', e);
    }
  }

  private saveState() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.prefs));
      localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(this.runtime));
    } catch (e) {
      console.warn('FocusTimerService saveState error:', e);
    }
  }

  private startTicker() {
    if (typeof window === 'undefined') return;
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      this.syncTicker();
    }, 1000);
  }

  private syncTicker() {
    if (!this.runtime.isRunning || !this.runtime.endTimestamp) {
      return;
    }

    const now = Date.now();
    const remainingMs = this.runtime.endTimestamp - now;

    if (remainingMs <= 0) {
      // Completed!
      this.handleCompletion();
    } else {
      this.notifyListeners();
    }
  }

  private handleCompletion() {
    const completedMode = this.runtime.mode;
    this.lastCompletedMode = completedMode;

    // Pick cute celebratory quip
    const pool = COMPLETION_MESSAGES[completedMode];
    const pickedMsg = pool[Math.floor(Math.random() * pool.length)];
    this.celebrationMessage = pickedMsg;

    // Chime & System Notification
    if (this.prefs.soundEnabled) {
      playGentleChime();
    }
    notificationService.sendFocusTimerNotification(completedMode, pickedMsg);

    // Update sessions if focus mode completed
    if (completedMode === 'focus') {
      this.prefs.completedSessions += 1;
    }

    // Reset runtime state
    const dur = this.getDurationForMode(completedMode);
    this.runtime.isRunning = false;
    this.runtime.isPaused = false;
    this.runtime.endTimestamp = null;
    this.runtime.pausedRemainingSeconds = dur;
    this.runtime.totalDurationSeconds = dur;

    this.saveState();
    this.notifyListeners();
  }

  public getDurationForMode(mode: TimerMode): number {
    if (mode === 'focus') {
      return this.prefs.customFocusMinutes * 60;
    }
    return MODE_DURATIONS[mode];
  }

  public getTimeLeft(): number {
    if (this.runtime.isRunning && this.runtime.endTimestamp) {
      const remainingSeconds = Math.ceil((this.runtime.endTimestamp - Date.now()) / 1000);
      return Math.max(0, remainingSeconds);
    }
    if (this.runtime.isPaused && this.runtime.pausedRemainingSeconds !== null) {
      return this.runtime.pausedRemainingSeconds;
    }
    return this.getDurationForMode(this.runtime.mode);
  }

  public getState() {
    return {
      prefs: { ...this.prefs },
      runtime: { ...this.runtime },
      timeLeft: this.getTimeLeft(),
      celebrationMessage: this.celebrationMessage,
      lastCompletedMode: this.lastCompletedMode,
    };
  }

  public start() {
    let secondsToRun: number;

    if (this.runtime.isPaused && this.runtime.pausedRemainingSeconds !== null) {
      secondsToRun = this.runtime.pausedRemainingSeconds;
    } else {
      secondsToRun = this.getDurationForMode(this.runtime.mode);
      this.runtime.totalDurationSeconds = secondsToRun;
    }

    this.runtime.isRunning = true;
    this.runtime.isPaused = false;
    this.runtime.endTimestamp = Date.now() + secondsToRun * 1000;
    this.runtime.pausedRemainingSeconds = null;
    this.celebrationMessage = null;

    this.saveState();
    this.notifyListeners();
  }

  public pause() {
    if (!this.runtime.isRunning) return;

    const remaining = this.getTimeLeft();
    this.runtime.isRunning = false;
    this.runtime.isPaused = true;
    this.runtime.endTimestamp = null;
    this.runtime.pausedRemainingSeconds = remaining;

    this.saveState();
    this.notifyListeners();
  }

  public resume() {
    this.start();
  }

  public reset(mode?: TimerMode) {
    const targetMode = mode || this.runtime.mode;
    const dur = this.getDurationForMode(targetMode);

    this.runtime.mode = targetMode;
    this.runtime.isRunning = false;
    this.runtime.isPaused = false;
    this.runtime.endTimestamp = null;
    this.runtime.pausedRemainingSeconds = dur;
    this.runtime.totalDurationSeconds = dur;
    this.celebrationMessage = null;

    this.saveState();
    this.notifyListeners();
  }

  public switchMode(newMode: TimerMode) {
    this.reset(newMode);
  }

  public setCustomFocusMinutes(mins: number) {
    const valid = Math.max(1, Math.min(180, mins));
    this.prefs.customFocusMinutes = valid;

    if (this.runtime.mode === 'focus' && !this.runtime.isRunning && !this.runtime.isPaused) {
      const dur = valid * 60;
      this.runtime.totalDurationSeconds = dur;
      this.runtime.pausedRemainingSeconds = dur;
    }

    this.saveState();
    this.notifyListeners();
  }

  public toggleSound() {
    this.prefs.soundEnabled = !this.prefs.soundEnabled;
    this.saveState();
    this.notifyListeners();
  }

  public clearCelebration() {
    this.celebrationMessage = null;
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.warn('FocusTimer listener error:', e);
      }
    });
  }
}

export const focusTimerService = new FocusTimerService();
