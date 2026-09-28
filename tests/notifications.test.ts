import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPreferences,
  notificationService,
  getCuteReminderMessage,
  isEventDueToday,
  isEventOnDate,
} from '../src/services/notificationService';

console.log('\n============================================================');
console.log('Sanctuary Desktop & Phone Notifications Unit Tests');
console.log('============================================================\n');

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      failedTests++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err?.message || err}`);
    }
  }

  await test('Default preferences specify disabled initial state with sensible defaults', () => {
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.enabled, false);
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.focusTimer, true);
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.taskReminders, true);
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.taskReminderTime, '10:00');
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.eventReminders, true);
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.eventReminderLeadMinutes, 15);
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.sweetLoveNotes, true);
    assert.strictEqual(DEFAULT_NOTIFICATION_PREFS.soundEnabled, true);
  });

  await test('Preferences persist and restore via safe storage fallback', () => {
    const customPrefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
      taskReminderTime: '09:30',
      eventReminderLeadMinutes: 30,
      sweetNoteTime: '15:00',
    };

    notificationService.savePreferences(customPrefs);
    const loaded = notificationService.getPreferences();
    assert.strictEqual(loaded.enabled, true);
    assert.strictEqual(loaded.taskReminderTime, '09:30');
    assert.strictEqual(loaded.eventReminderLeadMinutes, 30);
    assert.strictEqual(loaded.sweetNoteTime, '15:00');
  });

  await test('Service worker /public/sw.js exists and configures notification click listener', () => {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    assert.ok(fs.existsSync(swPath), 'public/sw.js must exist for mobile PWA & desktop notifications');
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes('notificationclick'), 'Service worker must handle notificationclick');
    assert.ok(swContent.includes('notification.close()'), 'Service worker must close clicked notification');
  });

  await test('In-app listener receives dispatched notifications when enabled', async () => {
    notificationService.savePreferences({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
      soundEnabled: false,
    });

    let receivedPayload: { title: string; body: string } | null = null;
    const unsubscribe = notificationService.onInAppNotification((payload) => {
      receivedPayload = payload;
    });

    const res = await notificationService.sendNotification('Test Sanctuary 💕', {
      body: 'Warm hugs and sweet notes!',
      silent: true,
    });

    assert.ok(receivedPayload !== null, 'Listener should receive notification payload');
    const payload = receivedPayload as { title: string; body: string };
    assert.strictEqual(payload.title, 'Test Sanctuary 💕');
    assert.strictEqual(payload.body, 'Warm hugs and sweet notes!');
    assert.strictEqual(res.inAppDispatched, true);

    unsubscribe();
  });

  await test('Notifications are suppressed when master enabled flag is false and forceNative is false', async () => {
    notificationService.savePreferences({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: false,
    });

    let received = false;
    const unsubscribe = notificationService.onInAppNotification(() => {
      received = true;
    });

    const sent = await notificationService.sendNotification('Test Muted', {
      body: 'Should not send',
      silent: true,
      forceNative: false,
    });

    assert.strictEqual(sent.success, false);
    assert.strictEqual(sent.inAppDispatched, false);
    assert.strictEqual(received, false);

    unsubscribe();
  });

  await test('Test Notification allows forceNative bypass for direct verification', async () => {
    notificationService.savePreferences({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: false,
    });

    let received = false;
    const unsubscribe = notificationService.onInAppNotification(() => {
      received = true;
    });

    const sent = await notificationService.sendTestNotification();
    assert.strictEqual(sent.inAppDispatched, true);
    assert.strictEqual(received, true);

    unsubscribe();
  });

  await test('Scheduled reminders check handles empty or completed task list gracefully', () => {
    notificationService.savePreferences({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
    });

    notificationService.checkScheduledReminders([], []);
    notificationService.checkScheduledReminders(
      [{ id: '1', title: 'Drink tea', completed: true }],
      []
    );
  });

  await test('getCuteReminderMessage generates personalized messages for birthdays, anniversaries, and appointments', () => {
    const birthdayMsg = getCuteReminderMessage({
      id: 'bday-1',
      title: 'Elena',
      time: '09:00 AM',
      date: '2026-09-26',
      type: 'birthday',
      category: 'birthday',
    });
    assert.strictEqual(birthdayMsg.emoji, '🎂');
    assert.ok(birthdayMsg.heading.includes('Birthday Celebration: Elena'));
    assert.strictEqual(birthdayMsg.badge, 'Birthday Celebration');

    const anniversaryMsg = getCuteReminderMessage({
      id: 'anni-1',
      title: 'First Date',
      time: '07:00 PM',
      date: '2026-09-26',
      type: 'anniversary',
      category: 'anniversary',
    });
    assert.strictEqual(anniversaryMsg.emoji, '💖');
    assert.ok(anniversaryMsg.heading.includes('Anniversary Milestone'));

    const apptMsg = getCuteReminderMessage({
      id: 'appt-1',
      title: 'Dr. Wellness Check',
      time: '02:00 PM',
      date: '2026-09-26',
      type: 'appointment',
      category: 'appointment',
    });
    assert.strictEqual(apptMsg.emoji, '🩺');
    assert.ok(apptMsg.body.includes('02:00 PM'));

    const taskMsg = getCuteReminderMessage({
      id: 'task-1',
      title: 'Gentle Walk in Park',
      time: '04:00 PM',
      date: '2026-09-26',
      type: 'task',
      category: 'task',
    });
    assert.strictEqual(taskMsg.emoji, '📝');
    assert.ok(taskMsg.body.includes('zero pressure'));
  });

  await test('Repeat schedule options (daily, weekly, yearly) correctly compute due dates', () => {
    // 1. Daily repeat
    const dailyEvent = {
      id: 'daily-1',
      title: 'Morning stretch',
      time: '08:00 AM',
      date: '2025-01-01',
      type: 'ritual' as const,
      repeat: 'daily' as const,
    };
    assert.strictEqual(isEventDueToday(dailyEvent, new Date(2026, 8, 26)), true);
    assert.strictEqual(isEventOnDate(dailyEvent, '2026-10-15'), true);

    // 2. Yearly repeat (e.g. birthday on Sept 26)
    const yearlyEvent = {
      id: 'bday-yearly',
      title: 'Mom Birthday',
      time: '09:00 AM',
      date: '1990-09-26',
      type: 'birthday' as const,
      repeat: 'yearly' as const,
    };
    assert.strictEqual(isEventDueToday(yearlyEvent, new Date(2026, 8, 26)), true);
    assert.strictEqual(isEventDueToday(yearlyEvent, new Date(2026, 8, 27)), false);
    assert.strictEqual(isEventOnDate(yearlyEvent, '2027-09-26'), true);
    assert.strictEqual(isEventOnDate(yearlyEvent, '2027-09-25'), false);

    // 3. Weekly repeat (e.g. Tuesday ritual)
    // 2026-09-01 was a Tuesday
    const weeklyEvent = {
      id: 'tues-weekly',
      title: 'Tea & Art',
      time: '06:00 PM',
      date: '2026-09-01', // Tuesday
      type: 'ritual' as const,
      repeat: 'weekly' as const,
    };
    // 2026-09-08 is Tuesday (+7 days), 2026-09-09 is Wednesday
    assert.strictEqual(isEventDueToday(weeklyEvent, new Date(2026, 8, 8)), true);
    assert.strictEqual(isEventDueToday(weeklyEvent, new Date(2026, 8, 9)), false);
  });

  await test('Snoozing and duplicate prevention logic functions without repeated dispatches', async () => {
    notificationService.savePreferences({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
      soundEnabled: false,
      eventReminders: true,
      eventReminderLeadMinutes: 60,
    });

    let reminderCount = 0;
    const unsubscribe = notificationService.onInAppNotification(() => {
      reminderCount++;
    });

    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMin = now.getMinutes().toString().padStart(2, '0');
    const todayStr = now.toISOString().split('T')[0];

    const event = {
      id: `test-dup-${Date.now()}`,
      title: 'Gentle Hydration',
      time: `${currentHour}:${currentMin}`,
      date: todayStr,
      type: 'ritual' as const,
      category: 'ritual' as const,
      repeat: 'none' as const,
    };

    // First check should notify
    notificationService.checkScheduledReminders([], [event]);
    const firstCount = reminderCount;
    assert.strictEqual(firstCount, 1, 'Event should notify on first check');

    // Immediate second check MUST NOT notify again (duplicate prevention)
    notificationService.checkScheduledReminders([], [event]);
    assert.strictEqual(reminderCount, firstCount, 'Duplicate notification must be prevented');

    unsubscribe();
  });

  console.log('\n============================================================');
  console.log(`Notifications Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed', err);
  process.exit(1);
});
