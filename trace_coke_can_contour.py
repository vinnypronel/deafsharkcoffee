from PIL import Image, ImageFilter
import numpy as np

img = Image.open(r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png').convert('RGB')
arr = np.array(img)
h, w, _ = arr.shape

alpha = np.zeros((h, w), dtype=np.uint8)

# For each row from y=52 to 396
for y in range(52, 396):
    # In each row, find the non-white pixels:
    row = arr[y, :, :]
    # A pixel is can if it's not pure white (R < 250 or G < 250 or B < 250)
    is_can = (row[:, 0] < 250) | (row[:, 1] < 250) | (row[:, 2] < 250)
    indices = np.where(is_can)[0]
    if len(indices) > 0:
        x_start = indices.min()
        x_end = indices.max()
        # Fill the entire span from x_start to x_end with solid opacity
        alpha[y, x_start:x_end+1] = 255

coke_perfect = Image.fromarray(np.dstack([arr, alpha]))
bbox = coke_perfect.getbbox()
coke_perfect = coke_perfect.crop(bbox)

coke_perfect.save('public/coke-perfect-alpha.png')
print("Successfully created coke-perfect-alpha.png with bbox:", bbox)
