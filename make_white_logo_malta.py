import numpy as np
from PIL import Image

# Load the current malta image
malta = Image.open('public/drink-malta.webp').convert('RGBA')
cup = Image.open('public/cup-cold.png').convert('RGBA')

# Resize cup to match malta if different
cup = cup.resize(malta.size, Image.Resampling.LANCZOS)

malta_arr = np.array(malta).astype(float)
cup_arr = np.array(cup).astype(float)

# In cup-cold.png, the logo is dark black/charcoal pixels in the center region
# Center region bounding box: y between 0.30 and 0.75, x between 0.25 and 0.75
h, w, _ = cup_arr.shape
y_indices, x_indices = np.indices((h, w))

in_logo_region = (y_indices > h * 0.30) & (y_indices < h * 0.75) & (x_indices > w * 0.25) & (x_indices < w * 0.75)

# In cup-cold.png, logo pixels are very dark (r < 75, g < 75, b < 75)
cup_r, cup_g, cup_b = cup_arr[:, :, 0], cup_arr[:, :, 1], cup_arr[:, :, 2]
logo_mask = in_logo_region & (cup_r < 80) & (cup_g < 80) & (cup_b < 80)

# Create smooth anti-aliased mask for the logo
logo_intensity = np.clip((85.0 - np.maximum(np.maximum(cup_r, cup_g), cup_b)) / 85.0, 0, 1.0)
logo_alpha = logo_intensity * in_logo_region.astype(float)

# Apply white logo onto malta
out = malta_arr.copy()
# White color: 255, 255, 255
for c in range(3):
    out[:, :, c] = out[:, :, c] * (1.0 - logo_alpha * 0.95) + 255.0 * (logo_alpha * 0.95)

out_img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode='RGBA')
out_img.save('public/drink-malta.webp', 'WEBP', quality=98)
print("Saved perfect drink-malta.webp with white logo!")
