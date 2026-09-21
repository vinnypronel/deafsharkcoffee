import rembg
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

session = rembg.new_session('u2netp')
cb_raw = Image.open('public/food-croissant-bagel.jpg').convert('RGB')
# Crop just the croissant bounding area
w, h = cb_raw.size
# Croissant is within left 60% and full height
croiss_area = cb_raw.crop((0, 0, int(w * 0.62), h))
croiss_cut = rembg.remove(croiss_area, session=session)

# Let's save and inspect
croiss_cut.save('public/test-whole-croissant.png')
print("Saved test-whole-croissant.png")
