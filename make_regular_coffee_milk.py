import numpy as np
from PIL import Image

latte = Image.open('public/drink-iced-latte.webp').convert('RGBA')
cold_brew = Image.open('public/drink-cold-brew.webp').convert('RGBA')

h, w, _ = np.array(latte).shape
latte_arr = np.array(latte).astype(float)
cold_brew_arr = np.array(cold_brew).astype(float)

# Regular Coffee with milk/cream:
# A classic creamy iced coffee (café con leche style) with smooth rich light coffee + milk blend
# Blend 55% latte milk tones with 45% rich coffee
coffee_with_milk_arr = cold_brew_arr * 0.42 + latte_arr * 0.58

# Warm the hue slightly to a rich creamy coffee latte/caramel tone
coffee_with_milk_arr[:, :, 0] = np.clip(coffee_with_milk_arr[:, :, 0] * 1.08 + 8, 0, 255)
coffee_with_milk_arr[:, :, 1] = np.clip(coffee_with_milk_arr[:, :, 1] * 1.02 + 4, 0, 255)
coffee_with_milk_arr[:, :, 2] = np.clip(coffee_with_milk_arr[:, :, 2] * 0.92, 0, 255)

coffee_img = Image.fromarray(coffee_with_milk_arr.astype(np.uint8), mode='RGBA')
coffee_img.putalpha(latte.getchannel('A'))
coffee_img.save('public/drink-iced-coffee.webp', 'WEBP', quality=95)
print("Saved distinct regular iced coffee with milk to drink-iced-coffee.webp")
