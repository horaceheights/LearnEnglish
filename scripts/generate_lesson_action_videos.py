import argparse
import re
import subprocess
import time
from pathlib import Path

import imageio_ffmpeg
from google import genai
from google.genai import types


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "backend" / ".env"
ASSETS = ROOT / "frontend" / "public" / "lesson-assets"
FAMILY_IMAGES = ROOT / "Lessons" / "Lesson1" / "images"
RAW_DIR = ROOT / "tmp" / "lesson-action-videos"


SCENES = {
    "girl-walking": ("girl_is_walking", "girl-walking-scene-v2.mp4", "walks forward with several relaxed, natural steps; her feet alternate and her arms swing gently"),
    "girl-drinking": ("girl_is_drinking", "girl-drinking-scene-v2.mp4", "raises the existing glass, takes one clear sip, and lowers it naturally"),
    "girl-sleeping": ("girl_is_sleeping", "girl-sleeping-scene-v2.mp4", "remains asleep while her chest and shoulders rise and fall subtly with calm breathing"),
    "man-swimming": ("man_is_swimming", "man-swimming-scene-v2.mp4", "clearly swims using a natural stroke, with visible arm movement, a gentle kick, and realistic water ripples"),
    "man-drinking": ("man_is_drinking", "man-drinking-scene-v2.mp4", "raises the existing glass, takes one clear sip, and lowers it naturally"),
    "woman-eating": ("woman_is_eating", "woman-eating-scene-v2.mp4", "takes one clear bite of the existing food, chews naturally, and lowers the utensil"),
    "woman-reading": ("woman_is_reading", "woman-reading-scene-v2.mp4", "unmistakably reads the existing open book; her eyes track the lines and one hand gently begins turning a page"),
    "woman-writing": ("woman_is_writing", "woman-writing-scene-v2.mp4", "unmistakably writes several letters or words on the existing paper; the pencil stays against the page and makes clear strokes"),
    "pair-boy-girl-running": ("they_boy_girl_are_running", "boy-girl-running-scene-v2.mp4", "both children clearly run, with airborne strides, bent elbows, and coordinated arm movement; they must not merely walk quickly"),
    "pair-man-woman-reading": ("they_man_woman_are_reading", "man-woman-reading-scene-v2.mp4", "both adults unmistakably read their existing books; their eyes track the pages and each makes a small natural page adjustment"),
    "pair-boy-man-eating": ("they_boy_man_are_eating", "boy-man-eating-scene-v2.mp4", "both people clearly take a bite of their existing food and chew naturally"),
    "pair-girl-woman-writing": ("they_girl_woman_are_writing", "girl-woman-writing-scene-v2.mp4", "both people unmistakably write on their existing pages with clear, continuous pencil or pen strokes"),
    "baby-sleeping": ("family_baby_sleeping", "baby-sleeping-scene-v2.mp4", "remains asleep while the chest rises and falls subtly with calm breathing"),
    "father-working": ("family_father_working", "father-working-scene-v2.mp4", "unmistakably works at the construction site by extending the existing tape measure along the wooden board, checking it, and making one careful mark"),
    "adults-playing": ("family_adults_playing", "adults-playing-scene-v2.mp4", "both adults actively play the activity already shown, with clear purposeful hand and body movement"),
    "grandparents-talking": ("family_grandparents_talking", "grandparents-talking-scene-v2.mp4", "have a friendly conversation, taking turns making small hand gestures toward each other; their interaction must clearly show talking"),
    "children-studying": ("family_children_studying", "children-studying-scene-v2.mp4", "both children clearly study: they look between their learning materials and write short answers with focused, purposeful movement"),
    "sister-reading": ("girl_is_reading", "girl-reading-scene-v2.mp4", "unmistakably reads the existing open book; her eyes track the lines and one hand gently begins turning a page"),
}


def api_key() -> str:
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        name, separator, value = line.partition("=")
        if separator and name.strip() in {"GEMINI_API_KEY", "GOOGLE_API_KEY"}:
            return value.strip().strip('"').strip("'")
    raise RuntimeError("Gemini API key not found.")


def source_path(stem: str) -> Path:
    for directory in (ASSETS, FAMILY_IMAGES):
        for extension in (".png", ".webp", ".jpg", ".jpeg"):
            candidate = directory / f"{stem}{extension}"
            if candidate.exists():
                return candidate
    raise FileNotFoundError(f"No lesson image found for {stem}")


def generate(client: genai.Client, scene_id: str) -> Path:
    image_stem, output_name, action = SCENES[scene_id]
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_DIR / output_name.replace("-v2.mp4", "-raw.mp4")
    if raw_path.exists():
        print(f"scene={scene_id} reuse-raw={raw_path.name}", flush=True)
        return raw_path

    prompt = (
        "Animate this exact educational course image in one continuous four-second shot. "
        f"Every person shown {action}. "
        "Keep mouths naturally closed unless mouth movement is physically required for eating or talking. "
        "Generate complete silence: no dialogue, speech, singing, vocalization, music, or sound effects. "
        "Preserve every person's exact identity, age, face, clothing, hands, existing objects, setting, lighting, "
        "colors, composition, and framing. Keep the camera completely locked and all heads and important body "
        "parts visible. No zoom, pan, cuts, scene changes, new objects, extra people, text, flicker, morphing, "
        "warped hands, duplicated objects, or exaggerated motion. The action must be immediately identifiable "
        "to an A1 English learner without seeing text."
    )
    operation = client.models.generate_videos(
        model="veo-3.1-lite-generate-preview",
        source=types.GenerateVideosSource(
            prompt=prompt,
            image=types.Image.from_file(location=str(source_path(image_stem))),
        ),
        config=types.GenerateVideosConfig(
            aspect_ratio="16:9",
            resolution="720p",
            duration_seconds=4,
            number_of_videos=1,
        ),
    )
    print(f"scene={scene_id} operation={operation.name}", flush=True)
    while not operation.done:
        time.sleep(10)
        try:
            operation = client.operations.get(operation)
            print(f"scene={scene_id} waiting", flush=True)
        except Exception as error:
            print(f"scene={scene_id} status-check-retry={type(error).__name__}", flush=True)
    if operation.error:
        raise RuntimeError(str(operation.error))
    videos = operation.response.generated_videos
    if not videos:
        raise RuntimeError("No generated video returned.")
    raw_path.write_bytes(client.files.download(file=videos[0].video))
    print(f"scene={scene_id} downloaded={raw_path.name} bytes={raw_path.stat().st_size}", flush=True)
    return raw_path


def optimize(scene_id: str, raw_path: Path) -> Path:
    output_path = ASSETS / SCENES[scene_id][1]
    encode_normalized(raw_path, output_path)
    print(f"scene={scene_id} optimized={output_path.name} bytes={output_path.stat().st_size}", flush=True)
    return output_path


def detected_crop(input_path: Path) -> str:
    result = subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(), "-ss", "0.25", "-i", str(input_path),
            "-t", "1.0", "-vf", "cropdetect=24:16:0", "-f", "null", "-",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    matches = re.findall(r"crop=(\d+:\d+:\d+:\d+)", result.stderr)
    return matches[-1] if matches else "iw:ih:0:0"


def encode_normalized(input_path: Path, output_path: Path) -> None:
    crop = detected_crop(input_path)
    temporary_path = output_path.with_name(f"{output_path.stem}.normalized.mp4")
    filter_graph = (
        f"[0:v]crop={crop},split=2[foreground][background];"
        "[background]scale=640:360:force_original_aspect_ratio=increase,"
        "crop=640:360,gblur=sigma=22[canvas];"
        "[foreground]scale=640:360:force_original_aspect_ratio=decrease[subject];"
        "[canvas][subject]overlay=(W-w)/2:(H-h)/2"
    )
    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-ss", "0.20", "-i", str(input_path), "-t", "3.0", "-an",
            "-filter_complex", filter_graph, "-c:v", "libx264", "-preset", "slow",
            "-crf", "20", "-movflags", "+faststart", "-pix_fmt", "yuv420p", str(temporary_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    temporary_path.replace(output_path)


def normalize_existing() -> None:
    for scene_id, (_, output_name, _) in SCENES.items():
        raw_path = RAW_DIR / output_name.replace("-v2.mp4", "-raw.mp4")
        if not raw_path.exists():
            print(f"scene={scene_id} skipped=no-raw-source", flush=True)
            continue
        output_path = ASSETS / output_name
        encode_normalized(raw_path, output_path)
        print(f"normalized={output_path.name} bytes={output_path.stat().st_size}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenes", nargs="*", choices=SCENES)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--normalize-existing", action="store_true")
    args = parser.parse_args()
    scene_ids = list(SCENES) if args.all else args.scenes
    if args.normalize_existing:
        normalize_existing()
    if not scene_ids and not args.normalize_existing:
        parser.error("Choose one or more scenes, or use --all.")
    if not scene_ids:
        return
    client = genai.Client(api_key=api_key())
    failures = []
    for scene_id in scene_ids:
        try:
            optimize(scene_id, generate(client, scene_id))
        except Exception as error:
            failures.append(scene_id)
            print(f"scene={scene_id} failed={type(error).__name__}: {error}", flush=True)
    if failures:
        raise SystemExit(f"Failed scenes: {', '.join(failures)}")


if __name__ == "__main__":
    main()
