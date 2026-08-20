import os
from PIL import Image
import numpy as np

# Load the base alpha mask from cold brew cup
cup = Image.open('public/drink-cold-brew.webp').convert('RGBA')
alpha = cup.getchannel('A')
target_size = cup.size

# Generated image paths
sb_path = 'C:/Users/vinny/.gemini/antigravity-ide/brain/d532e28f-9c44-4e33-b0a7-686c4b2be9a1/drink_smoothie_strawberry_1787192618564.jpg'
sb_banana_path = 'C:/Users/vinny/.gemini/antigravity-ide/brain/d532e28f-9c44-4e33-b0a7-686c4b2be9a1/drink_smoothie_strawberry_banana_1787192628659.jpg'
berry_path = 'C:/Users/vinny/.gemini/antigravity-ide/brain/d532e28f-9c44-4e33-b0a7-686c4b2be9a1/drink_smoothie_berry_1787192637791.jpg'
sunrise_path = 'C:/Users/vinny/.gemini/antigravity-ide/brain/d532e28f-9c44-4e33-b0a7-686c4b2be9a1/drink_smoothie_sunrise_1787192647287.jpg'

def process_and_save(src_path, dst_path):
    img = Image.open(src_path).convert('RGBA')
    img = img.resize(target_size, Image.Resampling.LANCZOS)
    
    # Isolate white background from image
    arr = np.array(img).astype(float)
    # Background is white (r > 240, g > 240, b > 240)
    r, g, b, _ = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    white_diff = np.maximum(np.maximum(255 - r, 255 - g), 255 - b)
    # Smooth alpha feathering on white edge
    img_alpha = np.clip(white_diff * 4.0, 0, 255).astype(np.uint8)
    
    # Combine with cup alpha
    cup_alpha_arr = np.array(alpha)
    final_alpha = np.minimum(cup_alpha_arr, img_alpha)
    
    img.putalpha(Image.fromarray(final_alpha))
    img.save(dst_path, 'WEBP', quality=95)
    print(f"Saved {dst_path}")

process_and_save(sb_path, 'public/drink-smoothie-strawberry.webp')
process_and_save(sb_banana_path, 'public/drink-smoothie-strawberry-banana.webp')
process_and_save(berry_path, 'public/drink-smoothie-berry-blend.webp')
process_and_save(sunrise_path, 'public/drink-smoothie-tropical-sunrise.webp')
