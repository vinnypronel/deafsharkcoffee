from PIL import Image
import numpy as np

img = Image.open(r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png').convert('RGB')
arr = np.array(img)
h, w, _ = arr.shape

# The can is centered horizontally around x = 140, with radius ~85px (x from 55 to 228)
# Let's inspect where red pixels exist in each row:
alpha = np.zeros((h, w), dtype=np.uint8)

for y in range(h):
    # Find pixels with significant red saturation: R - G > 30
    reds = np.where((arr[y, :, 0].astype(int) - arr[y, :, 1].astype(int) > 30) & (arr[y, :, 0] > 120))[0]
    # Or for top/bottom rims (y between 48..68 and 375..396), find silver (R > 120 and R < 240 and |R-G| < 15)
    silvers = np.where((arr[y, :, 0] > 110) & (arr[y, :, 0] < 238) & (np.abs(arr[y, :, 0].astype(int) - arr[y, :, 1].astype(int)) < 15))[0]
    
    # Restrict x to the can region (45 to 235)
    reds = reds[(reds >= 50) & (reds <= 232)]
    silvers = silvers[(silvers >= 50) & (silvers <= 232)]
    
    valid_x = np.concatenate([reds, silvers])
    if len(valid_x) > 0 and 48 <= y <= 396:
        x_min = valid_x.min()
        x_max = valid_x.max()
        alpha[y, x_min:x_max+1] = 255

coke_isolated = Image.fromarray(np.dstack([arr, alpha]))
coke_isolated = coke_isolated.crop(coke_isolated.getbbox())
coke_isolated.save('public/coke-isolated-true.png')
print("Saved coke-isolated-true.png with bbox:", coke_isolated.size)
