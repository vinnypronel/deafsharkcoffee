import os
import rembg
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageDraw, ImageEnhance

# Clean studio plate background generator matching food-cachapa.jpg and food-turkey-pesto.jpg
def create_studio_plate(size=(1024, 1024)):
    # Soft neutral background (#E4E4E4)
    canvas = Image.new('RGBA', size, (230, 230, 230, 255))
    center = size[0] // 2
    r_outer = 420
    r_inner = 368
    
    # Realistic soft plate drop shadow onto table
    shadow = Image.new('RGBA', size, (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.ellipse(
        (center - r_outer - 5, center - r_outer + 18, center + r_outer + 5, center + r_outer + 42),
        fill=(0, 0, 0, 40)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas, shadow)
    
    # White ceramic body
    plate = Image.new('RGBA', size, (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(plate)
    
    # Ceramic outer rim
    p_draw.ellipse(
        (center - r_outer, center - r_outer, center + r_outer, center + r_outer),
        fill=(255, 255, 255, 255),
        outline=(232, 232, 232, 255),
        width=2
    )
    
    # Inner basin with subtle lighting
    p_draw.ellipse(
        (center - r_inner, center - r_inner, center + r_inner, center + r_inner),
        fill=(252, 252, 252, 255),
        outline=(244, 244, 244, 255),
        width=2
    )
    
    canvas = Image.alpha_composite(canvas, plate)
    return canvas

plate_base = create_studio_plate()

def place_food_on_plate(food_rgba, scale=0.68, offset_y=-5):
    bbox = food_rgba.getbbox()
    if bbox:
        food_rgba = food_rgba.crop(bbox)
        
    w, h = food_rgba.size
    max_dim = int(1024 * scale)
    ratio = min(max_dim / w, max_dim / h)
    new_w, new_h = int(w * ratio), int(h * ratio)
    food_scaled = food_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Soft realistic contact shadow of food onto plate
    alpha = food_scaled.getchannel('A')
    shadow_mask = alpha.filter(ImageFilter.GaussianBlur(14))
    shadow_img = Image.new('RGBA', (new_w, new_h), (35, 20, 10, 75))
    shadow_img.putalpha(shadow_mask)
    
    pos_x = (1024 - new_w) // 2
    pos_y = (1024 - new_h) // 2 + offset_y
    
    shadow_canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    shadow_canvas.paste(shadow_img, (pos_x, pos_y + 10), shadow_img)
    
    res = Image.alpha_composite(plate_base.copy(), shadow_canvas)
    res.paste(food_scaled, (pos_x, pos_y), food_scaled)
    return res.convert('RGB')

session = rembg.new_session('u2netp')

# 1. EMILIA: Pressed ciabatta bread roll sandwich with mortadella, provolone, and honey
# In food-shark-cubano.jpg we have a gorgeous grilled artisan ciabatta sandwich cut in half on a plate!
# Let's adjust colors to highlight mortadella (pinkish-rosy meat) and provolone & honey (golden melt)
print("1. Creating Emilia (ciabatta bread roll)...")
cubano = Image.open('public/food-shark-cubano.jpg').convert('RGB')
# Crop sandwich halves from cubano
c_w, c_h = cubano.size
sand_crop = cubano.crop((int(c_w * 0.22), int(c_h * 0.20), int(c_w * 0.78), int(c_h * 0.80)))
sand_cut = rembg.remove(sand_crop, session=session)
# Enhance warmth and color
enhancer = ImageEnhance.Color(sand_cut)
sand_cut = enhancer.enhance(1.05)
emilia_img = place_food_on_plate(sand_cut, scale=0.68)
emilia_img.save('public/food-emilia.jpg', 'JPEG', quality=95)
print("Saved food-emilia.jpg")

# 2. SAUSAGE, EGG AND CHEESE CROISSANT
print("2. Creating Sausage, Egg & Cheese Croissant...")
croiss_raw = Image.open('public/food-breakfast-croissant.jpg').convert('RGBA')
# Extract the golden croissant
arr = np.array(croiss_raw)
mask = (arr[:, :, 0] < 240) | (arr[:, :, 1] < 240) | (arr[:, :, 2] < 240)
croiss_cut = croiss_raw.copy()
croiss_cut.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))
croissant_plate = place_food_on_plate(croiss_cut, scale=0.68)
croissant_plate.save('public/food-breakfast-croissant.jpg', 'JPEG', quality=95)
print("Saved food-breakfast-croissant.jpg")

# 3. FOUR TEQUEÑOS
print("3. Creating Four Tequeños on Plate...")
teq_raw = Image.open('public/food-tequenos.jpg').convert('RGBA')
t_arr = np.array(teq_raw)
t_mask = (t_arr[:, :, 0] < 240) | (t_arr[:, :, 1] < 240) | (t_arr[:, :, 2] < 240)
teq_cut = teq_raw.copy()
teq_cut.putalpha(Image.fromarray((t_mask * 255).astype(np.uint8)))
teq_plate = place_food_on_plate(teq_cut, scale=0.65)
teq_plate.save('public/food-tequenos.jpg', 'JPEG', quality=95)
print("Saved food-tequenos.jpg")

# 4. CACHITOS
print("4. Creating Cachitos on Plate...")
cach_raw = Image.open('public/food-cachitos.jpg').convert('RGBA')
c_arr = np.array(cach_raw)
c_mask = (c_arr[:, :, 0] < 240) | (c_arr[:, :, 1] < 240) | (c_arr[:, :, 2] < 240)
cach_cut = cach_raw.copy()
cach_cut.putalpha(Image.fromarray((c_mask * 255).astype(np.uint8)))
cach_plate = place_food_on_plate(cach_cut, scale=0.65)
cach_plate.save('public/food-cachitos.jpg', 'JPEG', quality=95)
print("Saved food-cachitos.jpg")

# 5. MAPLE WAFFLE SANDWICH
print("5. Creating Maple Waffle Sandwich on Plate...")
waff_raw = Image.open('public/food-maple-waffle.jpg').convert('RGBA')
w_arr = np.array(waff_raw)
w_mask = (w_arr[:, :, 0] < 240) | (w_arr[:, :, 1] < 240) | (w_arr[:, :, 2] < 240)
waff_cut = waff_raw.copy()
waff_cut.putalpha(Image.fromarray((w_mask * 255).astype(np.uint8)))
waff_plate = place_food_on_plate(waff_cut, scale=0.65)
waff_plate.save('public/food-maple-waffle.jpg', 'JPEG', quality=95)
print("Saved food-maple-waffle.jpg")

# 6. LA TOSCANA
print("6. Creating La Toscana on Plate...")
tosc_raw = Image.open('public/food-la-toscana.jpg').convert('RGBA')
tosc_arr = np.array(tosc_raw)
tosc_mask = (tosc_arr[:, :, 0] < 240) | (tosc_arr[:, :, 1] < 240) | (tosc_arr[:, :, 2] < 240)
tosc_cut = tosc_raw.copy()
tosc_cut.putalpha(Image.fromarray((tosc_mask * 255).astype(np.uint8)))
tosc_plate = place_food_on_plate(tosc_cut, scale=0.68)
tosc_plate.save('public/food-la-toscana.jpg', 'JPEG', quality=95)
print("Saved food-la-toscana.jpg")

# 7. FRENCH FRIES
print("7. Creating French Fries on Plate...")
fries_raw = Image.open('public/food-fries.jpg').convert('RGB')
fries_cut = rembg.remove(fries_raw.resize((600, int(600 * fries_raw.height / fries_raw.width))), session=session)
fries_plate = place_food_on_plate(fries_cut, scale=0.68)
fries_plate.save('public/food-fries.jpg', 'JPEG', quality=95)
print("Saved food-fries.jpg")

# 8. SIX MOZZARELLA STICKS
print("8. Creating Six Mozzarella Sticks on Plate...")
moz_raw = Image.open('public/food-mozzarella-sticks.jpg').convert('RGB')
moz_cut = rembg.remove(moz_raw.resize((600, int(600 * moz_raw.height / moz_raw.width))), session=session)
moz_plate = place_food_on_plate(moz_cut, scale=0.68)
moz_plate.save('public/food-mozzarella-sticks.jpg', 'JPEG', quality=95)
print("Saved food-mozzarella-sticks.jpg")

print("All bird's eye view white plate food images created successfully!")
