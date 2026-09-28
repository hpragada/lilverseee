import assert from 'assert';
import {
  getTimePeriod,
  GREETING_HEADINGS,
  PERIOD_SWEET_LINES,
  getRandomSweetLine,
  TimePeriod,
} from '../src/data/romanticGreetings';

console.log('\n============================================================');
console.log('Romantic Greeting Banner Unit & Boundary Tests');
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

// Helper to create date with specific hour and minute
function makeDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

test('Morning boundary (5 AM - 11:59 AM) maps to morning greeting', () => {
  assert.strictEqual(getTimePeriod(makeDate(5, 0)), 'morning');
  assert.strictEqual(getTimePeriod(makeDate(8, 30)), 'morning');
  assert.strictEqual(getTimePeriod(makeDate(11, 59)), 'morning');
  assert.strictEqual(
    GREETING_HEADINGS.morning,
    'Hey, good morning, love! ❤️ Ready to make today beautiful?'
  );
});

test('Afternoon boundary (12 PM - 4:59 PM) maps to afternoon greeting', () => {
  assert.strictEqual(getTimePeriod(makeDate(12, 0)), 'afternoon');
  assert.strictEqual(getTimePeriod(makeDate(14, 15)), 'afternoon');
  assert.strictEqual(getTimePeriod(makeDate(16, 59)), 'afternoon');
  assert.strictEqual(
    GREETING_HEADINGS.afternoon,
    'Hey, sunshine! Afternoon feels sweeter with you around 😘'
  );
});

test('Evening boundary (5 PM - 8:59 PM) maps to evening greeting', () => {
  assert.strictEqual(getTimePeriod(makeDate(17, 0)), 'evening');
  assert.strictEqual(getTimePeriod(makeDate(19, 0)), 'evening');
  assert.strictEqual(getTimePeriod(makeDate(20, 59)), 'evening');
  assert.strictEqual(
    GREETING_HEADINGS.evening,
    'Hey cutie, evening cuddles are calling 💕'
  );
});

test('Night boundary (9 PM - 4:59 AM) maps to night greeting', () => {
  assert.strictEqual(getTimePeriod(makeDate(21, 0)), 'night');
  assert.strictEqual(getTimePeriod(makeDate(23, 59)), 'night');
  assert.strictEqual(getTimePeriod(makeDate(0, 0)), 'night');
  assert.strictEqual(getTimePeriod(makeDate(2, 30)), 'night');
  assert.strictEqual(getTimePeriod(makeDate(4, 59)), 'night');
  assert.strictEqual(
    GREETING_HEADINGS.night,
    'Hey sleepyhead, sending you a thousand kisses 🌙'
  );
});

test('Each time period has rich collection of sweet romantic/cute lines', () => {
  const periods: TimePeriod[] = ['morning', 'afternoon', 'evening', 'night'];
  for (const p of periods) {
    const list = PERIOD_SWEET_LINES[p];
    assert.ok(list.length >= 5, `Period ${p} must have at least 5 lines`);
    for (const line of list) {
      assert.ok(line.length > 5, 'Line must not be empty');
    }
  }
});

test('getRandomSweetLine avoids duplicate when pool has multiple lines', () => {
  const first = getRandomSweetLine('morning');
  const second = getRandomSweetLine('morning', first);
  assert.notStrictEqual(second, first, 'Should select a different line if possible');
});

console.log('\n============================================================');
console.log(`Greeting Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
