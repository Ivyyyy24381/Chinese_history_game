#!/usr/bin/env python3
"""
Batch-generate game assets via ComfyUI HTTP API.

Reads `assets_manifest.csv`, queues each row to ComfyUI, waits for the result,
and writes the image to the target path under `public/assets/...`.

Usage:
    # 1. Start ComfyUI:  python main.py --listen 127.0.0.1 --port 8188
    # 2. Open ComfyUI in your browser, load your favorite txt2img workflow,
    #    then click "Save (API Format)" and save as `comfy_workflow.json` here.
    # 3. Run this script:
    #    python scripts/run_comfyui_batch.py --workflow scripts/comfy_workflow.json
    #
    # Optional flags:
    #    --only npc          # only NPC portraits (transparent PNGs)
    #    --only bg           # only backgrounds
    #    --filter 736        # only filenames containing "736"
    #    --skip-existing     # don't re-generate files that already exist
    #    --style "..."       # extra style suffix appended to every prompt
    #    --negative "..."    # negative prompt
    #    --seed 12345        # base seed (each row gets seed + index for reproducibility)
    #    --host 127.0.0.1:8188
"""
import argparse
import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

# ---- Style suffix appended to every prompt for visual consistency ------------
DEFAULT_STYLE_ZH = (
    "中国唐代水墨水彩画风, 半写实, 柔和笔触配工笔细节, "
    "唐代服饰与建筑严格考证, 电影感构图, 温暖暮色调, 柔光, "
    "无文字水印, 无现代元素, 高质量, 8k"
)
DEFAULT_NEG = (
    "text, watermark, signature, modern, anachronism, chibi, anime style, "
    "harsh contrast, oversaturation, blurry, low quality, deformed, extra fingers"
)
TRANSPARENT_TAIL = (
    ", 透明背景, transparent background, isolated character on alpha, no scenery, "
    "half-body portrait centered"
)


# ---- ComfyUI HTTP helpers ----------------------------------------------------
def post_prompt(host: str, workflow: dict, client_id: str) -> str:
    payload = {"prompt": workflow, "client_id": client_id}
    req = urllib.request.Request(
        f"http://{host}/prompt",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        body = json.loads(r.read())
    return body["prompt_id"]


def get_history(host: str, prompt_id: str) -> dict:
    with urllib.request.urlopen(f"http://{host}/history/{prompt_id}") as r:
        return json.loads(r.read())


def get_image(host: str, filename: str, subfolder: str, image_type: str) -> bytes:
    params = urllib.parse.urlencode(
        {"filename": filename, "subfolder": subfolder, "type": image_type}
    )
    with urllib.request.urlopen(f"http://{host}/view?{params}") as r:
        return r.read()


def wait_for_completion(host: str, prompt_id: str, timeout: int = 600) -> dict:
    """Poll /history until the prompt completes; return the history entry."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        hist = get_history(host, prompt_id)
        if prompt_id in hist:
            return hist[prompt_id]
        time.sleep(1)
    raise TimeoutError(f"Timed out waiting for prompt {prompt_id}")


# ---- Workflow patching -------------------------------------------------------
def find_node_by_class(workflow: dict, class_type: str) -> str | None:
    for nid, node in workflow.items():
        if node.get("class_type") == class_type:
            return nid
    return None


def find_all_by_class(workflow: dict, class_type: str) -> list[str]:
    return [nid for nid, node in workflow.items() if node.get("class_type") == class_type]


def patch_workflow(
    workflow: dict,
    positive: str,
    negative: str,
    width: int,
    height: int,
    seed: int,
    save_prefix: str,
) -> dict:
    """Mutate a copy of the workflow with our per-row settings.

    Assumes a fairly standard txt2img workflow:
      - 2x CLIPTextEncode nodes (positive + negative). We pick them by ordering:
        first occurrence = positive, second = negative. If your workflow has
        them labeled differently, edit the picker below.
      - 1x EmptyLatentImage (size).
      - 1x KSampler (seed).
      - 1x SaveImage (filename_prefix).
    """
    wf = json.loads(json.dumps(workflow))  # deep copy

    clip_nodes = find_all_by_class(wf, "CLIPTextEncode")
    if len(clip_nodes) < 2:
        raise RuntimeError(
            f"Expected ≥2 CLIPTextEncode nodes in workflow, found {len(clip_nodes)}"
        )
    # Convention: positive prompt is the first CLIPTextEncode by node-id order.
    pos_id, neg_id = sorted(clip_nodes, key=lambda x: int(x))[:2]
    wf[pos_id]["inputs"]["text"] = positive
    wf[neg_id]["inputs"]["text"] = negative

    latent_id = find_node_by_class(wf, "EmptyLatentImage") or find_node_by_class(
        wf, "EmptySD3LatentImage"
    )
    if latent_id:
        wf[latent_id]["inputs"]["width"] = width
        wf[latent_id]["inputs"]["height"] = height

    sampler_id = find_node_by_class(wf, "KSampler") or find_node_by_class(
        wf, "KSamplerAdvanced"
    )
    if sampler_id:
        # Both samplers expose `seed` (KSampler) or `noise_seed` (Advanced).
        if "seed" in wf[sampler_id]["inputs"]:
            wf[sampler_id]["inputs"]["seed"] = seed
        if "noise_seed" in wf[sampler_id]["inputs"]:
            wf[sampler_id]["inputs"]["noise_seed"] = seed

    save_id = find_node_by_class(wf, "SaveImage")
    if save_id:
        wf[save_id]["inputs"]["filename_prefix"] = save_prefix

    return wf


# ---- Driver ------------------------------------------------------------------
def run(args):
    root = Path(__file__).resolve().parent.parent
    manifest_path = root / "scripts" / "assets_manifest.csv"
    workflow_path = Path(args.workflow)
    if not workflow_path.is_absolute():
        workflow_path = root / workflow_path

    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow_template = json.load(f)

    rows = list(csv.DictReader(open(manifest_path, encoding="utf-8")))

    # Filter
    if args.only:
        rows = [r for r in rows if r["type"] == args.only]
    if args.filter:
        rows = [r for r in rows if args.filter in r["output_path"]]

    client_id = str(uuid.uuid4())
    style = args.style or DEFAULT_STYLE_ZH
    negative = args.negative or DEFAULT_NEG

    print(f"[batch] {len(rows)} rows to generate")
    print(f"[batch] ComfyUI at http://{args.host}")
    print(f"[batch] Workflow: {workflow_path.name}")
    print()

    ok, skipped, failed = 0, 0, 0
    for idx, row in enumerate(rows):
        out_rel = row["output_path"]
        out_abs = root / out_rel

        if args.skip_existing and out_abs.exists():
            print(f"[{idx+1:>2}/{len(rows)}] SKIP (exists)  {out_rel}")
            skipped += 1
            continue

        prompt = row["prompt"].strip()
        if row.get("transparent", "").lower() == "true":
            prompt = prompt + TRANSPARENT_TAIL
        full_positive = f"{prompt}, {style}"

        width = int(row["width"])
        height = int(row["height"])
        seed = args.seed + idx

        # Use a unique filename_prefix per row so ComfyUI doesn't overwrite.
        # We'll move/rename the resulting file at the end.
        prefix = f"batch_{idx:03d}_{Path(out_rel).stem}"

        patched = patch_workflow(
            workflow_template,
            positive=full_positive,
            negative=negative,
            width=width,
            height=height,
            seed=seed,
            save_prefix=prefix,
        )

        try:
            prompt_id = post_prompt(args.host, patched, client_id)
            print(f"[{idx+1:>2}/{len(rows)}] queued {prompt_id[:8]}  {out_rel}")
            entry = wait_for_completion(args.host, prompt_id, timeout=args.timeout)
        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            failed += 1
            continue

        # Find the output image in the history
        outputs = entry.get("outputs", {})
        image_info = None
        for nout in outputs.values():
            if "images" in nout and nout["images"]:
                image_info = nout["images"][0]
                break
        if image_info is None:
            print(f"  ✗ No image in outputs")
            failed += 1
            continue

        try:
            data = get_image(
                args.host,
                image_info["filename"],
                image_info.get("subfolder", ""),
                image_info.get("type", "output"),
            )
        except Exception as e:
            print(f"  ✗ download failed: {e}")
            failed += 1
            continue

        out_abs.parent.mkdir(parents=True, exist_ok=True)
        with open(out_abs, "wb") as f:
            f.write(data)
        print(f"  ✓ saved {len(data) // 1024} KB")
        ok += 1

    print()
    print(f"[done] ok={ok}  skipped={skipped}  failed={failed}  total={len(rows)}")


def main():
    p = argparse.ArgumentParser(description="Batch-generate game assets via ComfyUI.")
    p.add_argument("--workflow", default="scripts/comfy_workflow.json",
                   help="Path to ComfyUI workflow JSON in API format (export via 'Save (API Format)')")
    p.add_argument("--host", default="127.0.0.1:8188", help="ComfyUI host:port")
    p.add_argument("--only", choices=["npc", "bg"], help="Filter by type")
    p.add_argument("--filter", help="Substring filter on output_path (e.g. '736')")
    p.add_argument("--skip-existing", action="store_true",
                   help="Skip rows whose output file already exists")
    p.add_argument("--style", help="Override style suffix (default: Tang ink-wash)")
    p.add_argument("--negative", help="Override negative prompt")
    p.add_argument("--seed", type=int, default=42, help="Base seed; each row uses seed + index")
    p.add_argument("--timeout", type=int, default=600,
                   help="Per-row timeout in seconds (default 600)")
    args = p.parse_args()
    run(args)


if __name__ == "__main__":
    main()
