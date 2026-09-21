from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# 1. Load clean isolated Coke can
coke = Image.open('public/test-coke-clean.png').convert('RGBA')

# 2. Reset and load original lunch special
import subprocess
subprocess.run(["git", "checkout", "--", "public/food-lunch-special.jpg"], check=True)
orig_lunch = Image.open('public/food-lunch-special.jpg').convert('RGBA')
lw, lh = orig_lunch.size

# Extract the chips plate foreground (y: 570 to 850, x: 450 to 950) so chips stay in front of the can!
chips_fg = orig_lunch.crop((450, 570, 950, 850))

# Clean out the old blue can with white / background gradient
draw = ImageDraw.Draw(orig_lunch)
draw.rectangle((700, 200, 940, 600), fill=(255, 255, 255, 255))

# Sizing & Position of Coke can
target_w = 240
target_h = int(target_w * coke.height / coke.width)
coke_resized = coke.resize((target_w, target_h), Image.Resampling.LANCZOS)

pos_x = 708
pos_y = 202

# Paste Coke can
orig_lunch.paste(coke_resized, (pos_x, pos_y), mask=coke_resized)

# Paste back the chips foreground so the chips naturally overlap the bottom of the can!
orig_lunch.paste(chips_fg, (450, 570))

# Save
orig_lunch.convert('RGB').save('public/food-lunch-special.jpg', 'JPEG', quality=98)
print("Saved flawless lunch special with Coke!")
