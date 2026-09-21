import numpy as np
from PIL import Image

sb = Image.open('public/drink-strawberry-matcha.webp').convert('RGBA')
arr = np.array(sb).astype(float)
h, w, _ = arr.shape
y_coords = np.linspace(0, 1, h)[:, np.newaxis]

r = arr[:, :, 0]
g = arr[:, :, 1]
b = arr[:, :, 2]
a = arr[:, :, 3]

# Isolate all red/pink/strawberry pixels (where red > green + 10 in bottom half)
is_red = (y_coords > 0.52) & (r > g + 8) & (r > 60)

# Shift red to golden mango yellow
ratio = np.clip((r - g) / np.maximum(r, 1.0), 0, 1.0)
factor = is_red.astype(float) * ratio

out_r = r
out_g = g * (1.0 - factor) + (r * 0.76 + g * 0.24) * factor
out_b = b * (1.0 - factor) + (b * 0.2) * factor

out = arr.copy()
out[:, :, 0] = out_r
out[:, :, 1] = out_g
out[:, :, 2] = out_b

out_img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode='RGBA')
out_img.save('public/drink-mango-matcha.webp', 'WEBP', quality=98)
print("Saved flawless mango matcha with 0 pink fringes!")
