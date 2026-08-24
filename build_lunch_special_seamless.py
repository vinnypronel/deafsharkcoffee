import subprocess
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Extract chips plate foreground so chips naturally overlap bottom of can
chips_fg = lunch.crop((450, 595, 950, 880))

# 3. Clean ONLY the blue sliver on the right (x: 915 to 940, y: 260 to 480) with pure white
draw = ImageDraw.Draw(lunch)
draw.rectangle((912, 250, 940, 520), fill=(255, 255, 255, 255))

# 4. Sizing & position of Coke can
coke = Image.open('public/coke-perfect-alpha.png').convert('RGBA')
# Make height 418px to reach right behind the chips
target_h = 418
target_w = int(target_h * coke.width / coke.height) # ~226px
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 702
pos_y = 198

# 5. Soft contact shadow on table
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 8, pos_y + target_h - 18, pos_x + target_w + 8, pos_y + target_h + 18), fill=(0, 0, 0, 70))
shadow = shadow.filter(ImageFilter.GaussianBlur(12))

lunch = Image.alpha_composite(lunch, shadow)

# Paste Coke can
lunch.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Paste back chips foreground
lunch.paste(chips_fg, (450, 595))

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved seamless Lunch Special with Coke!")
