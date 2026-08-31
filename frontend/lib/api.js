import courseAudioManifest from "./courseAudioManifest.json";

// Identifies this (internal, testing-only) frontend to the backend so a
// stranger's script can't call the API directly. Not a per-user secret.
const APP_API_KEY = process.env.NEXT_PUBLIC_APP_API_KEY || "Lka_Ecgoda6om-OagWcyG0AK-zrmiD1c";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const STATIC_ASSET_VERSION = process.env.NEXT_PUBLIC_STATIC_ASSET_VERSION || "20260710-mobile-direct-audio";

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (configured) {
      return configured.replace(/\/$/, "");
    }

    const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const isLanHost = /^(10|172\.(1[6-9]|2\d|3[0-1])|192\.168)\./.test(window.location.hostname);
    if (isLocalHost || isLanHost) {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
  }

  return API_BASE_URL;
}

async function apiRequest(path, options = {}) {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-App-Key": APP_API_KEY,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed at ${apiBaseUrl}${path}: ${response.status}`);
  }

  return response.json();
}

export async function getLessons() {
  const apiBaseUrl = getApiBaseUrl();
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/lessons`, {
      cache: "no-store",
      headers: { "X-App-Key": APP_API_KEY },
    });
  } catch (error) {
    throw new Error(
      `Could not reach the backend at ${apiBaseUrl}. Start the FastAPI server first.`,
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to load lessons: ${response.status}`);
  }

  return response.json();
}

export async function getLesson(lessonId) {
  const apiBaseUrl = getApiBaseUrl();
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/lessons/${lessonId}`, {
      cache: "no-store",
      headers: { "X-App-Key": APP_API_KEY },
    });
  } catch (error) {
    throw new Error(
      `Could not reach the backend at ${apiBaseUrl}. Start the FastAPI server first.`,
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to load lesson: ${response.status}`);
  }

  return response.json();
}

export async function saveLearnerProfile(profile) {
  const userId = profile?.userId;
  const displayName = profile?.displayName || "Student";
  const payload = { display_name: displayName, profile };
  return apiRequest(userId ? `/api/users/${userId}` : "/api/users", {
    method: userId ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLearnerByName(displayName) {
  return apiRequest(`/api/users/by-name/${encodeURIComponent(displayName)}`, { cache: "no-store" });
}

export async function startLessonSession({ userId, lessonId, totalCards }) {
  return apiRequest("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, lesson_id: lessonId, total_cards: totalCards }),
  });
}

export async function finishLessonSession({ sessionId, score, totalCards }) {
  return apiRequest(`/api/sessions/${sessionId}/finish`, {
    method: "PATCH",
    body: JSON.stringify({ score, total_cards: totalCards }),
  });
}

export async function logCardAttempt(attempt) {
  return apiRequest("/api/card-attempts", {
    method: "POST",
    body: JSON.stringify({
      session_id: attempt.sessionId,
      user_id: attempt.userId,
      lesson_id: attempt.lessonId,
      card_index: attempt.cardIndex,
      prompt: attempt.prompt,
      selected_option_id: attempt.selectedOptionId,
      correct_option_id: attempt.correctOptionId,
      is_correct: attempt.isCorrect,
      first_try: attempt.firstTry,
    }),
  });
}

export async function scorePronunciationAudio({ text, audioBlob, userId, questionInfo, provider, level, exerciseType }) {
  const apiBaseUrl = getApiBaseUrl();
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const formData = new FormData();
  formData.append("text", text);
  formData.append("audio", audioBlob, "lesson-pronunciation.webm");
  if (userId) {
    formData.append("user_id", userId);
  }
  if (questionInfo) {
    formData.append("question_info", questionInfo);
  }
  if (provider) {
    formData.append("provider", provider);
  }
  if (level) {
    formData.append("level", level);
  }
  if (exerciseType) {
    formData.append("exercise_type", exerciseType);
  }

  const response = await fetch(`${apiBaseUrl}/api/pronunciation/score`, {
    method: "POST",
    body: formData,
    headers: { "X-App-Key": APP_API_KEY },
  });
  const payload = await response.json();

  if (!response.ok) {
    const detail = payload.detail;
    const error = new Error(
      detail?.short_message === "error_no_speech"
        ? "NO_SPEECH_DETECTED"
        : typeof detail === "string"
          ? detail
          : detail?.detail_message || detail?.message || "Could not score pronunciation."
    );
    error.status = response.status;
    error.code = detail?.short_message || payload.short_message || "PRONUNCIATION_SCORE_FAILED";
    error.detail = detail;
    throw error;
  }

  const clientTotalMs = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt);
  return {
    ...payload,
    _client_timing: {
      total_ms: clientTotalMs,
      backend: payload._timing,
    },
  };
}

export async function getPronunciationStreamingToken() {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/pronunciation/token`, {
    cache: "no-store",
    headers: { "X-App-Key": APP_API_KEY },
  });
  const payload = await response.json();

  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : "Could not start pronunciation streaming.";
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function hasVisualAudioPlaceholder(text) {
  return /_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i.test(String(text || ""));
}

export function sanitizeCourseAudioText(text) {
  const spokenText = String(text || "").replace(/\s+/g, " ").trim();
  if (hasVisualAudioPlaceholder(spokenText)) {
    throw new Error("Completion placeholders are visual only and cannot use ordinary course audio.");
  }
  return spokenText;
}

function completionAudioFields(text, fullText, blankText) {
  const visualPrompt = String(text || "");
  const completed = String(fullText || "").trim();
  const answer = String(blankText || "").trim();
  const placeholders = [...visualPrompt.matchAll(/_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/gi)];
  if (placeholders.length !== 1 || !completed || !answer) {
    throw new Error("Completion prompt audio requires one blank and a full completed sentence.");
  }
  if (hasVisualAudioPlaceholder(completed) || hasVisualAudioPlaceholder(answer)) {
    throw new Error("Completion answer text cannot contain a visual placeholder.");
  }
  const placeholder = placeholders[0];
  const prefix = visualPrompt.slice(0, placeholder.index);
  const suffix = visualPrompt.slice((placeholder.index ?? 0) + placeholder[0].length);
  if (`${prefix}${answer}${suffix}`.trim() !== completed) {
    throw new Error("Completion prompt audio must match the full completed sentence exactly.");
  }
  return { answer, completed, visualPrompt };
}

export function getCourseAudioUrl({
  assetId,
  text,
  fullText,
  blankText,
  mode = "prompt",
  lang = "en-US",
  variant = "default",
}) {
  if (assetId) {
    const params = new URLSearchParams({ key: APP_API_KEY });
    return `${getApiBaseUrl()}/api/audio/assets/${encodeURIComponent(assetId)}.mp3?${params.toString()}`;
  }
  if (hasVisualAudioPlaceholder(text)) {
    completionAudioFields(text, fullText, blankText);
    throw new Error("Completion prompt audio requires a persistent card asset ID.");
  }

  const spokenText = sanitizeCourseAudioText(text);
  const manifestKey = [spokenText, mode, lang, variant].join("\n");
  const staticAudioFile = courseAudioManifest[manifestKey];
  if (staticAudioFile) {
    return `/audio-cache/${staticAudioFile}?v=${encodeURIComponent(STATIC_ASSET_VERSION)}`;
  }

  throw new Error("Course audio is not approved in the static manifest and has no persistent asset ID.");
}

export async function preloadCourseAudio({
  assetId,
  text,
  fullText,
  blankText,
  mode = "prompt",
  lang = "en-US",
  variant = "default",
}) {
  const response = await fetch(getCourseAudioUrl({
    assetId,
    text,
    fullText,
    blankText,
    mode,
    lang,
    variant,
  }), {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`Could not preload course audio: ${response.status}`);
  }

  return response.blob();
}

export async function interpretAzurePronunciation({ expectedText, payload, level, exerciseType }) {
  return apiRequest("/api/pronunciation/interpret-azure", {
    method: "POST",
    body: JSON.stringify({
      expected_text: expectedText,
      payload,
      level,
      exercise_type: exerciseType,
    }),
  });
}
