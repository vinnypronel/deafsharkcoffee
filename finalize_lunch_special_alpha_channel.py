import subprocess
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Reset original lunch special from git
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = lunch.size

# 2. Extract chips plate foreground
chips_fg = lunch.crop((450, 580, 950, 880))

# 3. Sample exact backdrop color at (x=800, y=100)
backdrop_color = lunch.getpixel((800, 100))

# Inpaint old can with exact backdrop
draw = ImageDraw.Draw(lunch)
draw.rectangle((695, 190, 935, 600), fill=backdrop_color)

# 4. Load Coke can
coke = Image.open('public/coke-isolated-true.png').convert('RGBA')
target_h = 422
target_w = int(target_h * coke.width / coke.height) # ~218px
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

# IMPORTANT: Get explicit Alpha channel as 8-bit mask!
alpha_mask = coke_resized.getchannel('A')

pos_x = 705
pos_y = 196

# 5. Soft contact shadow on table
shadow = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
s_draw.ellipse((pos_x - 10, pos_y + target_h - 18, pos_x + target_w + 10, pos_y + target_h + 18), fill=(0, 0, 0, 60))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))

lunch = Image.alpha_composite(lunch, shadow)

# 6. Paste Coke can using EXPLICIT alpha mask!
lunch.paste(coke_resized, (pos_x, pos_y), mask=alpha_mask)

# 7. Paste back chips foreground
lunch.paste(chips_fg, (450, 580))

# Save
lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved 100% transparent Coke on Lunch Special!")
