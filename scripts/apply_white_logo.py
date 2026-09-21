import numpy as np
from PIL import Image

cup = Image.open('public/cup-cold.png').convert('RGBA')

def apply_white_logo(img_path):
    drink = Image.open(img_path).convert('RGBA')
    cup_res = cup.resize(drink.size, Image.Resampling.LANCZOS)
    
    drink_arr = np.array(drink).astype(float)
    cup_arr = np.array(cup_res).astype(float)
    
    h, w, _ = cup_arr.shape
    y_indices, x_indices = np.indices((h, w))
    
    in_logo_region = (y_indices > h * 0.30) & (y_indices < h * 0.75) & (x_indices > w * 0.25) & (x_indices < w * 0.75)
    
    cup_r, cup_g, cup_b = cup_arr[:, :, 0], cup_arr[:, :, 1], cup_arr[:, :, 2]
    logo_intensity = np.clip((85.0 - np.maximum(np.maximum(cup_r, cup_g), cup_b)) / 85.0, 0, 1.0)
    logo_alpha = logo_intensity * in_logo_region.astype(float)
    
    out = drink_arr.copy()
    for c in range(3):
        out[:, :, c] = out[:, :, c] * (1.0 - logo_alpha * 0.95) + 255.0 * (logo_alpha * 0.95)
        
    out_img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode='RGBA')
    out_img.save(img_path, 'WEBP', quality=98)
    print(f"Saved {img_path} with white logo!")

apply_white_logo('public/drink-iced-espresso.webp')
apply_white_logo('public/drink-iced-americano.webp')
