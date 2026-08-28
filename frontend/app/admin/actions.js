"use server";

import { deleteLearner, resetLearnerProgress } from "../../lib/adminApi";

export async function resetLearnerProgressAction(userId) {
  await resetLearnerProgress(userId);
}

export async function deleteLearnerAction(userId) {
  await deleteLearner(userId);
}
