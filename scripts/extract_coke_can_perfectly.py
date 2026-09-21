from PIL import Image, ImageFilter, ImageDraw
import numpy as np
from scipy import ndimage

coke_raw = Image.open(r'C:\Users\vinny\.gemini\antigravity-ide\brain\5b76b041-7bda-452c-bfc3-9cbb0f889427\.user_uploaded\media_1787609983410.png').convert('RGB')
arr = np.array(coke_raw)
h, w, _ = arr.shape

# Pixels close to white:
is_white = (arr[:, :, 0] > 245) & (arr[:, :, 1] > 245) & (arr[:, :, 2] > 245)

# Flood fill from border to find ONLY external background
# Create a mask initialized with False
external_bg = np.zeros((h, w), dtype=bool)

# Label connected components of white pixels
labeled, num_features = ndimage.label(is_white)
# The border pixels belong to the background components
border_labels = np.unique(np.concatenate([
    labeled[0, :], labeled[-1, :], labeled[:, 0], labeled[:, -1]
]))
# Mark any component connected to the border as external background
for lbl in border_labels:
    if lbl > 0:
        external_bg[labeled == lbl] = True

# Also remove any isolated white border margin
alpha = (~external_bg * 255).astype(np.uint8)
coke_clean = Image.fromarray(np.dstack([arr, alpha]))

# Crop transparent bounds
bbox = coke_clean.getbbox()
if bbox:
    coke_clean = coke_clean.crop(bbox)

coke_clean.save('public/coke-clean-extracted.png')
print("Successfully extracted Coke can without touching letters! bbox:", bbox)
