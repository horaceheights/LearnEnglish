import { getApiBaseUrl } from "./api";

// Server-only. Never import this file from a "use client" component --
// doing so would bundle ADMIN_API_KEY into the browser. Admin reads go
// through server components; admin mutations go through server actions
// (see app/admin/actions.js).
function getAdminApiKey() {
  const adminApiKey = process.env.ADMIN_API_KEY?.trim();
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is not configured for the frontend server.");
  }
  return adminApiKey;
}

async function adminRequest(path, options = {}) {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": getAdminApiKey(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed at ${apiBaseUrl}${path}: ${response.status}`);
  }

  return response.json();
}

export async function getAdminSummary() {
  return adminRequest("/api/admin/summary", { cache: "no-store" });
}

export async function resetLearnerProgress(userId) {
  return adminRequest(`/api/users/${encodeURIComponent(userId)}/activity`, { method: "DELETE" });
}

export async function deleteLearner(userId) {
  return adminRequest(`/api/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}
