import os
from PIL import Image, ImageOps

# Process all food images into 800x800 square images with consistent framing
food_files = [
    'public/chicken-pesto-centered.jpg',
    'public/food-shark-cubano.jpg',
    'public/food-chicken-sandwich.jpg',
    'public/food-emilia.jpg',
    'public/food-turkey-pesto.jpg',
    'public/food-la-toscana.jpg',
    'public/food-artisan-breakfast.jpg',
    'public/food-breakfast-croissant.jpg',
    'public/food-maple-waffle.jpg',
    'public/food-cachapa.jpg',
    'public/food-tequenos.jpg',
    'public/food-cachitos.jpg',
    'public/food-fries.jpg',
]

for filepath in food_files:
    if not os.path.exists(filepath):
        continue
    try:
        img = Image.open(filepath).convert('RGB')
        # Center-crop to 1:1 aspect ratio and resize to 800x800
        w, h = img.size
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        cropped = img.crop((left, top, right, bottom))
        resized = cropped.resize((800, 800), Image.Resampling.LANCZOS)
        resized.save(filepath, quality=92)
        print(f"Standardized {filepath} to 800x800")
    except Exception as e:
        print(f"Error on {filepath}: {e}")
