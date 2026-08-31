from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.card_audio_assets import VISUAL_PLACEHOLDER_PATTERN, asset_index  # noqa: E402
from backend.app.course_audio import (  # noqa: E402
    COMPLETION_PLACEHOLDER_PATTERN,
    _encode_mp3,
    assemble_completion_fragment_samples,
    completion_fragment_model,
    completion_prompt_contract,
    completion_prompt_fragments,
    normalize_course_audio,
)
from backend.app.course_audio_profile import (  # noqa: E402
    NAMED_SPEAKER_ROLES,
    NEUTRAL_SPEAKER_ROLES,
    render_profile_for,
)
from backend.app.course_audio_receipts import probe_mp3, sha256_bytes  # noqa: E402
from backend.app.course_audio_registry import (  # noqa: E402
    ApprovedTakeRegistryError,
    approved_audio_dir,
    load_approved_take_registry,
    resolve_approved_take,
)
from backend.app.data import LESSONS  # noqa: E402
from backend.app.schemas import CourseAudioAsset, LessonCard  # noqa: E402


ELEVENLABS_SPEECH_URL = "https://api.elevenlabs.io/v1/text-to-speech"
RENDER_STAGING_SCHEMA_VERSION = 1


@dataclass
class RenderJob:
    kind: str
    assets: list[CourseAudioAsset] = field(default_factory=list)
    text: str = ""
    visual_prompt: str | None = None
    blank_text: str | None = None

    @property
    def profile(self):
        asset = self.assets[0]
        return render_profile_for(asset.speaker_role, asset.mode)

    @property
    def completion_contract_metadata(self) -> dict[str, str] | None:
        if self.kind != "completion":
            return None
        return {
            "visual_prompt": self.visual_prompt or "",
            "full_text": self.text,
            "blank_text": self.blank_text or "",
        }

    def request_fragments(self) -> list[tuple[str, str]]:
        if self.kind == "ordinary":
            return [(self.text, self.profile.model_id)]
        contract = completion_prompt_contract(
            self.visual_prompt or "",
            self.text,
            self.blank_text or "",
        )
        prefix, suffix = completion_prompt_fragments(contract)
        return [
            (fragment, completion_fragment_model(fragment, self.profile.model_id))
            for fragment in (prefix, suffix)
            if fragment
        ]

    def estimated_character_cost(self) -> int:
        return sum(len(fragment) for fragment, _ in self.request_fragments())


def load_env_file(path: Path) -> None:
    if not path.is_file():
        raise ValueError(f"Environment file does not exist: {path}")
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        if key:
            os.environ.setdefault(key, value)


def blank_text_for(card: LessonCard, full_text: str) -> str:
    prompt = card.prompt
    placeholders = list(COMPLETION_PLACEHOLDER_PATTERN.finditer(prompt))
    if len(placeholders) != 1:
        raise ValueError(f"Completion card must contain exactly one placeholder: {card.slide_id}")
    placeholder = placeholders[0]
    prefix = prompt[: placeholder.start()]
    suffix = prompt[placeholder.end() :]
    if not full_text.startswith(prefix) or (suffix and not full_text.endswith(suffix)):
        raise ValueError(f"Completion answer does not align with prompt: {card.slide_id}")
    end = len(full_text) - len(suffix) if suffix else len(full_text)
    blank = full_text[len(prefix) : end]
    completion_prompt_contract(prompt, full_text, blank)
    return blank


def selected_assets(args: argparse.Namespace) -> list[tuple[CourseAudioAsset, LessonCard]]:
    all_assets = asset_index(LESSONS)
    requested_asset_ids = set(args.asset_id or [])
    unknown_assets = sorted(requested_asset_ids - set(all_assets))
    if unknown_assets:
        raise ValueError("Unknown asset IDs: " + ", ".join(unknown_assets))
    requested_lessons = set(args.lesson_id or [])
    unknown_lessons = sorted(requested_lessons - set(LESSONS))
    if unknown_lessons:
        raise ValueError("Unknown lesson IDs: " + ", ".join(unknown_lessons))
    if not (
        args.all_named_speakers
        or args.all_missing_after_reviewed_seed
        or requested_asset_ids
        or requested_lessons
    ):
        raise ValueError(
            "Select --all-named-speakers, --all-missing-after-reviewed-seed, --lesson-id, or --asset-id."
        )

    registry = load_approved_take_registry()
    manifest_path = ROOT / "frontend" / "lib" / "courseAudioManifest.json"
    static_dir = ROOT / "frontend" / "public" / "audio-cache"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    static_validation_cache: dict[Path, bool] = {}

    def available_from_reviewed_seed(asset: CourseAudioAsset) -> bool:
        if asset.id in registry["bindings"]:
            try:
                return resolve_approved_take(asset, registry) is not None
            except ApprovedTakeRegistryError as error:
                raise ValueError(
                    f"Approved binding for {asset.id} is invalid: {error}"
                ) from error
        if asset.speaker_role not in NEUTRAL_SPEAKER_ROLES or asset.variant == "completion-prompt":
            return False
        key = "\n".join([asset.text, asset.mode, "en-US", asset.variant])
        source_name = manifest.get(key)
        if not isinstance(source_name, str):
            return False
        source = static_dir / source_name
        if source not in static_validation_cache:
            try:
                static_validation_cache[source] = source.is_file() and bool(probe_mp3(source.read_bytes()))
            except (OSError, ValueError):
                static_validation_cache[source] = False
        return static_validation_cache[source]

    selected: list[tuple[CourseAudioAsset, LessonCard]] = []
    for lesson in LESSONS.values():
        for card in lesson.cards:
            for asset in card.audio_assets:
                if args.all_named_speakers and asset.speaker_role not in NAMED_SPEAKER_ROLES:
                    continue
                if args.all_missing_after_reviewed_seed and available_from_reviewed_seed(asset):
                    continue
                if requested_asset_ids and asset.id not in requested_asset_ids:
                    continue
                if requested_lessons and lesson.id not in requested_lessons:
                    continue
                selected.append((asset, card))
    return selected


def render_jobs(args: argparse.Namespace) -> list[RenderJob]:
    grouped: dict[tuple[str, ...], RenderJob] = {}
    for asset, card in selected_assets(args):
        profile = render_profile_for(asset.speaker_role, asset.mode)
        if asset.variant == "completion-prompt":
            if not VISUAL_PLACEHOLDER_PATTERN.search(card.prompt):
                raise ValueError(f"Completion asset has no visual placeholder: {asset.id}")
            blank = blank_text_for(card, asset.text)
            key = ("completion", profile.voice_id, card.prompt, asset.text, blank)
            job = grouped.setdefault(
                key,
                RenderJob(
                    kind="completion",
                    text=asset.text,
                    visual_prompt=card.prompt,
                    blank_text=blank,
                ),
            )
        else:
            key = ("ordinary", profile.voice_id, asset.text)
            job = grouped.setdefault(key, RenderJob(kind="ordinary", text=asset.text))
        job.assets.append(asset)
    return sorted(
        grouped.values(),
        key=lambda job: (job.profile.narrator, job.kind, job.text, job.visual_prompt or ""),
    )


def matching_take_id(registry: dict[str, Any], job: RenderJob) -> str | None:
    contract = job.completion_contract_metadata
    for take_id, take in registry["takes"].items():
        if take.get("text") != job.text:
            continue
        provenance = take.get("provenance") or {}
        if provenance.get("voice_id") != job.profile.voice_id:
            continue
        if take.get("profile_id") != job.assets[0].profile_id:
            continue
        if take.get("completion_contract") != contract:
            continue
        if not set(asset.speaker_role for asset in job.assets).issubset(
            set(take.get("compatible_speaker_roles") or [])
        ):
            continue
        if not set(asset.mode for asset in job.assets).issubset(
            set(take.get("compatible_modes") or [])
        ):
            continue
        if not set(asset.variant for asset in job.assets).issubset(
            set(take.get("compatible_variants") or [])
        ):
            continue
        for asset in job.assets:
            existing = registry["bindings"].get(asset.id)
            if existing is not None and existing.get("take_id") != take_id:
                break
            validation_registry = {
                "schema_version": registry.get("schema_version"),
                "takes": registry["takes"],
                "bindings": {
                    asset.id: {
                        "take_id": take_id,
                        "approved_at": take.get("provenance", {}).get("approved_at"),
                    }
                },
            }
            try:
                resolve_approved_take(asset, validation_registry)
            except ApprovedTakeRegistryError as error:
                raise ValueError(f"Matching approved take {take_id} is invalid: {error}") from error
        else:
            return take_id
    return None


def take_metadata_matches(take: dict[str, Any], job: RenderJob) -> bool:
    return (
        take.get("text") == job.text
        and take.get("profile_id") == job.assets[0].profile_id
        and take.get("provenance", {}).get("voice_id") == job.profile.voice_id
        and take.get("completion_contract") == job.completion_contract_metadata
    )


def logical_take_id(audio_sha256: str, job: RenderJob) -> str:
    """Name a logical take when identical media has different approved metadata.

    Fully blank completion prompts intentionally contain only deterministic
    digital silence. Different prompts can therefore have the same MP3 bytes
    even though their text and completion contracts must remain independently
    auditable. The physical file stays content-addressed by ``audio_sha256``;
    this identifier addresses the distinct approval record.
    """

    identity = {
        "audio_sha256": audio_sha256,
        "profile_id": job.assets[0].profile_id,
        "voice_id": job.profile.voice_id,
        "text": job.text,
        "completion_contract": job.completion_contract_metadata,
    }
    digest = sha256_bytes(
        json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )
    )
    return f"logical-{digest}"


def merge_take_compatibility(take: dict[str, Any], job: RenderJob) -> None:
    speakers = set(take.get("compatible_speaker_roles") or [])
    if not speakers and take.get("speaker_role"):
        speakers.add(take.pop("speaker_role"))
    speakers.update(asset.speaker_role for asset in job.assets)
    take["compatible_speaker_roles"] = sorted(speakers)
    modes = set(take.get("compatible_modes") or [])
    modes.update(asset.mode for asset in job.assets)
    take["compatible_modes"] = sorted(modes)
    variants = set(take.get("compatible_variants") or [])
    variants.update(asset.variant for asset in job.assets)
    take["compatible_variants"] = sorted(variants)


def bind_take(registry: dict[str, Any], take_id: str, job: RenderJob, note: str) -> None:
    take = registry["takes"][take_id]
    merge_take_compatibility(take, job)
    approved_at = take["provenance"].get("approved_at")
    for asset in job.assets:
        existing = registry["bindings"].get(asset.id)
        if existing and existing.get("take_id") != take_id:
            raise ValueError(f"Asset already has a different approved take: {asset.id}")
        registry["bindings"][asset.id] = {
            "take_id": take_id,
            "approved_at": approved_at,
            "approval_note": note,
        }


def write_registry(registry: dict[str, Any]) -> None:
    directory = approved_audio_dir()
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / "registry.json"
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=".registry-",
        suffix=".json",
        dir=directory,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            json.dump(registry, temporary, ensure_ascii=False, indent=2)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        for attempt in range(20):
            try:
                os.replace(temporary_name, target)
                break
            except PermissionError:
                if attempt == 19:
                    raise
                # Windows can briefly deny replacement while a verifier or
                # virus scanner has registry.json open. Retry only this local
                # atomic rename; provider requests are never retried here.
                time.sleep(0.05)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def fragment_request_contract(job: RenderJob, text: str, model_id: str) -> dict[str, Any]:
    return {
        "profile_id": job.assets[0].profile_id,
        "text": text,
        **job.profile.as_provenance_contract(),
        # Completion fragments can deliberately use a different model from
        # the take's pinned default (for example supported phoneme markup).
        # Keep both values so a model change always owns a different stage.
        "fragment_model_id": model_id,
    }


def fragment_stage_path(job: RenderJob, text: str, model_id: str) -> Path:
    contract = fragment_request_contract(job, text, model_id)
    digest = sha256_bytes(
        json.dumps(contract, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )
    )
    return approved_audio_dir() / ".render-staging" / f"{digest}.json"


def load_staged_fragment(
    job: RenderJob,
    text: str,
    model_id: str,
) -> tuple[bytes, dict[str, Any]] | None:
    path = fragment_stage_path(job, text, model_id)
    if not path.is_file():
        return None
    try:
        envelope = json.loads(path.read_text(encoding="utf-8"))
        if envelope.get("schema_version") != RENDER_STAGING_SCHEMA_VERSION:
            raise ValueError("schema version")
        if envelope.get("contract") != fragment_request_contract(job, text, model_id):
            raise ValueError("request contract")
        payload = base64.b64decode(envelope.get("audio_base64", ""), validate=True)
        if envelope.get("bytes") != len(payload):
            raise ValueError("byte count")
        if envelope.get("audio_sha256") != sha256_bytes(payload):
            raise ValueError("checksum")
        probe_mp3(payload)
        request = envelope.get("provider_response")
        if not isinstance(request, dict):
            raise ValueError("provider response")
        original_cost = request.get("character_cost")
        if not isinstance(original_cost, int) or isinstance(original_cost, bool) or original_cost < 0:
            raise ValueError("character cost")
    except (OSError, json.JSONDecodeError, ValueError, TypeError) as error:
        raise ValueError(f"Staged provider fragment is invalid: {path.name}.") from error
    return payload, {
        **request,
        "original_character_cost": original_cost,
        "character_cost": original_cost,
        "incremental_character_cost": 0,
        "staged_reuse": True,
    }


def stage_fragment_once(
    job: RenderJob,
    text: str,
    model_id: str,
    payload: bytes,
    request: dict[str, Any],
) -> None:
    path = fragment_stage_path(job, text, model_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    envelope = {
        "schema_version": RENDER_STAGING_SCHEMA_VERSION,
        "contract": fragment_request_contract(job, text, model_id),
        "audio_sha256": sha256_bytes(payload),
        "bytes": len(payload),
        "audio_base64": base64.b64encode(payload).decode("ascii"),
        "provider_response": request,
    }
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.stem}-",
        suffix=".json",
        dir=path.parent,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            json.dump(envelope, temporary, ensure_ascii=False, sort_keys=True)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        try:
            os.link(temporary_name, path)
        except FileExistsError:
            staged = load_staged_fragment(job, text, model_id)
            if staged is None or staged[0] != payload:
                raise ValueError("A different response owns this staged provider request.")
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def request_audio(
    client: httpx.Client,
    job: RenderJob,
    text: str,
    model_id: str,
    max_incremental_character_cost: int | None = None,
) -> tuple[bytes, dict[str, Any]]:
    staged = load_staged_fragment(job, text, model_id)
    if staged is not None:
        return staged
    if max_incremental_character_cost is not None:
        if max_incremental_character_cost < 0:
            raise ValueError("Remaining character budget cannot be negative.")
        if len(text) > max_incremental_character_cost:
            raise ValueError(
                "The next unstaged provider request exceeds the remaining character budget."
            )
    profile = job.profile
    response = client.post(
        f"{ELEVENLABS_SPEECH_URL}/{profile.voice_id}",
        params={"output_format": profile.output_format},
        json={
            "text": text,
            "model_id": model_id,
            "seed": profile.seed,
            "voice_settings": profile.as_provenance_contract()["settings"],
        },
    )
    response.raise_for_status()
    raw_cost = response.headers.get("character-cost")
    cost_header_error: str | None = None
    if raw_cost is None:
        character_cost = len(text)
        character_cost_source = "text-length-fallback"
    else:
        try:
            character_cost = int(raw_cost)
            if character_cost < 0:
                raise ValueError("negative character cost")
            character_cost_source = "provider-header"
        except ValueError:
            # The paid bytes are still staged below before failing closed, so
            # an operator can inspect and reuse them without another request.
            character_cost = len(text)
            character_cost_source = "invalid-header-text-length-fallback"
            cost_header_error = f"Invalid character-cost provider header: {raw_cost!r}."
    request = {
        "model_id": model_id,
        "text": text,
        "character_cost": character_cost,
        "incremental_character_cost": character_cost,
        "character_cost_source": character_cost_source,
        "character_cost_header": raw_cost,
        "staged_reuse": False,
        "request_id": response.headers.get("request-id"),
        "trace_id": response.headers.get("x-trace-id"),
    }
    # Persist every billed HTTP-200 response before decoding, normalization,
    # stitching, or a later fragment can fail. Invalid audio remains forensic
    # evidence for a provider refund and the strict loader will not reuse it.
    stage_fragment_once(job, text, model_id, response.content, request)
    probe_mp3(response.content)
    if cost_header_error:
        raise ValueError(cost_header_error + " The paid response was staged locally.")
    if (
        max_incremental_character_cost is not None
        and character_cost > max_incremental_character_cost
    ):
        raise ValueError(
            "The provider-reported character cost exceeded the remaining budget; "
            "the paid response was staged locally and no later fragment was requested."
        )
    return response.content, request


def deterministic_completion_silence(
    job: RenderJob,
    approved_at: str,
) -> tuple[bytes, dict[str, Any]]:
    """Build an all-blank completion locally without a provider request."""

    if job.kind != "completion" or job.request_fragments():
        raise ValueError("Deterministic silence is only valid for a completion with no visible speech.")
    generated_at = datetime.now(timezone.utc).isoformat()
    payload = _encode_mp3(assemble_completion_fragment_samples(None, None))
    provenance = {
        "source": "deterministic-completion-silence",
        **job.profile.as_provenance_contract(),
        "stored_media": probe_mp3(payload),
        "processing": [
            "The completion contains no learner-visible speech on either side of the blank.",
            "Generated deterministic digital silence locally at 24 kHz mono, 96 kbps MP3; ElevenLabs was not called.",
        ],
        "generated_at": generated_at,
        "approved_at": approved_at,
        "request_id": None,
        "trace_id": None,
        "character_cost": 0,
        "incremental_character_cost": 0,
        "character_cost_upper_bound": 0,
        "provider_requests": [],
        "review": {
            "status": "approved-profile-render",
            "basis": "User approved the pinned character voices and unchanged ElevenLabs parameters on 2026-08-31.",
        },
    }
    return payload, provenance


def generate_take(
    client: httpx.Client,
    job: RenderJob,
    approved_at: str,
    max_incremental_character_cost: int | None = None,
) -> tuple[bytes, dict[str, Any]]:
    if not job.request_fragments():
        return deterministic_completion_silence(job, approved_at)

    requests: list[dict[str, Any]] = []
    fragments: list[bytes] = []
    for text, model_id in job.request_fragments():
        incremental_cost = sum(
            int(existing_request["incremental_character_cost"])
            for existing_request in requests
        )
        remaining_budget = (
            None
            if max_incremental_character_cost is None
            else max_incremental_character_cost - incremental_cost
        )
        payload, request = request_audio(
            client,
            job,
            text,
            model_id,
            max_incremental_character_cost=remaining_budget,
        )
        probe_mp3(payload)
        fragments.append(payload)
        requests.append(request)

    if job.kind == "ordinary":
        final_payload = normalize_course_audio(
            fragments[0],
            job.text,
            job.assets[0].mode,
            job.assets[0].variant,
            "mp3",
            preserve_voice_pitch=True,
            preserve_natural_timing=True,
        )
        processing = [
            "ElevenLabs provider response normalized with course_audio.normalize_course_audio.",
            "Stored as 24 kHz mono, 96 kbps MP3 with premium voice pitch and natural timing preserved.",
        ]
    else:
        contract = completion_prompt_contract(
            job.visual_prompt or "",
            job.text,
            job.blank_text or "",
        )
        prefix, suffix = completion_prompt_fragments(contract)
        cursor = 0
        prefix_audio = fragments[cursor] if prefix else None
        cursor += 1 if prefix else 0
        suffix_audio = fragments[cursor] if suffix else None
        final_payload = _encode_mp3(
            assemble_completion_fragment_samples(prefix_audio, suffix_audio)
        )
        processing = [
            "Generated only the learner-visible fragments; the missing answer was never sent to ElevenLabs.",
            "Stitched visible fragments around deterministic digital silence at 24 kHz mono, 96 kbps MP3.",
        ]

    stored_media = probe_mp3(final_payload)
    profile_contract = job.profile.as_provenance_contract()
    request_ids = [request["request_id"] for request in requests if request["request_id"]]
    trace_ids = [request["trace_id"] for request in requests if request["trace_id"]]
    provenance = {
        "source": "elevenlabs-offline-render",
        **profile_contract,
        "stored_media": stored_media,
        "processing": processing,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": approved_at,
        "request_id": request_ids[0] if len(request_ids) == 1 else request_ids or None,
        "trace_id": trace_ids[0] if len(trace_ids) == 1 else trace_ids or None,
        # Total cost stays stable when a staged response is reused; the
        # incremental value is only what this execution newly purchased.
        "character_cost": sum(request["character_cost"] for request in requests),
        "incremental_character_cost": sum(
            request["incremental_character_cost"] for request in requests
        ),
        "provider_requests": requests,
        "review": {
            "status": "approved-profile-render",
            "basis": "User approved the pinned character voices and unchanged ElevenLabs parameters on 2026-08-31.",
        },
    }
    return final_payload, provenance


def verify_legacy_backend(client: httpx.Client, base_url: str) -> None:
    response = client.get(f"{base_url}/api/audio/health")
    response.raise_for_status()
    health = response.json()
    expected_voices = {
        "female-teacher": render_profile_for("teacher", "prompt").voice_id,
        "female-warm": render_profile_for("ana", "prompt").voice_id,
        "male-warm": render_profile_for("luis", "prompt").voice_id,
    }
    cast = health.get("elevenlabs_premium_cast") or {}
    if health.get("elevenlabs_audio_configured") is not True:
        raise ValueError("Legacy Render backend does not have ElevenLabs configured.")
    if health.get("elevenlabs_premium_model") != "eleven_multilingual_v2":
        raise ValueError("Legacy Render backend model does not match the pinned profile.")
    if any(cast.get(narrator) != voice_id for narrator, voice_id in expected_voices.items()):
        raise ValueError("Legacy Render backend cast does not match the pinned profile.")
    if health.get("elevenlabs_premium_prompt_speed") != 0.70:
        raise ValueError("Legacy Render backend prompt speed does not match the pinned profile.")
    if health.get("elevenlabs_premium_pronunciation_speed") != 0.70:
        raise ValueError("Legacy Render backend pronunciation speed does not match the pinned profile.")


def capture_legacy_backend_take(
    client: httpx.Client,
    base_url: str,
    job: RenderJob,
    approved_at: str,
) -> tuple[bytes, dict[str, Any]]:
    if not job.request_fragments():
        return deterministic_completion_silence(job, approved_at)

    profile = job.profile
    captured_at = datetime.now(timezone.utc).isoformat()
    if job.kind == "ordinary":
        response = client.get(
            f"{base_url}/api/audio/course.mp3",
            params={
                "text": job.text,
                "mode": job.assets[0].mode,
                "lang": "en-US",
                "variant": job.assets[0].variant,
                "provider": profile.provider,
                "narrator": profile.narrator,
            },
        )
        processing = [
            "Captured byte-for-byte from the configured legacy Render backend during the persistent-audio migration.",
            "The backend used the pinned ElevenLabs profile and course_audio.normalize_course_audio pipeline.",
        ]
    else:
        response = client.get(
            f"{base_url}/api/audio/course-completion.mp3",
            params={
                "visual_prompt": job.visual_prompt,
                "full_text": job.text,
                "blank_text": job.blank_text,
                "mode": job.assets[0].mode,
                "lang": "en-US",
                "variant": job.assets[0].variant,
                "provider": profile.provider,
                "narrator": profile.narrator,
            },
        )
        processing = [
            "Captured byte-for-byte from the configured legacy Render backend during the persistent-audio migration.",
            "The backend generated only visible completion fragments and stitched them around deterministic digital silence.",
        ]
    response.raise_for_status()
    if response.headers.get("x-audio-fail-silent", "").lower() == "true":
        raise ValueError(
            "Legacy Render backend returned fail-closed silence: "
            + response.headers.get("x-audio-fail-silent-reason", "unknown")
        )
    if response.headers.get("x-audio-provider") != profile.provider:
        raise ValueError("Legacy Render backend did not return the requested ElevenLabs provider.")
    payload = response.content
    stored_media = probe_mp3(payload)
    provenance = {
        "source": "captured-legacy-render-backend",
        **profile.as_provenance_contract(),
        "stored_media": stored_media,
        "processing": processing,
        "generated_at": None,
        "captured_at": captured_at,
        "approved_at": approved_at,
        # The legacy proxy does not forward provider billing/request headers.
        # Keep these unknown instead of inventing audit values.
        "request_id": None,
        "trace_id": None,
        "character_cost": None,
        "character_cost_upper_bound": job.estimated_character_cost(),
        "provider_requests": [
            {
                "source": "legacy-render-backend",
                "provider": response.headers.get("x-audio-provider"),
                "audio_profile": response.headers.get("x-audio-profile"),
            }
        ],
        "review": {
            "status": "approved-profile-render",
            "basis": "User approved the pinned character voices and unchanged ElevenLabs parameters on 2026-08-31.",
        },
    }
    return payload, provenance


def add_generated_take(
    registry: dict[str, Any],
    job: RenderJob,
    payload: bytes,
    provenance: dict[str, Any],
) -> str:
    audio_sha256 = sha256_bytes(payload)
    directory = approved_audio_dir()
    takes_directory = directory / "takes"
    takes_directory.mkdir(parents=True, exist_ok=True)
    target = takes_directory / f"{audio_sha256}.mp3"
    if target.exists():
        if target.read_bytes() != payload:
            raise ValueError(f"Hash-named take path contains different bytes: {target}")
    else:
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{audio_sha256}-",
            suffix=".mp3",
            dir=takes_directory,
        )
        try:
            with os.fdopen(descriptor, "wb") as temporary:
                temporary.write(payload)
                temporary.flush()
                os.fsync(temporary.fileno())
            try:
                os.link(temporary_name, target)
            except FileExistsError:
                if target.read_bytes() != payload:
                    raise ValueError(f"Hash-named take path contains different bytes: {target}")
        finally:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)
    take_id = audio_sha256
    take = registry["takes"].get(take_id)
    if take is not None and not take_metadata_matches(take, job):
        take_id = logical_take_id(audio_sha256, job)
        take = registry["takes"].get(take_id)
    if take is None:
        take = {
            "file": f"takes/{audio_sha256}.mp3",
            "audio_sha256": audio_sha256,
            "bytes": len(payload),
            "text": job.text,
            "compatible_speaker_roles": [],
            "profile_id": job.assets[0].profile_id,
            "compatible_modes": [],
            "compatible_variants": [],
            "provenance": provenance,
        }
        if job.completion_contract_metadata is not None:
            take["completion_contract"] = job.completion_contract_metadata
        registry["takes"][take_id] = take
    elif not take_metadata_matches(take, job):
        raise ValueError("Existing take metadata does not match its generated bytes.")
    merge_take_compatibility(take, job)
    return take_id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Plan or perform bounded operator-only ElevenLabs renders for immutable course-audio assets. "
            "Dry-run is the default; there are no automatic retries or provider fallbacks."
        )
    )
    parser.add_argument("--all-named-speakers", action="store_true")
    parser.add_argument(
        "--all-missing-after-reviewed-seed",
        action="store_true",
        help="Render only assets not already covered by the approved registry or reviewed static manifest.",
    )
    parser.add_argument("--lesson-id", action="append")
    parser.add_argument("--asset-id", action="append")
    parser.add_argument("--env-file", type=Path)
    parser.add_argument(
        "--legacy-backend-base-url",
        help=(
            "Migration-only source for the already-configured Render backend. "
            "The backend must return ElevenLabs without fallback; this stops working after learner TTS is retired."
        ),
    )
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--promote", action="store_true")
    parser.add_argument("--max-character-cost", type=int)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.env_file:
            load_env_file(args.env_file.resolve())
        jobs = render_jobs(args)
        registry = load_approved_take_registry()
        existing: list[tuple[RenderJob, str]] = []
        pending: list[RenderJob] = []
        for job in jobs:
            take_id = matching_take_id(registry, job)
            if take_id:
                existing.append((job, take_id))
            else:
                pending.append(job)
        legacy_base_url = str(args.legacy_backend_base_url or "").strip().rstrip("/")
        provider_requests_needed = 0
        reusable_staged_fragments = 0
        estimated_cost = 0
        for job in pending:
            for text, model_id in job.request_fragments():
                if not legacy_base_url and load_staged_fragment(job, text, model_id) is not None:
                    reusable_staged_fragments += 1
                    continue
                provider_requests_needed += 1
                estimated_cost += len(text)
        summary = {
            "selected_assets": sum(len(job.assets) for job in jobs),
            "unique_takes": len(jobs),
            "reusable_approved_takes": len(existing),
            "reusable_staged_fragments": reusable_staged_fragments,
            "provider_requests_needed": provider_requests_needed,
            "estimated_character_cost": estimated_cost,
            "execute": args.execute,
            "promote": args.promote,
        }
        print(json.dumps(summary, indent=2), flush=True)
        if not args.execute:
            return 0
        if not args.promote:
            raise ValueError("--execute requires --promote so paid output is persisted.")
        if args.max_character_cost is None or args.max_character_cost <= 0:
            raise ValueError("--execute requires a positive --max-character-cost.")
        if estimated_cost > args.max_character_cost:
            raise ValueError(
                f"Planned character cost {estimated_cost} exceeds budget {args.max_character_cost}."
            )
        api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
        if not api_key and not legacy_base_url:
            raise ValueError("ELEVENLABS_API_KEY is required for --execute.")
        if api_key and legacy_base_url:
            raise ValueError("Choose direct ELEVENLABS_API_KEY or --legacy-backend-base-url, not both.")
        if args.promote:
            for job, take_id in existing:
                bind_take(
                    registry,
                    take_id,
                    job,
                    "Reuse the exact reviewed take for the same pinned voice and spoken text.",
                )
            write_registry(registry)

        approved_at = datetime.now(timezone.utc).isoformat()
        reported_character_cost = 0
        audited_character_cost = 0
        character_cost_upper_bound = 0
        client_headers = (
            {
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            }
            if api_key
            else {"Accept": "audio/mpeg"}
        )
        with httpx.Client(
            timeout=60.0,
            headers=client_headers,
        ) as client:
            if legacy_base_url:
                verify_legacy_backend(client, legacy_base_url)
            for position, job in enumerate(pending, 1):
                if legacy_base_url:
                    payload, provenance = capture_legacy_backend_take(
                        client,
                        legacy_base_url,
                        job,
                        approved_at,
                    )
                    character_cost_upper_bound += job.estimated_character_cost()
                else:
                    payload, provenance = generate_take(
                        client,
                        job,
                        approved_at,
                        max_incremental_character_cost=(
                            args.max_character_cost - reported_character_cost
                        ),
                    )
                    reported_character_cost += int(
                        provenance["incremental_character_cost"]
                    )
                    audited_character_cost += int(provenance["character_cost"])
                    character_cost_upper_bound = reported_character_cost
                if character_cost_upper_bound > args.max_character_cost:
                    raise ValueError(
                        f"Provider-reported character cost exceeded budget after request {position}."
                    )
                if args.promote:
                    take_id = add_generated_take(registry, job, payload, provenance)
                    bind_take(
                        registry,
                        take_id,
                        job,
                        "Generated offline with the approved character voice and unchanged pinned parameters.",
                    )
                    write_registry(registry)
                print(
                    f"rendered {position}/{len(pending)} "
                    f"({len(job.assets)} bindings, cumulative character ceiling {character_cost_upper_bound})",
                    flush=True,
                )
        print(
            json.dumps(
                {
                    "rendered_takes": len(pending),
                    "reused_takes": len(existing),
                    "reported_incremental_character_cost": (
                        None if legacy_base_url else reported_character_cost
                    ),
                    "audited_character_cost": (
                        None if legacy_base_url else audited_character_cost
                    ),
                    "character_cost_upper_bound": character_cost_upper_bound,
                    "promoted": args.promote,
                },
                indent=2,
            ),
            flush=True,
        )
        return 0
    except (ValueError, OSError, httpx.HTTPError) as error:
        print(json.dumps({"error": str(error)}, indent=2), file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
