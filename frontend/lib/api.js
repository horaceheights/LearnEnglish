const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

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

export function getApiBaseUrl() {
  return API_BASE_URL;
}
