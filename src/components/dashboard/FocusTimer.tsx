import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Coffee,
  Sliders,
  X,
  Heart,
} from 'lucide-react';
import {
  focusTimerService,
  TimerMode,
} from '../../services/focusTimerService';

interface FocusTimerProps {
  compact?: boolean;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ compact = false }) => {
  const [, setTick] = useState(0);

  // Subscribe to persistent timer service
  useEffect(() => {
    const unsubscribe = focusTimerService.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const state = focusTimerService.getState();
  const { prefs, runtime, timeLeft, celebrationMessage } = state;
  const { mode, isRunning, isPaused, totalDurationSeconds } = runtime;

  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>(
    prefs.customFocusMinutes.toString()
  );

  const handleStart = () => {
    focusTimerService.start();
  };

  const handlePause = () => {
    focusTimerService.pause();
  };

  const handleResume = () => {
    focusTimerService.resume();
  };

  const handleReset = () => {
    focusTimerService.reset();
  };

  const handleSwitchMode = (newMode: TimerMode) => {
    focusTimerService.switchMode(newMode);
  };

  const handleApplyCustomMinutes = (mins: number) => {
    const valid = Math.max(1, Math.min(180, mins));
    focusTimerService.setCustomFocusMinutes(valid);
    setCustomInput(valid.toString());
    setShowCustomizer(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Circular progress calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDurationSeconds > 0 ? timeLeft / totalDurationSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <section className="relative w-full rounded-3xl bg-[#0A0A0A] border border-[#292929] p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(192,192,192,0.06)] backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Background Subtle Gold Gradient Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C0C0C0]/10 via-[#D9D9D9]/8 to-[#A6A6A6]/10 opacity-40 blur-xl pointer-events-none" />

      {/* Top Bar: Title, Mode Badges & Sound Toggle */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-[#C0C0C0]">
            <Sparkles className="w-4 h-4 text-[#C0C0C0]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-[#F5F5F5] tracking-wide">
                Focus Sanctuary
              </h2>
              {prefs.completedSessions > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141414] text-[#C0C0C0] border border-[#C0C0C0]/30 font-light">
                  {prefs.completedSessions} Completed
                </span>
              )}
            </div>
            <p className="text-xs font-light text-[#808080]">
              Gentle interval timer with soft breaks & soothing chimes
            </p>
          </div>
        </div>

        {/* Top Controls: Sound & Duration Customize */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Customize Duration Button */}
          <button
            onClick={() => setShowCustomizer(!showCustomizer)}
            title="Customize focus duration"
            className={`min-h-[34px] px-2.5 rounded-xl border text-xs font-light flex items-center gap-1.5 transition-colors cursor-pointer ${
              showCustomizer
                ? 'bg-[#141414] border-[#C0C0C0]/50 text-[#C0C0C0]'
                : 'bg-[#0E0E0E] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px]">{prefs.customFocusMinutes}m Focus</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => focusTimerService.toggleSound()}
            title={prefs.soundEnabled ? 'Chime sound enabled' : 'Chime muted'}
            className={`min-h-[34px] min-w-[34px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
              prefs.soundEnabled
                ? 'bg-[#141414] border-[#2A2A2A] text-[#C0C0C0]'
                : 'bg-[#0E0E0E] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
            }`}
          >
            {prefs.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Customizer Dropdown Drawer (Collapsible) */}
      {showCustomizer && (
        <div className="relative z-10 my-3 p-3.5 rounded-xl bg-[#0E0E0E] border border-[#2A2A2A] space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-[#F5F5F5]">
            <span className="font-light">Set Custom Focus Duration</span>
            <button
              onClick={() => setShowCustomizer(false)}
              className="text-[#808080] hover:text-[#F5F5F5] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[15, 20, 25, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => handleApplyCustomMinutes(m)}
                className={`min-h-[32px] px-3 rounded-lg text-xs font-light border transition-all cursor-pointer ${
                  prefs.customFocusMinutes === m
                    ? 'bg-[#C0C0C0]/20 border-[#C0C0C0]/50 text-[#FFFFFF] font-medium'
                    : 'bg-[#141414] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
                }`}
              >
                {m}m
              </button>
            ))}

            {/* Custom Minutes Input */}
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="number"
                min="1"
                max="180"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Mins"
                className="w-16 px-2 py-1 rounded-lg bg-[#141414] border border-[#2A2A2A] text-xs text-center text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
              />
              <button
                onClick={() => handleApplyCustomMinutes(parseInt(customInput) || 25)}
                className="min-h-[32px] px-3 rounded-lg bg-[#C0C0C0] hover:bg-[#D9D9D9] text-[#000000] text-xs font-medium cursor-pointer"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-4 pb-2">
        <button
          onClick={() => handleSwitchMode('focus')}
          className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-light flex items-center gap-1.5 border transition-all cursor-pointer ${
            mode === 'focus'
              ? 'bg-[#141414] border-[#C0C0C0]/50 text-[#F5F5F5] shadow-sm shadow-[#C0C0C0]/15'
              : 'bg-[#0E0E0E] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
          }`}
        >
          <Sparkles className="w-3 h-3 text-[#C0C0C0]" />
          <span>Focus ({prefs.customFocusMinutes}m)</span>
        </button>

        <button
          onClick={() => handleSwitchMode('shortBreak')}
          className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-light flex items-center gap-1.5 border transition-all cursor-pointer ${
            mode === 'shortBreak'
              ? 'bg-[#141414] border-[#C0C0C0]/50 text-[#F5F5F5] shadow-sm shadow-[#C0C0C0]/15'
              : 'bg-[#0E0E0E] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
          }`}
        >
          <Coffee className="w-3 h-3 text-teal-300" />
          <span>Short Break (5m)</span>
        </button>

        <button
          onClick={() => handleSwitchMode('longBreak')}
          className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-light flex items-center gap-1.5 border transition-all cursor-pointer ${
            mode === 'longBreak'
              ? 'bg-[#141414] border-[#C0C0C0]/50 text-[#F5F5F5] shadow-sm shadow-[#C0C0C0]/15'
              : 'bg-[#0E0E0E] border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
          }`}
        >
          <Sparkles className="w-3 h-3 text-[#C0C0C0]" />
          <span>Long Break (15m)</span>
        </button>
      </div>

      {/* Main Countdown Display: Circular SVG Ring */}
      {compact ? (
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 px-2">
          {/* Left: Mini Circular SVG Ring & Time Readout */}
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 sm:w-26 sm:h-26 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
                <defs>
                  <linearGradient id="timerRingGradientCompact" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C0C0C0" />
                    <stop offset="50%" stopColor="#D9D9D9" />
                    <stop offset="100%" stopColor="#A6A6A6" />
                  </linearGradient>
                </defs>

                {/* Background Track */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="#222222"
                  strokeWidth="7"
                  fill="transparent"
                />

                {/* Animated Progress Ring */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="url(#timerRingGradientCompact)"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    transition: isRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease',
                  }}
                />
              </svg>

              {/* Time & Status inside Circle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="text-xl sm:text-2xl font-light tracking-wider text-[#F5F5F5] font-mono drop-shadow-sm">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-light text-[#C0C0C0]/90 capitalize">
                  {isRunning ? 'Flowing' : isPaused ? 'Paused' : 'Ready'}
                </span>
              </div>
            </div>

            {/* Mode & Pacing description */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#F5F5F5] capitalize">
                {mode === 'focus' ? 'Gentle Focus Session' : mode === 'shortBreak' ? 'Short Sweet Break' : 'Long Rest Break'}
              </span>
              <p className="text-[11px] font-light text-[#808080]">
                {isRunning ? 'Softly ticking in the background...' : 'Tap start whenever you feel ready.'}
              </p>
            </div>
          </div>

          {/* Right: Controls (Start, Pause, Resume, Reset) */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {!isRunning && !isPaused && (
              <button
                onClick={handleStart}
                className="min-h-[40px] px-5 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#D9D9D9] to-[#A6A6A6] text-[#000000] text-xs font-medium flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-[#000000]" />
                <span>Start</span>
              </button>
            )}

            {isRunning && (
              <button
                onClick={handlePause}
                className="min-h-[40px] px-5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#F5F5F5] text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={handleResume}
                className="min-h-[40px] px-5 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#D9D9D9] to-[#A6A6A6] text-[#000000] text-xs font-medium flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-[#000000]" />
                <span>Resume</span>
              </button>
            )}

            <button
              onClick={handleReset}
              title="Reset timer"
              className="min-h-[40px] min-w-[40px] rounded-xl bg-[#0E0E0E] hover:bg-[#141414] border border-[#222222] text-[#808080] hover:text-[#F5F5F5] text-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center py-4 sm:py-6">
          <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
              <defs>
                <linearGradient id="timerRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C0C0C0" />
                  <stop offset="50%" stopColor="#D9D9D9" />
                  <stop offset="100%" stopColor="#A6A6A6" />
                </linearGradient>
              </defs>

              {/* Background Track */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="#222222"
                strokeWidth="6"
                fill="transparent"
              />

              {/* Animated Progress Ring */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="url(#timerRingGradient)"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: isRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease',
                }}
              />
            </svg>

            {/* Time & Status inside Circle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className="text-3xl sm:text-4xl font-light tracking-wider text-[#F5F5F5] font-mono drop-shadow-sm">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs font-light text-[#C0C0C0]/90 mt-1 capitalize">
                {isRunning ? 'Flowing' : isPaused ? 'Paused' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6">
            {!isRunning && !isPaused && (
              <button
                onClick={handleStart}
                className="min-h-[44px] px-6 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs sm:text-sm font-medium flex items-center gap-2 shadow-lg shadow-[#C0C0C0]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-[#000000]" />
                <span>Start Focus</span>
              </button>
            )}

            {isRunning && (
              <button
                onClick={handlePause}
                className="min-h-[44px] px-6 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#F5F5F5] text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={handleResume}
                className="min-h-[44px] px-6 rounded-xl bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] text-xs sm:text-sm font-medium flex items-center gap-2 shadow-md shadow-[#C0C0C0]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-[#000000]" />
                <span>Resume</span>
              </button>
            )}

            <button
              onClick={handleReset}
              title="Reset timer"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0E0E0E] hover:bg-[#141414] border border-[#222222] text-[#808080] hover:text-[#F5F5F5] text-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Completion Celebration Message Overlay */}
      {celebrationMessage && (
        <div className="relative z-20 mt-4 p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] text-[#F5F5F5] text-xs space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#F5F5F5] flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#C0C0C0] fill-[#C0C0C0]" />
              <span>Session Completed!</span>
            </span>
            <button
              onClick={() => focusTimerService.clearCelebration()}
              className="text-[#808080] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="font-light italic text-[#C0C0C0] leading-relaxed">
            “{celebrationMessage}”
          </p>
        </div>
      )}
    </section>
  );
};
