import os
import rembg
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageDraw, ImageEnhance

# 1. Master Porcelain Plate
def create_porcelain_plate(size=(1024, 1024)):
    w, h = size
    # Clean studio surface (#DEDEDE)
    bg = Image.new('RGBA', size, (222, 222, 222, 255))
    
    # Realistic soft plate shadow
    shadow = Image.new('RGBA', size, (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    center = 512
    r_plate = 420
    s_draw.ellipse(
        (center - r_plate - 4, center - r_plate + 14, center + r_plate + 4, center + r_plate + 38),
        fill=(0, 0, 0, 52)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(bg, shadow)
    
    # Pure white ceramic plate disc
    plate = Image.new('RGBA', size, (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(plate)
    p_draw.ellipse(
        (center - r_plate, center - r_plate, center + r_plate, center + r_plate),
        fill=(255, 255, 255, 255)
    )
    
    canvas = Image.alpha_composite(canvas, plate)
    return canvas

plate_master = create_porcelain_plate()

def place_food_on_plate(food_rgba, scale=0.68, offset_y=-5):
    bbox = food_rgba.getbbox()
    if bbox:
        food_rgba = food_rgba.crop(bbox)
        
    w, h = food_rgba.size
    max_dim = int(1024 * scale)
    ratio = min(max_dim / w, max_dim / h)
    new_w, new_h = int(w * ratio), int(h * ratio)
    food_scaled = food_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Soft natural shadow of food onto white plate
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

session = rembg.new_session('u2netp')

# 1. EMILIA (ciabatta bread roll sandwich)
print("1. Creating Emilia (ciabatta bread roll on plate)...")
cubano = Image.open('public/food-shark-cubano.jpg').convert('RGB')
c_w, c_h = cubano.size
sand_crop = cubano.crop((int(c_w * 0.22), int(c_h * 0.20), int(c_w * 0.78), int(c_h * 0.80)))
sand_cut = rembg.remove(sand_crop, session=session)
emilia_img = place_food_on_plate(sand_cut, scale=0.68)
emilia_img.save('public/food-emilia.jpg', 'JPEG', quality=95)
print("Saved food-emilia.jpg")

# 2. LA TOSCANA (artisan panini on plate)
print("2. Creating La Toscana on plate...")
pesto = Image.open('public/food-turkey-pesto.jpg').convert('RGB')
p_w, p_h = pesto.size
pesto_crop = pesto.crop((int(p_w * 0.22), int(p_h * 0.20), int(p_w * 0.78), int(p_h * 0.80)))
pesto_cut = rembg.remove(pesto_crop, session=session)
# Enhance colors slightly
enhancer = ImageEnhance.Color(pesto_cut)
toscana_img = place_food_on_plate(enhancer.enhance(1.1), scale=0.68)
toscana_img.save('public/food-la-toscana.jpg', 'JPEG', quality=95)
print("Saved food-la-toscana.jpg")

# 3. SAUSAGE, EGG AND CHEESE CROISSANT
print("3. Creating Sausage, Egg and Cheese Croissant on plate...")
# Use whole croissant
croiss_raw = Image.open('public/test-whole-croissant.png').convert('RGBA')
# Mask out bagel part on right
cw, ch = croiss_raw.size
c_arr = np.array(croiss_raw)
for y in range(ch):
    for x in range(cw):
        boundary = 450 - (y - 300) * 0.7 if y > 300 else 550
        if x > boundary and y > 280:
            c_arr[y, x, 3] = 0
croiss_clean = Image.fromarray(c_arr)
croissant_plate = place_food_on_plate(croiss_clean, scale=0.70)
croissant_plate.save('public/food-breakfast-croissant.jpg', 'JPEG', quality=95)
print("Saved food-breakfast-croissant.jpg")

# 4. CACHITOS
print("4. Creating Cachitos on plate...")
cachito_rot = croiss_clean.rotate(-25, expand=True, resample=Image.Resampling.BICUBIC)
cachito_plate = place_food_on_plate(cachito_rot, scale=0.68)
cachito_plate.save('public/food-cachitos.jpg', 'JPEG', quality=95)
print("Saved food-cachitos.jpg")

# 5. MAPLE WAFFLE SANDWICH
print("5. Creating Maple Waffle Sandwich on plate...")
waff_raw = Image.open('public/food-maple-waffle.jpg').convert('RGBA')
w_arr = np.array(waff_raw)
w_mask = (w_arr[:, :, 0] < 235) | (w_arr[:, :, 1] < 235) | (w_arr[:, :, 2] < 235)
waff_cut = waff_raw.copy()
waff_cut.putalpha(Image.fromarray((w_mask * 255).astype(np.uint8)))
waff_plate = place_food_on_plate(waff_cut, scale=0.65)
waff_plate.save('public/food-maple-waffle.jpg', 'JPEG', quality=95)
print("Saved food-maple-waffle.jpg")

# 6. FOUR TEQUEÑOS
print("6. Creating Four Tequeños on plate...")
teq_raw = Image.open('public/food-tequenos.jpg').convert('RGBA')
t_arr = np.array(teq_raw)
t_mask = (t_arr[:, :, 0] < 235) | (t_arr[:, :, 1] < 235) | (t_arr[:, :, 2] < 235)
teq_cut = teq_raw.copy()
teq_cut.putalpha(Image.fromarray((t_mask * 255).astype(np.uint8)))
teq_plate = place_food_on_plate(teq_cut, scale=0.65)
teq_plate.save('public/food-tequenos.jpg', 'JPEG', quality=95)
print("Saved food-tequenos.jpg")

# 7. FRENCH FRIES
print("7. Creating French Fries on plate...")
fries_raw = Image.open('public/food-fries.jpg').convert('RGB')
fries_cut = rembg.remove(fries_raw.resize((600, int(600 * fries_raw.height / fries_raw.width))), session=session)
fries_plate = place_food_on_plate(fries_cut, scale=0.68)
fries_plate.save('public/food-fries.jpg', 'JPEG', quality=95)
print("Saved food-fries.jpg")

# 8. SIX MOZZARELLA STICKS
print("8. Creating Six Mozzarella Sticks on plate...")
moz_raw = Image.open('public/food-mozzarella-sticks.jpg').convert('RGB')
moz_cut = rembg.remove(moz_raw.resize((600, int(600 * moz_raw.height / moz_raw.width))), session=session)
moz_plate = place_food_on_plate(moz_cut, scale=0.68)
moz_plate.save('public/food-mozzarella-sticks.jpg', 'JPEG', quality=95)
print("Saved food-mozzarella-sticks.jpg")

print("All bird's eye view plate images generated successfully!")
