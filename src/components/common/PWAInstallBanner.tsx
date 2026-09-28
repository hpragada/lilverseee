/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User installed LilVerse PWA');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 p-4 rounded-3xl bg-[#0D0D0D]/95 border border-[#292929] shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_24px_rgba(192,192,192,0.1)] backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#141414] border border-[#292929] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            <img src="/pwa-192x192.png" alt="LilVerse Icon" className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-xs font-normal text-[#F5F5F5] flex items-center gap-1">
              <span>Install LilVerse</span>
              <Sparkles className="w-3 h-3 text-[#C0C0C0]" />
            </h4>
            <p className="text-[11px] font-light text-[#999999]">
              Add to Android home screen for standalone experience
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="px-3.5 py-1.5 rounded-xl silver-btn-primary text-black text-xs font-medium hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="p-1 rounded-lg text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
