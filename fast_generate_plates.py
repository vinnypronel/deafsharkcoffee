import os
import rembg
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageDraw

session = rembg.new_session('u2netp')

def isolate_fast(img_path):
    img = Image.open(img_path).convert('RGB')
    # Resize to max 600px for instant inference
    orig_w, orig_h = img.size
    img_small = img.resize((600, int(600 * orig_h / orig_w)), Image.Resampling.BILINEAR)
    cut = rembg.remove(img_small, session=session)
    return cut.resize((orig_w, orig_h), Image.Resampling.LANCZOS)

# Create white ceramic plate canvas
def create_plate():
    canvas = Image.new('RGBA', (1024, 1024), (240, 240, 240, 255))
    center = 512
    r_plate = 400
    
    shadow = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.ellipse(
        (center - r_plate - 6, center - r_plate + 18, center + r_plate + 6, center + r_plate + 42),
        fill=(0, 0, 0, 42)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas, shadow)
    
    plate = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(plate)
    p_draw.ellipse(
        (center - r_plate, center - r_plate, center + r_plate, center + r_plate),
        fill=(254, 254, 254, 255),
        outline=(230, 230, 230, 255),
        width=3
    )
    r_rim = int(r_plate * 0.88)
    p_draw.ellipse(
        (center - r_rim, center - r_rim + 3, center + r_rim, center + r_rim + 3),
        outline=(245, 245, 245, 255),
        width=2
    )
    return Image.alpha_composite(canvas, plate)

plate_base = create_plate()

def composite_food(food_rgba, scale=0.68, offset_y=-5):
    w, h = food_rgba.size
    max_dim = int(1024 * scale)
    ratio = min(max_dim / w, max_dim / h)
    new_w, new_h = int(w * ratio), int(h * ratio)
    food_scaled = food_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    alpha = food_scaled.getchannel('A')
    shadow_mask = alpha.filter(ImageFilter.GaussianBlur(16))
    shadow_img = Image.new('RGBA', (new_w, new_h), (35, 22, 12, 85))
    shadow_img.putalpha(shadow_mask)
    
    pos_x = (1024 - new_w) // 2
    pos_y = (1024 - new_h) // 2 + offset_y
    
    shadow_canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    shadow_canvas.paste(shadow_img, (pos_x, pos_y + 14), shadow_img)
    
    res = Image.alpha_composite(plate_base.copy(), shadow_canvas)
    res.paste(food_scaled, (pos_x, pos_y), food_scaled)
    return res.convert('RGB')

# 1. Maple Waffle Sandwich
print("1. Maple Waffle...")
waffle_cut = isolate_fast('public/food-maple-waffle.jpg')
composite_food(waffle_cut, scale=0.65).save('public/food-maple-waffle.jpg', 'JPEG', quality=95)
print("Saved food-maple-waffle.jpg")

# 2. Emilia
print("2. Emilia...")
emilia_cut = isolate_fast('public/food-emilia.jpg')
composite_food(emilia_cut, scale=0.72).save('public/food-emilia.jpg', 'JPEG', quality=95)
print("Saved food-emilia.jpg")

# 3. La Toscana
print("3. La Toscana...")
toscana_cut = isolate_fast('public/food-la-toscana.jpg')
composite_food(toscana_cut, scale=0.70).save('public/food-la-toscana.jpg', 'JPEG', quality=95)
print("Saved food-la-toscana.jpg")

# 4. Sausage Egg & Cheese Croissant
print("4. Croissant...")
croissant_raw = Image.open('public/food-croissant-bagel.jpg').convert('RGB')
croissant_cropped = croissant_raw.crop((0, 0, int(croissant_raw.width * 0.65), croissant_raw.height))
croissant_cut = rembg.remove(croissant_cropped, session=session)
composite_food(croissant_cut, scale=0.72).save('public/food-breakfast-croissant.jpg', 'JPEG', quality=95)
print("Saved food-breakfast-croissant.jpg")

# 5. Cachitos
print("5. Cachitos...")
cachitos_cut = isolate_fast('public/food-cachitos.jpg')
composite_food(cachitos_cut, scale=0.65).save('public/food-cachitos.jpg', 'JPEG', quality=95)
print("Saved food-cachitos.jpg")

print("All done!")
