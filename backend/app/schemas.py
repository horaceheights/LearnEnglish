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
    visual_description_es: str | None = None
    spanish_translation: str | None = None
    pedagogy_note: str | None = None
    audio_speaker: str | None = None
    answer_audio_speaker: str | None = None
    audio_turns: list[CourseAudioTurn] = Field(default_factory=list)
    answer_audio_turns: list[CourseAudioTurn] = Field(default_factory=list)
    audio_revision: int = Field(default=1, ge=1)
    answer_audio_revision: int = Field(default=1, ge=1)
    audio_assets: list[CourseAudioAsset] = Field(default_factory=list)


class MissionTarget(BaseModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    correct_option_id: str = Field(min_length=1)

    @field_validator("id", "label", "correct_option_id")
    @classmethod
    def require_exact_nonempty_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Mission target values must not be blank.")
        if value != value.strip():
            raise ValueError(
                "Mission target values must not have leading or trailing whitespace."
            )
        return value


class MissionLessonCard(LessonCard):
    mission_chapter_id: str = Field(min_length=1)
    mission_visual_key: str = Field(min_length=1)
    instruction_es: str = Field(min_length=1)
    success_outcome_es: str = Field(min_length=1)
    mission_tutorial_mode: Literal["guided-no-fail"] | None = None
    mission_targets: list[MissionTarget] = Field(default_factory=list)

    @field_validator(
        "mission_chapter_id",
        "mission_visual_key",
        "instruction_es",
        "success_outcome_es",
    )
    @classmethod
    def require_exact_card_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Mission card values must not be blank.")
        if value != value.strip():
            raise ValueError("Mission card values must not have surrounding whitespace.")
        return value

    @model_validator(mode="after")
    def require_valid_mission_targets(self):
        target_interactions = {"mission-match", "mission-truth-stamp"}
        option_ids = {option.id for option in self.options}
        target_ids = [target.id for target in self.mission_targets]
        if len(target_ids) != len(set(target_ids)):
            raise ValueError("Mission target IDs must be unique within a card.")
        target_option_ids = [target.correct_option_id for target in self.mission_targets]
        if len(target_option_ids) != len(set(target_option_ids)):
            raise ValueError(
                "Mission targets must not reuse one answer option across multiple targets."
            )
        missing_option_ids = sorted(
            {
                target.correct_option_id
                for target in self.mission_targets
                if target.correct_option_id not in option_ids
            }
        )
        if missing_option_ids:
            raise ValueError(
                "Mission targets reference missing option IDs: "
                + ", ".join(missing_option_ids)
                + "."
            )
        if self.interaction_type == "mission-match" and not self.mission_targets:
            raise ValueError("mission-match cards require at least one mission target.")
        expected_correct_ids = self.correct_option_ids or [self.correct_option_id]
        if self.mission_targets and target_option_ids != expected_correct_ids:
            raise ValueError(
                "Mission target order must match the card's correct option order."
            )
        if self.interaction_type not in target_interactions and self.mission_targets:
            raise ValueError(
                "Only target-based mission interactions may declare mission targets."
            )
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
    completion_title: str = Field(min_length=1)
    completion_message: str = Field(min_length=1)
    chapters: list[MissionChapter] = Field(min_length=1)

    @field_validator(
        "label",
        "title",
        "briefing",
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
