import subprocess
import os

# 1. Background-removed SVG for adaptive icon foreground
foreground_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
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

  <!-- Stars and Sparkles -->
  <path d="M165,110 Q165,125 177,125 Q165,125 165,140 Q165,125 153,125 Q165,125 165,110 Z" fill="#F3EEFB" filter="url(#glow)"/>
  <path d="M365,245 Q365,257 375,257 Q365,257 365,269 Q365,257 355,257 Q365,257 365,245 Z" fill="#E8D5FF" filter="url(#glow)"/>
  <circle cx="212" cy="92" r="3.5" fill="#FFFFFF" opacity="0.9" filter="url(#glow)"/>
  <circle cx="136" cy="148" r="2.5" fill="#E8D5FF" opacity="0.7"/>
  <circle cx="123" cy="200" r="2" fill="#F472B6" opacity="0.8"/>
  <circle cx="110" cy="262" r="2.5" fill="#E8D5FF" opacity="0.8"/>
  <circle cx="280" cy="206" r="2" fill="#FFFFFF" opacity="0.9"/>
  <circle cx="330" cy="275" r="2.5" fill="#E8D5FF" opacity="0.7"/>
  <circle cx="418" cy="260" r="2" fill="#F472B6" opacity="0.8"/>

  <!-- Butterfly -->
  <g transform="translate(352, 108) rotate(-12) scale(0.95)" filter="url(#glow)">
    <path d="M-60,50 Q-30,45 -10,20" fill="none" stroke="#E8D5FF" stroke-width="2" stroke-dasharray="3,4" opacity="0.7"/>
    <path d="M0,0 C-12,-16 -24,-8 -14,6 C-22,12 -12,22 0,4 C12,22 22,12 14,6 C24,-8 12,-16 0,0 Z" fill="none" stroke="#F3EEFB" stroke-width="2.5"/>
    <path d="M-2,-2 C-8,-10 -15,-5 -8,2 Z" fill="#E8D5FF" opacity="0.6"/>
    <path d="M2,-2 C8,-10 15,-5 8,2 Z" fill="#E8D5FF" opacity="0.6"/>
  </g>

  <!-- Crescent Moon with Planetary Ring -->
  <g filter="url(#softGlow)" transform="scale(0.8) translate(64, 40)">
    <ellipse cx="256" cy="200" rx="122" ry="32" fill="none" stroke="url(#ringGrad)" stroke-width="3" transform="rotate(-16, 256, 200)" opacity="0.85"/>
    <path d="M 270,118 A 82,82 0 1,0 270,282 A 70,70 0 1,1 270,118 Z" fill="url(#moonGrad)"/>
    <path d="M 138,212 C 160,232 230,245 320,225" fill="none" stroke="url(#ringGrad)" stroke-width="3.5" transform="rotate(-16, 256, 200)"/>
    <path d="M322,176 Q322,185 330,185 Q322,185 322,194 Q322,185 314,185 Q322,185 322,176 Z" fill="#FFFFFF"/>
  </g>

  <!-- Typography: LilVerse -->
  <g text-anchor="middle" filter="url(#glow)">
    <text x="256" y="380" font-family="'Inter', 'Segoe UI', system-ui, sans-serif" font-weight="700" font-size="64" fill="url(#textGrad)" letter-spacing="0">LilVerse</text>
    <path d="M 188,317 C 188,312 183,308 178,311 C 173,308 168,312 168,317 C 168,323 178,329 178,329 C 178,329 188,323 188,317 Z" fill="#F472B6"/>
    <line x1="110" y1="407" x2="138" y2="407" stroke="#E8D5FF" stroke-width="1.5" opacity="0.7"/>
    <text x="256" y="411" font-family="'Inter', 'Segoe UI', system-ui, sans-serif" font-weight="400" font-size="15" fill="#E8D5FF" letter-spacing="2.5" opacity="0.9">your own little universe</text>
    <line x1="374" y1="407" x2="402" y2="407" stroke="#E8D5FF" stroke-width="1.5" opacity="0.7"/>
  </g>
</svg>
'''

# Save the foreground SVG temporary file
with open('/tmp/android_foreground.svg', 'w') as f:
    f.write(foreground_svg)

# Original full SVG structure with background
full_svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
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
  <path d="M165,110 Q165,125 177,125 Q165,125 165,140 Q165,125 153,125 Q165,125 165,110 Z" fill="#F3EEFB" filter="url(#glow)"/>
  <path d="M365,245 Q365,257 375,257 Q365,257 365,269 Q365,257 355,257 Q365,257 365,245 Z" fill="#E8D5FF" filter="url(#glow)"/>
  <circle cx="212" cy="92" r="3.5" fill="#FFFFFF" opacity="0.9" filter="url(#glow)"/>
  <circle cx="136" cy="148" r="2.5" fill="#E8D5FF" opacity="0.7"/>
  <circle cx="123" cy="200" r="2" fill="#F472B6" opacity="0.8"/>
  <circle cx="110" cy="262" r="2.5" fill="#E8D5FF" opacity="0.8"/>
  <circle cx="280" cy="206" r="2" fill="#FFFFFF" opacity="0.9"/>
  <circle cx="330" cy="275" r="2.5" fill="#E8D5FF" opacity="0.7"/>
  <circle cx="418" cy="260" r="2" fill="#F472B6" opacity="0.8"/>

  <!-- Butterfly -->
  <g transform="translate(352, 108) rotate(-12) scale(0.95)" filter="url(#glow)">
    <path d="M-60,50 Q-30,45 -10,20" fill="none" stroke="#E8D5FF" stroke-width="2" stroke-dasharray="3,4" opacity="0.7"/>
    <path d="M0,0 C-12,-16 -24,-8 -14,6 C-22,12 -12,22 0,4 C12,22 22,12 14,6 C24,-8 12,-16 0,0 Z" fill="none" stroke="#F3EEFB" stroke-width="2.5"/>
    <path d="M-2,-2 C-8,-10 -15,-5 -8,2 Z" fill="#E8D5FF" opacity="0.6"/>
    <path d="M2,-2 C8,-10 15,-5 8,2 Z" fill="#E8D5FF" opacity="0.6"/>
  </g>

  <!-- Crescent Moon with Planetary Ring -->
  <g filter="url(#softGlow)">
    <ellipse cx="256" cy="200" rx="122" ry="32" fill="none" stroke="url(#ringGrad)" stroke-width="3" transform="rotate(-16, 256, 200)" opacity="0.85"/>
    <path d="M 270,118 A 82,82 0 1,0 270,282 A 70,70 0 1,1 270,118 Z" fill="url(#moonGrad)"/>
    <path d="M 138,212 C 160,232 230,245 320,225" fill="none" stroke="url(#ringGrad)" stroke-width="3.5" transform="rotate(-16, 256, 200)"/>
    <path d="M322,176 Q322,185 330,185 Q322,185 322,194 Q322,185 314,185 Q322,185 322,176 Z" fill="#FFFFFF"/>
  </g>

  <!-- Typography: LilVerse -->
  <g text-anchor="middle" filter="url(#glow)">
    <text x="256" y="365" font-family="'Inter', 'Segoe UI', system-ui, sans-serif" font-weight="700" font-size="64" fill="url(#textGrad)" letter-spacing="0">LilVerse</text>
    <path d="M 188,302 C 188,297 183,293 178,296 C 173,293 168,297 168,302 C 168,308 178,314 178,314 C 178,314 188,308 188,302 Z" fill="#F472B6"/>
    <line x1="110" y1="392" x2="138" y2="392" stroke="#E8D5FF" stroke-width="1.5" opacity="0.7"/>
    <text x="256" y="396" font-family="'Inter', 'Segoe UI', system-ui, sans-serif" font-weight="400" font-size="15" fill="#E8D5FF" letter-spacing="2.5" opacity="0.9">your own little universe</text>
    <line x1="374" y1="392" x2="402" y2="392" stroke="#E8D5FF" stroke-width="1.5" opacity="0.7"/>
  </g>
</svg>
'''

with open('/tmp/android_full.svg', 'w') as f:
    f.write(full_svg_content)

res_dir = 'android/app/src/main/res'

icon_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

foreground_sizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
}

# Generate traditional icons using ImageMagick
for folder, size in icon_sizes.items():
    target_path = os.path.join(res_dir, folder)
    os.makedirs(target_path, exist_ok=True)
    
    # Generate ic_launcher.png
    cmd1 = f"convert -size {size}x{size} /tmp/android_full.svg {os.path.join(target_path, 'ic_launcher.png')}"
    subprocess.run(cmd1, shell=True, check=True)
    
    # Generate ic_launcher_round.png
    cmd2 = f"convert -size {size}x{size} /tmp/android_full.svg {os.path.join(target_path, 'ic_launcher_round.png')}"
    subprocess.run(cmd2, shell=True, check=True)
    
    print(f"Generated traditional icons in {folder} ({size}x{size})")

# Generate adaptive foreground icons using ImageMagick
for folder, size in foreground_sizes.items():
    target_path = os.path.join(res_dir, folder)
    os.makedirs(target_path, exist_ok=True)
    
    # Generate ic_launcher_foreground.png
    cmd3 = f"convert -background none -size {size}x{size} /tmp/android_foreground.svg {os.path.join(target_path, 'ic_launcher_foreground.png')}"
    subprocess.run(cmd3, shell=True, check=True)
    
    print(f"Generated adaptive foreground in {folder} ({size}x{size})")

# 3. Update ic_launcher_background.xml
background_color_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#08080C</color>
</resources>
'''

with open(os.path.join(res_dir, 'values/ic_launcher_background.xml'), 'w') as f:
    f.write(background_color_xml)

print("Launcher icons and adaptive foreground/background generated successfully via ImageMagick!")
