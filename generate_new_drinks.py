import numpy as np
from PIL import Image

latte = Image.open('public/drink-iced-latte.webp').convert('RGBA')
cold_brew = Image.open('public/drink-cold-brew.webp').convert('RGBA')
matcha_latte = Image.open('public/drink-matcha-latte.webp').convert('RGBA')
strawberry_matcha = Image.open('public/drink-strawberry-matcha.webp').convert('RGBA')
chicha = Image.open('public/drink-chicha.webp').convert('RGBA')

h, w, _ = np.array(latte).shape
y_coords = np.linspace(0, 1, h)[:, np.newaxis, np.newaxis]
alpha_latte = latte.getchannel('A')
alpha_cold_brew = cold_brew.getchannel('A')

# 1. Mango Matcha: Golden mango base (bottom 40%), creamy milk middle (20%), emerald matcha top (40%)
sb_arr = np.array(strawberry_matcha).astype(float)
is_bottom = 1.0 / (1.0 + np.exp(-(y_coords - 0.52) * 16.0))
mango_arr = sb_arr.copy()
mango_r = np.clip(sb_arr[:, :, 0] * 1.05 + 15, 0, 255)
mango_g = np.clip(sb_arr[:, :, 0] * 0.72 + sb_arr[:, :, 1] * 0.4 + 20, 0, 255)
mango_b = np.clip(sb_arr[:, :, 2] * 0.25 + 10, 0, 255)

mango_arr[:, :, 0] = sb_arr[:, :, 0] * (1.0 - is_bottom[:, :, 0]) + mango_r * is_bottom[:, :, 0]
mango_arr[:, :, 1] = sb_arr[:, :, 1] * (1.0 - is_bottom[:, :, 0]) + mango_g * is_bottom[:, :, 0]
mango_arr[:, :, 2] = sb_arr[:, :, 2] * (1.0 - is_bottom[:, :, 0]) + mango_b * is_bottom[:, :, 0]

mango_img = Image.fromarray(np.clip(mango_arr, 0, 255).astype(np.uint8), mode='RGBA')
mango_img.putalpha(strawberry_matcha.getchannel('A'))
mango_img.save('public/drink-mango-matcha.webp', 'WEBP', quality=95)
print("Saved drink-mango-matcha.webp")

# 2. Chai Tea Latte: Warm golden spiced tea latte with spiced caramel infusion and milky foam
chai_arr = np.array(latte).astype(float)
chai_arr[:, :, 0] = np.clip(chai_arr[:, :, 0] * 1.06 + 18, 0, 255)
chai_arr[:, :, 1] = np.clip(chai_arr[:, :, 1] * 0.94 + 8, 0, 255)
chai_arr[:, :, 2] = np.clip(chai_arr[:, :, 2] * 0.72 + 5, 0, 255)
chai_img = Image.fromarray(chai_arr.astype(np.uint8), mode='RGBA')
chai_img.putalpha(alpha_latte)
chai_img.save('public/drink-chai-latte.webp', 'WEBP', quality=95)
print("Saved drink-chai-latte.webp")

# 3. Strawberry Smoothie: Rich blended strawberry texture in full cup
sb_smoothie_arr = np.array(chicha).astype(float)
sb_smoothie_arr[:, :, 0] = np.clip(sb_smoothie_arr[:, :, 0] * 0.9 + 185 * 0.35, 0, 255)
sb_smoothie_arr[:, :, 1] = np.clip(sb_smoothie_arr[:, :, 1] * 0.32 + 35 * 0.35, 0, 255)
sb_smoothie_arr[:, :, 2] = np.clip(sb_smoothie_arr[:, :, 2] * 0.38 + 55 * 0.35, 0, 255)
sb_smoothie_img = Image.fromarray(sb_smoothie_arr.astype(np.uint8), mode='RGBA')
sb_smoothie_img.putalpha(alpha_latte)
sb_smoothie_img.save('public/drink-smoothie-strawberry.webp', 'WEBP', quality=95)
print("Saved drink-smoothie-strawberry.webp")

# 4. Strawberry Banana Smoothie: Creamy pastel strawberry banana blush
sb_banana_arr = np.array(chicha).astype(float)
sb_banana_arr[:, :, 0] = np.clip(sb_banana_arr[:, :, 0] * 0.92 + 215 * 0.28, 0, 255)
sb_banana_arr[:, :, 1] = np.clip(sb_banana_arr[:, :, 1] * 0.65 + 120 * 0.28, 0, 255)
sb_banana_arr[:, :, 2] = np.clip(sb_banana_arr[:, :, 2] * 0.55 + 95 * 0.28, 0, 255)
sb_banana_img = Image.fromarray(sb_banana_arr.astype(np.uint8), mode='RGBA')
sb_banana_img.putalpha(alpha_latte)
sb_banana_img.save('public/drink-smoothie-strawberry-banana.webp', 'WEBP', quality=95)
print("Saved drink-smoothie-strawberry-banana.webp")

# 5. Berry Blend Smoothie: Deep rich purple/blackberry smoothie
berry_arr = np.array(chicha).astype(float)
berry_arr[:, :, 0] = np.clip(berry_arr[:, :, 0] * 0.45 + 90 * 0.35, 0, 255)
berry_arr[:, :, 1] = np.clip(berry_arr[:, :, 1] * 0.22 + 25 * 0.35, 0, 255)
berry_arr[:, :, 2] = np.clip(berry_arr[:, :, 2] * 0.58 + 110 * 0.35, 0, 255)
berry_img = Image.fromarray(berry_arr.astype(np.uint8), mode='RGBA')
berry_img.putalpha(alpha_latte)
berry_img.save('public/drink-smoothie-berry-blend.webp', 'WEBP', quality=95)
print("Saved drink-smoothie-berry-blend.webp")

# 6. Tropical Sunrise Smoothie: Gradient sunrise - golden peach/mango on top, strawberry red on bottom
sunrise_arr = np.array(chicha).astype(float)
grad = 1.0 / (1.0 + np.exp(-(y_coords - 0.48) * 10.0))
top_r, top_g, top_b = 245, 158, 11
bot_r, bot_g, bot_b = 225, 29, 72

target_r = top_r * (1.0 - grad[:, :, 0]) + bot_r * grad[:, :, 0]
target_g = top_g * (1.0 - grad[:, :, 0]) + bot_g * grad[:, :, 0]
target_b = top_b * (1.0 - grad[:, :, 0]) + bot_b * grad[:, :, 0]

sunrise_arr[:, :, 0] = np.clip(sunrise_arr[:, :, 0] * 0.4 + target_r * 0.6, 0, 255)
sunrise_arr[:, :, 1] = np.clip(sunrise_arr[:, :, 1] * 0.4 + target_g * 0.6, 0, 255)
sunrise_arr[:, :, 2] = np.clip(sunrise_arr[:, :, 2] * 0.4 + target_b * 0.6, 0, 255)
sunrise_img = Image.fromarray(sunrise_arr.astype(np.uint8), mode='RGBA')
sunrise_img.putalpha(alpha_latte)
sunrise_img.save('public/drink-smoothie-tropical-sunrise.webp', 'WEBP', quality=95)
print("Saved drink-smoothie-tropical-sunrise.webp")

# 7. Decaf Coffee: Classic smooth iced brew with slight warm chestnut hue
decaf_arr = np.array(cold_brew).astype(float)
decaf_arr[:, :, 0] = np.clip(decaf_arr[:, :, 0] * 1.05 + 10, 0, 255)
decaf_arr[:, :, 1] = np.clip(decaf_arr[:, :, 1] * 0.95 + 6, 0, 255)
decaf_arr[:, :, 2] = np.clip(decaf_arr[:, :, 2] * 0.85, 0, 255)
decaf_img = Image.fromarray(decaf_arr.astype(np.uint8), mode='RGBA')
decaf_img.putalpha(alpha_cold_brew)
decaf_img.save('public/drink-iced-decaf.webp', 'WEBP', quality=95)
print("Saved drink-iced-decaf.webp")

# 8. Red Eye: Drip coffee base with extra dark concentrated espresso shot floating on top
redeye_arr = np.array(cold_brew).astype(float)
dark_top = 1.0 / (1.0 + np.exp((y_coords[:, :, 0] - 0.35) * 12.0))
redeye_arr[:, :, 0] = np.clip(redeye_arr[:, :, 0] * (1.0 - dark_top * 0.22), 0, 255)
redeye_arr[:, :, 1] = np.clip(redeye_arr[:, :, 1] * (1.0 - dark_top * 0.25), 0, 255)
redeye_arr[:, :, 2] = np.clip(redeye_arr[:, :, 2] * (1.0 - dark_top * 0.28), 0, 255)
redeye_img = Image.fromarray(redeye_arr.astype(np.uint8), mode='RGBA')
redeye_img.putalpha(alpha_cold_brew)
redeye_img.save('public/drink-iced-red-eye.webp', 'WEBP', quality=95)
print("Saved drink-iced-red-eye.webp")

# 9. Hot/Iced Tea: Clear radiant golden amber brewed loose-leaf tea with ice cubes
tea_arr = np.array(cold_brew).astype(float)
tea_arr[:, :, 0] = np.clip(tea_arr[:, :, 0] * 1.25 + 35, 0, 255)
tea_arr[:, :, 1] = np.clip(tea_arr[:, :, 1] * 1.1 + 25, 0, 255)
tea_arr[:, :, 2] = np.clip(tea_arr[:, :, 2] * 0.45 + 5, 0, 255)
tea_img = Image.fromarray(tea_arr.astype(np.uint8), mode='RGBA')
tea_img.putalpha(alpha_cold_brew)
tea_img.save('public/drink-tea.webp', 'WEBP', quality=95)
print("Saved drink-tea.webp")
