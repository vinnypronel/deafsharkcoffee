import subprocess
from PIL import Image, ImageFilter
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Extract chips plate foreground so chips naturally overlap bottom of can
chips_fg = lunch.crop((450, 570, 950, 880))

# 3. Load transparent Coke can
coke = Image.open('public/coke-perfect-alpha.png').convert('RGBA')
target_w = 238
target_h = int(target_w * coke.height / coke.width)
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 702
pos_y = 200

# 4. Paste Coke can directly over the old blue can (no drawn rectangle!)
lunch.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# 5. Paste back chips foreground
lunch.paste(chips_fg, (450, 570))

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved clean Lunch Special!")
