import assert from 'assert';

console.log('\n============================================================');
console.log('Focus Sanctuary Timer Unit & Logic Tests');
console.log('============================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err?.message || err}`);
  }
}

// Logic helpers from FocusTimer
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getDurationForMode = (m: 'focus' | 'shortBreak' | 'longBreak', focusMins: number) => {
  if (m === 'focus') return focusMins * 60;
  if (m === 'shortBreak') return 5 * 60;
  return 15 * 60;
};

test('Time formatting properly formats minutes and seconds with padding', () => {
  assert.strictEqual(formatTime(25 * 60), '25:00');
  assert.strictEqual(formatTime(5 * 60), '05:00');
  assert.strictEqual(formatTime(15 * 60), '15:00');
  assert.strictEqual(formatTime(65), '01:05');
  assert.strictEqual(formatTime(9), '00:09');
  assert.strictEqual(formatTime(0), '00:00');
});

test('Default mode durations adhere to 25m, 5m, and 15m specifications', () => {
  assert.strictEqual(getDurationForMode('focus', 25), 1500);
  assert.strictEqual(getDurationForMode('shortBreak', 25), 300);
  assert.strictEqual(getDurationForMode('longBreak', 25), 900);
});

test('Custom focus duration applies correctly', () => {
  assert.strictEqual(getDurationForMode('focus', 45), 2700);
  assert.strictEqual(getDurationForMode('focus', 60), 3600);
  assert.strictEqual(getDurationForMode('focus', 10), 600);
});

test('Progress circle calculation remains between 0 and 1', () => {
  const total = 1500;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  // At start
  let left = 1500;
  let offset = circumference * (1 - left / total);
  assert.strictEqual(Math.round(offset), 0);

  // At halfway
  left = 750;
  offset = circumference * (1 - left / total);
  assert.strictEqual(Math.round(offset), Math.round(circumference / 2));

  // At end
  left = 0;
  offset = circumference * (1 - left / total);
  assert.strictEqual(Math.round(offset), Math.round(circumference));
});

console.log('\n============================================================');
console.log(`Timer Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
