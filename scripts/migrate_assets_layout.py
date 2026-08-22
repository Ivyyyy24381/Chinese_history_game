#!/usr/bin/env python3
"""Migrate public/assets/ to the per-storyline layout (see docs/ASSET_RESTRUCTURE_PLAN.md).

    python scripts/migrate_assets_layout.py           # dry-run: print the plan
    python scripts/migrate_assets_layout.py --apply   # git mv + rewrite refs + validate
    python scripts/migrate_assets_layout.py --check   # validation scan only

Layout:  /assets/<charId>/{hero,npcs,events,maps,props,bgm}/...  +  /assets/shared/...
Safe to re-run: already-moved files are skipped.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"

DANTE_NPCS = {
    "boccaccio", "beatrice_young", "beatrice_paradiso", "cavalcanti", "forese",
    "boniface", "corso_donati", "henry_vii", "cangrande_young", "guido_novello",
    "pietro_adult", "antonia_nun", "scribe", "friar_messenger",
}
DANTE_PROPS = {
    "sentenza_scroll", "amnistia_scroll", "epistole_letters", "aeneid_codex",
    "spindle_wool", "laurel_crown", "florin_coin", "mosaic_fragment",
    "moldy_manuscript", "lectern_codex",
}
DUFU_BGM = {"youth", "changan", "anshi", "chengdu", "piaobo"}
SHARED_TOP = {"home_background.png", "中国历史游.png", "李白.png", "杜甫.png", "苏轼.png"}

# Text files whose asset references get rewritten
REWRITE_GLOBS = ["src/**/*.jsx", "src/**/*.js", "src/**/*.json",
                 "scripts/*.csv", "docs/*.md", "index.html"]

# Literal code/glob replacements (old, new) — applied verbatim if present
CODE_EDITS = [
    ("src/App.jsx",
     "asset(`/assets/audio/bgm/${stageId}.mp3`)",
     'asset(`/assets/${character?.id || "dufu"}/bgm/${stageId}.mp3`)'),
    ("src/components/CharacterSelect.jsx",
     "asset(`/assets/${char.name}.png`)",
     "asset(`/assets/shared/${char.name}.png`)"),
    ("src/components/SceneEditor.jsx",
     '"/public/assets/events/**/*.{png,jpg,jpeg,webp}"',
     '"/public/assets/*/events/**/*.{png,jpg,jpeg,webp}"'),
    ("src/components/SceneEditor.jsx",
     'import.meta.glob("/public/assets/characters/**/*.{png,jpg,jpeg,webp}"',
     'import.meta.glob("/public/assets/*/{hero,npcs}/**/*.{png,jpg,jpeg,webp}"'),
    ("src/components/SceneEditor.jsx",
     'import.meta.glob("/public/assets/props/**/*.{png,jpg,jpeg,webp}"',
     'import.meta.glob("/public/assets/*/props/**/*.{png,jpg,jpeg,webp}"'),
    ("src/components/SceneEditor.jsx",
     'import.meta.glob("/public/assets/items/**/*.{png,jpg,jpeg,webp}"',
     'import.meta.glob("/public/assets/shared/items/**/*.{png,jpg,jpeg,webp}"'),
    ("src/components/SceneEditor.jsx",
     '"/assets/characters/npcs/"', '"/assets/dufu/npcs/"'),
    ("src/data/dufuPoses.js",
     "`/assets/characters/dufu/${pose}.png`", "`/assets/dufu/hero/${pose}.png`"),
]


def event_line(dirname: str) -> str:
    m = re.match(r"(\d+)_", dirname)
    return "dufu" if m and int(m.group(1)) < 1000 else "dante"


def build_moves():
    """Return list of (old_rel, new_rel) under public/assets, POSIX style."""
    moves = []

    def add(old: Path, new_rel: str):
        moves.append((old.relative_to(ASSETS).as_posix(), new_rel))

    d = ASSETS / "characters" / "dufu"
    if d.exists():
        for f in d.rglob("*.*"):
            add(f, "dufu/hero/" + f.relative_to(d).as_posix())
    d = ASSETS / "characters" / "dante"
    if d.exists():
        for f in d.rglob("*.*"):
            add(f, "dante/hero/" + f.relative_to(d).as_posix())
    d = ASSETS / "characters" / "npcs"
    if d.exists():
        for f in d.iterdir():
            if f.is_file():
                line = "dante" if f.stem in DANTE_NPCS else "dufu"
                add(f, f"{line}/npcs/{f.name}")
    d = ASSETS / "events"
    if d.exists():
        for ev in sorted(d.iterdir()):
            if ev.is_dir():
                line = event_line(ev.name)
                for f in ev.rglob("*.*"):
                    add(f, f"{line}/events/{ev.name}/" + f.relative_to(ev).as_posix())
            elif ev.is_file():
                add(ev, "dufu/events/" + ev.name)  # stray files default dufu
    d = ASSETS / "maps"
    if d.exists():
        for f in d.iterdir():
            if not f.is_file():
                continue
            m = re.match(r"route_(\d+)", f.stem)
            if f.stem.startswith("dante") or (m and int(m.group(1)) >= 1000):
                add(f, f"dante/maps/{f.name}")
            else:
                add(f, f"dufu/maps/{f.name}")
    d = ASSETS / "audio" / "bgm"
    if d.exists():
        for f in d.iterdir():
            if f.is_file():
                dest = "dufu/bgm" if f.stem in DUFU_BGM else "shared/bgm"
                add(f, f"{dest}/{f.name}")
    d = ASSETS / "props"
    if d.exists():
        for f in d.iterdir():
            if f.is_file():
                line = "dante" if f.stem in DANTE_PROPS else "dufu"
                add(f, f"{line}/props/{f.name}")
    d = ASSETS / "items"
    if d.exists():
        for f in d.rglob("*.*"):
            add(f, "shared/items/" + f.relative_to(d).as_posix())
    for name in SHARED_TOP:
        f = ASSETS / name
        if f.exists():
            add(f, f"shared/{name}")
    return moves


def git_mv(old_rel, new_rel):
    src = ASSETS / old_rel
    dst = ASSETS / new_rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["git", "mv", str(src), str(dst)], cwd=ROOT,
                       capture_output=True, text=True)
    if r.returncode != 0:  # untracked file etc. — plain move, git add later
        src.rename(dst)


def rewrite_refs(moves, apply):
    # longest-old-path-first so nested paths never get half-replaced
    url_map = {}
    for old, new in moves:
        url_map["/assets/" + old] = "/assets/" + new
        url_map["public/assets/" + old] = "public/assets/" + new
    keys = sorted(url_map, key=len, reverse=True)
    changed = []
    for pattern in REWRITE_GLOBS:
        for f in ROOT.glob(pattern):
            if not f.is_file() or f.name == Path(__file__).name:
                continue
            try:
                text = f.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            orig = text
            for k in keys:
                if k in text:
                    text = text.replace(k, url_map[k])
            for path, old_s, new_s in CODE_EDITS:
                if f == ROOT / path and old_s in text:
                    text = text.replace(old_s, new_s)
            if text != orig:
                changed.append(f.relative_to(ROOT).as_posix())
                if apply:
                    f.write_text(text, encoding="utf-8")
    return changed


def validate():
    """Scan literal /assets/... references and check the files exist."""
    ref_re = re.compile(r"""["'`(](/assets/[^"'`)\s?#$]+?\.(?:png|jpg|jpeg|webp|mp3))""")
    broken = {}
    for pattern in REWRITE_GLOBS:
        for f in ROOT.glob(pattern):
            if not f.is_file():
                continue
            try:
                text = f.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for m in ref_re.finditer(text):
                url = m.group(1)
                if "${" in url or "..." in url or "<" in url:
                    continue  # dynamic template / docs placeholder
                if not (ROOT / "public" / url.lstrip("/")).exists():
                    broken.setdefault(url, []).append(f.relative_to(ROOT).as_posix())
    return broken


def find_npc_fallback_callsites():
    sp = ROOT / "src" / "components" / "ScenePlayer.jsx"
    if not sp.exists():
        return []
    return [f"  ScenePlayer.jsx:{i}: {l.strip()}"
            for i, l in enumerate(sp.read_text(encoding="utf-8").splitlines(), 1)
            if "npcPortraitPath" in l]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="actually move files & rewrite refs")
    ap.add_argument("--check", action="store_true", help="validation scan only")
    args = ap.parse_args()

    if args.check:
        broken = validate()
        for url, files in sorted(broken.items()):
            print(f"BROKEN {url}   <- {', '.join(files)}")
        print(f"[check] {len(broken)} broken asset references")
        sys.exit(1 if broken else 0)

    moves = build_moves()
    print(f"[plan] {len(moves)} files to move")
    for old, new in moves:
        print(f"  {old}  ->  {new}")

    if args.apply:
        for old, new in moves:
            git_mv(old, new)
        print(f"[apply] moved {len(moves)} files")

    changed = rewrite_refs(moves, apply=args.apply)
    verb = "rewrote" if args.apply else "would rewrite"
    print(f"[refs] {verb} {len(changed)} files:")
    for c in changed:
        print(f"  {c}")

    if args.apply:
        # sweep leftovers of old dirs (empty dirs are ignored by git anyway)
        for leftover in ["characters", "events", "maps", "audio", "props", "items"]:
            d = ASSETS / leftover
            if d.exists() and not any(d.rglob("*.*")):
                print(f"[note] {d.relative_to(ROOT)} is now empty — remove it manually")
        broken = validate()
        for url, files in sorted(broken.items()):
            print(f"BROKEN {url}   <- {', '.join(files)}")
        print(f"[validate] {len(broken)} broken asset references")

    print()
    print("TODO (manual, one spot): make npcPortraitPath charId-aware —")
    print('  function npcPortraitPath(speakerId, eventId) {')
    print('    const line = parseInt(eventId, 10) < 1000 ? "dufu" : "dante";')
    print("    return `/assets/${line}/npcs/${speakerId}.png`;")
    print("  }")
    print("call sites:")
    for line in find_npc_fallback_callsites():
        print(line)
    if not args.apply and not args.check:
        print("\n(dry-run only — nothing was changed. Re-run with --apply.)")


if __name__ == "__main__":
    main()
