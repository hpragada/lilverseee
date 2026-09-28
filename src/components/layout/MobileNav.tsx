import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  Image as ImageIcon,
  Folder,
  Settings,
  Moon,
  Menu,
  X,
  Sparkles,
  Shield,
  CalendarClock,
  Calendar,
  Wallet,
  LayoutDashboard,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { UserStatusBadge } from '../auth/UserStatusBadge';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, userProfile, toggleLowEnergyMode } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Handle Android physical back button for mobile drawer
  useEffect(() => {
    const handleBack = (e: Event) => {
      if (drawerOpen) {
        setDrawerOpen(false);
        e.preventDefault();
      }
    };
    window.addEventListener('mlw_handle_back_button', handleBack);
    return () => window.removeEventListener('mlw_handle_back_button', handleBack);
  }, [drawerOpen]);

  interface MenuItem {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
    badge?: string;
  }

  const primaryTabs: MenuItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'memories', label: 'Moments', icon: ImageIcon },
    { id: 'files', label: 'Vault Files', icon: Folder },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  const allSanctuaryTabs: MenuItem[] = [
    { id: 'home', label: 'Home Sanctuary', icon: Home, description: 'Daily moments & living overview' },
    { id: 'memories', label: 'Moments & Photos', icon: ImageIcon, description: 'Visual scrapbook & photo highlights' },
    { id: 'journal', label: 'Personal Journal', icon: BookOpen, description: 'Reflections, thoughts & daily entries' },
    { id: 'notes', label: 'Quick Notes', icon: FileText, description: 'Ideas, checklists & fleeting memos' },
    { id: 'dashboard', label: 'Life Dashboard', icon: LayoutDashboard, description: 'Holistic goals, wishlist & habit paths' },
    { id: 'schedule', label: 'Weekly Schedule', icon: CalendarClock, description: 'Time-anchored routines & rhythms' },
    { id: 'calendar', label: 'Sanctuary Calendar', icon: Calendar, description: 'Dates, celebrations & gentle reminders' },
    { id: 'letters', label: 'Money Tracker', icon: Wallet, description: 'Income, budgets & quiet expenses' },
    { id: 'career', label: 'Learning Hub', icon: GraduationCap, description: 'Skills, studies & creative dreams' },
    { id: 'files', label: 'Vault Files', icon: Folder, description: 'Private documents & archive' },
    { id: 'vault', label: 'Encrypted Vault', icon: Shield, description: 'PIN-protected encrypted storage' },
    { id: 'settings', label: 'Settings & Cloud', icon: Settings, description: 'Theme, Google Drive & preferences' },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  const isMoreActive = ['dashboard', 'schedule', 'letters', 'files', 'vault', 'calendar', 'career', 'settings'].includes(activeTab);

  return (
    <>
      {/* 1. Mobile Top Bar (Compact, Luxury Pure Black & Silver Header) */}
      <header className="md:hidden sticky top-0 z-30 bg-[#000000]/95 backdrop-blur-xl border-b border-[#292929] px-4 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#141414] to-[#0A0A0A] border border-[#C0C0C0]/35 flex items-center justify-center text-[#C0C0C0] shadow-[0_0_12px_rgba(192,192,192,0.15)]">
            <Sparkles className="w-4 h-4 text-[#C0C0C0]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium tracking-wide text-[#F5F5F5]">
                Lilverse
              </span>
              <span className="text-[10px] text-[#C0C0C0] font-light">
                ✦
              </span>
            </div>
            <p className="text-[10px] text-[#999999] font-light tracking-wider -mt-0.5 uppercase">
              My Little World
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Gentle Low Energy Pill */}
          <button
            onClick={toggleLowEnergyMode}
            className={`min-h-[32px] px-2.5 py-1 rounded-full border text-[11px] font-light flex items-center gap-1.5 transition-all cursor-pointer ${
              userProfile.lowEnergyMode
                ? 'bg-[#C0C0C0]/15 border-[#C0C0C0]/40 text-[#FFFFFF] shadow-[0_0_10px_rgba(192,192,192,0.2)]'
                : 'bg-[#0D0D0D] border-[#292929] text-[#C0C0C0] hover:text-[#F5F5F5] hover:border-[#C0C0C0]/30'
            }`}
            title="Toggle calm low energy mode"
          >
            <Moon className="w-3 h-3 text-[#C0C0C0]" />
            <span>{userProfile.lowEnergyMode ? 'Calm' : 'Gentle'}</span>
          </button>

          {/* Spaces Drawer Trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open spaces drawer"
            className="w-8 h-8 rounded-xl bg-[#0D0D0D] border border-[#292929] flex items-center justify-center text-[#C0C0C0] hover:text-[#F5F5F5] hover:border-[#C0C0C0]/40 transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Floating Luxury Mobile Bottom Dock (Pure Black with Refined Silver Highlights) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 pointer-events-none px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <nav className="pointer-events-auto mx-auto max-w-md bg-[#080808]/96 backdrop-blur-2xl border border-[#292929] rounded-3xl px-2 py-1.5 flex items-center justify-around shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_20px_rgba(192,192,192,0.08)]">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex-1 min-h-[46px] flex flex-col items-center justify-center transition-all duration-300 rounded-2xl cursor-pointer ${
                  isActive
                    ? 'text-[#F5F5F5]'
                    : 'text-[#999999] hover:text-[#C0C0C0]'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 bg-gradient-to-b from-[#C0C0C0]/20 to-transparent rounded-2xl -z-10 border border-[#C0C0C0]/35 shadow-[0_0_12px_rgba(192,192,192,0.18)]" />
                )}
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105 text-[#C0C0C0]' : ''}`} />
                <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-medium text-[#F5F5F5]' : 'font-light'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#C0C0C0] shadow-[0_0_6px_#C0C0C0] mt-0.5" />
                )}
              </button>
            );
          })}

          {/* More Drawer Tab */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex-1 min-h-[46px] flex flex-col items-center justify-center transition-all duration-300 rounded-2xl cursor-pointer ${
              isMoreActive
                ? 'text-[#F5F5F5]'
                : 'text-[#999999] hover:text-[#C0C0C0]'
            }`}
          >
            {isMoreActive && (
              <span className="absolute inset-0 bg-gradient-to-b from-[#C0C0C0]/20 to-transparent rounded-2xl -z-10 border border-[#C0C0C0]/35 shadow-[0_0_12px_rgba(192,192,192,0.18)]" />
            )}
            <Menu className={`w-5 h-5 transition-transform duration-200 ${isMoreActive ? 'scale-105 text-[#C0C0C0]' : ''}`} />
            <span className={`text-[10px] tracking-tight mt-0.5 ${isMoreActive ? 'font-medium text-[#F5F5F5]' : 'font-light'}`}>
              More
            </span>
            {isMoreActive && (
              <span className="w-1 h-1 rounded-full bg-[#C0C0C0] shadow-[0_0_6px_#C0C0C0] mt-0.5" />
            )}
          </button>
        </nav>
      </div>

      {/* 3. Mobile Slide-Up Modal Sheet for All Sanctuary Spaces */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 bg-[#080808] border-t border-[#C0C0C0]/25 rounded-t-[2rem] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-[#222222] rounded-full mx-auto" />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-[#C0C0C0] font-medium">
                  Sanctuary Spaces
                </span>
                <span className="text-xs text-[#71717A]">·</span>
                <span className="text-xs text-[#999999] font-light">
                  {allSanctuaryTabs.length} spaces
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0] hover:text-[#F5F5F5] hover:border-[#C0C0C0]/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cloud User Account Card */}
            <UserStatusBadge />

            {/* Grid of Sanctuary Navigation Tiles */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              {allSanctuaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all min-h-[52px] cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#141414] via-[#111111] to-[#0A0A0A] border-[#C0C0C0]/50 text-[#F5F5F5] shadow-[0_0_18px_rgba(192,192,192,0.15)] font-medium'
                        : 'bg-[#0D0D0D] border-[#292929] text-[#C0C0C0] hover:text-[#F5F5F5] hover:border-[#C0C0C0]/35'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                        isActive
                          ? 'border-[#C0C0C0]/50 bg-[#C0C0C0]/15 text-[#C0C0C0] shadow-[0_0_10px_rgba(192,192,192,0.2)]'
                          : 'border-[#292929] bg-[#141414] text-[#999999]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-light text-[#F5F5F5]">
                          {tab.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-medium text-[#C0C0C0] bg-[#C0C0C0]/15 px-2 py-0.5 rounded-full border border-[#C0C0C0]/35">
                            Active
                          </span>
                        )}
                      </div>
                      {tab.description && (
                        <p className="text-xs text-[#808080] font-light truncate mt-0.5">
                          {tab.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
