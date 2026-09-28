import React, { useState } from 'react';
import {
  Heart,
  Copy,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Share2,
  BookmarkCheck,
} from 'lucide-react';
import { FlirtLine } from '../../types';
import { FLIRT_CATEGORIES } from '../../data/flirtLines';
import { useApp } from '../../context/AppContext';

interface FlirtCardProps {
  currentLine: FlirtLine;
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  historyCount: number;
  historyIndex: number;
  onTriggerBurst: () => void;
  onShowToast: (message: string) => void;
}

const CARD_THEMES = [
  {
    id: 'silver',
    name: 'Pure Silver',
    border: 'border-[#292929] hover:border-[#C0C0C0]/60',
    glow: 'from-[#C0C0C0]/15 via-[#E8E8E8]/10 to-[#A8A8A8]/15',
    accentText: 'text-[#C0C0C0]',
    btnGradient: 'from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8]',
  },
  {
    id: 'platinum',
    name: 'Platinum Light',
    border: 'border-[#333333] hover:border-[#E8E8E8]/60',
    glow: 'from-[#E8E8E8]/15 via-[#C0C0C0]/10 to-[#888888]/15',
    accentText: 'text-[#E8E8E8]',
    btnGradient: 'from-[#E8E8E8] via-[#C0C0C0] to-[#999999]',
  },
  {
    id: 'deep',
    name: 'Obsidian Metallic',
    border: 'border-[#292929] hover:border-[#C0C0C0]/40',
    glow: 'from-[#292929]/20 via-[#141414]/40 to-[#292929]/20',
    accentText: 'text-[#C0C0C0]',
    btnGradient: 'from-[#A8A8A8] via-[#C0C0C0] to-[#E8E8E8]',
  },
];

export const FlirtCard: React.FC<FlirtCardProps> = ({
  currentLine,
  onNext,
  onPrevious,
  canGoPrevious,
  canGoNext,
  historyCount,
  historyIndex,
  onTriggerBurst,
  onShowToast,
}) => {
  const { addFlirtFavorite, removeFlirtFavorite, isFlirtFavorite } = useApp();
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);

  const theme = CARD_THEMES[themeIndex];
  const isFav = isFlirtFavorite(currentLine.id);

  const categoryMeta =
    FLIRT_CATEGORIES.find((c) => c.id === currentLine.category) || FLIRT_CATEGORIES[0];

  const handleCopyStandard = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(currentLine.text);
      setCopied(true);
      onShowToast('Copied to clipboard! Ready to send 💕');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not access clipboard');
    }
  };

  const handleCopyWithEmojis = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const formatted = `"${currentLine.text}" ${currentLine.emoji}💕`;
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      onShowToast('Copied with cute emojis! 💕✨');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not access clipboard');
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFav) {
      removeFlirtFavorite(currentLine.id);
      onShowToast('Removed from favorites');
    } else {
      addFlirtFavorite(currentLine);
      onTriggerBurst();
      onShowToast('Saved to your Favorites 💕');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'A sweet line for you 💕',
          text: `"${currentLine.text}" ${currentLine.emoji}`,
        });
      } catch {
        // User cancelled or ignored
      }
    } else {
      handleCopyStandard();
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      onShowToast('Speech synthesis not supported in this browser');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentLine.text);
    utterance.rate = 0.9; // gentle, slower pace
    utterance.pitch = 1.05;

    // Pick a gentle English voice if available
    const voices = window.speechSynthesis.getVoices();
    const sweetVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Samantha') ||
          v.name.includes('Victoria') ||
          v.name.includes('Google') ||
          v.name.includes('Natural'))
    );
    if (sweetVoice) {
      utterance.voice = sweetVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const cycleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    setThemeIndex((prev) => (prev + 1) % CARD_THEMES.length);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">
      {/* Ambient background glow */}
      <div
        className={`absolute -inset-1.5 rounded-3xl bg-gradient-to-r ${theme.glow} blur-xl opacity-80 pointer-events-none transition-all duration-700`}
      />

      {/* Main Glass Card */}
      <div
        className={`relative z-10 rounded-3xl bg-[#0D0D0D]/95 backdrop-blur-xl border ${theme.border} p-6 sm:p-10 shadow-2xl transition-all duration-300 flex flex-col justify-between min-h-[380px] sm:min-h-[420px]`}
      >
        {/* Top Header inside Card */}
        <div className="flex items-center justify-between gap-3 pb-6 border-b border-[#292929]">
          {/* Category Pill with Emoji */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${categoryMeta.badgeColor} shadow-sm`}
            >
              <span>{currentLine.emoji}</span>
              <span>{categoryMeta.label}</span>
            </span>

            {currentLine.tag && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-light bg-[#141414] text-[#999999] border border-[#292929]">
                {currentLine.tag}
              </span>
            )}
          </div>

          {/* Action Icons right side */}
          <div className="flex items-center gap-1.5">
            {/* Cycle Theme Glow */}
            <button
              onClick={cycleTheme}
              title={`Switch card mood (${theme.name})`}
              className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-[#999999] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C0C0C0]" />
            </button>

            {/* Read Aloud Whisper */}
            <button
              onClick={handleSpeak}
              title={isSpeaking ? 'Stop voice' : 'Whisper this line'}
              className={`min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isSpeaking
                  ? 'text-[#C0C0C0] bg-[#C0C0C0]/15'
                  : 'text-[#999999] hover:text-[#F5F5F5] hover:bg-[#141414]'
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-4 h-4 animate-pulse" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              title="Share line"
              className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-[#999999] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Favorite / Heart toggle button */}
            <button
              onClick={handleToggleFavorite}
              title={isFav ? 'Remove from favorites' : 'Save to favorites 💕'}
              className={`min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isFav
                  ? 'bg-[#C0C0C0]/20 text-[#C0C0C0] border border-[#C0C0C0]/40 shadow-sm shadow-black/40 scale-105'
                  : 'text-[#999999] hover:text-[#C0C0C0] hover:bg-[#141414]'
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform duration-200 ${
                  isFav ? 'fill-[#C0C0C0] text-[#C0C0C0] scale-110' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Center Quotation & Flirty Line */}
        <div className="py-8 sm:py-12 my-auto text-center px-2 sm:px-6 relative">
          <p className="text-xl sm:text-2xl md:text-[26px] font-light text-[#F5F5F5] leading-relaxed tracking-wide transition-opacity duration-200">
            “{currentLine.text}”
          </p>
        </div>

        {/* Bottom Action Footer */}
        <div className="pt-6 border-t border-[#292929] space-y-4">
          {/* Quick Copy Buttons Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyStandard}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-xs font-light text-[#F5F5F5] flex items-center gap-2 transition-all hover:border-[#383838] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#999999]" />
                    <span>Copy line</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopyWithEmojis}
                title="Copy line with cute emojis attached"
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-xs font-light text-[#C0C0C0] flex items-center gap-1.5 transition-all hover:border-[#383838] cursor-pointer"
              >
                <span>Copy + 💕</span>
              </button>
            </div>

            {/* History Counter & Arrow navigation */}
            <div className="flex items-center gap-1.5 text-xs text-[#999999]">
              <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                title="Previous line"
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-[#292929] bg-[#0D0D0D] text-[#999999] hover:text-[#F5F5F5] hover:bg-[#141414] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono text-[11px] text-[#999999]">
                {historyIndex + 1} / {Math.max(historyCount, 1)}
              </span>

              <button
                onClick={onNext}
                disabled={!canGoNext}
                title="Next line in history"
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-[#292929] bg-[#0D0D0D] text-[#999999] hover:text-[#F5F5F5] hover:bg-[#141414] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Action Button: "Another One 💕" */}
          <div className="pt-2">
            <button
              onClick={() => {
                onTriggerBurst();
                onNext();
              }}
              className={`w-full min-h-[52px] sm:min-h-[56px] rounded-2xl bg-gradient-to-r ${theme.btnGradient} text-[#000000] font-semibold text-base shadow-lg shadow-black/50 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer relative overflow-hidden group`}
            >
              {/* Shimmer sweep */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              <Heart className="w-5 h-5 fill-black/70 group-hover:scale-125 transition-transform duration-300" />
              <span className="tracking-wide">Another One 💕</span>
              <Sparkles className="w-4 h-4 opacity-75 group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
