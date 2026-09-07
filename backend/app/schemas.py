from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .course_audio_profile import narrator_for_speaker


class ChoiceOption(BaseModel):
    id: str
    image_url: str = ""
    label: str | None = None


class CourseAudioAsset(BaseModel):
    """Immutable audio contract published by an approved lesson release."""

    id: str
    purpose: str
    text: str
    mode: str
    variant: str
    image_ref: str
    semantic_role: str
    speaker_role: str
    profile_id: str
    revision: int


class CourseAudioTurn(BaseModel):
    text: str = Field(min_length=1)
    speaker_role: str = Field(min_length=1)
    image_url: str = Field(min_length=1)

    @field_validator("text", "speaker_role", "image_url")
    @classmethod
    def require_exact_nonempty_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Course audio turn values must not be blank.")
        if value != value.strip():
            raise ValueError(
                "Course audio turn values must not have leading or trailing whitespace."
            )
        return value

    @field_validator("speaker_role")
    @classmethod
    def require_supported_speaker_role(cls, value: str) -> str:
        narrator_for_speaker(value)
        return value


class LessonCard(BaseModel):
    slide_id: str | None = None
    interaction_type: str | None = None
    prompt: str
    stage: str
    correct_option_id: str
    correct_option_ids: list[str] = Field(default_factory=list)
    options: list[ChoiceOption]
    audio_text: str | None = None
    answer_audio_text: str | None = None
    prompt_image_url: str = ""
    spanish_translation: str | None = None
    pedagogy_note: str | None = None
    audio_speaker: str | None = None
    answer_audio_speaker: str | None = None
    audio_turns: list[CourseAudioTurn] = Field(default_factory=list)
    answer_audio_turns: list[CourseAudioTurn] = Field(default_factory=list)
    audio_revision: int = Field(default=1, ge=1)
    answer_audio_revision: int = Field(default=1, ge=1)
    audio_assets: list[CourseAudioAsset] = Field(default_factory=list)


class MissionNormalizedRect(BaseModel):
    """A mission hit/destination area expressed relative to its hero still."""

    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def require_rect_inside_image(self):
        if self.x + self.width > 1:
            raise ValueError("Mission target rectangles must fit within image width.")
        if self.y + self.height > 1:
            raise ValueError("Mission target rectangles must fit within image height.")
        return self


class MissionGameTarget(BaseModel):
    id: str = Field(min_length=1)
    label_es: str = Field(min_length=1)
    rect: MissionNormalizedRect
    accepted_option_ids: list[str] = Field(min_length=1)

    @field_validator("id", "label_es")
    @classmethod
    def require_exact_nonempty_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Mission target values must not be blank.")
        if value != value.strip():
            raise ValueError(
                "Mission target values must not have leading or trailing whitespace."
            )
        return value

    @field_validator("accepted_option_ids")
    @classmethod
    def require_unique_exact_option_ids(cls, values: list[str]) -> list[str]:
        if any(not value.strip() or value != value.strip() for value in values):
            raise ValueError("Accepted mission option IDs must be exact nonblank values.")
        if len(values) != len(set(values)):
            raise ValueError("Accepted mission option IDs must be unique within a target.")
        return values


class MissionGame(BaseModel):
    kind: Literal[
        "hotspot",
        "label-placement",
        "relationship-link",
        "action-sequence",
        "not-correction",
        "who-dialogue",
        "speak",
        "finale",
    ]
    instruction_es: str = Field(min_length=1)
    validation: Literal["single", "ordered", "unordered"]
    targets: list[MissionGameTarget] = Field(min_length=1)
    tutorial_mode: Literal["guided-no-fail"] | None = None
    cue_audio_text: str | None = None

    @field_validator("instruction_es")
    @classmethod
    def require_exact_instruction(cls, value: str) -> str:
        if not value.strip() or value != value.strip():
            raise ValueError("Mission instructions must be exact nonblank values.")
        return value

    @field_validator("cue_audio_text")
    @classmethod
    def require_exact_optional_cue(cls, value: str | None) -> str | None:
        if value is not None and (not value.strip() or value != value.strip()):
            raise ValueError("Mission cue audio must be an exact nonblank value.")
        return value

    @model_validator(mode="after")
    def require_coherent_target_plan(self):
        target_ids = [target.id for target in self.targets]
        if len(target_ids) != len(set(target_ids)):
            raise ValueError("Mission target IDs must be unique within a card.")
        if self.validation == "single" and len(self.targets) != 1:
            raise ValueError("Single mission validation requires exactly one target.")
        if self.validation == "ordered" and len(self.targets) < 2:
            raise ValueError("Ordered mission validation requires at least two targets.")
        if self.tutorial_mode is not None and self.kind != "hotspot":
            raise ValueError("Guided no-fail tutorials are reserved for hotspot missions.")
        return self


class MissionLessonCard(LessonCard):
    mission_chapter_id: str = Field(min_length=1)
    mission_game: MissionGame

    @field_validator("mission_chapter_id")
    @classmethod
    def require_exact_chapter_id(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("Mission chapter IDs must not have surrounding whitespace.")
        return value

    @model_validator(mode="after")
    def require_game_targets_to_match_answers(self):
        option_ids = {option.id for option in self.options}
        accepted_ids = [
            option_id
            for target in self.mission_game.targets
            for option_id in target.accepted_option_ids
        ]
        missing_ids = sorted(set(accepted_ids) - option_ids)
        if missing_ids:
            raise ValueError(
                "Mission targets reference missing option IDs: "
                + ", ".join(missing_ids)
                + "."
            )
        if len(accepted_ids) != len(set(accepted_ids)):
            raise ValueError(
                "One mission option cannot satisfy more than one target on the same card."
            )

        expected_ids = self.correct_option_ids or [self.correct_option_id]
        if self.mission_game.validation == "ordered":
            if accepted_ids != expected_ids:
                raise ValueError(
                    "Ordered mission target answers must match correct_option_ids in order."
                )
        elif set(accepted_ids) != set(expected_ids):
            raise ValueError(
                "Mission target answers must match the card's declared correct options."
            )

        if self.mission_game.kind == "speak":
            if self.stage != "Speak" or self.mission_game.validation != "single":
                raise ValueError("Mission speak games require one Speak-stage target.")
        elif self.stage == "Speak" and self.mission_game.kind != "finale":
            raise ValueError("Only speak or finale mission games may use the Speak stage.")
        return self


class MissionChapter(BaseModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    objective: str = Field(min_length=1)

    @field_validator("id", "title", "objective")
    @classmethod
    def require_exact_nonempty_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Mission chapter values must not be blank.")
        if value != value.strip():
            raise ValueError(
                "Mission chapter values must not have leading or trailing whitespace."
            )
        return value


class MissionPresentation(BaseModel):
    label: str = Field(min_length=1)
    title: str = Field(min_length=1)
    briefing: str = Field(min_length=1)
    kickoff_image_url: str = Field(min_length=1)
    objectives: list[str] = Field(min_length=1)
    completion_title: str = Field(min_length=1)
    completion_message: str = Field(min_length=1)
    chapters: list[MissionChapter] = Field(min_length=1)

    @field_validator(
        "label",
        "title",
        "briefing",
        "kickoff_image_url",
        "completion_title",
        "completion_message",
    )
    @classmethod
    def require_exact_nonempty_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Mission presentation values must not be blank.")
        if value != value.strip():
            raise ValueError(
                "Mission presentation values must not have leading or trailing whitespace."
            )
        return value

    @field_validator("objectives")
    @classmethod
    def require_unique_exact_objectives(cls, values: list[str]) -> list[str]:
        if any(not value.strip() or value != value.strip() for value in values):
            raise ValueError("Mission objectives must be exact nonblank values.")
        if len(values) != len(set(values)):
            raise ValueError("Mission objectives must be unique.")
        return values

    @model_validator(mode="after")
    def require_unique_chapter_ids(self):
        chapter_ids = [chapter.id for chapter in self.chapters]
        if len(chapter_ids) != len(set(chapter_ids)):
            raise ValueError("Mission chapter IDs must be unique.")
        return self


class Lesson(BaseModel):
    id: str
    title: str
    level: str
    unit_id: str
    unit_title: str
    unit_outcome: str = ""
    lesson_id: str
    lesson_title: str
    sub_lesson_id: str
    sub_lesson_title: str
    goal: str
    vocabulary: list[str]
    review_vocabulary: list[str] = Field(default_factory=list)
    grammar_function: str = ""
    prerequisite: str = ""
    speaking_outcome: str = ""
    purposeful_review_slides: list[str] = Field(default_factory=list)
    cards: list[LessonCard]


class MissionLesson(Lesson):
    experience_type: Literal["mission"]
    content_revision: int = Field(ge=1)
    mission: MissionPresentation
    cards: list[MissionLessonCard]

    @model_validator(mode="after")
    def require_declared_contiguous_chapters(self):
        declared_ids = [chapter.id for chapter in self.mission.chapters]
        declared = set(declared_ids)
        card_ids = [card.mission_chapter_id for card in self.cards]

        unknown_ids = sorted(set(card_ids) - declared)
        if unknown_ids:
            raise ValueError(
                f"Mission cards reference undeclared chapters: {', '.join(unknown_ids)}."
            )

        missing_ids = [chapter_id for chapter_id in declared_ids if chapter_id not in card_ids]
        if missing_ids:
            raise ValueError(
                f"Mission chapters have no cards: {', '.join(missing_ids)}."
            )

        encountered_ids: list[str] = []
        for chapter_id in card_ids:
            if not encountered_ids or encountered_ids[-1] != chapter_id:
                encountered_ids.append(chapter_id)
        if encountered_ids != declared_ids:
            raise ValueError(
                "Mission cards must follow the declared chapter order without returning "
                "to an earlier chapter."
            )
        return self


class AzureAssessmentInterpretRequest(BaseModel):
    expected_text: str
    payload: dict[str, Any]
    level: str | None = None
    exercise_type: str | None = None
