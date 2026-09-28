import subprocess
import os

svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#1A122B"/>
      <stop offset="60%" stop-color="#0F0A1C"/>
      <stop offset="100%" stop-color="#080512"/>
    </radialGradient>

    <!-- Glowing Moon Gradient -->
    <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F3EEFB"/>
      <stop offset="40%" stop-color="#E8D5FF"/>
      <stop offset="80%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>

    <!-- Ring Gradient -->
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F3EEFB" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#E8D5FF" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#C084FC" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Text Gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="45%" stop-color="#F3EEFB"/>
      <stop offset="80%" stop-color="#E8D5FF"/>
      <stop offset="100%" stop-color="#F472B6"/>
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Dark Midnight Background -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)"/>

  <!-- Outer Neon Squircle Frame -->
  <rect x="24" y="24" width="464" height="464" rx="88" fill="none" stroke="#A855F7" stroke-width="3" opacity="0.6" filter="url(#glow)"/>
  <rect x="24" y="24" width="464" height="464" rx="88" fill="none" stroke="#F472B6" stroke-width="1.5" opacity="0.8"/>

  <!-- Stars and Sparkles -->
  <!-- Top Left Star -->
  <path d="M165,110 Q165,125 177,125 Q165,125 165,140 Q165,125 153,125 Q165,125 165,110 Z" fill="#F3EEFB" filter="url(#glow)"/>
  <!-- Right Bottom Star -->
  <path d="M365,245 Q365,257 375,257 Q365,257 365,269 Q365,257 355,257 Q365,257 365,245 Z" fill="#E8D5FF" filter="url(#glow)"/>
  <!-- Top Center Dot Star -->
  <circle cx="212" cy="92" r="3.5" fill="#FFFFFF" opacity="0.9" filter="url(#glow)"/>
  <!-- Small dots -->
  <circle cx="136" cy="148" r="2.5" fill="#E8D5FF" opacity="0.7"/>
  <circle cx="123" cy="200" r="2" fill="#F472B6" opacity="0.8"/>
  <circle cx="110" cy="262" r="2.5" fill="#E8D5FF" opacity="0.8"/>
  <circle cx="280" cy="206" r="2" fill="#FFFFFF" opacity="0.9"/>
  <circle cx="330" cy="275" r="2.5" fill="#E8D5FF" opacity="0.7"/>
  <circle cx="418" cy="260" r="2" fill="#F472B6" opacity="0.8"/>

  <!-- Butterfly -->
  <g transform="translate(352, 108) rotate(-12) scale(0.95)" filter="url(#glow)">
    <!-- Butterfly Dotted Trajectory -->
    <path d="M-60,50 Q-30,45 -10,20" fill="none" stroke="#E8D5FF" stroke-width="2" stroke-dasharray="3,4" opacity="0.7"/>
    <!-- Wings -->
    <path d="M0,0 C-12,-16 -24,-8 -14,6 C-22,12 -12,22 0,4 C12,22 22,12 14,6 C24,-8 12,-16 0,0 Z" fill="none" stroke="#F3EEFB" stroke-width="2.5"/>
    <path d="M-2,-2 C-8,-10 -15,-5 -8,2 Z" fill="#E8D5FF" opacity="0.6"/>
    <path d="M2,-2 C8,-10 15,-5 8,2 Z" fill="#E8D5FF" opacity="0.6"/>
  </g>

  <!-- Crescent Moon with Planetary Ring -->
  <g filter="url(#softGlow)">
    <!-- Planetary Ring Back Layer -->
    <ellipse cx="256" cy="200" rx="122" ry="32" fill="none" stroke="url(#ringGrad)" stroke-width="3" transform="rotate(-16, 256, 200)" opacity="0.85"/>
    
    <!-- Crescent Moon Body -->
    <path d="M 270,118 A 82,82 0 1,0 270,282 A 70,70 0 1,1 270,118 Z" fill="url(#moonGrad)"/>

    <!-- Planetary Ring Front Layer Cutover -->
    <path d="M 138,212 C 160,232 230,245 320,225" fill="none" stroke="url(#ringGrad)" stroke-width="3.5" transform="rotate(-16, 256, 200)"/>

    <!-- Small Star on Ring -->
    <path d="M322,176 Q322,185 330,185 Q322,185 322,194 Q322,185 314,185 Q322,185 322,176 Z" fill="#FFFFFF"/>
  </g>

  <!-- Typography: LilVerse -->
  <g text-anchor="middle" filter="url(#glow)">
    <!-- Brand Title -->
    <text x="256" y="365" font-family="'Inter', 'Segoe UI', system-ui, sans-serif" font-weight="700" font-size="64" fill="url(#textGrad)" letter-spacing="0">LilVerse</text>
    
    <!-- Heart above 'i' in LilVerse -->
    <path d="M 188,302 C 188,297 183,293 178,296 C 173,293 168,297 168,302 C 168,308 178,314 178,314 C 178,314 188,308 188,302 Z" fill="#F472B6"/>

    <!-- Subtitle Frame Line Left -->
    <line x1="110" y1="392" x2="138" y2="392" stroke="#E8D5FF" stroke-width="1.5" opacity="0.7"/>
    
    <!-- Subtitle: your own little universe -->
    <text x="256" y="396" font-family="'Inter', 'Segoe UI', system-ui, sans-serif" font-weight="400" font-size="15" fill="#E8D5FF" letter-spacing="2.5" opacity="0.9">your own little universe</text>
    
    <!-- Subtitle Frame Line Right -->
    <line x1="374" y1="392" x2="402" y2="392" stroke="#E8D5FF" stroke-width="1.5" opacity="0.7"/>
  </g>
</svg>
'''

with open('/tmp/pwa_icon.svg', 'w') as f:
    f.write(svg_content)

os.makedirs('public', exist_ok=True)

sizes = [
    ('public/pwa-512x512.png', 512, 512),
    ('public/pwa-192x192.png', 192, 192),
    ('public/pwa-512x512-maskable.png', 512, 512),
    ('public/pwa-192x192-maskable.png', 192, 192),
    ('public/apple-touch-icon.png', 180, 180),
    ('public/favicon.png', 64, 64),
]

for path, w, h in sizes:
    cmd = f"rsvg-convert -w {w} -h {h} /tmp/pwa_icon.svg -o {path}"
    subprocess.run(cmd, shell=True, check=True)
    print(f"Generated {path} ({w}x{h})")

