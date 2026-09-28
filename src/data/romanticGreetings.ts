export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export const GREETING_HEADINGS: Record<TimePeriod, string> = {
  morning: 'Hey, good morning, love! ❤️ Ready to make today beautiful?',
  afternoon: 'Hey, sunshine! Afternoon feels sweeter with you around 😘',
  evening: 'Hey cutie, evening cuddles are calling 💕',
  night: 'Hey sleepyhead, sending you a thousand kisses 🌙',
};

export interface PeriodTheme {
  period: TimePeriod;
  badgeLabel: string;
  badgeIcon: string;
  gradient: string;
  border: string;
  glow: string;
  accentText: string;
}

export const PERIOD_THEMES: Record<TimePeriod, PeriodTheme> = {
  morning: {
    period: 'morning',
    badgeLabel: 'Morning Glow',
    badgeIcon: '☀️',
    gradient: 'from-zinc-900/60 via-[#111111] to-black',
    border: 'border-[#292929] hover:border-[#C0C0C0]/40',
    glow: 'from-[#C0C0C0]/15 to-transparent',
    accentText: 'text-[#E8E8E8]',
  },
  afternoon: {
    period: 'afternoon',
    badgeLabel: 'Sunlit Afternoon',
    badgeIcon: '✨',
    gradient: 'from-zinc-900/60 via-[#111111] to-black',
    border: 'border-[#292929] hover:border-[#C0C0C0]/40',
    glow: 'from-[#C0C0C0]/15 to-transparent',
    accentText: 'text-[#E8E8E8]',
  },
  evening: {
    period: 'evening',
    badgeLabel: 'Cozy Twilight',
    badgeIcon: '🌆',
    gradient: 'from-zinc-900/60 via-[#111111] to-black',
    border: 'border-[#292929] hover:border-[#C0C0C0]/40',
    glow: 'from-[#C0C0C0]/15 to-transparent',
    accentText: 'text-[#E8E8E8]',
  },
  night: {
    period: 'night',
    badgeLabel: 'Starry Night',
    badgeIcon: '🌙',
    gradient: 'from-zinc-900/60 via-[#111111] to-black',
    border: 'border-[#292929] hover:border-[#C0C0C0]/40',
    glow: 'from-[#C0C0C0]/15 to-transparent',
    accentText: 'text-[#E8E8E8]',
  },
};

export const PERIOD_SWEET_LINES: Record<TimePeriod, string[]> = {
  morning: [
    'The sun is up, but you’re still the brightest thing in my world ✨',
    'Coffee is nice, but your smile is what truly wakes my heart up ☕💕',
    'Wishing I could sneak a warm forehead kiss into your morning routine 🌸',
    'Hope your morning is as soft, sweet, and gentle as your laugh 🥐',
    'Just in case no one told you yet today: you are so deeply cherished ☀️',
    'Take a slow, deep breath, my favorite human. Today is yours to shine 🌿',
    'If I were making breakfast, you’d have heart-shaped waffles waiting on your table 🧇💕',
  ],
  afternoon: [
    'Pause for a second, breathe, and remember someone is completely crazy about you 🌟',
    'Halfway through the day and you’ve crossed my mind about a hundred times already 💭',
    'Sending you an afternoon refill of warm hugs, quiet comfort, and sweet energy 🧋',
    'Afternoon reminder: you are doing so well, and you look effortlessly adorable today 😘',
    'Don’t work too hard—make sure to save a little of that radiant charm for later 😉',
    'Wishing I could magically drop off your favorite sweet drink and a warm hug right now 🥤💕',
    'A quick midday whisper just to make your heart skip a happy beat ✨',
  ],
  evening: [
    'The day is winding down, but my thoughts of you are still wide awake 🌆',
    'Kick off your shoes, grab your softest blanket, and let cozy mode take over 🛋️',
    'Even the prettiest sunset doesn’t stand a chance next to your smile 🌇',
    'Sending you a long, comforting hug to melt away any stress from today 🕯️',
    'If evening cuddles could be ordered on an app, you’d have endless deliveries by now 💕',
    'May your evening be filled with gentle peace, warm tea, and quiet joy 🍵',
    'Thinking about your cute laugh and instantly feeling 100% warmer inside 💫',
  ],
  night: [
    'Close your pretty eyes, dream the sweetest dreams, and sleep peacefully 🌌',
    'May your pillow stay cool and your heart stay warm all night long 🧸',
    'Tucking you in from afar with warm blankets and gentle whispers 💫',
    'The stars are out, but none of them glow quite as beautifully as you do in my life ⭐',
    'Leave all of today’s worries behind; tomorrow is another gentle adventure together 🌙',
    'Rest well, my favorite person. Sleep tight and wake up refreshed 🛌',
    'Sending a pocketful of soft kisses to guard your dreams until morning 💤',
  ],
};

/**
 * Computes time period based on user's local time:
 * - Morning: 5 AM – 11:59 AM
 * - Afternoon: 12 PM – 4:59 PM
 * - Evening: 5 PM – 8:59 PM
 * - Night: 9 PM – 4:59 AM
 */
export function getTimePeriod(date: Date = new Date()): TimePeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Gets a random sweet line for the given time period, avoiding immediate duplicates
 */
export function getRandomSweetLine(period: TimePeriod, currentLine?: string): string {
  const lines = PERIOD_SWEET_LINES[period];
  if (!lines || lines.length === 0) {
    return 'You make every moment sweeter 💕';
  }
  if (lines.length === 1) {
    return lines[0];
  }
  let candidate: string;
  let attempts = 0;
  do {
    const idx = Math.floor(Math.random() * lines.length);
    candidate = lines[idx];
    attempts++;
  } while (candidate === currentLine && attempts < 10);
  return candidate;
}
