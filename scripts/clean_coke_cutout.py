import rembg
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

session = rembg.new_session('u2netp')

# 1. Load Coke can
coke_path = r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png'
coke_raw = Image.open(coke_path).convert('RGB')
coke_cut = rembg.remove(coke_raw, session=session)

# Crop transparent bounds
c_bbox = coke_cut.getbbox()
if c_bbox:
    coke_cut = coke_cut.crop(c_bbox)

# 2. Re-create lunch special base from clean sandwich & chips
# Let's restore the original lunch special without the white box, then composite coke:
lunch_base = Image.open('public/food-lunch-special.jpg').convert('RGBA')

# Target can sizing & position
target_w = 230
target_h = int(target_w * coke_cut.height / coke_cut.width)
coke_resized = coke_cut.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 708
pos_y = 205

# Clear the rectangle area to smooth studio white/light-grey
draw = ImageDraw.Draw(lunch_base)
draw.rectangle((670, 180, 960, 630), fill=(255, 255, 255, 255))

# Soft contact shadow under the can
shadow = Image.new('RGBA', lunch_base.size, (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 8, pos_y + target_h - 18, pos_x + target_w + 8, pos_y + target_h + 20), fill=(0, 0, 0, 65))
shadow = shadow.filter(ImageFilter.GaussianBlur(12))

lunch_final = Image.alpha_composite(lunch_base, shadow)
lunch_final.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Save
lunch_final.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved clean Coke on lunch special!")
