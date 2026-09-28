import assert from 'assert';
import {
  PREDEFINED_FLIRT_LINES,
  FLIRT_CATEGORIES,
  getLinesByCategory,
  getRandomFlirtLine,
  getDailyFlirtLine,
} from '../src/data/flirtLines';
import { FlirtFavorite } from '../src/types';

console.log('\n============================================================');
console.log('Flirt Corner 💕 Unit & Logic Tests');
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

test('Predefined lines dataset contains over 50 lines with unique IDs', () => {
  assert.ok(PREDEFINED_FLIRT_LINES.length >= 50, `Found ${PREDEFINED_FLIRT_LINES.length} lines`);
  const ids = new Set(PREDEFINED_FLIRT_LINES.map((l) => l.id));
  assert.strictEqual(ids.size, PREDEFINED_FLIRT_LINES.length, 'IDs must be unique');
});

test('All required categories are represented in predefined lines', () => {
  const requiredCategories = ['romantic', 'teasing', 'funny', 'caring', 'cheesy', 'spicy'] as const;
  for (const cat of requiredCategories) {
    const lines = getLinesByCategory(cat);
    assert.ok(lines.length >= 8, `Category ${cat} should have at least 8 lines, got ${lines.length}`);
  }
});

test('getRandomFlirtLine respects category filter and returns valid line', () => {
  const line = getRandomFlirtLine('teasing');
  assert.strictEqual(line.category, 'teasing');
  assert.ok(line.text.length > 5);
  assert.ok(line.emoji.length > 0);
});

test('getRandomFlirtLine avoids immediate duplicate when pool > 1', () => {
  const initial = getRandomFlirtLine('romantic');
  const next = getRandomFlirtLine('romantic', initial.id);
  assert.notStrictEqual(next.id, initial.id, 'Should pick a different line when pool has multiple items');
});

test('getDailyFlirtLine returns a consistent deterministic line for today', () => {
  const line1 = getDailyFlirtLine();
  const line2 = getDailyFlirtLine();
  assert.strictEqual(line1.id, line2.id, 'Daily line must be deterministic for the current date');
  assert.ok(line1.text.length > 0);
});

test('FlirtFavorite schema validation complies with user-specific sync standards', () => {
  const sampleFavorite: FlirtFavorite = {
    id: `fav-${Date.now()}-abc`,
    lineId: 'rom-1',
    text: 'If my heart had a playlist, your voice would be on repeat.',
    category: 'romantic',
    emoji: '🌹',
    savedAt: new Date().toISOString(),
    customNote: 'Sent to my crush',
    copiedCount: 1,
    updatedAt: new Date().toISOString(),
  };

  assert.strictEqual(typeof sampleFavorite.id, 'string');
  assert.strictEqual(typeof sampleFavorite.lineId, 'string');
  assert.strictEqual(typeof sampleFavorite.text, 'string');
  assert.ok(['romantic', 'teasing', 'funny', 'caring', 'cheesy', 'spicy'].includes(sampleFavorite.category));
  assert.strictEqual(typeof sampleFavorite.savedAt, 'string');
});

console.log('\n============================================================');
console.log(`Flirt Corner Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
