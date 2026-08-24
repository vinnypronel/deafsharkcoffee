import os
import rembg
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
import numpy as np

session = rembg.new_session('u2netp')

# Master clean plate
def create_master_plate():
    canvas = Image.new('RGBA', (1024, 1024), (222, 222, 222, 255))
    center = 512
    r_plate = 420
    
    # Realistic soft plate shadow
    shadow = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.ellipse(
        (center - r_plate - 4, center - r_plate + 14, center + r_plate + 4, center + r_plate + 38),
        fill=(0, 0, 0, 52)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas, shadow)
    
    # Pure white ceramic disc
    plate = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(plate)
    p_draw.ellipse(
        (center - r_plate, center - r_plate, center + r_plate, center + r_plate),
        fill=(255, 255, 255, 255)
    )
    
    return Image.alpha_composite(canvas, plate)

plate_master = create_master_plate()

def place_clean_on_plate(food_cut_rgba, scale=0.68, offset_y=-5):
    # Auto crop transparent edges
    bbox = food_cut_rgba.getbbox()
    if bbox:
        food_cut_rgba = food_cut_rgba.crop(bbox)
        
    w, h = food_cut_rgba.size
    max_dim = int(1024 * scale)
    ratio = min(max_dim / w, max_dim / h)
    new_w, new_h = int(w * ratio), int(h * ratio)
    food_scaled = food_cut_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Soft contact shadow of food on white plate
    alpha = food_scaled.getchannel('A')
    shadow_mask = alpha.filter(ImageFilter.GaussianBlur(14))
    shadow_img = Image.new('RGBA', (new_w, new_h), (35, 20, 10, 75))
    shadow_img.putalpha(shadow_mask)
    
    pos_x = (1024 - new_w) // 2
    pos_y = (1024 - new_h) // 2 + offset_y
    
    shadow_canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    shadow_canvas.paste(shadow_img, (pos_x, pos_y + 10), shadow_img)
    
    res = Image.alpha_composite(plate_master.copy(), shadow_canvas)
    res.paste(food_scaled, (pos_x, pos_y), food_scaled)
    return res.convert('RGB')

# 1. EMILIA (grilled ciabatta sandwich halves)
cubano = Image.open('public/food-shark-cubano.jpg').convert('RGB')
c_w, c_h = cubano.size
sand_crop = cubano.crop((int(c_w * 0.22), int(c_h * 0.20), int(c_w * 0.78), int(c_h * 0.80)))
sand_cut = rembg.remove(sand_crop, session=session)
place_clean_on_plate(sand_cut, scale=0.68).save('public/food-emilia.jpg', 'JPEG', quality=95)
print("Saved food-emilia.jpg")

# 2. LA TOSCANA (pesto burrata ciabatta sandwich halves)
pesto = Image.open('public/food-turkey-pesto.jpg').convert('RGB')
p_w, p_h = pesto.size
pesto_crop = pesto.crop((int(p_w * 0.22), int(p_h * 0.20), int(p_w * 0.78), int(p_h * 0.80)))
pesto_cut = rembg.remove(pesto_crop, session=session)
place_clean_on_plate(pesto_cut, scale=0.68).save('public/food-la-toscana.jpg', 'JPEG', quality=95)
print("Saved food-la-toscana.jpg")

# 3. MAPLE WAFFLES (extract waffles cleanly)
waffle_cut = Image.open('public/test-waffle-cut.png' if os.path.exists('public/test-waffle-cut.png') else 'public/food-maple-waffle.jpg').convert('RGBA')
# Make sure to remove any rectangular background
w_arr = np.array(waffle_cut)
# The waffles are warm golden colors (R > 120, B < 150)
w_mask = (w_arr[:, :, 0] > 110) & (w_arr[:, :, 1] > 70) & (w_arr[:, :, 2] < 160)
# Clean up mask
w_alpha = Image.fromarray((w_mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
waffle_clean = waffle_cut.copy()
waffle_clean.putalpha(w_alpha)
place_clean_on_plate(waffle_clean, scale=0.65).save('public/food-maple-waffle.jpg', 'JPEG', quality=95)
print("Saved food-maple-waffle.jpg")

# 4. FOUR TEQUEÑOS
moz = Image.open('public/food-mozzarella-sticks.jpg').convert('RGB')
moz_cut = rembg.remove(moz.resize((600, int(600 * moz.height / moz.width))), session=session)
place_clean_on_plate(moz_cut, scale=0.68).save('public/food-tequenos.jpg', 'JPEG', quality=95)
print("Saved food-tequenos.jpg")

# 5. SIX MOZZARELLA STICKS
place_clean_on_plate(moz_cut, scale=0.68).save('public/food-mozzarella-sticks.jpg', 'JPEG', quality=95)
print("Saved food-mozzarella-sticks.jpg")

# 6. FRENCH FRIES
fries = Image.open('public/food-fries.jpg').convert('RGB')
fries_cut = rembg.remove(fries.resize((600, int(600 * fries.height / fries.width))), session=session)
place_clean_on_plate(fries_cut, scale=0.68).save('public/food-fries.jpg', 'JPEG', quality=95)
print("Saved food-fries.jpg")

# 7. CACHITOS (golden pastry crescent)
croiss = Image.open('public/food-croissant-bagel.jpg').convert('RGB')
# Left 55%
cr_crop = croiss.crop((0, 0, int(croiss.width * 0.55), croiss.height))
cr_cut = rembg.remove(cr_crop, session=session)
# Rotate for cachito crescent
cach_rot = cr_cut.rotate(-20, expand=True, resample=Image.Resampling.BICUBIC)
place_clean_on_plate(cach_rot, scale=0.68).save('public/food-cachitos.jpg', 'JPEG', quality=95)
print("Saved food-cachitos.jpg")

# 8. SAUSAGE, EGG AND CHEESE CROISSANT
place_clean_on_plate(cr_cut, scale=0.70).save('public/food-breakfast-croissant.jpg', 'JPEG', quality=95)
print("Saved food-breakfast-croissant.jpg")

print("All plates rendered cleanly!")
