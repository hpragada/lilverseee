import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../firebase/authContext';
import { useApp } from '../../context/AppContext';
import { Cloud, CloudOff, LogIn, LogOut, ShieldCheck, ChevronDown, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface UserStatusBadgeProps {
  compact?: boolean;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ compact = false }) => {
  const { currentUser, isGuest, openAuthModal, signOutUser, reauthenticateWithGoogle } = useAuth();
  const { syncState, triggerManualSync } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isSigningInAgain, setIsSigningInAgain] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleManualSyncClick = async () => {
    setIsManualSyncing(true);
    setReauthError(null);
    try {
      await triggerManualSync();
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  const handleSignInAgain = async () => {
    setIsSigningInAgain(true);
    setReauthError(null);
    try {
      const user = await reauthenticateWithGoogle();
      if (user?.uid) {
        await triggerManualSync(user.uid);
      }
    } catch (err: any) {
      console.warn('[UserStatusBadge] Sign in again failed:', err);
      const code = err?.code;
      const message = code
        ? `[${code}] ${err?.message || 'Sign in failed. Please try again.'}`
        : err?.message || 'Sign in failed. Please try again.';
      setReauthError(message);
    } finally {
      setIsSigningInAgain(false);
    }
  };

  if (isGuest || !currentUser) {
    return (
      <button
        onClick={() => openAuthModal('login')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E0E0E] hover:bg-[#161616] border border-[#222222] hover:border-[#C0C0C0]/40 text-xs font-normal text-[#F5F5F5] transition-all group cursor-pointer ${
          compact ? 'w-auto' : 'w-full justify-between'
        }`}
        title="Sign in to enable cloud synchronization"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-[#141414] flex items-center justify-center text-[#808080] group-hover:text-[#C0C0C0] transition-colors">
            <CloudOff className="w-3 h-3" />
          </div>
          <span className="truncate text-[11px] text-[#C0C0C0] group-hover:text-[#F5F5F5] transition-colors">
            Local Sanctuary
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-[#C0C0C0] font-medium shrink-0">
          <span>Sign In</span>
          <LogIn className="w-3 h-3" />
        </div>
      </button>
    );
  }

  const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Sanctuary Keeper';
  const initial = displayName.charAt(0).toUpperCase();

  const isSyncing = syncState.status === 'syncing' || isManualSyncing;
  const isOffline = syncState.status === 'offline';
  const isError = syncState.status === 'error';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        title={
          isError
            ? `Sync Paused: ${syncState.errorMessage || 'Check details in menu'}`
            : isOffline
            ? 'Offline Mode (Local Cache Active)'
            : isSyncing
            ? 'Synchronizing...'
            : 'Cloud Synced'
        }
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#0E0E0E] hover:bg-[#161616] border border-[#222222] hover:border-[#C0C0C0]/40 transition-all text-left group cursor-pointer ${
          compact ? 'w-auto' : 'w-full'
        }`}
      >
        <div className="relative shrink-0">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL || undefined}
              alt={displayName}
              className="w-7 h-7 rounded-full object-cover border border-[#C0C0C0]/30"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#141414] border border-[#C0C0C0]/30 flex items-center justify-center text-xs text-[#C0C0C0] font-medium">
              {initial}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#000000] ${
              isError
                ? 'bg-zinc-400'
                : isOffline
                ? 'bg-[#808080]'
                : isSyncing
                ? 'bg-[#C0C0C0] animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-[#F5F5F5] font-normal truncate group-hover:text-[#C0C0C0] transition-colors">
            {displayName}
          </span>
          <div
            className={`flex items-center gap-1 text-[10px] font-normal truncate ${
              isError
                ? 'text-zinc-400'
                : isOffline
                ? 'text-[#808080]'
                : isSyncing
                ? 'text-[#C0C0C0]'
                : 'text-emerald-400/90'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-2.5 h-2.5 shrink-0 animate-spin" />
                <span className="truncate">Syncing...</span>
              </>
            ) : isOffline ? (
              <>
                <CloudOff className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Offline Cache</span>
              </>
            ) : isError ? (
              <>
                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Sync Paused</span>
              </>
            ) : (
              <>
                <Cloud className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Cloud Synced</span>
              </>
            )}
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-[#808080] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#0E0E0E] border border-[#222222] rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-[#F5F5F5]">
          <div className="px-3 py-2 border-b border-[#222222]">
            <p className="text-xs font-medium text-[#F5F5F5] truncate">{displayName}</p>
            <p className="text-[11px] text-[#808080] truncate font-normal">{currentUser.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/40 w-fit">
              <ShieldCheck className="w-3 h-3" />
              <span>Isolated User UID Security</span>
            </div>
            {syncState.lastSyncedAt && (
              <p className="text-[10px] text-[#808080] font-normal mt-1">
                Last synced: {new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            {isError && (
              <div className="mt-2 p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/40 text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>
                    {syncState.errorReason === 'quota'
                      ? 'Cloud Quota Limit'
                      : syncState.errorReason === 'network'
                      ? 'Network Disconnected'
                      : syncState.errorReason === 'auth'
                      ? 'Session Expired'
                      : 'Sync Paused'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-200/90 mt-1 leading-relaxed font-normal">
                  {syncState.errorMessage || 'Cloud sync is paused. Your local data is completely safe.'}
                </p>

                {/* Direct one-click Sign In Again button for expired session */}
                {syncState.errorReason === 'auth' && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/40">
                    <button
                      onClick={handleSignInAgain}
                      disabled={isSigningInAgain}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-400/20 hover:bg-zinc-400/30 active:bg-zinc-400/40 border border-zinc-400/50 text-xs font-normal text-zinc-100 hover:text-white transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <LogIn className={`w-3.5 h-3.5 shrink-0 ${isSigningInAgain ? 'animate-pulse' : ''}`} />
                      <span>{isSigningInAgain ? 'Opening Sign In...' : 'Sign In Again'}</span>
                    </button>
                    {reauthError && (
                      <p className="text-[10px] text-rose-300 mt-1.5 font-normal leading-snug break-words">
                        {reauthError}
                      </p>
                    )}
                  </div>
                )}

                {syncState.nextRetryMs && (
                  <p className="text-[9px] text-zinc-400/80 mt-1 font-normal">
                    Auto-retry in {Math.max(1, Math.round((syncState.nextRetryMs - Date.now()) / 1000))}s...
                  </p>
                )}
              </div>
            )}

            {isOffline && !isError && (
              <div className="mt-2 p-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#C0C0C0]">
                  <CloudOff className="w-3 h-3 shrink-0" />
                  <span>Offline Mode</span>
                </div>
                <p className="text-[10px] text-[#808080] mt-0.5 leading-relaxed font-normal">
                  Working offline. Local changes will synchronize automatically when connection resumes.
                </p>
              </div>
            )}
          </div>

          <div className="pt-1.5 space-y-1">
            <button
              onClick={handleManualSyncClick}
              disabled={isSyncing}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#C0C0C0] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors text-left disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C0C0C0] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : isError ? 'Retry Sync Now' : 'Sync Now'}</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                openAuthModal('login');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#C0C0C0] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors text-left cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span>Switch or manage account</span>
            </button>

            <button
              onClick={async () => {
                setMenuOpen(false);
                await signOutUser();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-950/20 transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out to Local Mode</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
