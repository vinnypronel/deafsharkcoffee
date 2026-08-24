from PIL import Image, ImageDraw, ImageFilter
import numpy as np

# Load turkey pesto
pesto = Image.open('public/food-turkey-pesto.jpg').convert('RGB')
w, h = pesto.size

# In turkey pesto, the outer background (outside radius 420) is clean studio grey #DADADA.
# The plate rim (radius 360 to 420) is pure clean photographed white ceramic.
# Let's clone the clean ceramic texture across the inner basin:
# Center is (512, 512)
# Let's sample a clean 100x100 patch of the plate from (x=512, y=190) which is pure plate ceramic:
plate_patch = pesto.crop((462, 160, 562, 260))
# Resize patch to cover the center basin (700x700)
basin_texture = plate_patch.resize((720, 720), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(15))

# Create smooth circular mask for the basin
basin_mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(basin_mask)
draw.ellipse((512 - 355, 512 - 355, 512 + 355, 512 + 355), fill=255)
basin_mask = basin_mask.filter(ImageFilter.GaussianBlur(12))

plate_empty = pesto.copy()
# Paste basin texture in center
plate_empty.paste(basin_texture, (512 - 360, 512 - 360), Image.new('L', (720, 720), 255))
# Blend with original plate using basin mask
genuine_plate = Image.composite(plate_empty, pesto, basin_mask)
genuine_plate.save('public/plate-genuine.jpg', quality=98)
print("Saved plate-genuine.jpg")
