/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export const WelcomeEntranceOverlay: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('mlw_entrance_shown') !== 'true';
    } catch {
      return true;
    }
  });

  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) return;

    // After 2.0s, start smooth fade-out
    const timer1 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // After 2.5s (2.0s + 500ms fade), remove from DOM and store flag
    const timer2 = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('mlw_entrance_shown', 'true');
      } catch (err) {
        console.warn('sessionStorage failed', err);
      }
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#000000] flex flex-col items-center justify-center overflow-hidden select-none transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Soft Glow Backdrops */}
      <div className="absolute w-96 h-96 bg-[#C0C0C0]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-80 h-80 bg-[#A8A8A8]/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-300" />

      {/* Floating Surrounding Emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden text-2xl sm:text-3xl">
        <span className="absolute top-[25%] left-[20%] animate-float-drift-1 text-[#F5F5F5]">
          💗
        </span>
        <span className="absolute top-[20%] right-[22%] animate-float-drift-2 text-[#C0C0C0]">
          ✨
        </span>
        <span className="absolute bottom-[28%] left-[24%] animate-float-drift-2">
          🎀
        </span>
        <span className="absolute bottom-[25%] right-[20%] animate-float-drift-1">
          🦋
        </span>
        <span className="absolute top-[42%] left-[12%] animate-float-drift-2">
          🌸
        </span>
        <span className="absolute top-[40%] right-[12%] animate-float-drift-1">
          ⭐
        </span>
      </div>

      {/* Central Greeting Box */}
      <div className="relative z-10 text-center space-y-3 px-6 animate-welcome-scale">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#111111] border border-[#292929] shadow-none mb-2">
          <span className="text-3xl sm:text-4xl animate-bounce">💖</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-light tracking-wide bg-[#F5F5F5] bg-clip-text text-transparent drop-shadow-none">
          Hey cutie! 💗
        </h1>

        <p className="text-xs sm:text-sm font-light text-[#999999] tracking-wider uppercase">
          Welcome back to LilVerse — your own little universe
        </p>

        {/* Sparkle burst decoration ring */}
        <div className="absolute -inset-8 pointer-events-none flex items-center justify-center">
          <div className="w-full h-full border border-[#292929] rounded-full animate-sparkle-burst" />
        </div>
      </div>
    </div>
  );
};
