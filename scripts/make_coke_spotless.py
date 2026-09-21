import subprocess
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Backdrop color
backdrop = lunch.getpixel((800, 100))

# 3. Clean out the ENTIRE old blue/orange can area (x: 690 to 940, y: 190 to 625)
draw = ImageDraw.Draw(lunch)
draw.rectangle((690, 190, 940, 625), fill=backdrop)

# 4. Load Coke can
coke = Image.open('public/coke-isolated-true.png').convert('RGBA')
target_h = 405
target_w = int(target_h * coke.width / coke.height) # ~210px
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)
alpha_mask = coke_resized.getchannel('A')

pos_x = 716
pos_y = 210

# 5. Soft contact shadow on table
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 10, pos_y + target_h - 18, pos_x + target_w + 10, pos_y + target_h + 18), fill=(0, 0, 0, 65))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))

lunch = Image.alpha_composite(lunch, shadow)

# 6. Paste Coke can
lunch.paste(coke_resized, (pos_x, pos_y), mask=alpha_mask)

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved spotless Lunch Special with Coke!")
