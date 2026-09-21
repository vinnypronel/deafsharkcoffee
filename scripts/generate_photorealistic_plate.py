from PIL import Image, ImageFilter, ImageDraw
import numpy as np

def create_master_photorealistic_plate(size=(1024, 1024)):
    w, h = size
    # 1. Background studio floor: smooth neutral grey gradient (#DCDCDC to #D4D4D4)
    bg = Image.new('RGBA', size, (218, 218, 218, 255))
    
    # 2. Outer plate drop shadow (cast to bottom/bottom-right)
    shadow = Image.new('RGBA', size, (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    center = 512
    r_plate = 422
    s_draw.ellipse(
        (center - r_plate - 4, center - r_plate + 18, center + r_plate + 4, center + r_plate + 44),
        fill=(0, 0, 0, 65)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    canvas = Image.alpha_composite(bg, shadow)
    
    # 3. Plate ceramic rim & body
    plate = Image.new('RGBA', size, (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(plate)
    
    # Outer ceramic lip
    p_draw.ellipse(
        (center - r_plate, center - r_plate, center + r_plate, center + r_plate),
        fill=(255, 255, 255, 255)
    )
    
    # Inner basin
    r_basin = 372
    p_draw.ellipse(
        (center - r_basin, center - r_basin + 2, center + r_basin, center + r_basin + 2),
        fill=(248, 248, 248, 255)
    )
    # Inner basin soft gradient ring
    ring_mask = Image.new('RGBA', size, (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(ring_mask)
    r_draw.ellipse(
        (center - r_basin - 4, center - r_basin - 2, center + r_basin + 4, center + r_basin + 6),
        outline=(220, 220, 220, 160),
        width=8
    )
    ring_mask = ring_mask.filter(ImageFilter.GaussianBlur(6))
    
    plate = Image.alpha_composite(plate, ring_mask)
    canvas = Image.alpha_composite(canvas, plate)
    return canvas

master_plate = create_master_photorealistic_plate()
master_plate.convert('RGB').save('public/plate-master-clean.jpg', quality=98)
print("Saved plate-master-clean.jpg")
