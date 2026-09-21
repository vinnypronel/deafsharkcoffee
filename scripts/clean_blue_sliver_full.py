import subprocess
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Inpaint the entire right boundary (x: 900 to 950, y: 240 to 560) using backdrop from (960, y)
for y in range(240, 560):
    col = lunch.getpixel((960, y))
    for x in range(900, 950):
        lunch.putpixel((x, y), col)

# 3. Load cleanly isolated Coke can
coke = Image.open('public/coke-isolated-true.png').convert('RGBA')

# Target size:
target_w = 226
target_h = int(target_w * coke.height / coke.width) # ~436px
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)
alpha_mask = coke_resized.getchannel('A')

pos_x = 708
pos_y = 198

# 4. Paste Coke can
lunch.paste(coke_resized, (pos_x, pos_y), mask=alpha_mask)

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved flawless Lunch Special!")
