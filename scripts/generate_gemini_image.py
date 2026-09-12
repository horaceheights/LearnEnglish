import argparse
import base64
import json
import re
import sys
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
env_path = ROOT / "backend" / ".env"
env = dict(re.findall(r"^([A-Z_]+)=(.*)$", env_path.read_text(encoding="utf-8"), re.M))

key = env.get("GEMINI_API_KEY", "").strip()
if not key:
    print("Error: No GEMINI_API_KEY found in backend/.env")
    sys.exit(1)


def generate_image(prompt: str, output_path: Path, model: str = "gemini-2.5-flash-image"):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE"]
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )

    print(f"Generating image with {model}...")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"No candidates returned: {data}")
                sys.exit(1)
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    b64_data = part["inlineData"]["data"]
                    img_bytes = base64.b64decode(b64_data)
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    output_path.write_bytes(img_bytes)
                    print(f"Successfully saved {len(img_bytes)} bytes to {output_path}")
                    return
            print("No inlineData found in response parts.")
            sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt", help="Text prompt for image generation")
    parser.add_argument("output", help="Output path (e.g. image.jpg or image.png)")
    parser.add_argument("--model", default="gemini-2.5-flash-image", help="Model name")
    args = parser.parse_args()

    generate_image(args.prompt, Path(args.output), model=args.model)
