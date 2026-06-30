const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (configured) {
      return configured.replace(/\/$/, "");
    }
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return API_BASE_URL;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export async function getLessons() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/lessons`, {
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `Could not reach the backend at ${API_BASE_URL}. Start the FastAPI server first.`,
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to load lessons: ${response.status}`);
  }

  return response.json();
}

export async function getLesson(lessonId) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/lessons/${lessonId}`, {
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `Could not reach the backend at ${API_BASE_URL}. Start the FastAPI server first.`,
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

export async function getAdminSummary() {
  return apiRequest("/api/admin/summary", { cache: "no-store" });
}
