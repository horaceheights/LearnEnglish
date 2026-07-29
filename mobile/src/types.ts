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
  unit_id?: string;
  unit_title?: string;
  lesson_id?: string;
  lesson_title?: string;
  sub_lesson_id?: string;
  sub_lesson_title?: string;
  goal: string;
  vocabulary: string[];
  cards: LessonCard[];
};

export type LessonSummary = Omit<Lesson, 'goal' | 'vocabulary' | 'cards'>;

export type LearnerProfile = {
  userId?: string;
  displayName: string;
  level: string;
  immediateGoal: string;
  learningMode: string;
  confidence: string;
  sessionLength: string;
  challenge: string[];
};

export type SavedUser = {
  id: string;
  display_name: string;
  profile: Omit<LearnerProfile, 'userId' | 'displayName'> & Partial<LearnerProfile>;
};

export type WordScore = {
  word?: string;
  quality_score?: number;
  error_type?: string;
  syllable_score_list?: { letters?: string; quality_score?: number }[];
  phone_score_list?: { phone?: string; quality_score?: number }[];
};

export type PronunciationResult = {
  recognized_text?: string;
  text_score?: {
    quality_score?: number;
    word_score_list?: WordScore[];
    azure_scores?: {
      accuracy?: number;
      fluency?: number;
      completeness?: number;
    };
  };
};
