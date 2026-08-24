from PIL import Image, ImageFilter, ImageDraw
import numpy as np

cachapa = Image.open('public/food-cachapa.jpg').convert('RGB')
w, h = cachapa.size

# In food-cachapa.jpg, the top 45% (y from 0 to 450) is 100% clean background and plate!
# Center is (512, 512)
top_half = cachapa.crop((0, 0, w, 512))
# Flip vertically to make bottom half
bottom_half = top_half.transpose(Image.Transpose.FLIP_TOP_BOTTOM)

# Combine top and bottom
empty_plate = Image.new('RGB', (w, h))
empty_plate.paste(top_half, (0, 0))
empty_plate.paste(bottom_half, (0, 512))

# Smooth the seam in the middle basin
seam_mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(seam_mask)
draw.rectangle((150, 480, 874, 544), fill=255)
seam_mask = seam_mask.filter(ImageFilter.GaussianBlur(15))

basin_fill = Image.new('RGB', (w, h), (252, 252, 252))
empty_plate = Image.composite(basin_fill, empty_plate, seam_mask)

empty_plate.save('public/plate-studio-empty.jpg', quality=98)
print("Saved perfect cachapa-based plate template.")
