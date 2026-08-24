from PIL import Image
import numpy as np

img = Image.open(r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png').convert('RGB')
arr = np.array(img)
h, w, _ = arr.shape
print("Size:", w, h)

# Let's find rows/cols with red pixels (Coke can is red)
red_mask = (arr[:, :, 0] > 180) & (arr[:, :, 1] < 60) & (arr[:, :, 2] < 60)
y_indices, x_indices = np.where(red_mask)
print("Can X range:", x_indices.min(), x_indices.max())
print("Can Y range:", y_indices.min(), y_indices.max())
