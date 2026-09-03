import argparse
import hashlib
import re
import shutil
import subprocess
import time
from pathlib import Path

import imageio_ffmpeg
from PIL import Image
from google import genai
from google.genai import types
from a1_media_runtime_contracts import OPTION_MEDIA_VARIANTS
from audit_video_full_bleed import solid_bands


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "backend" / ".env"
ASSETS = ROOT / "frontend" / "public" / "lesson-assets"
FAMILY_IMAGES = ROOT / "Lessons" / "Lesson1" / "images"
RAW_DIR = ROOT / "tmp" / "lesson-action-videos"
MOBILE_VIDEOS = ROOT / "mobile" / "assets" / "lesson-videos"


SCENES = {
    "girl-walking": ("girl_is_walking", "girl-walking-scene-full-bleed-v1.mp4", "walks forward with several relaxed, natural steps; her feet alternate and her arms swing gently"),
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
    "baby-sleeping": ("family_baby_sleeping", "baby-sleeping-scene-full-bleed-v1.mp4", "remains asleep while the chest rises and falls subtly with calm breathing"),
    "brother-studying": ("family_brother_studying", "brother-studying-scene-full-bleed-v1.mp4", "clearly studies by looking between the learning materials and writing short answers with focused, purposeful movement"),
    "children-playing": ("family_children_playing", "children-playing-scene-full-bleed-v1.mp4", "both children actively play with the existing toys using clear, purposeful hand and body movement"),
    "father-working": ("family_father_working", "father-working-scene-full-bleed-v1.mp4", "unmistakably works at the construction site by extending the existing tape measure along the wooden board, checking it, and making one careful mark"),
    "mother-cooking": ("family_mother_cooking", "mother-cooking-scene-full-bleed-v1.mp4", "clearly cooks by stirring the existing food in the pan with natural hand movement"),
    "parents-talking": ("family_parents_talking", "parents-talking-scene-full-bleed-wide-v1.mp4", "take turns making small conversational hand gestures toward each other and nod gently while seated; keep both faces and hands visible"),
    "adults-playing": ("family_adults_playing", "adults-playing-scene-v2.mp4", "both adults actively play the activity already shown, with clear purposeful hand and body movement"),
    "grandparents-talking": ("family_grandparents_talking", "grandparents-talking-scene-v2.mp4", "take turns making small conversational hand gestures toward each other and nod gently while seated; keep both faces and hands visible"),
    "children-studying": ("family_children_studying", "children-studying-scene-v2.mp4", "both children clearly study: they look between their learning materials and write short answers with focused, purposeful movement"),
    "sister-reading": ("girl_is_reading", "girl-reading-scene-v2.mp4", "unmistakably reads the existing open book; her eyes track the lines and one hand gently begins turning a page"),
}

BUNDLED_SCENES = {
    "baby-sleeping",
    "brother-studying",
    "children-playing",
    "father-working",
    "girl-walking",
    "mother-cooking",
    "parents-talking",
}

# Full-bleed masters now preserve the complete action at every option count.
# Two-card references use those same files instead of the legacy inset crops.
TWO_CARD_ACTION_VARIANTS = {
    "brother-studying": "brother-studying-scene-full-bleed-v1.mp4",
    "children-playing": "children-playing-scene-full-bleed-v1.mp4",
    "father-working": "father-working-scene-full-bleed-v1.mp4",
}


def raw_name_for(output_name: str) -> str:
    return re.sub(r"-v\d+\.mp4$", "-raw.mp4", output_name)


def api_key() -> str:
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        name, separator, value = line.partition("=")
        if separator and name.strip() in {"GEMINI_API_KEY", "GOOGLE_API_KEY"}:
            return value.strip().strip('"').strip("'")
    raise RuntimeError("Gemini API key not found.")


def source_path(stem: str) -> Path:
    # Animate the same full-bleed landscape master displayed by the clients.
    # Square legacy PNGs caused padding to be baked into the old clips.
    filename = OPTION_MEDIA_VARIANTS.get(f"{stem}.webp", f"{stem}.webp")
    for directory in (ASSETS, FAMILY_IMAGES):
        candidate = directory / filename
        if candidate.exists():
            with Image.open(candidate) as image:
                width, height = image.size
                bands = solid_bands(image.convert("RGB").resize((300, 200)).tobytes(), 300, 200)
            if abs(width / height - 3 / 2) > 0.005:
                raise ValueError(f"Video source must be a full-bleed 3:2 master: {filename}")
            if bands:
                raise ValueError(f"Video source contains solid edge bands: {filename}: {bands}")
            return candidate
    raise FileNotFoundError(f"No lesson image found for {stem}")


def generate(client: genai.Client, scene_id: str, model: str = "veo-3.1-lite-generate-preview") -> Path:
    image_stem, output_name, action = SCENES[scene_id]
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_DIR / raw_name_for(output_name)
    if raw_path.exists():
        print(f"scene={scene_id} reuse-raw={raw_path.name}", flush=True)
        return raw_path

    prompt = (
        "Animate this exact educational course image in one continuous four-second shot. "
        f"Every person shown {action}. "
        "Keep mouths naturally closed unless mouth movement is physically required for eating or talking. "
        "No dialogue, speech, singing, or music. Quiet natural room tone is acceptable; "
        "the final educational export removes all audio. "
        "Preserve every person's exact identity, age, face, clothing, hands, existing objects, setting, lighting, "
        "colors, composition, and framing. Keep the camera completely locked and all heads and important body "
        "parts visible. No zoom, pan, cuts, scene changes, new objects, extra people, text, flicker, morphing, "
        "Extend the real surrounding scene naturally to every edge of the landscape video. "
        "No borders, letterboxing, pillarboxing, solid padding, or blurred background panels. "
        "Keep all heads, hands, feet, and action-defining objects inside the central 3:2 safe area. "
        "warped hands, duplicated objects, or exaggerated motion. The action must be immediately identifiable "
        "to an A1 English learner without seeing text."
    )
    operation = client.models.generate_videos(
        model=model,
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
        raise RuntimeError(f"No generated video returned: {operation.response.rai_media_filtered_reasons}")
    raw_path.write_bytes(client.files.download(file=videos[0].video))
    print(f"scene={scene_id} downloaded={raw_path.name} bytes={raw_path.stat().st_size}", flush=True)
    return raw_path


def optimize(scene_id: str, raw_path: Path) -> Path:
    output_path = ASSETS / SCENES[scene_id][1]
    encode_normalized(scene_id, raw_path, output_path)
    if scene_id in BUNDLED_SCENES:
        MOBILE_VIDEOS.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output_path, MOBILE_VIDEOS / output_path.name)
    print(f"scene={scene_id} optimized={output_path.name} bytes={output_path.stat().st_size}", flush=True)
    return output_path


def detected_crop(input_path: Path) -> str:
    result = subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(), "-ss", "0.25", "-i", str(input_path),
            "-t", "1.0", "-vf", "cropdetect=24:2:0", "-f", "null", "-",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    matches = re.findall(r"crop=(\d+:\d+:\d+:\d+)", result.stderr)
    if not matches:
        raise ValueError(f"Could not determine visible source bounds: {input_path.name}")
    return matches[-1]


def media_duration(input_path: Path) -> float:
    result = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-i", str(input_path), "-f", "null", "-"],
        check=False,
        capture_output=True,
        text=True,
    )
    match = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not match:
        return 3.0
    hours, minutes, seconds = match.groups()
    return (int(hours) * 3600) + (int(minutes) * 60) + float(seconds)


def encode_normalized(
    scene_id: str,
    input_path: Path,
    output_path: Path,
    reviewed_crop: tuple[str, str] | None = None,
) -> None:
    if reviewed_crop is not None:
        crop, expected_source_sha256 = reviewed_crop
        if hashlib.sha256(input_path.read_bytes()).hexdigest() != expected_source_sha256:
            raise ValueError("Reviewed crop does not match the exact inspected raw source")
    else:
        crop = detected_crop(input_path)
    crop_width, crop_height, crop_x, crop_y = (int(value) for value in crop.split(":"))
    temporary_path = output_path.with_name(f"{output_path.stem}.normalized.mp4")
    if crop_width + 2 < crop_height * 3 / 2:
        raise ValueError(
            f"{scene_id}: narrow footage cannot be padded or cropped automatically; "
            "regenerate from the full-bleed landscape master and review the complete action."
        )
    filter_graph = (
        f"[0:v]crop={crop},scale=768:512:force_original_aspect_ratio=increase,"
        "crop=768:512"
    )
    trim_start = 0.0 if media_duration(input_path) < 2.5 else 0.2
    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-ss", f"{trim_start:.2f}", "-i", str(input_path), "-t", "3.0", "-an",
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
        raw_path = RAW_DIR / raw_name_for(output_name)
        if not raw_path.exists():
            print(f"scene={scene_id} skipped=no-raw-source", flush=True)
            continue
        output_path = ASSETS / output_name
        optimize(scene_id, raw_path)
        print(f"normalized={output_path.name} bytes={output_path.stat().st_size}", flush=True)


def normalize_two_card_existing() -> None:
    for scene_id, output_name in TWO_CARD_ACTION_VARIANTS.items():
        raw_path = RAW_DIR / raw_name_for(SCENES[scene_id][1])
        if not raw_path.exists():
            print(f"scene={scene_id} skipped=no-raw-source", flush=True)
            continue
        output_path = ASSETS / output_name
        encode_normalized(scene_id, raw_path, output_path)
        MOBILE_VIDEOS.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output_path, MOBILE_VIDEOS / output_path.name)
        print(f"two-card-normalized={output_path.name} bytes={output_path.stat().st_size}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenes", nargs="*", choices=SCENES)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--normalize-existing", action="store_true")
    parser.add_argument("--normalize-two-card-existing", action="store_true")
    args = parser.parse_args()
    scene_ids = list(SCENES) if args.all else args.scenes
    if args.normalize_existing:
        normalize_existing()
    if args.normalize_two_card_existing:
        normalize_two_card_existing()
    if not scene_ids and not args.normalize_existing and not args.normalize_two_card_existing:
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
