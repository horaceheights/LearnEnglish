"""Helper to sequentially render unrendered stills in a pack using render_course_stills.py."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CLI = Path(r"C:\Users\gorre\.codex\skills\.system\imagegen\scripts\image_gen.py")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pack", type=Path, required=True)
    parser.add_argument("--max-cost-usd", default="1.50")
    parser.add_argument("--request-reserve-usd", default="0.05")
    parser.add_argument("--only-asset", help="Render only this asset ID")
    args = parser.parse_args()

    env_path = ROOT / "backend" / ".env"
    env = os.environ.copy()
    if "OPENAI_API_KEY" not in env and env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENAI_API_KEY="):
                env["OPENAI_API_KEY"] = line.split("=", 1)[1].strip()
                break

    pack_data = json.loads(args.pack.read_text(encoding="utf-8"))
    out_dir = ROOT / "output" / "imagegen" / pack_data.get("output_namespace", "unknown")
    out_dir.mkdir(parents=True, exist_ok=True)

    assets = pack_data["assets"]
    if args.only_asset:
        assets = [a for a in assets if a["id"] == args.only_asset]

    for asset in assets:
        aid = asset["id"]
        out_png = out_dir / f"{aid}.png"
        out_receipt = out_dir / f"{aid}.receipt.json"
        if out_png.is_file() and out_receipt.is_file():
            try:
                rec = json.loads(out_receipt.read_text(encoding="utf-8"))
                if rec.get("status") == "image_saved":
                    print(f"[{aid}] Already saved. Skipping.")
                    continue
            except Exception:
                pass

        print(f"[{aid}] Rendering...")
        cmd = [
            sys.executable,
            str(ROOT / "scripts" / "render_course_stills.py"),
            "--pack", str(args.pack),
            "--asset-id", aid,
            "--cli", str(CLI),
            "--execute",
            "--max-cost-usd", str(args.max_cost_usd),
            "--request-reserve-usd", str(args.request_reserve_usd),
        ]
        res = subprocess.run(cmd, env=env, cwd=str(ROOT))
        if res.returncode != 0:
            print(f"[{aid}] Failed with exit code {res.returncode}. Stopping.")
            return res.returncode
        print(f"[{aid}] Completed successfully.")

    print("Batch finished.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
