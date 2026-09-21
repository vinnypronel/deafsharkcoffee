from PIL import Image, ImageFilter, ImageDraw
import numpy as np

# Load cachapa
cachapa = Image.open('public/food-cachapa.jpg').convert('RGB')
w, h = cachapa.size

# The plate is centered at (512, 512)
# Radius of outer rim = 438px
# Radius of inner basin = 370px
# Background is uniform studio grey (#ECECEC)

# Let's create the clean plate:
# 1. Start with the smooth studio grey background from the edges of cachapa
clean_bg = Image.new('RGB', (w, h), (236, 236, 236))

# 2. Extract the rim from cachapa using top/bottom rotation
# The top 300px has pristine rim and background:
# We can sample the plate rim across 360 degrees:
plate_mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(plate_mask)
draw.ellipse((512 - 438, 512 - 438, 512 + 438, 512 + 438), fill=255)
draw.ellipse((512 - 370, 512 - 370, 512 + 370, 512 + 370), fill=0)
plate_mask = plate_mask.filter(ImageFilter.GaussianBlur(3))

# Create full 360 rim from top 300px
rim_source = cachapa.crop((0, 0, w, 320))
full_rim = Image.new('RGB', (w, h), (236, 236, 236))
# Paste top
full_rim.paste(rim_source, (0, 0))
# Paste bottom (flip vertical)
full_rim.paste(rim_source.transpose(Image.Transpose.FLIP_TOP_BOTTOM), (0, h - 320))
# Paste left & right (rotate 90 and flip)
side_rim = rim_source.transpose(Image.Transpose.ROTATE_90)
full_rim.paste(side_rim, (0, 0))
full_rim.paste(side_rim.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (w - 320, 0))

# Smooth the rim
full_rim = full_rim.filter(ImageFilter.GaussianBlur(1))

# Inner basin: clean white ceramic #FAFAFA with subtle vignette
basin_canvas = Image.new('RGB', (w, h), (252, 252, 252))
basin_mask = Image.new('L', (w, h), 0)
b_draw = ImageDraw.Draw(basin_mask)
b_draw.ellipse((512 - 378, 512 - 378, 512 + 378, 512 + 378), fill=255)
basin_mask = basin_mask.filter(ImageFilter.GaussianBlur(10))

plate_final = Image.composite(basin_canvas, full_rim, basin_mask)

# Outer edge mask onto studio background
outer_mask = Image.new('L', (w, h), 0)
o_draw = ImageDraw.Draw(outer_mask)
o_draw.ellipse((512 - 438, 512 - 438, 512 + 438, 512 + 438), fill=255)
outer_mask = outer_mask.filter(ImageFilter.GaussianBlur(4))

plate_template = Image.composite(plate_final, clean_bg, outer_mask)
plate_template.save('public/plate-template.jpg', quality=98)
print("Saved perfect plate-template.jpg")
