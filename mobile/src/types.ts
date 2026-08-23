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
  spanish_translation?: string | null;
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

export type LessonProgress = {
  lesson_id: string;
  completed: true;
  passed: boolean;
  score: number;
  total_cards: number;
  percentage: number;
  completed_at: string;
};

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
  offset_ms?: number;
  duration_ms?: number;
  syllable_score_list?: { letters?: string; quality_score?: number; offset_ms?: number; duration_ms?: number }[];
  phone_score_list?: { phone?: string; quality_score?: number; offset_ms?: number; duration_ms?: number }[];
};

export type PronunciationFeedbackCode =
  | 'CLEAR_AND_SMOOTH'
  | 'CLEAR_BUT_SLOW'
  | 'GOOD_SOUNDS_TRY_SMOOTHER'
  | 'MISSING_PART'
  | 'RETRY_TARGET_SOUND'
  | 'RECORDING_UNCLEAR'
  | 'NO_SPEECH'
  | 'SYSTEM_UNCERTAIN';

export type PronunciationResult = {
  expectedText?: string;
  recognizedText?: string;
  recognized_text?: string;
  raw?: {
    accuracyScore?: number;
    fluencyScore?: number;
    completenessScore?: number;
    prosodyScore?: number;
    pronScore?: number;
  };
  interpreted?: {
    level: 'PRE_A1' | 'A1' | 'A2_PLUS';
    exerciseType: 'WORD' | 'SHORT_PHRASE' | 'SENTENCE';
    soundAccuracy: number;
    completeness: number;
    smoothness: number | null;
    prosody: number | null;
    pedagogicalScore: number;
    passed: boolean;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    feedbackCode: PronunciationFeedbackCode;
  };
  diagnostics?: {
    longestPauseMs?: number | null;
    pauseToleranceMs?: number;
    unexpectedBreaks?: number;
    missingBreaks?: number;
    missingWords?: string[];
    weakWords?: string[];
    weakPhonemes?: { phoneme: string; score: number }[];
    missingFinalWords?: string[];
    recognitionConfidence?: number | null;
    snr?: number | null;
    fallbackUsed?: boolean;
  };
  feedback?: {
    code: PronunciationFeedbackCode;
    target?: string | null;
    messages: { en: string; es: string };
  };
  feature_flags?: { pedagogicalScoring?: boolean };
  _timing?: {
    audio_bytes?: number;
    backend_total_ms?: number;
    client_request_ms?: number;
    convert_audio_ms?: number;
    provider_ms?: number;
    read_audio_ms?: number;
    recorder_finalize_ms?: number;
    uploaded_audio_bytes?: number;
  };
  text_score?: {
    quality_score?: number;
    word_score_list?: WordScore[];
    azure_scores?: {
      accuracy?: number;
      fluency?: number;
      completeness?: number;
      prosody?: number;
      pronunciation?: number;
    };
  };
};

export type LessonFeedbackInput = {
  userId: string;
  sessionId?: string;
  lessonId: string;
  clarityRating: string;
  learningSupport: string;
  commentText?: string;
  score: number;
  totalCards: number;
  appVersion?: string;
  updateId?: string;
  viewportWidth: number;
  viewportHeight: number;
};
