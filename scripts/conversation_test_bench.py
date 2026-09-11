#!/usr/bin/env python3
"""Interactive Terminal Test Bench for Gemini Conversational Milestones.

Run directly in-process:
    python scripts/conversation_test_bench.py

Run against FastAPI server:
    python scripts/conversation_test_bench.py --api-url http://127.0.0.1:8000

Run without TTS audio:
    python scripts/conversation_test_bench.py --no-audio
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
import time
from pathlib import Path
from typing import Any, Optional

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Optional winsound for native Windows audio playback
try:
    import winsound
    HAS_WINSOUND = True
except ImportError:
    HAS_WINSOUND = False


# ANSI Color Codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
BLUE = "\033[94m"
RED = "\033[91m"


def print_banner() -> None:
    print(f"\n{BOLD}{CYAN}{'=' * 65}{RESET}")
    print(f"{BOLD}{MAGENTA}   🎉  SPANGLISH CONVERSATIONAL TEST BENCH (GEMINI A1)  🎉{RESET}")
    print(f"{BOLD}{CYAN}   Scenario: At the Family Celebration with Liam (Unit 1){RESET}")
    print(f"{BOLD}{CYAN}{'=' * 65}{RESET}\n")
    print(f"{DIM}Commands: 'exit' to quit | 'replay' to replay audio | 'help' for info{RESET}\n")


def print_objectives_bar(objectives: list[Any]) -> None:
    parts = []
    for obj in objectives:
        # Support both Pydantic model and dict
        obj_id = getattr(obj, "id", None) or obj.get("id")
        title = getattr(obj, "title", None) or obj.get("title", obj_id)
        is_completed = getattr(obj, "is_completed", None)
        if is_completed is None:
            is_completed = obj.get("is_completed", False)

        if is_completed:
            parts.append(f"{GREEN}[✓] {title}{RESET}")
        else:
            parts.append(f"{DIM}[ ] {title}{RESET}")

    print(f"{BOLD}Objectives:{RESET} " + "  ".join(parts))
    print(f"{DIM}{'-' * 65}{RESET}")


def play_audio_file(filepath: Path) -> None:
    if not filepath.is_file():
        return

    if HAS_WINSOUND and filepath.suffix.lower() == ".wav":
        try:
            winsound.PlaySound(str(filepath), winsound.SND_FILENAME | winsound.SND_ASYNC)
            return
        except Exception:
            pass

    # Fallback to PowerShell MediaPlayer for other formats or platforms
    if sys.platform == "win32":
        try:
            ps_cmd = (
                f"$player = New-Object System.Media.SoundPlayer '{filepath}';"
                "$player.PlaySync();"
            )
            os.system(f'powershell -c "{ps_cmd}"')
        except Exception:
            pass


def save_audio_payload(
    audio_b64: Optional[str],
    mime_type: Optional[str],
    turn_idx: int,
    output_dir: Path,
) -> Optional[Path]:
    if not audio_b64:
        return None

    output_dir.mkdir(parents=True, exist_ok=True)
    ext = ".wav" if (mime_type and "wav" in mime_type) else ".mp3"
    filepath = output_dir / f"turn_{turn_idx:02d}{ext}"

    try:
        raw_bytes = base64.b64decode(audio_b64)
        filepath.write_bytes(raw_bytes)
        return filepath
    except Exception as err:
        print(f"{DIM}[Audio save failed: {err}]{RESET}")
        return None


def run_interactive_session(api_url: Optional[str] = None, no_audio: bool = False) -> None:
    audio_output_dir = PROJECT_ROOT / "output" / "conversation_audio"
    last_audio_file: Optional[Path] = None
    turn_counter = 0

    print_banner()

    # Client setup: Direct Service vs HTTP API
    service = None
    http_client = None

    if api_url:
        import urllib.error
        import urllib.request
        import json

        base_url = api_url.rstrip("/")
        print(f"{CYAN}Connecting via HTTP to FastAPI: {base_url}{RESET}\n")

        def start_call(include_audio: bool) -> dict[str, Any]:
            req = urllib.request.Request(
                f"{base_url}/api/conversation/start",
                data=json.dumps({"scenario_id": "unit-1-celebration", "include_audio": include_audio}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))

        def turn_call(interaction_id: str, text: str, include_audio: bool) -> dict[str, Any]:
            req = urllib.request.Request(
                f"{base_url}/api/conversation/turn",
                data=json.dumps({
                    "interaction_id": interaction_id,
                    "learner_text": text,
                    "scenario_id": "unit-1-celebration",
                    "include_audio": include_audio,
                }).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
    else:
        from backend.app.conversation import ConversationService
        service = ConversationService()
        if not service.api_key:
            print(f"{RED}Error: GEMINI_API_KEY is not set in backend/.env or environment.{RESET}")
            sys.exit(1)
        print(f"{CYAN}Initialized direct ConversationService (Model: {service.text_model}){RESET}\n")

        def start_call(include_audio: bool) -> Any:
            return service.start_conversation(scenario_id="unit-1-celebration", include_audio=include_audio)

        def turn_call(interaction_id: str, text: str, include_audio: bool) -> Any:
            return service.send_turn(
                interaction_id=interaction_id,
                learner_text=text,
                scenario_id="unit-1-celebration",
                include_audio=include_audio,
            )

    include_audio = not no_audio
    print(f"{DIM}Connecting with Liam to begin the celebration...{RESET}\n")

    try:
        response = start_call(include_audio=include_audio)
    except Exception as exc:
        print(f"{RED}Failed to start session: {exc}{RESET}")
        return

    interaction_id = getattr(response, "interaction_id", None) or response.get("interaction_id")
    character_name = getattr(response, "character_name", None) or response.get("character_name", "Liam")
    character_reply = getattr(response, "character_reply", None) or response.get("character_reply", "")
    spanish_hint = getattr(response, "spanish_hint", None) or response.get("spanish_hint", "")
    objectives = getattr(response, "objectives", None) or response.get("objectives", [])
    audio_b64 = getattr(response, "audio_base64", None) or response.get("audio_base64")
    audio_mime = getattr(response, "audio_mime_type", None) or response.get("audio_mime_type")

    # Display opening turn
    print_objectives_bar(objectives)
    print(f"\n{BOLD}{CYAN}{character_name}:{RESET} {BOLD}{character_reply}{RESET}")
    if spanish_hint:
        print(f"{DIM}💬 Spanish hint: {spanish_hint}{RESET}")

    if include_audio and audio_b64:
        last_audio_file = save_audio_payload(audio_b64, audio_mime, turn_counter, audio_output_dir)
        if last_audio_file:
            print(f"{DIM}🔊 [Audio saved: {last_audio_file.name} - playing]{RESET}")
            play_audio_file(last_audio_file)

    milestone_celebrated = False

    while True:
        try:
            user_input = input(f"\n{BOLD}{GREEN}You > {RESET}").strip()
        except (KeyboardInterrupt, EOFError):
            print(f"\n{YELLOW}Exiting conversation. Goodbye!{RESET}")
            break

        if not user_input:
            continue

        cmd = user_input.lower()
        if cmd in {"exit", "quit"}:
            print(f"{YELLOW}Ending session. Great practice!{RESET}")
            break
        elif cmd == "replay":
            if last_audio_file and last_audio_file.is_file():
                print(f"{DIM}Replaying audio...{RESET}")
                play_audio_file(last_audio_file)
            else:
                print(f"{DIM}No audio file to replay.{RESET}")
            continue
        elif cmd == "help":
            print(f"{CYAN}Available commands:{RESET}")
            print("  exit / quit : Exit the test bench")
            print("  replay      : Replay Liam's last voice response")
            print("  help        : Show this help message")
            continue

        turn_counter += 1
        print(f"{DIM}Liam is listening and replying...{RESET}")

        try:
            turn_response = turn_call(
                interaction_id=interaction_id,
                text=user_input,
                include_audio=include_audio,
            )
        except Exception as exc:
            print(f"{RED}Error during turn: {exc}{RESET}")
            continue

        # Extract fields
        interaction_id = getattr(turn_response, "interaction_id", None) or turn_response.get("interaction_id")
        character_reply = getattr(turn_response, "character_reply", None) or turn_response.get("character_reply", "")
        spanish_hint = getattr(turn_response, "spanish_hint", None) or turn_response.get("spanish_hint", "")
        objectives = getattr(turn_response, "objectives", None) or turn_response.get("objectives", [])
        feedback_coaching = getattr(turn_response, "feedback_coaching", None) or turn_response.get("feedback_coaching")
        is_complete = getattr(turn_response, "is_milestone_complete", None)
        if is_complete is None:
            is_complete = turn_response.get("is_milestone_complete", False)
        audio_b64 = getattr(turn_response, "audio_base64", None) or turn_response.get("audio_base64")
        audio_mime = getattr(turn_response, "audio_mime_type", None) or turn_response.get("audio_mime_type")

        # Display Turn
        print()
        print_objectives_bar(objectives)
        print(f"\n{BOLD}{CYAN}{character_name}:{RESET} {BOLD}{character_reply}{RESET}")
        if spanish_hint:
            print(f"{DIM}💬 Spanish hint: {spanish_hint}{RESET}")
        if feedback_coaching:
            print(f"{YELLOW}💡 Coach feedback: {feedback_coaching}{RESET}")

        if include_audio and audio_b64:
            last_audio_file = save_audio_payload(audio_b64, audio_mime, turn_counter, audio_output_dir)
            if last_audio_file:
                print(f"{DIM}🔊 [Audio saved: {last_audio_file.name} - playing]{RESET}")
                play_audio_file(last_audio_file)

        # Handle Milestone Completion
        if is_complete and not milestone_celebrated:
            milestone_celebrated = True
            print(f"\n{BOLD}{GREEN}{'=' * 65}{RESET}")
            print(f"{BOLD}{GREEN}  🏆  MILESTONE COMPLETED! ALL 3 OBJECTIVES ACHIEVED!  🏆{RESET}")
            print(f"{BOLD}{GREEN}  You greeted Liam, asked about family, and described actions!{RESET}")
            print(f"{BOLD}{GREEN}{'=' * 65}{RESET}\n")

            try:
                choice = input(f"{BOLD}Would you like to keep chatting with Liam (free-form)? [y/N]: {RESET}").strip().lower()
            except (KeyboardInterrupt, EOFError):
                break

            if choice not in {"y", "yes"}:
                print(f"\n{CYAN}Session completed successfully. Excellent work!{RESET}\n")
                break


def main() -> None:
    parser = argparse.ArgumentParser(description="Spanglish Interactive Conversational Test Bench")
    parser.add_argument("--api-url", type=str, default=None, help="FastAPI backend URL (e.g. http://127.0.0.1:8000)")
    parser.add_argument("--no-audio", action="store_true", help="Disable TTS audio generation for rapid text testing")
    args = parser.parse_args()

    run_interactive_session(api_url=args.api_url, no_audio=args.no_audio)


if __name__ == "__main__":
    main()
