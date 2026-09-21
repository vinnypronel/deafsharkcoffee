import subprocess
from PIL import Image, ImageFilter
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Load cleanly isolated Coke can
coke = Image.open('public/coke-isolated-true.png').convert('RGBA')

# Target size: precisely cover the blue can
# Blue can is x: 710 to 925, y: 205 to 615
target_w = 224
target_h = int(target_w * coke.height / coke.width) # ~432px
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)
alpha_mask = coke_resized.getchannel('A')

pos_x = 708
pos_y = 200

# 3. Paste Coke can directly on top of the blue can
# NO rectangle is drawn anywhere!
lunch.paste(coke_resized, (pos_x, pos_y), mask=alpha_mask)

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved perfect lunch special!")
