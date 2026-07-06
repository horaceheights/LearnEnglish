const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

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

export async function scorePronunciationAudio({ text, audioBlob, userId, questionInfo }) {
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

  const response = await fetch(`${apiBaseUrl}/api/pronunciation/score`, {
    method: "POST",
    body: formData,
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

export function getCourseAudioUrl({ text, mode = "prompt", lang = "en-US", variant = "default" }) {
  const apiBaseUrl = getApiBaseUrl();
  const params = new URLSearchParams({
    text,
    mode,
    lang,
    variant,
  });
  return `${apiBaseUrl}/api/audio/course?${params.toString()}`;
}

export async function preloadCourseAudio({ text, mode = "prompt", lang = "en-US", variant = "default" }) {
  const response = await fetch(getCourseAudioUrl({ text, mode, lang, variant }), {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`Could not preload course audio: ${response.status}`);
  }

  return response.blob();
}

export async function getAdminSummary() {
  return apiRequest("/api/admin/summary", { cache: "no-store" });
}
