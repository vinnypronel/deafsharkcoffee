from PIL import Image, ImageFilter, ImageDraw
import numpy as np

def create_pure_porcelain_plate(size=(1024, 1024)):
    w, h = size
    # 1. Background studio floor (#DFDFDF)
    bg = Image.new('RGBA', size, (222, 222, 222, 255))
    
    # 2. Outer plate drop shadow
    shadow = Image.new('RGBA', size, (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    center = 512
    r_plate = 420
    s_draw.ellipse(
        (center - r_plate - 4, center - r_plate + 14, center + r_plate + 4, center + r_plate + 38),
        fill=(0, 0, 0, 48)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(bg, shadow)
    
    # 3. Pure porcelain body (clean solid white disc with soft edge anti-aliasing)
    plate = Image.new('RGBA', size, (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(plate)
    p_draw.ellipse(
        (center - r_plate, center - r_plate, center + r_plate, center + r_plate),
        fill=(254, 254, 254, 255)
    )
    
    # Subtle inner bevel/lip (barely perceptible highlight at top, soft shadow at bottom)
    rim_highlight = Image.new('RGBA', size, (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(rim_highlight)
    r_draw.ellipse(
        (center - r_plate + 2, center - r_plate + 2, center + r_plate - 2, center + r_plate - 2),
        outline=(255, 255, 255, 180),
        width=4
    )
    
    plate = Image.alpha_composite(plate, rim_highlight)
    canvas = Image.alpha_composite(canvas, plate)
    return canvas

plate_canvas = create_pure_porcelain_plate()
plate_canvas.convert('RGB').save('public/plate-porcelain.jpg', quality=98)
print("Saved plate-porcelain.jpg")
