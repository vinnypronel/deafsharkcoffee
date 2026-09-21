from PIL import Image, ImageFilter
import numpy as np

coke_path = r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png'
coke_raw = Image.open(coke_path).convert('RGB')
arr = np.array(coke_raw)

# The background in the image is solid white (255, 255, 255)
# Let's create an alpha mask where pixels that are not pure white are kept:
is_bg = (arr[:, :, 0] > 248) & (arr[:, :, 1] > 248) & (arr[:, :, 2] > 248)

alpha = (~is_bg * 255).astype(np.uint8)
coke_rgba = Image.fromarray(np.dstack([arr, alpha]))

# Crop transparent bounds
c_bbox = coke_rgba.getbbox()
if c_bbox:
    coke_rgba = coke_rgba.crop(c_bbox)

coke_rgba.save('public/test-coke-clean.png')
print("Saved test-coke-clean.png with bbox:", c_bbox)
