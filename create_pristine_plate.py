from PIL import Image, ImageDraw, ImageFilter
import numpy as np

# Load food-turkey-pesto.jpg
pesto = Image.open('public/food-turkey-pesto.jpg').convert('RGB')
w, h = pesto.size

# We can take the top-half of the rim (which is 100% clean) and mirror/rotate to make a 100% pristine round ceramic plate!
# Center is (512, 512)
# Let's create an empty canvas of the same background color:
bg_color = (218, 218, 218) # Soft studio gray
clean_plate = Image.new('RGB', (w, h), bg_color)

# Outer plate ellipse from turkey-pesto:
# Radius is 415px
# The basin is radius 360px
# Let's take the circular plate area from turkey-pesto and mask the center:
plate_mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(plate_mask)
draw.ellipse((512 - 425, 512 - 425, 512 + 425, 512 + 425), fill=255)
plate_mask = plate_mask.filter(ImageFilter.GaussianBlur(3))

# Composite pesto plate onto clean background:
clean_plate = Image.composite(pesto, clean_plate, plate_mask)

# Now inpaint/fill the basin center with the clean off-white plate color (252, 252, 252):
basin_mask = Image.new('L', (w, h), 0)
b_draw = ImageDraw.Draw(basin_mask)
b_draw.ellipse((512 - 350, 512 - 350, 512 + 350, 512 + 350), fill=255)
basin_mask = basin_mask.filter(ImageFilter.GaussianBlur(8))

basin_color = Image.new('RGB', (w, h), (252, 252, 252))
clean_plate = Image.composite(basin_color, clean_plate, basin_mask)

clean_plate.save('public/plate-studio-empty.jpg', quality=98)
print("Saved pristine plate-studio-empty.jpg")
