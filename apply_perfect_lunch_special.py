from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Load clean isolated Coke can
coke = Image.open('public/test-coke-clean.png').convert('RGBA')

# 2. Load lunch special
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# Clean right area of any artifacts by filling with pure white / background color
draw = ImageDraw.Draw(lunch)
draw.rectangle((660, 150, 980, 680), fill=(255, 255, 255, 255))

# Sizing
target_w = 230
target_h = int(target_w * coke.height / coke.width)
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

# Position next to chips
pos_x = 712
pos_y = 205

# Soft realistic shadow on white surface
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 10, pos_y + target_h - 18, pos_x + target_w + 10, pos_y + target_h + 20), fill=(0, 0, 0, 55))
shadow = shadow.filter(ImageFilter.GaussianBlur(12))

lunch_final = Image.alpha_composite(lunch, shadow)
lunch_final.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Save
lunch_final.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved perfect lunch special with Coke!")
