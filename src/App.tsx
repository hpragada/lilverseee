/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './firebase/authContext';
import { AppPinProvider, useAppPin } from './context/AppPinContext';
import { AppProvider, useApp } from './context/AppContext';
import { FirebaseAuthScreen } from './components/auth/FirebaseAuthScreen';
import { AppPinScreen } from './components/auth/AppPinScreen';
import { AuthModal } from './components/auth/AuthModal';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { LifeDashboardView } from './components/dashboard/LifeDashboardView';
import { JournalView } from './components/journal/JournalView';
import { NotesView } from './components/notes/NotesView';
import { MemoriesView } from './components/memories/MemoriesView';
import { MoneyTrackerView } from './components/finance/MoneyTrackerView';
import { CalendarView } from './components/calendar/CalendarView';
import { DreamsView } from './components/dreams/DreamsView';
import { CareerView } from './components/career/CareerView';
import { FilesView } from './components/files/FilesView';
import { VaultView } from './components/vault/VaultView';
import { ScheduleView } from './components/schedule/ScheduleView';
import { SettingsView } from './components/settings/SettingsView';
import { QuickActionsModal } from './components/common/QuickActionsModal';
import { WelcomeEntranceOverlay } from './components/common/WelcomeEntranceOverlay';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { ActiveReminderModal } from './components/calendar/ActiveReminderModal';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  // Centralized Android physical back button handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = async () => {
      // 1. Dispatch custom event to close any topmost open overlay (photo preview, camera, modal, drawer)
      const closeEvent = new CustomEvent('mlw_handle_back_button', { cancelable: true });
      window.dispatchEvent(closeEvent);

      if (closeEvent.defaultPrevented) {
        // An overlay handled and consumed the back event
        return;
      }

      // 2. If not on home tab, navigate back to home
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }

      // 3. On root home screen with no overlays open, exit app
      CapApp.exitApp();
    };

    const listener = CapApp.addListener('backButton', handleBackButton);
    return () => {
      listener.then((l) => l.remove()).catch(() => {});
    };
  }, [activeTab, setActiveTab]);

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F5] flex flex-col md:flex-row relative w-full selection:bg-[#C0C0C0]/25 selection:text-[#FFFFFF]">
      {/* App Entrance Animation (Once per session) */}
      <WelcomeEntranceOverlay />

      {/* Ambient Soft Gold Glow Backdrops (GPU optimized) */}
      <div className="fixed top-[-100px] right-[10%] w-[420px] h-[420px] bg-[#C0C0C0]/6 rounded-full blur-[120px] pointer-events-none z-0 transform-gpu" />
      <div className="fixed bottom-[-100px] left-[15%] w-[420px] h-[420px] bg-[#D9D9D9]/5 rounded-full blur-[120px] pointer-events-none z-0 transform-gpu" />
      <div className="fixed top-[40%] left-[-100px] w-[350px] h-[350px] bg-[#A6A6A6]/4 rounded-full blur-[100px] pointer-events-none z-0 transform-gpu" />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Top and Bottom Navigation */}
      <MobileNav />

      {/* Main Content Area: Smooth, natural native mobile scroll with lightweight page transition */}
      <main className="flex-1 min-w-0 w-full min-h-screen pb-28 md:pb-12 pt-0 bg-[#000000]">
        <div key={activeTab} className="app-page-transition w-full">
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'dashboard' && <LifeDashboardView />}
          {activeTab === 'schedule' && <ScheduleView />}
          {activeTab === 'journal' && <JournalView />}
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'letters' && <MoneyTrackerView />}
          {activeTab === 'memories' && <MemoriesView />}
          {activeTab === 'files' && <FilesView />}
          {activeTab === 'vault' && <VaultView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'dreams' && <DreamsView />}
          {activeTab === 'career' && <CareerView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Shared Quick Action Modal */}
      <QuickActionsModal />

      {/* Active In-App Reminder Modal with Snooze & Complete */}
      <ActiveReminderModal />

      {/* PWA Android Install Banner */}
      <PWAInstallBanner />

      {/* Cloud Authentication Modal */}
      <AuthModal />
    </div>
  );
};

const AppGates: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const { isPinUnlocked } = useAppPin();

  // 1. Loading splash while Firebase Auth initializes session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-[#F5F5F5]">
        <div className="w-10 h-10 rounded-full border-2 border-[#C0C0C0]/20 border-t-[#C0C0C0] animate-spin mb-4" />
        <span className="text-xs font-light text-[#C0C0C0] tracking-wider uppercase">Loading Sanctuary...</span>
      </div>
    );
  }

  // 2. Primary Gate: Firebase Authentication
  if (!currentUser) {
    return <FirebaseAuthScreen />;
  }

  // 3. Secondary Gate: 6-Digit App-Wide Secret PIN Lock
  if (!isPinUnlocked) {
    return <AppPinScreen />;
  }

  // 4. Authenticated & PIN-Unlocked Private Application Dashboard
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppPinProvider>
        <AppGates />
      </AppPinProvider>
    </AuthProvider>
  );
}

