from PIL import Image
import numpy as np

img = Image.open(r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png')
print("Format:", img.format, "Size:", img.size, "Mode:", img.mode)

# Let's inspect the actual Coke can pixels:
# The Coke can is red (R > 180, G < 60, B < 60) or white text (letters) or silver top/bottom.
arr = np.array(img.convert('RGBA'))
print("Corners:", arr[0, 0], arr[0, -1], arr[-1, 0], arr[-1, -1])
