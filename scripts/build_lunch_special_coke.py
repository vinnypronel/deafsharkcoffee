import subprocess
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Extract chips plate foreground so it layers smoothly in front of the can base
# Chips plate covers y: 570 to 880, x: 450 to 950
chips_fg = lunch.crop((450, 570, 950, 880))

# 3. Clean out the old blue can with pure white / background color
draw = ImageDraw.Draw(lunch)
draw.rectangle((680, 180, 950, 600), fill=(255, 255, 255, 255))

# 4. Load perfect transparent Coke can
coke = Image.open('public/coke-perfect-alpha.png').convert('RGBA')
target_w = 232
target_h = int(target_w * coke.height / coke.width)
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 708
pos_y = 202

# 5. Soft contact shadow on table
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 8, pos_y + target_h - 18, pos_x + target_w + 8, pos_y + target_h + 18), fill=(0, 0, 0, 70))
shadow = shadow.filter(ImageFilter.GaussianBlur(12))

lunch = Image.alpha_composite(lunch, shadow)

# Paste Coke can using its own alpha mask
lunch.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Paste back chips foreground
lunch.paste(chips_fg, (450, 570))

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved flawless Lunch Special with classic Coke can!")
