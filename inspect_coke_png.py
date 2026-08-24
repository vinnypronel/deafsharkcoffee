from PIL import Image
import numpy as np

img = Image.open('public/coke-isolated-true.png')
print("Image format:", img.format, "mode:", img.mode, "size:", img.size)
arr = np.array(img)
print("Channels:", arr.shape[2])
# Print top-left corner 5x5 alpha values:
print("Alpha channel [0..5, 0..5]:\n", arr[0:5, 0:5, 3])
# Print right corner 5x5 alpha values:
print("Alpha channel [0..5, -5..end]:\n", arr[0:5, -5:, 3])
