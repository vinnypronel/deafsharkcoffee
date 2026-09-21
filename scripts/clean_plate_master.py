from PIL import Image, ImageFilter, ImageDraw

pesto = Image.open('public/food-turkey-pesto.jpg').convert('RGB')
w, h = pesto.size

# Sample clean plate texture
plate_patch = pesto.crop((450, 160, 574, 284))
basin_texture = plate_patch.resize((740, 740), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(15))

basin_mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(basin_mask)
draw.ellipse((512 - 360, 512 - 360, 512 + 360, 512 + 360), fill=255)
basin_mask = basin_mask.filter(ImageFilter.GaussianBlur(12))

plate_empty = pesto.copy()
plate_empty.paste(basin_texture, (512 - 370, 512 - 370), Image.new('L', (740, 740), 255))
genuine_plate = Image.composite(plate_empty, pesto, basin_mask)

# Clean the bottom green dot by pasting the clean top rim over the bottom rim
top_rim_patch = pesto.crop((400, 90, 624, 180))
bottom_patch = top_rim_patch.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
genuine_plate.paste(bottom_patch, (400, 840))

# Smooth the patch seam
patch_mask = Image.new('L', (w, h), 0)
p_draw = ImageDraw.Draw(patch_mask)
p_draw.rectangle((390, 830, 634, 930), fill=255)
patch_mask = patch_mask.filter(ImageFilter.GaussianBlur(8))

genuine_plate = Image.composite(genuine_plate.filter(ImageFilter.GaussianBlur(1)), genuine_plate, patch_mask)
genuine_plate.save('public/plate-master.jpg', quality=98)
print("Saved plate-master.jpg")
