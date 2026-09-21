from PIL import Image, ImageFilter
import numpy as np

# 1. Load clean isolated Coke can
coke = Image.open('public/test-coke-clean.png').convert('RGBA')

# 2. Load original lunch special
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# Target can sizing & position matching original blue can
target_w = 232
target_h = int(target_w * coke.height / coke.width)
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 702
pos_y = 200

# Paste Coke directly over the old can using alpha mask
lunch.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved clean Coke composite on lunch special!")
