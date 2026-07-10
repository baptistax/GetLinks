from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
ICONS_DIR = ROOT / "icons"
SOURCE_PATH = ICONS_DIR / "icon-source.png"
SIZES = (16, 32, 48, 128)


def prepare_source() -> Image.Image:
    source = Image.open(SOURCE_PATH).convert("RGBA")
    side = min(source.size)
    left = (source.width - side) // 2
    top = (source.height - side) // 2
    source = source.crop((left, top, left + side, top + side))

    mask = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (0, 0, side - 1, side - 1),
        radius=round(side * 0.18),
        fill=255,
    )
    source.putalpha(mask)
    return source


def generate_icon(source: Image.Image, size: int) -> None:
    icon = source.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(ICONS_DIR / f"icon{size}.png", optimize=True)


if __name__ == "__main__":
    if not SOURCE_PATH.exists():
        raise SystemExit(f"Missing icon source: {SOURCE_PATH}")

    ICONS_DIR.mkdir(exist_ok=True)
    prepared_source = prepare_source()
    for icon_size in SIZES:
        generate_icon(prepared_source, icon_size)

    print("GetLinks icons generated successfully.")
