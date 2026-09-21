import rembg
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

session = rembg.new_session('u2netp')

# 1. Load user's coke can image
coke_path = r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png'
coke_raw = Image.open(coke_path).convert('RGB')
coke_cut = rembg.remove(coke_raw, session=session)

# Crop transparent bounds
c_bbox = coke_cut.getbbox()
if c_bbox:
    coke_cut = coke_cut.crop(c_bbox)

# 2. Load food-lunch-special.jpg
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# Paint out any old can residue with pure white
draw = ImageDraw.Draw(lunch)
draw.rectangle((695, 195, 945, 630), fill=(255, 255, 255, 255))

# Target can sizing
target_w = 238
target_h = int(target_w * coke_cut.height / coke_cut.width)
coke_resized = coke_cut.resize((target_w, target_h), Image.Resampling.LANCZOS)

# Position
pos_x = 700
pos_y = 202

# Realistic contact shadow under coke can
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 12, pos_y + target_h - 18, pos_x + target_w + 12, pos_y + target_h + 24), fill=(0, 0, 0, 75))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))

lunch_composite = Image.alpha_composite(lunch, shadow)
lunch_composite.paste(coke_resized, (pos_x, pos_y), coke_resized)

# Save result
lunch_composite.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved perfect lunch special with Coke!")
