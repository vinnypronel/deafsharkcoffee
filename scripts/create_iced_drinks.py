import numpy as np
from PIL import Image

latte = Image.open('public/drink-iced-latte.webp').convert('RGBA')
cold_brew = Image.open('public/drink-cold-brew.webp').convert('RGBA')
macchiato = Image.open('public/drink-caramel-macchiato.webp').convert('RGBA')

h, w, _ = np.array(latte).shape

# 1. Cortado: Smooth gradient transition from deep rich espresso roast on top to creamy golden milk on bottom
latte_arr = np.array(latte).astype(float)
cold_brew_arr = np.array(cold_brew).astype(float)

# Blend ratio smoothly from top (70% dark espresso) to bottom (100% creamy latte)
y_coords = np.linspace(0, 1, h)[:, np.newaxis, np.newaxis]
# Smooth sigmoid curve
blend = 1.0 / (1.0 + np.exp(-(y_coords - 0.45) * 8.0))

cortado_arr = cold_brew_arr * (1.0 - blend) * 0.9 + latte_arr * (blend + (1.0 - blend) * 0.1)
cortado_arr = np.clip(cortado_arr, 0, 255).astype(np.uint8)

cortado_img = Image.fromarray(cortado_arr, mode='RGBA')
cortado_img.putalpha(latte.getchannel('A'))
cortado_img.save('public/drink-iced-cortado.webp', 'WEBP', quality=95)
print("Saved smooth drink-iced-cortado.webp")

# 2. Regular Iced Coffee: classic smooth iced brew
coffee_arr = np.array(cold_brew).astype(float)
coffee_arr[:, :, 0] = np.clip(coffee_arr[:, :, 0] * 1.08 + 12, 0, 255)
coffee_arr[:, :, 1] = np.clip(coffee_arr[:, :, 1] * 0.98 + 4, 0, 255)
coffee_arr[:, :, 2] = np.clip(coffee_arr[:, :, 2] * 0.88, 0, 255)
coffee_img = Image.fromarray(coffee_arr.astype(np.uint8), mode='RGBA')
coffee_img.putalpha(cold_brew.getchannel('A'))
coffee_img.save('public/drink-iced-coffee.webp', 'WEBP', quality=95)
print("Saved smooth drink-iced-coffee.webp")

# 3. Iced Espresso: deep dark roasted double shot with golden crema glow near top
espresso_arr = np.array(cold_brew).astype(float)
crema_blend = np.exp(-((y_coords - 0.25) / 0.18) ** 2)
espresso_arr[:, :, 0] = np.clip(espresso_arr[:, :, 0] * 0.88 + crema_blend[:, :, 0] * 45, 0, 255)
espresso_arr[:, :, 1] = np.clip(espresso_arr[:, :, 1] * 0.82 + crema_blend[:, :, 0] * 28, 0, 255)
espresso_arr[:, :, 2] = np.clip(espresso_arr[:, :, 2] * 0.78 + crema_blend[:, :, 0] * 10, 0, 255)
espresso_img = Image.fromarray(espresso_arr.astype(np.uint8), mode='RGBA')
espresso_img.putalpha(cold_brew.getchannel('A'))
espresso_img.save('public/drink-iced-espresso.webp', 'WEBP', quality=95)
print("Saved smooth drink-iced-espresso.webp")

# 4. Iced Cappuccino: thick velvety cold foam top fading into rich espresso and cold milk
foam_blend = 1.0 / (1.0 + np.exp((y_coords - 0.32) * 12.0)) # 1 at top, 0 below
cappuccino_arr = latte_arr * (1.0 - foam_blend * 0.5) + 245 * foam_blend * 0.5
cappuccino_arr = np.clip(cappuccino_arr, 0, 255).astype(np.uint8)
cappuccino_img = Image.fromarray(cappuccino_arr, mode='RGBA')
cappuccino_img.putalpha(latte.getchannel('A'))
cappuccino_img.save('public/drink-iced-cappuccino.webp', 'WEBP', quality=95)
print("Saved smooth drink-iced-cappuccino.webp")

# 5. Iced Americano: pure clean espresso opened over crystal ice
americano_arr = np.array(cold_brew).astype(float)
americano_arr[:, :, 0] = np.clip(americano_arr[:, :, 0] * 1.04 + 6, 0, 255)
americano_arr[:, :, 1] = np.clip(americano_arr[:, :, 1] * 0.96 + 2, 0, 255)
americano_arr[:, :, 2] = np.clip(americano_arr[:, :, 2] * 0.92, 0, 255)
americano_img = Image.fromarray(americano_arr.astype(np.uint8), mode='RGBA')
americano_img.putalpha(cold_brew.getchannel('A'))
americano_img.save('public/drink-iced-americano.webp', 'WEBP', quality=95)
print("Saved smooth drink-iced-americano.webp")
