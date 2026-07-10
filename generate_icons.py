import os
from PIL import Image, ImageDraw, ImageFont

def generate_icon(size, output_path):
    # Create a gradient background
    img = Image.new('RGB', (size, size), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    
    # Draw a simple stylized 'G' and 'L' for getLinks
    # Since we can't guarantee font, we'll draw simple geometric shapes
    # representing a chain link.
    padding = size * 0.2
    thickness = max(1, int(size * 0.1))
    
    # Draw top left oval
    draw.ellipse(
        [padding, padding, size - padding, size - padding], 
        outline=(59, 130, 246), # primary color
        width=thickness
    )
    
    img.save(output_path)

if __name__ == "__main__":
    icons_dir = os.path.join(os.path.dirname(__file__), "icons")
    os.makedirs(icons_dir, exist_ok=True)
    
    for size in [16, 32, 48, 128]:
        generate_icon(size, os.path.join(icons_dir, f"icon{size}.png"))
    
    print("Icons generated successfully!")
