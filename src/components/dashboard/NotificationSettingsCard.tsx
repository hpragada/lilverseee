import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  Settings,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Laptop,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import {
  notificationService,
  NotificationPreferences,
  NotificationDispatchResult,
} from '../../services/notificationService';

export const NotificationSettingsCard: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() =>
    notificationService.getPreferences()
  );
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => notificationService.getPermissionStatus()
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);

  const isInIframe = notificationService.isInIframe();

  // Function to refresh permission and synchronize state reactively
  const refreshPermissionState = useCallback(() => {
    const current = notificationService.getPermissionStatus();
    setPermission((prev) => {
      if (prev !== current) {
        if (current === 'granted') {
          setPrefs((p) => {
            if (!p.enabled) {
              const updated = { ...p, enabled: true };
              notificationService.savePreferences(updated);
              return updated;
            }
            return p;
          });
        }
        return current;
      }
      return prev;
    });
  }, []);

  // Reactive Permission Listener: Permissions API, visibilitychange, focus & gentle interval
  useEffect(() => {
    refreshPermissionState();

    let permStatusObj: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          permStatusObj = status;
          status.onchange = () => {
            refreshPermissionState();
          };
        })
        .catch(() => {});
    }

    const handleWindowFocus = () => refreshPermissionState();
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('visibilitychange', handleWindowFocus);

    const intervalId = setInterval(refreshPermissionState, 2500);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('visibilitychange', handleWindowFocus);
      clearInterval(intervalId);
      if (permStatusObj) {
        permStatusObj.onchange = null;
      }
    };
  }, [refreshPermissionState]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleToggleMaster = () => {
    const nextState = !prefs.enabled;
    const next = { ...prefs, enabled: nextState };
    setPrefs(next);
    notificationService.savePreferences(next);
    showToast(nextState ? 'Notifications active ✦' : 'Notifications muted');
  };

  const handleEnableClick = async () => {
    setPreviewNotice(null);
    const currentPerm = notificationService.getPermissionStatus();
    setPermission(currentPerm);

    if (currentPerm === 'granted') {
      const next = { ...prefs, enabled: true };
      setPrefs(next);
      notificationService.savePreferences(next);
      showToast('Notifications enabled! Sending real test notification ✦');
      await handleSendTest();
      return;
    }

    if (currentPerm === 'denied') {
      showToast('Notifications are blocked by your browser settings. Please allow notifications in site settings.');
      return;
    }

    const result = await notificationService.requestPermission();
    const updatedPerm = notificationService.getPermissionStatus();
    setPermission(updatedPerm);

    if (result.granted || updatedPerm === 'granted') {
      const next = { ...prefs, enabled: true };
      setPrefs(next);
      notificationService.savePreferences(next);
      showToast('Notifications enabled! Sending real test notification ✦');
      await handleSendTest();
    } else if (result.error) {
      setPreviewNotice(result.error);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setPreviewNotice(null);

    const result: NotificationDispatchResult = await notificationService.sendTestNotification();
    setTesting(false);

    if (result.nativeDispatched) {
      showToast('Real browser notification sent! ✦ Check your system tray');
    } else if (result.previewBlocked) {
      setPreviewNotice(
        'The Google AI Studio preview iframe blocked the native notification popup. Open the app in a standalone browser tab for native desktop/phone alerts.'
      );
    } else if (result.error) {
      showToast(result.error);
    }
  };

  const handleUpdatePref = <K extends keyof NotificationPreferences>(
    key: K,
    val: NotificationPreferences[K]
  ) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    notificationService.savePreferences(next);
  };

  const isBrowserGranted = permission === 'granted';
  const isBrowserDenied = permission === 'denied';
  const standaloneUrl = typeof window !== 'undefined' ? window.location.href : '#';

  return (
    <div className="relative w-full rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all duration-300">
      {/* Toast Notification Popup */}
      {toastMsg && (
        <div className="absolute top-3 right-4 z-30 px-3.5 py-1.5 rounded-full bg-[#141414] border border-[#C0C0C0]/50 text-[#FFFFFF] text-xs font-light shadow-xl flex items-center gap-1.5 animate-in fade-in duration-200">
          <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Header / Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Icon & Title & Badges */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              prefs.enabled && isBrowserGranted
                ? 'bg-[#C0C0C0]/15 border border-[#C0C0C0]/40 text-[#C0C0C0]'
                : 'bg-[#121212] border border-[#222222] text-[#808080]'
            }`}
          >
            {prefs.enabled && isBrowserGranted ? (
              <BellRing className="w-4 h-4 text-[#C0C0C0] animate-pulse" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-normal text-[#F5F5F5] tracking-wide">
                Sanctuary Notifications
              </h3>

              {/* Browser Permission Badge */}
              {isBrowserGranted ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-light flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Browser: Granted ✦</span>
                </span>
              ) : isBrowserDenied ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-light">
                  Browser: Blocked
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C0C0C0]/15 text-[#FFFFFF] border border-[#C0C0C0]/30 font-light">
                  Browser: Not Set
                </span>
              )}

              {/* App Status Badge */}
              {prefs.enabled ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C0C0C0]/15 text-[#C0C0C0] border border-[#C0C0C0]/30 font-light">
                  Active
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141414] text-[#808080] border border-[#222222] font-light">
                  Muted
                </span>
              )}
            </div>

            <p className="text-xs font-light text-[#808080] mt-0.5">
              Desktop & phone alerts for focus timer, gentle tasks, events, and sweet notes
            </p>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {isBrowserGranted && (
            <button
              onClick={handleSendTest}
              disabled={testing}
              title="Send a real browser notification to your device"
              className="min-h-[34px] px-3 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#C0C0C0]/30 text-xs font-light text-[#F5F5F5] hover:text-[#C0C0C0] flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
              <span className="text-[11px] font-normal">{testing ? 'Sending...' : 'Test Notification'}</span>
            </button>
          )}

          {/* Options Dropdown Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title="Notification preferences"
            className="min-h-[34px] px-2.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] text-xs font-light text-[#808080] hover:text-[#F5F5F5] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px]">Options</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Master Enable/Toggle Button */}
          {isBrowserGranted ? (
            <button
              onClick={handleToggleMaster}
              title={prefs.enabled ? 'Mute notifications' : 'Turn on notifications'}
              className={`min-h-[34px] px-3.5 rounded-xl text-xs font-light flex items-center gap-1.5 transition-all cursor-pointer ${
                prefs.enabled
                  ? 'bg-[#C0C0C0]/20 hover:bg-[#C0C0C0]/30 border border-[#C0C0C0]/40 text-[#FFFFFF]'
                  : 'bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] text-[#808080] hover:text-[#F5F5F5]'
              }`}
            >
              {prefs.enabled ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span>On</span>
                </>
              ) : (
                <span>Turn On</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleEnableClick}
              className={`min-h-[36px] px-4 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isBrowserDenied
                  ? 'bg-zinc-500/20 border border-zinc-500/40 text-zinc-200'
                  : 'bg-gradient-to-r from-[#C0C0C0] to-[#D9D9D9] text-[#000000] shadow-[#C0C0C0]/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isBrowserDenied ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Blocked in Browser</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enable Notifications ✦</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Preview Iframe Notice */}
      {previewNotice && (
        <div className="mt-3.5 p-3.5 rounded-xl bg-[#141414] border border-[#C0C0C0]/40 text-[#F5F5F5] text-xs font-light space-y-2 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#C0C0C0] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-[#FFFFFF]">Preview Context Notice</p>
              <p className="text-[11px] leading-relaxed text-[#C0C0C0]">
                {previewNotice}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C0C0C0]/20 hover:bg-[#C0C0C0]/30 border border-[#C0C0C0]/40 text-[#FFFFFF] text-xs font-normal transition-colors"
            >
              <span>Open Standalone App Tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => setPreviewNotice(null)}
              className="px-2.5 py-1.5 rounded-lg border border-[#222222] text-xs text-[#808080] hover:text-[#F5F5F5] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Blocked in Browser Hint */}
      {isBrowserDenied && !previewNotice && (
        <div className="mt-3 p-3 rounded-xl bg-zinc-500/10 border border-zinc-500/30 text-zinc-200 text-xs font-light flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-zinc-300">Browser Permissions Blocked</p>
            <p className="text-[11px] leading-relaxed text-zinc-200/80">
              Chrome or your browser has blocked notifications for this origin. Click the lock/site settings icon in your browser URL bar, change Notifications to "Allow", and reload.
            </p>
          </div>
        </div>
      )}

      {/* Expanded Customization Panel */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#222222] space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Focus Timer Alerts */}
            <div className="p-3 rounded-xl bg-[#101010] border border-[#222222] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#F5F5F5]">Focus Timer Alerts</span>
                <p className="text-[11px] text-[#808080] font-light">
                  Celebration alerts when focus sessions finish
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.focusTimer}
                onChange={(e) => handleUpdatePref('focusTimer', e.target.checked)}
                className="w-4 h-4 rounded accent-[#C0C0C0] cursor-pointer"
              />
            </div>

            {/* 2. Audio Chime */}
            <div className="p-3 rounded-xl bg-[#101010] border border-[#222222] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#F5F5F5]">Chime Sound</span>
                <p className="text-[11px] text-[#808080] font-light">
                  Gentle synthesized chime with notifications
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.soundEnabled}
                onChange={(e) => handleUpdatePref('soundEnabled', e.target.checked)}
                className="w-4 h-4 rounded accent-[#C0C0C0] cursor-pointer"
              />
            </div>

            {/* 3. Task Reminders with Custom Time */}
            <div className="p-3 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-[#F5F5F5]">Gentle Task Reminder</span>
                  <p className="text-[11px] text-[#808080] font-light">
                    Friendly reminder of your daily gentle tasks
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.taskReminders}
                  onChange={(e) => handleUpdatePref('taskReminders', e.target.checked)}
                  className="w-4 h-4 rounded accent-[#C0C0C0] cursor-pointer"
                />
              </div>

              {prefs.taskReminders && (
                <div className="flex items-center gap-2 pt-1 border-t border-[#222222] text-xs text-[#808080]">
                  <Clock className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span>Notify at:</span>
                  <input
                    type="time"
                    value={prefs.taskReminderTime}
                    onChange={(e) => handleUpdatePref('taskReminderTime', e.target.value)}
                    className="px-2 py-0.5 rounded-lg bg-[#0A0A0A] border border-[#222222] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
              )}
            </div>

            {/* 4. Calendar Event Reminders */}
            <div className="p-3 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-[#F5F5F5]">Upcoming Event Reminders</span>
                  <p className="text-[11px] text-[#808080] font-light">
                    Alerts for calendar dates and special moments
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.eventReminders}
                  onChange={(e) => handleUpdatePref('eventReminders', e.target.checked)}
                  className="w-4 h-4 rounded accent-[#C0C0C0] cursor-pointer"
                />
              </div>

              {prefs.eventReminders && (
                <div className="flex items-center gap-2 pt-1 border-t border-[#222222] text-xs text-[#808080]">
                  <span>Lead time:</span>
                  <select
                    value={prefs.eventReminderLeadMinutes}
                    onChange={(e) =>
                      handleUpdatePref('eventReminderLeadMinutes', parseInt(e.target.value) || 15)
                    }
                    className="px-2 py-0.5 rounded-lg bg-[#0A0A0A] border border-[#222222] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  >
                    <option value="0">At event time</option>
                    <option value="5">5 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                  </select>
                </div>
              )}
            </div>

            {/* 5. Midday Sweet Love Notes */}
            <div className="p-3 rounded-xl bg-[#101010] border border-[#222222] space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 fill-[#C0C0C0] text-[#C0C0C0]" />
                    <span className="text-xs font-medium text-[#F5F5F5]">Midday Sweet Notes</span>
                  </div>
                  <p className="text-[11px] text-[#808080] font-light">
                    Random quiet thoughts and reflections to brighten your day
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.sweetLoveNotes}
                  onChange={(e) => handleUpdatePref('sweetLoveNotes', e.target.checked)}
                  className="w-4 h-4 rounded accent-[#C0C0C0] cursor-pointer"
                />
              </div>

              {prefs.sweetLoveNotes && (
                <div className="flex items-center gap-2 pt-1 border-t border-[#222222] text-xs text-[#808080]">
                  <Clock className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span>Send whisper around:</span>
                  <input
                    type="time"
                    value={prefs.sweetNoteTime}
                    onChange={(e) => handleUpdatePref('sweetNoteTime', e.target.value)}
                    className="px-2 py-0.5 rounded-lg bg-[#0A0A0A] border border-[#222222] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
              )}
            </div>

            {/* 6. In-App Interactive Popups */}
            <div className="p-3 rounded-xl bg-[#101010] border border-[#222222] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#F5F5F5]">In-App Reminder Popups</span>
                <p className="text-[11px] text-[#808080] font-light">
                  Show aesthetic popup with snooze & complete actions when due
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.inAppPopups !== false}
                onChange={(e) => handleUpdatePref('inAppPopups', e.target.checked)}
                className="w-4 h-4 rounded accent-[#C0C0C0] cursor-pointer"
              />
            </div>

            {/* 7. Default Snooze Duration */}
            <div className="p-3 rounded-xl bg-[#101010] border border-[#222222] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#F5F5F5]">Default Snooze Length</span>
                <p className="text-[11px] text-[#808080] font-light">
                  Quick snooze delay for active reminders
                </p>
              </div>
              <select
                value={prefs.defaultSnoozeMinutes || 10}
                onChange={(e) =>
                  handleUpdatePref('defaultSnoozeMinutes', parseInt(e.target.value) || 10)
                }
                className="px-2.5 py-1 rounded-lg bg-[#0A0A0A] border border-[#222222] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
              >
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>
          </div>

          {/* Desktop & Mobile Background Support Note */}
          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#222222] flex items-start gap-2.5 text-[11px] text-[#808080] font-light">
            <div className="flex items-center gap-1 shrink-0 text-[#C0C0C0] mt-0.5">
              <Laptop className="w-3.5 h-3.5" />
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1">
              <p className="leading-relaxed">
                Notifications work across desktop and mobile while your browser is open or minimized in the background via Service Worker.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
