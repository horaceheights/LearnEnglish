import base64
import math
import struct
import wave
from io import BytesIO
from pathlib import Path

import streamlit as st

from models import LESSON_1, LessonCard


st.set_page_config(page_title="Learn English Lab", page_icon="L", layout="wide")


def build_tone_data_uri(frequency: int, duration_ms: int, volume: float) -> str:
    sample_rate = 22050
    frame_count = int(sample_rate * (duration_ms / 1000))
    audio = BytesIO()

    with wave.open(audio, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for frame in range(frame_count):
            sample = volume * math.sin(2 * math.pi * frequency * frame / sample_rate)
            frames.extend(struct.pack("<h", int(sample * 32767)))
        wav_file.writeframes(bytes(frames))

    encoded = base64.b64encode(audio.getvalue()).decode("ascii")
    return f"data:audio/wav;base64,{encoded}"


CORRECT_SOUND = build_tone_data_uri(880, 140, 0.22)
WRONG_SOUND = build_tone_data_uri(220, 180, 0.18)


def image_to_data_uri(image_path: Path) -> str:
    mime = "image/png"
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def get_query_int(name: str, default: int) -> int:
    value = st.query_params.get(name)
    if value is None:
        return default
    try:
        return int(str(value))
    except ValueError:
        return default


def sync_query_state(include_click: bool = False, choice: str | None = None) -> None:
    params = {
        "progress": str(st.session_state.card_index),
        "score": str(st.session_state.score),
    }
    if include_click and choice is not None:
        params["card"] = str(st.session_state.card_index)
        params["choice"] = choice
    st.query_params.from_dict(params)


def init_state() -> None:
    st.session_state.setdefault("card_index", 0)
    st.session_state.setdefault("score", 0)
    st.session_state.setdefault("completed_cards", {})
    st.session_state.setdefault("last_result", None)
    st.session_state.setdefault("selected_option_id", None)
    st.session_state.setdefault("pending_sound", None)
    st.session_state.setdefault("wrong_attempts", {})


def reset_lesson() -> None:
    st.session_state.card_index = 0
    st.session_state.score = 0
    st.session_state.completed_cards = {}
    st.session_state.last_result = None
    st.session_state.selected_option_id = None
    st.session_state.pending_sound = None
    st.session_state.wrong_attempts = {}


def play_pending_sound() -> None:
    sound = st.session_state.pop("pending_sound", None)
    if not sound:
        return
    st.markdown(
        f"""
        <audio autoplay>
            <source src="{sound}" type="audio/wav">
        </audio>
        """,
        unsafe_allow_html=True,
    )


def render_styles() -> None:
    st.markdown(
        """
        <style>
        .choice-card {
            border: 3px solid #d8e2da;
            border-radius: 22px;
            overflow: hidden;
            background: #ffffff;
            transition: box-shadow 0.12s ease, border-color 0.12s ease;
            box-shadow: 0 8px 24px rgba(12, 24, 18, 0.08);
            padding: 8px;
        }
        .choice-card img {
            width: 100%;
            height: 320px;
            object-fit: cover;
            display: block;
            border-radius: 16px;
        }
        .choice-card.is-correct {
            border-color: #2b8a5a;
            box-shadow: 0 0 0 6px rgba(43, 138, 90, 0.18), 0 14px 28px rgba(12, 24, 18, 0.14);
        }
        .choice-card.is-wrong {
            border-color: #d84b4b;
            box-shadow: 0 0 0 6px rgba(216, 75, 75, 0.20), 0 14px 28px rgba(72, 12, 12, 0.14);
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_header() -> None:
    st.title("Learn English Lab")
    st.write("Prototype lesson flow for a Rosetta-style English app for Spanish-speaking learners.")


def render_sidebar() -> None:
    total_cards = len(LESSON_1.cards)
    st.sidebar.markdown("**Lesson**")
    st.sidebar.write(LESSON_1.title)
    st.sidebar.caption(f"{LESSON_1.level} | {LESSON_1.goal}")
    st.sidebar.markdown("**Vocabulary**")
    st.sidebar.write(", ".join(LESSON_1.vocabulary))
    st.sidebar.metric("Progress", f"{st.session_state.card_index + 1} / {total_cards}")
    st.sidebar.metric("Score", f"{st.session_state.score} / {total_cards}")
    if st.sidebar.button("Restart Lesson", use_container_width=True):
        reset_lesson()
        st.rerun()


def submit_answer(card: LessonCard, option_id: str) -> None:
    current_index = st.session_state.card_index
    is_correct = option_id == card.correct_option_id
    st.session_state.selected_option_id = option_id
    st.session_state.last_result = "correct" if is_correct else "wrong"
    st.session_state.pending_sound = CORRECT_SOUND if is_correct else WRONG_SOUND

    if is_correct:
        if current_index not in st.session_state.completed_cards:
            st.session_state.completed_cards[current_index] = True
            if current_index not in st.session_state.wrong_attempts:
                st.session_state.score += 1
    else:
        st.session_state.wrong_attempts[current_index] = True

    st.rerun()


def next_card() -> None:
    st.session_state.card_index += 1
    st.session_state.last_result = None
    st.session_state.selected_option_id = None
    st.rerun()


def render_feedback(card: LessonCard) -> None:
    current_index = st.session_state.card_index
    if st.session_state.last_result is None:
        return

    if st.session_state.last_result == "correct":
        st.success("Correct.")
        if st.button("Next", key=f"next_{current_index}", type="primary", use_container_width=True):
            next_card()
    else:
        st.error("Not quite.")

    selected_id = st.session_state.selected_option_id
    correct_id = card.correct_option_id
    selected_label = next((option.id for option in card.options if option.id == selected_id), "")
    correct_label = next((option.id for option in card.options if option.id == correct_id), "")

    if st.session_state.last_result == "wrong":
        st.caption(f"You picked: {selected_label.replace('-', ' ')}")
        st.caption(f"Correct answer: {correct_label.replace('-', ' ')}")


def render_card(card: LessonCard) -> None:
    current_index = st.session_state.card_index
    st.caption(card.stage)
    st.subheader(card.prompt)

    columns = st.columns(2, gap="large")
    for index, option in enumerate(card.options):
        with columns[index]:
            image_uri = image_to_data_uri(option.image_path)
            css_class = "choice-card"
            if st.session_state.selected_option_id == option.id:
                if st.session_state.last_result == "correct":
                    css_class += " is-correct"
                elif st.session_state.last_result == "wrong":
                    css_class += " is-wrong"

            if current_index in st.session_state.completed_cards:
                st.markdown(
                    f'<div class="{css_class}"><img src="{image_uri}" alt="{option.id}"></div>',
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    f'<div class="{css_class}"><img src="{image_uri}" alt="{option.id}"></div>',
                    unsafe_allow_html=True,
                )
                disabled = current_index in st.session_state.completed_cards
                if st.button("Choose", key=f"choose_{current_index}_{option.id}", use_container_width=True, disabled=disabled):
                    submit_answer(card, option.id)

    render_feedback(card)


def render_completion() -> None:
    total_cards = len(LESSON_1.cards)
    st.success("Lesson complete.")
    st.write(f"You got {st.session_state.score} out of {total_cards} correct.")
    st.write("A card only counts as good if the learner gets it right on the first try.")
    if st.button("Start Again", type="primary"):
        reset_lesson()
        st.rerun()


def main() -> None:
    init_state()
    render_styles()
    render_header()
    render_sidebar()
    play_pending_sound()

    if st.session_state.card_index >= len(LESSON_1.cards):
        render_completion()
        return

    current_card = LESSON_1.cards[st.session_state.card_index]
    render_card(current_card)


if __name__ == "__main__":
    main()
