from PIL import Image, ImageDraw, ImageFilter
import numpy as np

# Load food-cachapa.jpg
cachapa = Image.open('public/food-cachapa.jpg').convert('RGB')
w, h = cachapa.size

# In food-cachapa.jpg:
# Center is (512, 512)
# The outer plate rim radius is ~418px.
# The inner flat plate area radius is ~365px.
# The background outside the plate is a soft neutral grey gradient (#E5E5E5).
# The plate rim is pure white (#FFFFFF to #F8F8F8) with realistic studio lighting and soft drop shadow.

# Let's create an empty plate canvas by taking the real plate rim and background from cachapa,
# and filling the inner basin with the clean ceramic white tone (#FAFAFA) with subtle realistic gradient:
empty_plate = cachapa.copy()
draw = ImageDraw.Draw(empty_plate)

# The plate basin is a circle centered at (512, 512) with radius 360
# Let's fill the inner basin with a smooth radial gradient matching the plate ceramic:
basin = Image.new('RGB', (w, h), (250, 250, 250))
# Let's create a smooth mask for the basin
basin_mask = Image.new('L', (w, h), 0)
b_draw = ImageDraw.Draw(basin_mask)
b_draw.ellipse((512 - 365, 512 - 365, 512 + 365, 512 + 365), fill=255)
basin_mask = basin_mask.filter(ImageFilter.GaussianBlur(6))

empty_plate = Image.composite(basin, empty_plate, basin_mask)
empty_plate.save('public/plate-studio-empty.jpg', quality=98)
print("Saved plate-studio-empty.jpg successfully!")
