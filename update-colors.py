#!/usr/bin/env python3
import re
import os

# Color mapping from old to new
color_map = {
    '#1A0F0A': 'colors.background',  # Background
    '#2A1A10': 'colors.card',         # Cards
    '#3D2618': 'colors.border',       # Borders
    '#E8722A': 'colors.primary',      # Primary orange
    '#F5E6D3': 'colors.text',         # Text
    '#78716c': 'colors.textSecondary',# Secondary text
    '#57534e': 'colors.textLight',    # Light gray text
    '#ef4444': 'colors.error',        # Red/error
}

files_to_update = [
    '/Users/zacharyseibert/wingdings/mobile/app/(tabs)/leaderboard.tsx',
    '/Users/zacharyseibert/wingdings/mobile/app/(tabs)/profile.tsx',
    '/Users/zacharyseibert/wingdings/mobile/components/BadgeCelebration.tsx',
    '/Users/zacharyseibert/wingdings/mobile/components/LocationPicker.tsx',
]

for filepath in files_to_update:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} - not found")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    # Add import if not present
    if 'import { colors } from' not in content:
        # Find the last import and add after it
        lines = content.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
        lines.insert(last_import_idx + 1, "import { colors } from '../../lib/colors';")
        content = '\n'.join(lines)

    # Replace colors
    for old_color, new_color in color_map.items():
        content = content.replace(f"'{old_color}'", new_color)
        content = content.replace(f'"{old_color}"', new_color)

    with open(filepath, 'w') as f:
        f.write(content)

    print(f"Updated {filepath}")

print("Done!")
