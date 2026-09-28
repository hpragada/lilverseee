import React from 'react';
import {
  Home,
  BookOpen,
  Image,
  Calendar,
  Sparkles,
  Heart,
  Settings,
  Moon,
  Feather,
  Folder,
  Shield,
  CalendarClock,
  Wallet,
  LayoutDashboard,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { MOOD_OPTIONS } from '../../data/initialData';
import { UserStatusBadge } from '../auth/UserStatusBadge';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'dashboard', label: 'My Life Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'notes', label: 'My Notes', icon: FileText },
  { id: 'letters', label: 'My Money Tracker', icon: Wallet },
  { id: 'memories', label: 'Little Moments', icon: Image },
  { id: 'files', label: 'Vault Files', icon: Folder },
  { id: 'vault', label: 'Private Vault', icon: Shield },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'dreams', label: 'My Little Wishlist', icon: Heart },
  { id: 'career', label: 'My Learning Hub', icon: GraduationCap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, userProfile, toggleLowEnergyMode } = useApp();
  const currentMoodObj = MOOD_OPTIONS.find((m) => m.id === userProfile.currentMood);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#000000] border-r border-[#C0C0C0]/15 select-none z-30">
      {/* Brand Header */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#161616] to-[#0D0D0D] border border-[#C0C0C0]/30 flex items-center justify-center text-[#C0C0C0] shadow-sm shadow-[#C0C0C0]/15">
            <Feather className="w-4 h-4 text-[#C0C0C0]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-medium tracking-wide text-[#F5F5F5]">
              Lilverse
            </span>
            <span className="text-[10px] text-[#999999] font-light uppercase tracking-wider">
              your little universe
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-light transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#141414] via-[#111111] to-[#0D0D0D] text-[#F5F5F5] border border-[#C0C0C0]/40 shadow-[0_0_16px_rgba(192,192,192,0.15)] font-medium'
                  : 'text-[#C0C0C0] hover:text-[#F5F5F5] hover:bg-[#0E0E0E] border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-[#C0C0C0]' : 'text-[#808080]'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8] shadow-[0_0_8px_rgba(192,192,192,0.6)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Low Energy Mode Switch */}
      <div className="p-3 mx-3 mb-3 rounded-2xl bg-[#080808] border border-[#222222]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon
              className={`w-3.5 h-3.5 transition-colors ${
                userProfile.lowEnergyMode ? 'text-[#C0C0C0]' : 'text-[#808080]'
              }`}
            />
            <span className="text-xs font-light text-[#F5F5F5]">
              Low Energy Mode
            </span>
          </div>
          <button
            onClick={toggleLowEnergyMode}
            type="button"
            role="switch"
            aria-checked={userProfile.lowEnergyMode}
            aria-label="Toggle low energy mode"
            className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-[#C0C0C0] cursor-pointer ${
              userProfile.lowEnergyMode ? 'bg-[#C0C0C0]' : 'bg-[#222222]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-[#000000] transition-transform ${
                userProfile.lowEnergyMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[#808080] leading-relaxed font-light">
          {userProfile.lowEnergyMode
            ? 'Gentle mode active · Take it slow today'
            : 'Gentle pacing for calm, restful days'}
        </p>
      </div>

      {/* User Mini Bar & Cloud Status */}
      <div className="p-3 border-t border-[#C0C0C0]/15 space-y-2 bg-[#000000]">
        <UserStatusBadge />
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-[#0E0E0E] text-left group w-full transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#141414] border border-[#C0C0C0]/30 flex items-center justify-center text-[11px] text-[#C0C0C0]">
            {userProfile.name.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs text-[#F5F5F5] truncate font-light group-hover:text-[#C0C0C0] transition-colors">
              {userProfile.name}
            </span>
            <span className="text-[10px] text-[#808080] truncate font-light flex items-center gap-1">
              <span>{currentMoodObj?.symbol}</span>
              <span>{currentMoodObj?.label}</span>
            </span>
          </div>
        </button>
      </div>
    </aside>
  );
};
