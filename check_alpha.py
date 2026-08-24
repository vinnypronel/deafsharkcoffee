from PIL import Image
import numpy as np

img = Image.open('public/coke-perfect-alpha.png')
print("Mode:", img.mode, "Size:", img.size)
arr = np.array(img)
print("Alpha channel shape:", arr.shape)
print("Alpha top-left pixel (0,0):", arr[0, 0, 3])
print("Alpha corners:", arr[0, 0, 3], arr[0, -1, 3], arr[-1, 0, 3], arr[-1, -1, 3])
print("Total 0-alpha pixels:", np.sum(arr[:, :, 3] == 0))
print("Total 255-alpha pixels:", np.sum(arr[:, :, 3] == 255))
