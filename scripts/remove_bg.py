#!/usr/bin/env python3
"""
Batch-remove backgrounds from character portraits using rembg (u2net).

Usage:
    # Default: process all PNGs under public/assets/characters/npcs/, in-place
    python scripts/remove_bg.py

    # Process a specific folder
    python scripts/remove_bg.py --dir public/assets/characters/dufu

    # Output to a separate folder (don't overwrite)
    python scripts/remove_bg.py --out public/assets/characters/npcs_cut

    # Skip files that are already transparent (alpha channel < 255 anywhere)
    python scripts/remove_bg.py --skip-existing

    # Use a different model (default u2net; u2netp is faster/lighter,
    # isnet-anime works well on illustrated characters)
    python scripts/remove_bg.py --model isnet-anime

First run downloads the model (~170MB for u2net) to ~/.u2net/.

Requires: pip install rembg
"""
import argparse
import sys
from pathlib import Path


def is_already_transparent(path: Path) -> bool:
    """True if the PNG already has an alpha channel with at least one transparent pixel."""
    try:
        from PIL import Image
        img = Image.open(path)
        if img.mode != "RGBA":
            return False
        alpha = img.split()[-1]
        lo, hi = alpha.getextrema()
        return lo < 255  # at least one non-opaque pixel
    except Exception:
        return False


def main():
    p = argparse.ArgumentParser(description="Batch background removal for character portraits.")
    p.add_argument("--dir", default="public/assets/characters/npcs",
                   help="Input directory (relative to repo root or absolute)")
    p.add_argument("--out", default=None,
                   help="Output directory (default: in-place overwrite of --dir)")
    p.add_argument("--model", default="u2net",
                   choices=["u2net", "u2netp", "u2net_human_seg", "isnet-general-use", "isnet-anime"],
                   help="rembg model (isnet-anime good for illustrated characters)")
    p.add_argument("--skip-existing", action="store_true",
                   help="Skip files that already have transparency")
    p.add_argument("--ext", default="png", help="File extension to process (default: png)")
    p.add_argument("--recursive", "-r", action="store_true",
                   help="Recurse into subdirectories (preserves structure in --out)")
    args = p.parse_args()

    try:
        from rembg import new_session, remove
    except ImportError:
        print("ERROR: rembg not installed. Run:")
        print("    pip install rembg")
        sys.exit(1)

    root = Path(__file__).resolve().parent.parent
    in_dir = Path(args.dir)
    if not in_dir.is_absolute():
        in_dir = root / in_dir
    if not in_dir.is_dir():
        print(f"ERROR: input directory not found: {in_dir}")
        sys.exit(1)

    out_dir = Path(args.out) if args.out else in_dir
    if not out_dir.is_absolute():
        out_dir = root / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.recursive:
        files = sorted(in_dir.rglob(f"*.{args.ext}"))
    else:
        files = sorted(in_dir.glob(f"*.{args.ext}"))
    if not files:
        print(f"No .{args.ext} files in {in_dir}")
        return

    print(f"[rembg] model={args.model}  in={in_dir}  out={out_dir}  recursive={args.recursive}  files={len(files)}")
    session = new_session(args.model)

    ok, skipped, failed = 0, 0, 0
    for i, src in enumerate(files, 1):
        # Preserve subdirectory structure when recursive
        rel = src.relative_to(in_dir) if args.recursive else Path(src.name)
        dst = out_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if args.skip_existing and dst.exists() and is_already_transparent(dst):
            print(f"[{i:>2}/{len(files)}] SKIP (already transparent)  {src.name}")
            skipped += 1
            continue
        try:
            with open(src, "rb") as f:
                input_bytes = f.read()
            output_bytes = remove(input_bytes, session=session)
            with open(dst, "wb") as f:
                f.write(output_bytes)
            kb = len(output_bytes) // 1024
            print(f"[{i:>2}/{len(files)}] OK ({kb} KB)  {src.name}")
            ok += 1
        except Exception as e:
            print(f"[{i:>2}/{len(files)}] FAIL  {src.name}: {e}")
            failed += 1

    print(f"\n[done] ok={ok}  skipped={skipped}  failed={failed}  total={len(files)}")


if __name__ == "__main__":
    main()
