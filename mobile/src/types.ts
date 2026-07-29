export type ChoiceOption = {
  id: string;
  image_url: string;
  label: string | null;
};

export type LessonCard = {
  prompt: string;
  stage: string;
  correct_option_id: string;
  options: ChoiceOption[];
  audio_text: string | null;
  answer_audio_text: string | null;
  prompt_image_url: string;
};

export type Lesson = {
  id: string;
  title: string;
  level: string;
  goal: string;
  vocabulary: string[];
  cards: LessonCard[];
};

export type WordScore = {
  word?: string;
  quality_score?: number;
  error_type?: string;
};

export type PronunciationResult = {
  recognized_text?: string;
  text_score?: {
    quality_score?: number;
    word_score_list?: WordScore[];
  };
};
