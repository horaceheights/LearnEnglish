"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteLearnerAction as deleteLearner, resetLearnerProgressAction as resetLearnerProgress } from "./actions";

const buttonStyle = {
  border: "1px solid #cdbf9f",
  borderRadius: 10,
  padding: "7px 10px",
  background: "#fff",
  color: "#29444d",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export default function LearnerActions({ learner }) {
  const router = useRouter();
  const [working, setWorking] = useState(null);
  const [error, setError] = useState("");

  async function runAction(action) {
    const isReset = action === "reset";
    const message = isReset
      ? `Reset all lesson progress for ${learner.display_name}? The learner profile will remain.`
      : `Permanently delete ${learner.display_name} and all of their lesson data?`;

    if (!window.confirm(message)) return;

    setWorking(action);
    setError("");
    try {
      if (isReset) {
        await resetLearnerProgress(learner.id);
      } else {
        await deleteLearner(learner.id);
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError.message || "The action could not be completed.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 142 }}>
      <button
        type="button"
        disabled={Boolean(working)}
        onClick={() => runAction("reset")}
        style={{ ...buttonStyle, opacity: working ? 0.55 : 1 }}
      >
        {working === "reset" ? "Resetting…" : "Reset"}
      </button>
      <button
        type="button"
        disabled={Boolean(working)}
        onClick={() => runAction("delete")}
        style={{ ...buttonStyle, borderColor: "#d8a79e", color: "#9b3f32", opacity: working ? 0.55 : 1 }}
      >
        {working === "delete" ? "Deleting…" : "Delete"}
      </button>
      {error && <span title={error} style={{ color: "#9b3f32", fontSize: 12 }}>Failed</span>}
    </div>
  );
}
