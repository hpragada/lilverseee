import { FlirtCategory, FlirtLine } from '../types';

export interface CategoryMeta {
  id: FlirtCategory;
  label: string;
  emoji: string;
  description: string;
  badgeColor: string;
  glowColor: string;
}

export const FLIRT_CATEGORIES: CategoryMeta[] = [
  {
    id: 'all',
    label: 'All Lines',
    emoji: '💕',
    description: 'A swirl of sweet, witty & romantic lines',
    badgeColor: 'bg-[#111111] text-[#F5F5F5] border-[#292929]',
    glowColor: 'from-[#C0C0C0]/15 via-[#111111]/30 to-transparent',
  },
  {
    id: 'romantic',
    label: 'Romantic',
    emoji: '🌹',
    description: 'Heartfelt words that make your heart skip a beat',
    badgeColor: 'bg-[#111111] text-[#E8E8E8] border-[#C0C0C0]/30',
    glowColor: 'from-[#E8E8E8]/15 via-[#111111]/30 to-transparent',
  },
  {
    id: 'teasing',
    label: 'Teasing',
    emoji: '😉',
    description: 'Playful banter, clever smirks & cheeky sparks',
    badgeColor: 'bg-[#111111] text-[#C0C0C0] border-[#292929]',
    glowColor: 'from-[#C0C0C0]/15 via-[#111111]/30 to-transparent',
  },
  {
    id: 'funny',
    label: 'Funny',
    emoji: '😂',
    description: 'Laugh-out-loud pickup lines & witty charm',
    badgeColor: 'bg-[#111111] text-[#A8A8A8] border-[#292929]',
    glowColor: 'from-[#A8A8A8]/15 via-[#111111]/30 to-transparent',
  },
  {
    id: 'caring',
    label: 'Caring',
    emoji: '🧸',
    description: 'Wholesome sweetness, gentle hugs & pure comfort',
    badgeColor: 'bg-[#111111] text-[#E8E8E8] border-[#C0C0C0]/30',
    glowColor: 'from-[#C0C0C0]/15 via-[#111111]/30 to-transparent',
  },
  {
    id: 'cheesy',
    label: 'Cheesy',
    emoji: '🧀',
    description: 'Delightfully corny lines you secretly adore',
    badgeColor: 'bg-[#111111] text-[#A8A8A8] border-[#292929]',
    glowColor: 'from-[#A8A8A8]/15 via-[#111111]/30 to-transparent',
  },
  {
    id: 'spicy',
    label: 'Spicy',
    emoji: '🔥',
    description: 'Sultry whispers, butterflies & electric blush',
    badgeColor: 'bg-[#111111] text-[#F5F5F5] border-[#C0C0C0]/40',
    glowColor: 'from-[#C0C0C0]/20 via-[#111111]/30 to-transparent',
  },
];

export const PREDEFINED_FLIRT_LINES: FlirtLine[] = [
  // ROMANTIC 🌹
  {
    id: 'rom-1',
    text: "I didn't believe in love at first sight, but then you smiled and ruined my whole argument.",
    category: 'romantic',
    emoji: '🌹',
    tag: 'Heartfelt',
  },
  {
    id: 'rom-2',
    text: 'If my heart had a playlist, the sound of your laugh would be set to loop forever.',
    category: 'romantic',
    emoji: '✨',
    tag: 'Sweet Sound',
  },
  {
    id: 'rom-3',
    text: 'You have no idea how fast my heart races every single time your name pops up on my screen.',
    category: 'romantic',
    emoji: '📱',
    tag: 'Screen Flutter',
  },
  {
    id: 'rom-4',
    text: "If I had a flower for every time you made me smile, I'd walk through an endless garden every day.",
    category: 'romantic',
    emoji: '🌸',
    tag: 'Endless Blooms',
  },
  {
    id: 'rom-5',
    text: "You're my favorite thought before falling asleep and the sweetest reason I wake up with a smile.",
    category: 'romantic',
    emoji: '🌙',
    tag: 'Bedtime Wish',
  },
  {
    id: 'rom-6',
    text: 'In a room full of art and wonder, my eyes would still only search for you.',
    category: 'romantic',
    emoji: '🎨',
    tag: 'Masterpiece',
  },
  {
    id: 'rom-7',
    text: "You aren't just someone I care about; you're the feeling of finally coming home after a long journey.",
    category: 'romantic',
    emoji: '🏡',
    tag: 'Safe Haven',
  },
  {
    id: 'rom-8',
    text: 'I think my absolute favorite place in the entire world is right beside you, doing nothing at all.',
    category: 'romantic',
    emoji: '💫',
    tag: 'Right Here',
  },
  {
    id: 'rom-9',
    text: 'Falling for you was never a conscious choice—it was just the natural law of gravity.',
    category: 'romantic',
    emoji: '🪐',
    tag: 'Gravitational Pull',
  },
  {
    id: 'rom-10',
    text: 'Every love song I ever shrugged off suddenly started making complete sense once I met you.',
    category: 'romantic',
    emoji: '🎶',
    tag: 'Symphony',
  },
  {
    id: 'rom-11',
    text: 'If you were a star, you would outshine every constellation in the night sky.',
    category: 'romantic',
    emoji: '⭐',
    tag: 'Starlight',
  },
  {
    id: 'rom-12',
    text: 'I fell in love with your mind first, but your eyes and smile sealed the deal forever.',
    category: 'romantic',
    emoji: '💌',
    tag: 'Soulful',
  },
  {
    id: 'rom-13',
    text: 'Time moves too fast when we are together and stubbornly slow whenever you are away.',
    category: 'romantic',
    emoji: '⏳',
    tag: 'Time Distortion',
  },
  {
    id: 'rom-14',
    text: 'Holding your hand feels like holding every warm memory I never want to forget.',
    category: 'romantic',
    emoji: '🤝',
    tag: 'Gentle Touch',
  },
  {
    id: 'rom-15',
    text: 'If I were given a lifetime of sunsets, I would choose to watch every single one looking at you.',
    category: 'romantic',
    emoji: '🌅',
    tag: 'Golden Hour',
  },

  // TEASING 😉
  {
    id: 'tea-1',
    text: "Are you tired? Because you've been running through my mind all day... and honestly, you need better cardio.",
    category: 'teasing',
    emoji: '🏃',
    tag: 'Cardio Check',
  },
  {
    id: 'tea-2',
    text: "Stop being so effortlessly adorable. It's distracting and quite frankly, should be illegal.",
    category: 'teasing',
    emoji: '🚨',
    tag: 'Citation Needed',
  },
  {
    id: 'tea-3',
    text: "I bet you look cute even when you're angry, but let's not test that theory today.",
    category: 'teasing',
    emoji: '😼',
    tag: 'Cheeky Dare',
  },
  {
    id: 'tea-4',
    text: 'Are you always this naturally charming, or did you practice on a mirror just for me?',
    category: 'teasing',
    emoji: '🪞',
    tag: 'Practiced Charm',
  },
  {
    id: 'tea-5',
    text: 'You think you are pretty smart, don’t you? Well, you are pretty... that part is definitely true.',
    category: 'teasing',
    emoji: '😏',
    tag: 'Clever Banter',
  },
  {
    id: 'tea-6',
    text: 'You owe me a hot coffee—because looking at your smile made mine go completely cold.',
    category: 'teasing',
    emoji: '☕',
    tag: 'Coffee Debt',
  },
  {
    id: 'tea-7',
    text: "My friends warned me not to fall for someone with that mischievous smile, but clearly I don't follow rules.",
    category: 'teasing',
    emoji: '😈',
    tag: 'Rebel',
  },
  {
    id: 'tea-8',
    text: "If you keep staring at me with those eyes, I can't be held responsible for what I might say next.",
    category: 'teasing',
    emoji: '👀',
    tag: 'Stare Down',
  },
  {
    id: 'tea-9',
    text: 'I was having an exceptionally productive day until your face crossed my mind and wrecked my focus.',
    category: 'teasing',
    emoji: '📊',
    tag: 'Distraction',
  },
  {
    id: 'tea-10',
    text: 'Do you have a license for being this ridiculously good-looking, or do I need to make a citizen arrest?',
    category: 'teasing',
    emoji: '👮',
    tag: 'License Check',
  },
  {
    id: 'tea-11',
    text: "I’d tell you how cute you are, but I don't want your ego taking up any more space in the room.",
    category: 'teasing',
    emoji: '💅',
    tag: 'Ego Boost',
  },
  {
    id: 'tea-12',
    text: 'You are like my favorite notification: I should probably ignore you, but I always open it anyway.',
    category: 'teasing',
    emoji: '🔔',
    tag: 'Ping Me',
  },
  {
    id: 'tea-13',
    text: "Is it exhausting being that charming all day, or do you have a secret power nap routine?",
    category: 'teasing',
    emoji: '⚡',
    tag: 'Recharge',
  },
  {
    id: 'tea-14',
    text: 'I’m not saying you stole my heart, but I definitely noticed a shortage in my chest right after you walked in.',
    category: 'teasing',
    emoji: '🕵️',
    tag: 'Grand Theft',
  },

  // FUNNY 😂
  {
    id: 'fun-1',
    text: 'Are you a keyboard? Because you are definitely my type.',
    category: 'funny',
    emoji: '⌨️',
    tag: 'Nerd Love',
  },
  {
    id: 'fun-2',
    text: 'Do you have a map? Because I just got hopelessly lost in your eyes and Google Maps is no help.',
    category: 'funny',
    emoji: '🗺️',
    tag: 'GPS Lost',
  },
  {
    id: 'fun-3',
    text: 'Are you Wi-Fi? Because I am feeling a super strong, password-protected connection.',
    category: 'funny',
    emoji: '📶',
    tag: 'Full Signal',
  },
  {
    id: 'fun-4',
    text: 'My doctor said I have a severe clinical deficiency of Vitamin U.',
    category: 'funny',
    emoji: '💊',
    tag: 'Prescription',
  },
  {
    id: 'fun-5',
    text: "Are you a parking ticket? Because you've got 'FINE' written all over you!",
    category: 'funny',
    emoji: '🎫',
    tag: 'Meter Maid',
  },
  {
    id: 'fun-6',
    text: 'Do you like raisins? No? Well, how would you feel about a date instead?',
    category: 'funny',
    emoji: '🍇',
    tag: 'Fruit Stand',
  },
  {
    id: 'fun-7',
    text: 'Are you a bank loan? Because you have definitely acquired 100% of my interest.',
    category: 'funny',
    emoji: '🏦',
    tag: 'High Interest',
  },
  {
    id: 'fun-8',
    text: 'Are you a time traveler? Because I see you in my future, and also in my weekend dinner plans.',
    category: 'funny',
    emoji: '⏳',
    tag: 'Timeline',
  },
  {
    id: 'fun-9',
    text: "I'd never play hide and seek with you, because someone as precious as you is impossible to replace.",
    category: 'funny',
    emoji: '🙈',
    tag: 'Hide & Seek',
  },
  {
    id: 'fun-10',
    text: "Are you French? Because Eiffel for you hard and there's no going back.",
    category: 'funny',
    emoji: '🗼',
    tag: 'Parisian',
  },
  {
    id: 'fun-11',
    text: 'Do you have an eraser? Because I simply cannot get you out of my mind.',
    category: 'funny',
    emoji: '✏️',
    tag: 'Permanent Ink',
  },
  {
    id: 'fun-12',
    text: 'Is your name Google? Because you have everything I’ve been tirelessly searching for.',
    category: 'funny',
    emoji: '🔍',
    tag: 'Search Result',
  },
  {
    id: 'fun-13',
    text: 'Are you a campfire? Because you are piping hot and I want s’more of you every day.',
    category: 'funny',
    emoji: '🔥',
    tag: 'Campfire',
  },
  {
    id: 'fun-14',
    text: "If you were a fruit, you'd be a fine-apple, without a doubt.",
    category: 'funny',
    emoji: '🍍',
    tag: 'Fresh Produce',
  },

  // CARING 🧸
  {
    id: 'car-1',
    text: 'Just a gentle reminder that you are deeply cherished and appreciated, exactly as you are.',
    category: 'caring',
    emoji: '🧸',
    tag: 'Warm Affirmation',
  },
  {
    id: 'car-2',
    text: 'I hope today treated you gently. But if it was heavy, please let me be your soft place to land.',
    category: 'caring',
    emoji: '🌸',
    tag: 'Soft Landing',
  },
  {
    id: 'car-3',
    text: 'Did you drink some water today? Eat something warm? Take a deep breath? I care about you, you know.',
    category: 'caring',
    emoji: '💧',
    tag: 'Hydration Check',
  },
  {
    id: 'car-4',
    text: "No matter how loud the world gets, remember you don't have to carry everything by yourself.",
    category: 'caring',
    emoji: '🛡️',
    tag: 'Safe Shelter',
  },
  {
    id: 'car-5',
    text: 'You make the world softer, kinder, and infinitely brighter just by existing in it.',
    category: 'caring',
    emoji: '🌟',
    tag: 'Pure Light',
  },
  {
    id: 'car-6',
    text: 'Wrap yourself up in your favorite cozy blanket and imagine it’s a tight, comforting hug from me.',
    category: 'caring',
    emoji: '🛋️',
    tag: 'Cozy Hug',
  },
  {
    id: 'car-7',
    text: 'You did so wonderfully today, even if all you did was survive. I am genuinely proud of you.',
    category: 'caring',
    emoji: '💐',
    tag: 'Proud of You',
  },
  {
    id: 'car-8',
    text: 'Your feelings are valid, your pace is perfect, and you are worthy of all the peace in this universe.',
    category: 'caring',
    emoji: '🕊️',
    tag: 'Inner Peace',
  },
  {
    id: 'car-9',
    text: 'Whenever you feel overwhelmed, picture me cheering for you quietly from the front row.',
    category: 'caring',
    emoji: '📣',
    tag: '#1 Fan',
  },
  {
    id: 'car-10',
    text: 'Your laugh has the power to heal a sour mood in three seconds flat. Keep protecting that joy.',
    category: 'caring',
    emoji: '🌻',
    tag: 'Joy Keeper',
  },
  {
    id: 'car-11',
    text: 'I wish I could bottle up how special you are and hand it to you every time you doubt yourself.',
    category: 'caring',
    emoji: '🍯',
    tag: 'Honey Drops',
  },
  {
    id: 'car-12',
    text: 'May your pillow be cool, your dreams be gentle, and your morning wake up to quiet sunshine.',
    category: 'caring',
    emoji: '🛌',
    tag: 'Sweet Dreams',
  },

  // CHEESY 🧀
  {
    id: 'che-1',
    text: 'Are you made of Copper and Tellurium? Because you are unmistakably Cu-Te.',
    category: 'cheesy',
    emoji: '🧪',
    tag: 'Chemistry',
  },
  {
    id: 'che-2',
    text: 'If you were a vegetable, you would be a cute-cumber and nobody can convince me otherwise.',
    category: 'cheesy',
    emoji: '🥒',
    tag: 'Produce Aisle',
  },
  {
    id: 'che-3',
    text: 'Did it hurt when you fell from heaven? Or did you just slide gracefully into my heart?',
    category: 'cheesy',
    emoji: '🪽',
    tag: 'Classic Angel',
  },
  {
    id: 'che-4',
    text: "Can I take your picture? I need to show Santa exactly what I want for Christmas this year.",
    category: 'cheesy',
    emoji: '📸',
    tag: 'Wishlist',
  },
  {
    id: 'che-5',
    text: 'Do you believe in love at first sight, or should I walk by you one more time?',
    category: 'cheesy',
    emoji: '🚶',
    tag: 'Take Two',
  },
  {
    id: 'che-6',
    text: "If beauty were measured in time, you'd easily be an eternity.",
    category: 'cheesy',
    emoji: '⌛',
    tag: 'Timeless',
  },
  {
    id: 'che-7',
    text: "I'm not a photographer, but I can definitely picture you and me together for a very long time.",
    category: 'cheesy',
    emoji: '📷',
    tag: 'Framed',
  },
  {
    id: 'che-8',
    text: 'Are you a triangle? Because you are definitely acute one.',
    category: 'cheesy',
    emoji: '📐',
    tag: 'Geometry',
  },
  {
    id: 'che-9',
    text: 'Is there an airport nearby, or was that just my heart taking flight when you glanced over?',
    category: 'cheesy',
    emoji: '🛫',
    tag: 'Runway',
  },
  {
    id: 'che-10',
    text: 'If you were a burger at McDonald’s, you’d be the McGorgeous.',
    category: 'cheesy',
    emoji: '🍔',
    tag: 'Extra Sauce',
  },
  {
    id: 'che-11',
    text: 'Are you a lightning bolt? Because you are shocking, electric, and completely breathtaking.',
    category: 'cheesy',
    emoji: '⚡',
    tag: 'Thunderstruck',
  },
  {
    id: 'che-12',
    text: 'Is your name Waldo? Because someone as wonderfully rare as you is so hard to find.',
    category: 'cheesy',
    emoji: '🔍',
    tag: 'Found You',
  },

  // SPICY 🔥
  {
    id: 'spi-1',
    text: "My thoughts about you today are definitely not suitable for a general audience rating.",
    category: 'spicy',
    emoji: '🌶️',
    tag: 'Rated R',
  },
  {
    id: 'spi-2',
    text: 'You look breathtaking today, but you would look even more intoxicating whispering in my ear.',
    category: 'spicy',
    emoji: '💋',
    tag: 'Whispers',
  },
  {
    id: 'spi-3',
    text: 'I was trying so hard to be productive today, but thinking about your lips ruined that entire plan.',
    category: 'spicy',
    emoji: '💄',
    tag: 'Lipstick Mark',
  },
  {
    id: 'spi-4',
    text: 'If kisses were snowflakes, I would send you an all-out winter blizzard right now.',
    category: 'spicy',
    emoji: '❄️',
    tag: 'Blizzard',
  },
  {
    id: 'spi-5',
    text: 'Come closer... I have a quiet secret that can only be shared with zero inches between us.',
    category: 'spicy',
    emoji: '🤫',
    tag: 'Zero Distance',
  },
  {
    id: 'spi-6',
    text: "The only thing more addictive than your voice is the thought of being wrapped in your arms tonight.",
    category: 'spicy',
    emoji: '🕯️',
    tag: 'Night Glow',
  },
  {
    id: 'spi-7',
    text: 'You have this ridiculous effect where the second you look at me, my brain turns off completely.',
    category: 'spicy',
    emoji: '🫠',
    tag: 'Melted',
  },
  {
    id: 'spi-8',
    text: 'Tell me what you are thinking about right now... and tell me if it involves me.',
    category: 'spicy',
    emoji: '🖤',
    tag: 'Mind Reading',
  },
  {
    id: 'spi-9',
    text: 'I wish teleportation existed so I could pull you into my arms in 0.2 seconds.',
    category: 'spicy',
    emoji: '⚡',
    tag: 'Teleport',
  },
  {
    id: 'spi-10',
    text: 'You have that quiet confidence that makes it completely impossible to look away.',
    category: 'spicy',
    emoji: '🔥',
    tag: 'Magnetic',
  },
  {
    id: 'spi-11',
    text: 'My sweater smells like you, and honestly I am never going to wash it.',
    category: 'spicy',
    emoji: '🧥',
    tag: 'Scent of You',
  },
  {
    id: 'spi-12',
    text: "Every time you touch my arm, there's an electric spark that keeps me awake for hours.",
    category: 'spicy',
    emoji: '⚡',
    tag: 'Sparks Fly',
  },
];

/**
 * Filter lines by selected category
 */
export function getLinesByCategory(category: FlirtCategory): FlirtLine[] {
  if (category === 'all') {
    return PREDEFINED_FLIRT_LINES;
  }
  return PREDEFINED_FLIRT_LINES.filter((line) => line.category === category);
}

/**
 * Get a random line from a category, avoiding immediate duplicate
 */
export function getRandomFlirtLine(category: FlirtCategory, currentId?: string): FlirtLine {
  const pool = getLinesByCategory(category);
  if (pool.length === 0) {
    return PREDEFINED_FLIRT_LINES[0];
  }
  if (pool.length === 1) {
    return pool[0];
  }
  let candidate: FlirtLine;
  let attempts = 0;
  do {
    const randomIndex = Math.floor(Math.random() * pool.length);
    candidate = pool[randomIndex];
    attempts++;
  } while (candidate.id === currentId && attempts < 10);
  return candidate;
}

/**
 * Deterministic Line of the Day based on the current date
 */
export function getDailyFlirtLine(): FlirtLine {
  const now = new Date();
  const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash << 5) - hash + dateString.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PREDEFINED_FLIRT_LINES.length;
  return PREDEFINED_FLIRT_LINES[index];
}
