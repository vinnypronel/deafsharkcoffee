import numpy as np
from PIL import Image, ImageFilter

base = Image.open('public/drink-matcha-latte.webp').convert('RGBA')
arr = np.array(base).astype(float)
h, w, _ = arr.shape
alpha = base.getchannel('A')
alpha_arr = np.array(alpha).astype(float) / 255.0

y_grid, x_grid = np.indices((h, w))
y_norm = y_grid / float(h)
x_norm = x_grid / float(w)

inside_cup = (alpha_arr > 0.5)

# The second ridge line from the bottom is precisely at y = 0.835
# Generate multi-octave fluid marbling noise
def generate_marbling(seed_offset=0.0):
    np.random.seed(int(seed_offset * 100))
    t1 = np.sin(x_norm * 8.0 + seed_offset) * 0.04
    t2 = np.cos(x_norm * 16.0 + seed_offset * 2.1) * 0.025
    t3 = np.sin(x_norm * 28.0 + y_norm * 18.0 + seed_offset * 3.7) * 0.018
    t4 = np.cos(x_norm * 45.0 - y_norm * 35.0) * 0.012
    return t1 + t2 + t3 + t4

# 1. Strawberry Matcha
turb_sb = generate_marbling(1.4)
# Solid up to ridge line at y = 0.835
ridge_y = 0.835
# Bleeding plumes rising from the ridge up into y = 0.70 - 0.78
plume1 = np.exp(-((x_norm - 0.42) ** 2) / 0.007) * 0.11
plume2 = np.exp(-((x_norm - 0.65) ** 2) / 0.005) * 0.08
plume3 = np.exp(-((x_norm - 0.28) ** 2) / 0.008) * 0.06

bleed_height_sb = ridge_y - (plume1 + plume2 + plume3 + turb_sb)

# Create multi-layer soft bleeding density
# Below ridge: solid (1.0)
# Above ridge up to bleed_height: soft fluid gradient
density_sb = np.zeros_like(y_norm)
# Solid below ridge
density_sb[y_norm >= ridge_y] = 1.0
# Bleeding zone between bleed_height and ridge
in_bleed = (y_norm < ridge_y) & (y_norm >= bleed_height_sb)
density_sb[in_bleed] = (y_norm[in_bleed] - bleed_height_sb[in_bleed]) / np.maximum(ridge_y - bleed_height_sb[in_bleed], 0.001)

# Smooth blur for liquid diffusion
density_img = Image.fromarray((density_sb * 255).astype(np.uint8))
density_img = density_img.filter(ImageFilter.GaussianBlur(radius=5))
density_sb_smooth = np.array(density_img).astype(float) / 255.0 * inside_cup

# Strawberry color
sb_r = 218.0
sb_g = 22.0
sb_b = 58.0

milk_lum = (arr[:, :, 0] + arr[:, :, 1] + arr[:, :, 2]) / (3.0 * 255.0)
shade = np.clip(milk_lum * 1.12, 0.65, 1.05)

sb_out = arr.copy()
for c, col in enumerate([sb_r, sb_g, sb_b]):
    sb_out[:, :, c] = arr[:, :, c] * (1.0 - density_sb_smooth) + (col * shade) * density_sb_smooth

logo_mask = (arr[:, :, 0] < 45) & (arr[:, :, 1] < 45) & (arr[:, :, 2] < 45) & (y_norm > 0.32) & (y_norm < 0.72) & (x_norm > 0.28) & (x_norm < 0.72)
for c in range(3):
    sb_out[logo_mask, c] = arr[logo_mask, c]

sb_img = Image.fromarray(np.clip(sb_out, 0, 255).astype(np.uint8), mode='RGBA')
sb_img.putalpha(alpha)
sb_img.save('public/drink-strawberry-matcha.webp', 'WEBP', quality=98)
print("Saved diffuse bleeding Strawberry Matcha at 2nd ridge!")

# 2. Mango Matcha (distinct plume positions and marbling)
turb_mg = generate_marbling(4.8)
plume_mg1 = np.exp(-((x_norm - 0.58) ** 2) / 0.009) * 0.12
plume_mg2 = np.exp(-((x_norm - 0.35) ** 2) / 0.006) * 0.09
plume_mg3 = np.exp(-((x_norm - 0.72) ** 2) / 0.007) * 0.06

bleed_height_mg = ridge_y - (plume_mg1 + plume_mg2 + plume_mg3 + turb_mg)

density_mg = np.zeros_like(y_norm)
density_mg[y_norm >= ridge_y] = 1.0
in_bleed_mg = (y_norm < ridge_y) & (y_norm >= bleed_height_mg)
density_mg[in_bleed_mg] = (y_norm[in_bleed_mg] - bleed_height_mg[in_bleed_mg]) / np.maximum(ridge_y - bleed_height_mg[in_bleed_mg], 0.001)

density_mg_img = Image.fromarray((density_mg * 255).astype(np.uint8))
density_mg_img = density_mg_img.filter(ImageFilter.GaussianBlur(radius=5))
density_mg_smooth = np.array(density_mg_img).astype(float) / 255.0 * inside_cup

mg_r = 248.0
mg_g = 168.0
mg_b = 14.0

mg_out = arr.copy()
for c, col in enumerate([mg_r, mg_g, mg_b]):
    mg_out[:, :, c] = arr[:, :, c] * (1.0 - density_mg_smooth) + (col * shade) * density_mg_smooth

for c in range(3):
    mg_out[logo_mask, c] = arr[logo_mask, c]

mg_img = Image.fromarray(np.clip(mg_out, 0, 255).astype(np.uint8), mode='RGBA')
mg_img.putalpha(alpha)
mg_img.save('public/drink-mango-matcha.webp', 'WEBP', quality=98)
print("Saved diffuse bleeding Mango Matcha at 2nd ridge!")
