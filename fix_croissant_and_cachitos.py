import rembg
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
import numpy as np

session = rembg.new_session('u2netp')

# Master clean plate
def create_master_plate():
    canvas = Image.new('RGBA', (1024, 1024), (222, 222, 222, 255))
    center = 512
    r_plate = 420
    
    # Soft plate drop shadow
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

def place_clean(food_cut_rgba, scale=0.68, offset_y=-5):
    bbox = food_cut_rgba.getbbox()
    if bbox:
        food_cut_rgba = food_cut_rgba.crop(bbox)
        
    w, h = food_cut_rgba.size
    max_dim = int(1024 * scale)
    ratio = min(max_dim / w, max_dim / h)
    new_w, new_h = int(w * ratio), int(h * ratio)
    food_scaled = food_cut_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
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

# 1. Sausage, Egg and Cheese Croissant Sandwich (cut halves on white plate)
# Use egg-cheese breakfast sandwich halves
egg_cheese = Image.open('public/food-egg-cheese-breakfast.jpg').convert('RGB')
ec_cut = rembg.remove(egg_cheese.resize((600, 600)), session=session)
place_clean(ec_cut, scale=0.68).save('public/food-breakfast-croissant.jpg', 'JPEG', quality=95)
print("Saved food-breakfast-croissant.jpg")

# 2. Cachitos (ham & cheese stuffed Venezuelan pastry halves)
ham_cheese = Image.open('public/food-ham-cheese-breakfast.jpg').convert('RGB')
hc_cut = rembg.remove(ham_cheese.resize((600, 600)), session=session)
place_clean(hc_cut, scale=0.68).save('public/food-cachitos.jpg', 'JPEG', quality=95)
print("Saved food-cachitos.jpg")

# 3. Maple Waffle Sandwich (clean waffles)
# Re-extract waffles from test-waffle-cut or synthesize clean waffle shape
w_raw = Image.open('public/test-waffle-cut.png' if os.path.exists('public/test-waffle-cut.png') else 'public/food-maple-waffle.jpg').convert('RGBA')
# Extract bounding box of actual waffles
w_arr = np.array(w_raw)
w_mask = (w_arr[:, :, 0] > 120) & (w_arr[:, :, 1] > 80) & (w_arr[:, :, 2] < 150)
w_clean = w_raw.copy()
w_clean.putalpha(Image.fromarray((w_mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1)))
place_clean(w_clean, scale=0.65).save('public/food-maple-waffle.jpg', 'JPEG', quality=95)
print("Saved food-maple-waffle.jpg")

print("Finished rendering!")
