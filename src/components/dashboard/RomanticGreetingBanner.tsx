import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Copy, Check, Shuffle } from 'lucide-react';
import {
  TimePeriod,
  getTimePeriod,
  PERIOD_THEMES,
} from '../../data/romanticGreetings';
import { getRandomFlirtLine } from '../../data/flirtLines';
import { useApp } from '../../context/AppContext';
import { FlirtLine } from '../../types';

// Animated telegram emojis: 😜🥰😘🥹💗🦋✨
const TELEGRAM_EMOJIS = [
  { emoji: '😜', label: 'Playful wink', animClass: 'telegram-emoji-bounce-1' },
  { emoji: '🥰', label: 'Warm affection', animClass: 'telegram-emoji-bounce-2' },
  { emoji: '😘', label: 'Sweet kiss', animClass: 'telegram-emoji-bounce-3' },
  { emoji: '🥹', label: 'Heart melting', animClass: 'telegram-emoji-bounce-4' },
  { emoji: '💗', label: 'Growing heart', animClass: 'telegram-emoji-heartbeat' },
  { emoji: '🦋', label: 'Butterflies', animClass: 'telegram-emoji-flutter' },
  { emoji: '✨', label: 'Pure magic', animClass: 'telegram-emoji-sparkle' },
];

export const RomanticGreetingBanner: React.FC = () => {
  const { userProfile, isFlirtFavorite, addFlirtFavorite, removeFlirtFavorite } = useApp();

  const [period, setPeriod] = useState<TimePeriod>(() => getTimePeriod());
  const [currentLine, setCurrentLine] = useState<FlirtLine>(() => getRandomFlirtLine('all'));
  const [copied, setCopied] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [activeEmojiIndex, setActiveEmojiIndex] = useState<number | null>(null);
  const [burstHearts, setBurstHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // Update time period dynamically
  useEffect(() => {
    const checkTime = () => {
      const currentPeriod = getTimePeriod(new Date());
      setPeriod((prevPeriod) => {
        if (currentPeriod !== prevPeriod) {
          return currentPeriod;
        }
        return prevPeriod;
      });
    };

    const intervalId = setInterval(checkTime, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const theme = PERIOD_THEMES[period];

  const getTimeGreeting = (p: TimePeriod): string => {
    const name = userProfile.name || 'Hari';
    switch (p) {
      case 'morning':
        return `Good morning, ${name}! ☀️`;
      case 'afternoon':
        return `Good afternoon, ${name}! 🌸`;
      case 'evening':
        return `Good evening, ${name}! ✨`;
      case 'night':
        return `Good night, ${name}! 🌙`;
      default:
        return `Good day, ${name}! 💗`;
    }
  };

  const handleShuffleLine = useCallback(() => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 450);
    const nextLine = getRandomFlirtLine('all', currentLine.id);
    setCurrentLine(nextLine);
  }, [currentLine.id]);

  const handleCopyLine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`"${currentLine.text}" 💗`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFlirtFavorite(currentLine.id)) {
      removeFlirtFavorite(currentLine.id);
    } else {
      addFlirtFavorite(currentLine, 'Favorited from Home Greeting 💕');
    }
  };

  // Interactive Telegram-style emoji tap
  const handleEmojiClick = (index: number, e: React.MouseEvent) => {
    setActiveEmojiIndex(index);
    setTimeout(() => setActiveEmojiIndex(null), 600);

    const rect = e.currentTarget.getBoundingClientRect();
    const newBurst = {
      id: Date.now() + Math.random(),
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
    setBurstHearts((prev) => [...prev.slice(-4), newBurst]);
    setTimeout(() => {
      setBurstHearts((prev) => prev.filter((b) => b.id !== newBurst.id));
    }, 800);
  };

  const isFavorited = isFlirtFavorite(currentLine.id);

  return (
    <div className="relative w-full select-none transition-all py-2 sm:py-3">
      {/* Background Soft Silver Glow Accents */}
      <div className="absolute -top-12 left-1/4 w-72 h-32 bg-[#C0C0C0]/8 opacity-60 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-10 right-1/4 w-72 h-32 bg-[#E8E8E8]/5 opacity-50 blur-3xl pointer-events-none rounded-full" />

      {/* Floating Micro Silver Stars & Hearts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <span className="absolute left-[8%] bottom-0 text-[11px] text-[#C0C0C0]/35 animate-float-heart-1">✦</span>
        <span className="absolute left-[30%] bottom-0 text-[10px] text-[#E8E8E8]/30 animate-float-heart-2">✨</span>
        <span className="absolute left-[65%] bottom-0 text-[10px] text-[#A8A8A8]/30 animate-float-heart-4">🤍</span>
        <span className="absolute left-[88%] bottom-0 text-[11px] text-[#FFFFFF]/30 animate-float-heart-5">✦</span>
      </div>

      <div className="relative z-10 space-y-3.5">
        {/* Top Greeting Pill & Telegram Bouncing Emojis */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium bg-[#0D0D0D] border border-[#292929] text-[#F5F5F5] shadow-[0_0_12px_rgba(192,192,192,0.12)]">
              <span className="text-sm">{theme.badgeIcon}</span>
              <span>{getTimeGreeting(period)}</span>
            </span>
          </div>

          {/* Telegram-Style Animated Bouncing Emojis */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#080808] px-2.5 py-1 rounded-2xl border border-[#292929] backdrop-blur-md shadow-inner">
            {TELEGRAM_EMOJIS.map((item, idx) => (
              <button
                key={item.emoji}
                onClick={(e) => handleEmojiClick(idx, e)}
                title={`${item.label} (Tap to burst!)`}
                className={`text-lg p-1 rounded-lg transition-transform duration-200 hover:scale-125 active:scale-95 cursor-pointer ${
                  item.animClass
                } ${activeEmojiIndex === idx ? 'scale-135 rotate-12' : ''}`}
                style={{
                  filter: 'drop-shadow(0 2px 6px rgba(192, 192, 192, 0.25))',
                }}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Central Headline - Displayed directly on pure black background without card container */}
        <div className="pt-1">
          <h1 className="text-2xl sm:text-3xl font-light text-[#F5F5F5] tracking-tight flex items-center gap-2 flex-wrap">
            <span>Welcome to Lilverse, <span className="font-normal text-[#FFFFFF]">{userProfile.name || 'Hari'}</span>!</span>
            <span className="text-[#C0C0C0] inline-block telegram-emoji-heartbeat">
              ✦
            </span>
          </h1>
          <p className="text-xs sm:text-sm font-light text-[#999999] mt-1 tracking-wide leading-relaxed">
            Your private luxury digital world — filled with treasured moments, quiet thoughts, and timeless rhythms.
          </p>
        </div>

        {/* Cute Flirty Whisper Bar - Luxury Pure Black with Silver Outline */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#292929] shadow-md relative overflow-hidden backdrop-blur-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <span className="text-xl mt-0.5 select-none shrink-0 filter drop-shadow">
                {currentLine.emoji || '💕'}
              </span>
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-[#C0C0C0]">
                    Quiet Thought · {currentLine.category}
                  </span>
                  {currentLine.tag && (
                    <span className="text-[10px] text-[#999999] font-light">
                      #{currentLine.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-light text-[#F5F5F5] italic leading-relaxed pt-0.5 break-words">
                  “{currentLine.text}”
                </p>
              </div>
            </div>

            {/* Actions: Another, Favorite, Copy */}
            <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
              <button
                onClick={handleShuffleLine}
                title="Roll another line"
                className="min-h-[30px] px-2.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#292929] text-[#F5F5F5] hover:text-[#C0C0C0] text-[11px] font-light flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Shuffle
                  className={`w-3 h-3 text-[#C0C0C0] transition-transform duration-300 ${
                    isRotating ? 'rotate-180' : ''
                  }`}
                />
                <span>Another ✨</span>
              </button>

              <button
                onClick={handleToggleFavorite}
                title={isFavorited ? 'Saved in favorites' : 'Save to favorites'}
                className={`w-7.5 h-7.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  isFavorited
                    ? 'bg-[#C0C0C0]/20 border-[#C0C0C0]/60 text-[#C0C0C0] shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                    : 'bg-[#141414] border-[#2A2A2A] text-[#808080] hover:text-[#C0C0C0]'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    isFavorited ? 'fill-[#C0C0C0] text-[#C0C0C0]' : ''
                  }`}
                />
              </button>

              <button
                onClick={handleCopyLine}
                title="Copy line"
                className="w-7.5 h-7.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#808080] hover:text-[#F5F5F5] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Micro-Gold Bursts on Tap */}
      {burstHearts.map((b) => (
        <div
          key={b.id}
          className="fixed pointer-events-none text-sm animate-micro-burst z-50 text-[#C0C0C0]"
          style={{ left: b.x, top: b.y }}
        >
          ✦
        </div>
      ))}
    </div>
  );
};
