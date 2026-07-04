"use client";

import { useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../../lib/api";

const targetPhrase = "The boy is running.";

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px 48px",
    background: "var(--bg)",
    color: "var(--text)",
  },
  shell: {
    maxWidth: 920,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  },
  panel: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 14px 40px rgba(22, 33, 39, 0.06)",
  },
  button: {
    border: 0,
    borderRadius: 14,
    background: "var(--green)",
    color: "#fff",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryButton: {
    border: "1px solid var(--line)",
    borderRadius: 14,
    background: "#fff",
    color: "var(--text)",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  dangerButton: {
    border: 0,
    borderRadius: 14,
    background: "var(--red)",
    color: "#fff",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  pre: {
    margin: 0,
    padding: 16,
    borderRadius: 16,
    background: "#19252b",
    color: "#e7f3ed",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    fontSize: 13,
    lineHeight: 1.45,
  },
};

function summarizeScore(result) {
  const textScore = result?.text_score;
  const wordScores = textScore?.word_score_list || [];
  const pronunciation =
    textScore?.speechace_score?.pronunciation ??
    textScore?.quality_score ??
    result?.speechace_score?.pronunciation;
  const weakestWord = wordScores
    .filter((word) => typeof word.quality_score === "number")
    .sort((left, right) => left.quality_score - right.quality_score)[0];

  return {
    pronunciation,
    weakestWord: weakestWord
      ? {
          word: weakestWord.word,
          score: weakestWord.quality_score,
          weakestSyllable: (weakestWord.syllable_score_list || [])
            .filter((syllable) => typeof syllable.quality_score === "number")
            .sort((left, right) => left.quality_score - right.quality_score)[0],
          weakestPhone: (weakestWord.phone_score_list || [])
            .filter((phone) => typeof phone.quality_score === "number")
            .sort((left, right) => left.quality_score - right.quality_score)[0],
        }
      : null,
  };
}

export default function PronunciationPocPage() {
  const [status, setStatus] = useState("Ready");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const apiBaseUrl = getApiBaseUrl();
  const summary = useMemo(() => summarizeScore(result), [result]);

  const startRecording = async () => {
    setError("");
    setResult(null);
    setAudioBlob(null);
    setAudioUrl("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setStatus("Recording ready. Send it to Speechace.");
      };

      recorder.start();
      setIsRecording(true);
      setStatus("Recording...");
    } catch (recordingError) {
      setError(recordingError.message || "Could not start recording.");
      setStatus("Recording failed");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }

    recorderRef.current.stop();
    setIsRecording(false);
  };

  const scoreRecording = async () => {
    if (!audioBlob) {
      setError("Record audio first.");
      return;
    }

    setError("");
    setStatus("Sending to Speechace...");

    const formData = new FormData();
    formData.append("text", targetPhrase);
    formData.append("audio", audioBlob, "pronunciation-poc.webm");

    try {
      const response = await fetch(`${apiBaseUrl}/api/pronunciation/score`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail));
      }

      setResult(payload);
      setStatus("Score received");
    } catch (scoreError) {
      setError(scoreError.message || "Could not score audio.");
      setStatus("Scoring failed");
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <section style={{ ...styles.panel, background: "linear-gradient(135deg, #2f8f62, #2b6e75)", color: "#fff" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
            Speechace POC
          </div>
          <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(2rem, 4vw, 3.3rem)" }}>Pronunciation Practice</h1>
          <p style={{ margin: 0, opacity: 0.92 }}>Say: {targetPhrase}</p>
        </section>

        <section style={styles.panel}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {!isRecording ? (
              <button type="button" style={styles.button} onClick={startRecording}>
                Start Recording
              </button>
            ) : (
              <button type="button" style={styles.dangerButton} onClick={stopRecording}>
                Stop Recording
              </button>
            )}
            <button type="button" style={styles.secondaryButton} onClick={scoreRecording} disabled={!audioBlob || isRecording}>
              Score Recording
            </button>
            <strong>{status}</strong>
          </div>

          {audioUrl ? (
            <audio controls src={audioUrl} style={{ width: "100%", marginTop: 18 }}>
              <track kind="captions" />
            </audio>
          ) : null}

          {error ? (
            <div style={{ marginTop: 18, color: "var(--red)", fontWeight: 700 }}>
              {error}
            </div>
          ) : null}
        </section>

        {result ? (
          <section style={styles.panel}>
            <h2 style={{ margin: "0 0 12px" }}>Quick Summary</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <div>Pronunciation score: {summary.pronunciation ?? "Not returned"}</div>
              {summary.weakestWord ? (
                <>
                  <div>
                    Weakest word: {summary.weakestWord.word} ({Math.round(summary.weakestWord.score)})
                  </div>
                  <div>
                    Weakest syllable: {summary.weakestWord.weakestSyllable?.letters || "Not returned"}
                  </div>
                  <div>
                    Weakest sound: {summary.weakestWord.weakestPhone?.phone || "Not returned"}
                  </div>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {result ? (
          <section style={styles.panel}>
            <h2 style={{ margin: "0 0 12px" }}>Raw Speechace Response</h2>
            <pre style={styles.pre}>{JSON.stringify(result, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}
