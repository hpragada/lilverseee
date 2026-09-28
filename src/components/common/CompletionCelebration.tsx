/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

export interface CompletionCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  show,
  onComplete,
}) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (show) {
      setActive(true);
      const timer = setTimeout(() => {
        setActive(false);
        if (onComplete) onComplete();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center overflow-hidden">
      <div className="relative space-y-2 text-center animate-bounce">
        <div className="text-4xl sm:text-5xl filter drop-shadow-[0_0_20px_rgba(192,192,192,0.6)]">
          ✨ 🤍 🕊️
        </div>
        <div className="text-xs font-light text-[#E8E8E8] tracking-widest uppercase bg-[#0D0D0D]/90 border border-[#292929] px-3 py-1 rounded-full shadow-[0_0_15px_rgba(192,192,192,0.3)]">
          Wonderful Job!
        </div>
      </div>
    </div>
  );
};
