import subprocess
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Inpaint/cover the ENTIRE old blue/orange can (x: 685 to 935, y: 190 to 625) with pure white
draw = ImageDraw.Draw(lunch)
draw.rectangle((685, 190, 935, 625), fill=(255, 255, 255, 255))

# 3. Load Coke can
coke = Image.open('public/coke-perfect-alpha.png').convert('RGBA')
target_h = 425
target_w = int(target_h * coke.width / coke.height) # ~230px
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 698
pos_y = 195

# 4. Soft realistic contact shadow
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 10, pos_y + target_h - 20, pos_x + target_w + 10, pos_y + target_h + 16), fill=(0, 0, 0, 75))
shadow = shadow.filter(ImageFilter.GaussianBlur(12))

lunch = Image.alpha_composite(lunch, shadow)

# Paste Coke can
lunch.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved perfect lunch special with Coke!")
