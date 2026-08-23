"""Generate preview images and an immutable WebP DZI pyramid for the map."""

from __future__ import annotations

import argparse
import math
import shutil
from pathlib import Path

from PIL import Image


EXPECTED_SIZE = (8091, 5669)
TILE_SIZE = 512
OVERLAP = 1


def save_webp(image: Image.Image, path: Path, quality: int) -> None:
    image.save(path, "WEBP", quality=quality, method=6)


def generate_tiles(source: Image.Image, output_base: Path, quality: int) -> int:
    max_level = math.ceil(math.log2(max(source.size)))
    tile_root = output_base.parent / f"{output_base.name}_files"
    level_image = source.copy()
    total_tiles = 0

    for level in range(max_level, -1, -1):
        level_dir = tile_root / str(level)
        level_dir.mkdir(parents=True, exist_ok=True)
        width, height = level_image.size
        columns = math.ceil(width / TILE_SIZE)
        rows = math.ceil(height / TILE_SIZE)

        for row in range(rows):
            for column in range(columns):
                left = column * TILE_SIZE - (OVERLAP if column else 0)
                top = row * TILE_SIZE - (OVERLAP if row else 0)
                right = min(width, (column + 1) * TILE_SIZE + (OVERLAP if column < columns - 1 else 0))
                bottom = min(height, (row + 1) * TILE_SIZE + (OVERLAP if row < rows - 1 else 0))
                tile = level_image.crop((left, top, right, bottom))
                save_webp(tile, level_dir / f"{column}_{row}.webp", quality)
                total_tiles += 1

        print(f"level {level}: {width}x{height}, {columns * rows} tiles", flush=True)
        if level:
            level_image = level_image.resize(
                (math.ceil(width / 2), math.ceil(height / 2)),
                Image.Resampling.LANCZOS,
            )

    descriptor = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" TileSize="{TILE_SIZE}" '
        f'Overlap="{OVERLAP}" Format="webp">\n'
        f'  <Size Width="{EXPECTED_SIZE[0]}" Height="{EXPECTED_SIZE[1]}"/>\n'
        '</Image>\n'
    )
    output_base.with_suffix(".dzi").write_text(descriptor, encoding="utf-8")
    return total_tiles


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--quality", type=int, default=88)
    args = parser.parse_args()
    if not args.version.startswith("v") or not args.version[1:].isalnum():
        raise SystemExit("Version must look like v3")

    workspace = Path(__file__).resolve().parents[1]
    map_dir = workspace / "assets" / "map"
    source_path = map_dir / "huanglian-map.jpg"
    tiles_root = (map_dir / "tiles").resolve()
    output_dir = (tiles_root / args.version).resolve()
    if tiles_root not in output_dir.parents:
        raise SystemExit("Refusing to generate outside assets/map/tiles")
    if output_dir.exists():
        raise SystemExit(f"Tile version already exists: {output_dir}")

    with Image.open(source_path) as opened:
        source = opened.convert("RGB")
    if source.size != EXPECTED_SIZE:
        raise SystemExit(f"Unexpected map dimensions: {source.size}; expected {EXPECTED_SIZE}")

    output_dir.mkdir(parents=True)
    try:
        save_webp(source.resize((2048, 1435), Image.Resampling.LANCZOS), map_dir / "huanglian-map-preview.webp", 88)
        save_webp(source.resize((1024, 717), Image.Resampling.LANCZOS), map_dir / "huanglian-map-placeholder.webp", 82)
        tile_count = generate_tiles(source, output_dir / "huanglian", args.quality)
    except Exception:
        if output_dir.is_relative_to(tiles_root):
            shutil.rmtree(output_dir, ignore_errors=True)
        raise

    print(f"generated {tile_count} tiles in {output_dir}")


if __name__ == "__main__":
    main()
