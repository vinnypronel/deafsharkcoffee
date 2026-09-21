import numpy as np
from PIL import Image

# Load matcha latte as master base
base = Image.open('public/drink-matcha-latte.webp').convert('RGBA')
arr = np.array(base).astype(float)
h, w, _ = arr.shape

alpha = base.getchannel('A')
alpha_arr = np.array(alpha).astype(float) / 255.0

y_grid, x_grid = np.indices((h, w))
y_norm = y_grid / float(h)
x_norm = x_grid / float(w)

# Inside cup mask
inside_cup = (alpha_arr > 0.5)

# The second ridge line from the bottom is at y ~ 0.81
# 1. Strawberry bleeding tendrils & marbling
# Ridge base at 0.81, with multiple fluid plumes bleeding up into y = 0.68-0.75
plume_sb1 = np.exp(-((x_norm - 0.38) ** 2) / 0.008) * 0.12
plume_sb2 = np.exp(-((x_norm - 0.62) ** 2) / 0.006) * 0.09
plume_sb3 = np.exp(-((x_norm - 0.48) ** 2) / 0.015) * 0.06
wisps_sb = 0.025 * np.sin(x_norm * 25.0 + 1.0) * np.cos(y_norm * 30.0)
bleed_sb_top = 0.815 - (plume_sb1 + plume_sb2 + plume_sb3 + wisps_sb)

# Soft diffusion gradient
bleed_sb_mask = np.clip((y_norm - bleed_sb_top) / 0.08, 0, 1.0)
# Make base solid below y=0.815
solid_sb_base = np.clip((y_norm - 0.815) / 0.02, 0, 1.0)
sb_density = np.maximum(bleed_sb_mask, solid_sb_base) * inside_cup * (y_norm > 0.65).astype(float)

# Organic turbulence in the milk-bleed interface
noise_sb = np.sin(x_norm * 40.0) * np.sin(y_norm * 35.0) * 0.08
sb_density = np.clip(sb_density + noise_sb * np.clip((0.85 - y_norm) / 0.2, 0, 1.0) * sb_density, 0, 1.0)

# Realistic rich strawberry red coulis colors
sb_r = 220.0
sb_g = 25.0
sb_b = 60.0

milk_lum = (arr[:, :, 0] + arr[:, :, 1] + arr[:, :, 2]) / (3.0 * 255.0)
shade = np.clip(milk_lum * 1.15, 0.65, 1.05)

sb_out = arr.copy()
sb_out[:, :, 0] = arr[:, :, 0] * (1.0 - sb_density) + (sb_r * shade) * sb_density
sb_out[:, :, 1] = arr[:, :, 1] * (1.0 - sb_density) + (sb_g * shade) * sb_density
sb_out[:, :, 2] = arr[:, :, 2] * (1.0 - sb_density) + (sb_b * shade) * sb_density

# Black logo preservation
logo_mask = (arr[:, :, 0] < 45) & (arr[:, :, 1] < 45) & (arr[:, :, 2] < 45) & (y_norm > 0.32) & (y_norm < 0.72) & (x_norm > 0.28) & (x_norm < 0.72)
for c in range(3):
    sb_out[logo_mask, c] = arr[logo_mask, c]

sb_img = Image.fromarray(np.clip(sb_out, 0, 255).astype(np.uint8), mode='RGBA')
sb_img.putalpha(alpha)
sb_img.save('public/drink-strawberry-matcha.webp', 'WEBP', quality=98)
print("Saved authentic bleeding Strawberry Matcha at 2nd ridge!")

# 2. Mango bleeding tendrils & marbling (distinct swirl dynamics)
plume_mg1 = np.exp(-((x_norm - 0.55) ** 2) / 0.010) * 0.13
plume_mg2 = np.exp(-((x_norm - 0.32) ** 2) / 0.007) * 0.08
plume_mg3 = np.exp(-((x_norm - 0.70) ** 2) / 0.009) * 0.07
wisps_mg = 0.028 * np.cos(x_norm * 22.0 + 2.5) * np.sin(y_norm * 28.0)
bleed_mg_top = 0.815 - (plume_mg1 + plume_mg2 + plume_mg3 + wisps_mg)

bleed_mg_mask = np.clip((y_norm - bleed_mg_top) / 0.08, 0, 1.0)
solid_mg_base = np.clip((y_norm - 0.815) / 0.02, 0, 1.0)
mg_density = np.maximum(bleed_mg_mask, solid_mg_base) * inside_cup * (y_norm > 0.65).astype(float)

noise_mg = np.cos(x_norm * 35.0) * np.cos(y_norm * 30.0) * 0.08
mg_density = np.clip(mg_density + noise_mg * np.clip((0.85 - y_norm) / 0.2, 0, 1.0) * mg_density, 0, 1.0)

# Golden mango yellow colors #F59E0B / #EAB308
mg_r = 248.0
mg_g = 170.0
mg_b = 16.0

mg_out = arr.copy()
mg_out[:, :, 0] = arr[:, :, 0] * (1.0 - mg_density) + (mg_r * shade) * mg_density
mg_out[:, :, 1] = arr[:, :, 1] * (1.0 - mg_density) + (mg_g * shade) * mg_density
mg_out[:, :, 2] = arr[:, :, 2] * (1.0 - mg_density) + (mg_b * shade) * mg_density

for c in range(3):
    mg_out[logo_mask, c] = arr[logo_mask, c]

mg_img = Image.fromarray(np.clip(mg_out, 0, 255).astype(np.uint8), mode='RGBA')
mg_img.putalpha(alpha)
mg_img.save('public/drink-mango-matcha.webp', 'WEBP', quality=98)
print("Saved authentic bleeding Mango Matcha at 2nd ridge!")
