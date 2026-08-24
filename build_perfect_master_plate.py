from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# Load shark cubano & turkey pesto
cubano = Image.open('public/food-shark-cubano.jpg').convert('RGB')
w, h = cubano.size

# Rotate cubano top half across the circle
# The top 300px of cubano is 100% clean white plate on clean grey background
top_part = cubano.crop((0, 0, w, 400))

plate_rot0 = Image.new('RGB', (w, h), (218, 218, 218))
plate_rot0.paste(top_part, (0, 0))

# 180 deg
top_flip = top_part.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
plate_rot0.paste(top_flip, (0, h - 400))

# 90 deg
top_rot90 = top_part.transpose(Image.Transpose.ROTATE_90)
plate_rot0.paste(top_rot90, (0, 0))

# 270 deg
top_rot270 = top_part.transpose(Image.Transpose.ROTATE_270)
plate_rot0.paste(top_rot270, (w - 400, 0))

# In center (basin): fill with smooth pure plate ceramic #FAFAFA
basin_mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(basin_mask)
draw.ellipse((512 - 340, 512 - 340, 512 + 340, 512 + 340), fill=255)
basin_mask = basin_mask.filter(ImageFilter.GaussianBlur(14))

basin_color = Image.new('RGB', (w, h), (250, 250, 250))
perfect_plate = Image.composite(basin_color, plate_rot0, basin_mask)

# Save
perfect_plate.save('public/plate-master-perfect.jpg', quality=98)
print("Saved plate-master-perfect.jpg")
