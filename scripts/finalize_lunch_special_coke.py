import subprocess
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Inpaint/cover the old blue can completely with pure white / background color
draw = ImageDraw.Draw(lunch)
draw.rectangle((680, 180, 945, 620), fill=(255, 255, 255, 255))

# 3. Load cleanly isolated Coke can
coke = Image.open('public/coke-isolated-true.png').convert('RGBA')
target_h = 422
target_w = int(target_h * coke.width / coke.height) # ~218px
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 705
pos_y = 196

# 4. Soft realistic contact shadow onto white surface
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 10, pos_y + target_h - 18, pos_x + target_w + 10, pos_y + target_h + 18), fill=(0, 0, 0, 75))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))

lunch = Image.alpha_composite(lunch, shadow)

# 5. Paste Coke can using its own alpha mask
lunch.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved final Lunch Special with Coke!")
