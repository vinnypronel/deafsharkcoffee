import numpy as np
from PIL import Image

# Load matcha latte as the master base (green matcha top + pristine white milk bottom)
base = Image.open('public/drink-matcha-latte.webp').convert('RGBA')
arr = np.array(base).astype(float)
h, w, _ = arr.shape

alpha = base.getchannel('A')
alpha_arr = np.array(alpha).astype(float) / 255.0

y_grid, x_grid = np.indices((h, w))
y_norm = y_grid / float(h)
x_norm = x_grid / float(w)

# Define inside cup mask in the lower region (where alpha > 0.5)
inside_cup = alpha_arr > 0.5

# 1. Strawberry Matcha
# Layer starts around y = 0.70 and extends down through 0.95 (bottom base)
# Create organic wavy swirl boundary
wave_sb = 0.70 + 0.035 * np.sin(x_norm * 9.0) + 0.02 * np.cos(x_norm * 17.0 + 1.2) - 0.015 * np.sin(x_norm * 4.0)
dist_sb = (y_norm - wave_sb) / 0.06
puree_sb_mask = np.clip(dist_sb, 0, 1.0) * inside_cup * (y_norm > 0.62).astype(float)

# Strawberry red puree colors: deep rich ruby red #D11A3E to #B91C1C
sb_r = 215.0 - (y_norm - 0.7) * 35.0
sb_g = 28.0 + (y_norm - 0.7) * 15.0
sb_b = 62.0 + (y_norm - 0.7) * 20.0

# Add subtle shading based on the original milk texture so shadows and glass reflections remain intact
milk_lum = (arr[:, :, 0] + arr[:, :, 1] + arr[:, :, 2]) / (3.0 * 255.0)
shade = np.clip(milk_lum * 1.15, 0.7, 1.1)

sb_out = arr.copy()
sb_out[:, :, 0] = arr[:, :, 0] * (1.0 - puree_sb_mask) + (sb_r * shade) * puree_sb_mask
sb_out[:, :, 1] = arr[:, :, 1] * (1.0 - puree_sb_mask) + (sb_g * shade) * puree_sb_mask
sb_out[:, :, 2] = arr[:, :, 2] * (1.0 - puree_sb_mask) + (sb_b * shade) * puree_sb_mask

# Preserve black logo
logo_mask = (arr[:, :, 0] < 45) & (arr[:, :, 1] < 45) & (arr[:, :, 2] < 45) & (y_norm > 0.32) & (y_norm < 0.72) & (x_norm > 0.28) & (x_norm < 0.72)
for c in range(3):
    sb_out[logo_mask, c] = arr[logo_mask, c]

sb_img = Image.fromarray(np.clip(sb_out, 0, 255).astype(np.uint8), mode='RGBA')
sb_img.putalpha(alpha)
sb_img.save('public/drink-strawberry-matcha.webp', 'WEBP', quality=98)
print("Saved perfect Strawberry Matcha!")

# 2. Mango Matcha
# Layer starts around y = 0.72 with a distinct organic swirl wave (different from strawberry)
wave_mg = 0.72 + 0.04 * np.cos(x_norm * 8.0 + 0.5) - 0.025 * np.sin(x_norm * 14.0 + 2.0) + 0.018 * np.sin(x_norm * 3.5)
dist_mg = (y_norm - wave_mg) / 0.06
puree_mg_mask = np.clip(dist_mg, 0, 1.0) * inside_cup * (y_norm > 0.64).astype(float)

# Golden mango yellow-orange colors: #F59E0B / #EAB308 / #FBBF24
mg_r = 245.0 - (y_norm - 0.7) * 20.0
mg_g = 168.0 - (y_norm - 0.7) * 25.0
mg_b = 18.0 + (y_norm - 0.7) * 10.0

mg_out = arr.copy()
mg_out[:, :, 0] = arr[:, :, 0] * (1.0 - puree_mg_mask) + (mg_r * shade) * puree_mg_mask
mg_out[:, :, 1] = arr[:, :, 1] * (1.0 - puree_mg_mask) + (mg_g * shade) * puree_mg_mask
mg_out[:, :, 2] = arr[:, :, 2] * (1.0 - puree_mg_mask) + (mg_b * shade) * puree_mg_mask

for c in range(3):
    mg_out[logo_mask, c] = arr[logo_mask, c]

mg_img = Image.fromarray(np.clip(mg_out, 0, 255).astype(np.uint8), mode='RGBA')
mg_img.putalpha(alpha)
mg_img.save('public/drink-mango-matcha.webp', 'WEBP', quality=98)
print("Saved perfect Mango Matcha with distinct natural swirl!")
