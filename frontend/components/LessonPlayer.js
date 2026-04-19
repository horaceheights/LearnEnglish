"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px 48px",
  },
  shell: {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gap: "24px",
    gridTemplateColumns: "300px minmax(0, 1fr)",
  },
  sidebar: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 14px 40px rgba(22, 33, 39, 0.06)",
    alignSelf: "start",
    position: "sticky",
    top: "20px",
  },
  main: {
    display: "grid",
    gap: "20px",
  },
  hero: {
    background: "linear-gradient(135deg, #2f8f62, #2b6e75)",
    borderRadius: "28px",
    color: "#fff",
    padding: "28px",
    boxShadow: "0 20px 45px rgba(25, 67, 70, 0.22)",
  },
  board: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 14px 40px rgba(22, 33, 39, 0.06)",
  },
  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "20px",
  },
  cardButton: {
    border: "3px solid #d9ded7",
    borderRadius: "24px",
    overflow: "hidden",
    background: "#fff",
    padding: "10px",
    cursor: "pointer",
    transition: "transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease",
    boxShadow: "0 12px 30px rgba(22, 33, 39, 0.08)",
  },
  image: {
    width: "100%",
    height: "340px",
    objectFit: "cover",
    display: "block",
    borderRadius: "18px",
    background: "var(--surface-2)",
  },
  feedback: {
    borderRadius: "20px",
    padding: "16px 18px",
    fontWeight: 600,
  },
  nextButton: {
    border: 0,
    borderRadius: "16px",
    background: "var(--green)",
    color: "#fff",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 700,
    width: "100%",
  },
  subtleButton: {
    border: "1px solid var(--line)",
    borderRadius: "16px",
    background: "#fff",
    color: "var(--text)",
    padding: "12px 16px",
    cursor: "pointer",
    width: "100%",
  },
};

const PRAISE_PHRASES = [
  "Great",
  "Awesome",
  "Yay",
  "Keep it up",
  "Nice job",
  "Excellent",
];

function normalizeSpeechText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\bis\b/g, " is ")
    .replace(/\s+/g, " ")
    .trim();
}

function countLeadingTokenMatches(expectedText, spokenText) {
  const expectedTokens = normalizeSpeechText(expectedText).split(" ").filter(Boolean);
  const spokenTokens = normalizeSpeechText(spokenText).split(" ").filter(Boolean);
  let index = 0;

  while (index < expectedTokens.length && index < spokenTokens.length && expectedTokens[index] === spokenTokens[index]) {
    index += 1;
  }

  return index;
}

function useTone() {
  const audioContextRef = useRef(null);

  return (notes) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;
    const now = context.currentTime;
    const sequence = Array.isArray(notes) ? notes : [notes];

    sequence.forEach((note, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = now + (note.delayMs || 0) / 1000;
      const endAt = startAt + note.durationMs / 1000;

      oscillator.type = note.type || "sine";
      oscillator.frequency.value = note.frequency;
      gain.gain.value = 0.0001;

      oscillator.connect(gain);
      gain.connect(context.destination);

      gain.gain.exponentialRampToValueAtTime(note.volume || 0.12, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

      oscillator.start(startAt);
      oscillator.stop(endAt);

      if (note.frequency2) {
        const sparkle = context.createOscillator();
        const sparkleGain = context.createGain();
        sparkle.type = note.type2 || "sine";
        sparkle.frequency.value = note.frequency2;
        sparkleGain.gain.value = 0.0001;
        sparkle.connect(sparkleGain);
        sparkleGain.connect(context.destination);
        sparkleGain.gain.exponentialRampToValueAtTime((note.volume || 0.12) * 0.6, startAt + 0.03);
        sparkleGain.gain.exponentialRampToValueAtTime(0.0001, endAt);
        sparkle.start(startAt);
        sparkle.stop(endAt);
      }
    });
  };
}

function useSpeech() {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return undefined;
    }

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  return (text, options = {}) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return 0;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || "en-US";
    utterance.rate = options.rate ?? 0.39;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    const englishVoices = voices.filter((item) => item.lang?.toLowerCase().startsWith("en"));
    const promptVoice = englishVoices[0];
    const feedbackVoice = englishVoices[1] || englishVoices[0];
    const voice =
      options.voiceMode === "feedback"
        ? feedbackVoice
        : options.voiceMode === "prompt"
          ? promptVoice
          : promptVoice;

    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
    return Math.max(2400, text.length * 170);
  };
}

function useViewportWidth() {
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return viewportWidth;
}

export default function LessonPlayer({ lesson, lessons }) {
  const [started, setStarted] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState({});
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [autoAdvanceDelayMs, setAutoAdvanceDelayMs] = useState(700);
  const [showHelp, setShowHelp] = useState(false);
  const [phase, setPhase] = useState("choose");
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const playTone = useTone();
  const speakText = useSpeech();
  const recognitionRef = useRef(null);
  const viewportWidth = useViewportWidth();
  const apiBaseUrl = getApiBaseUrl();
  const isTablet = viewportWidth <= 1080;
  const isMobile = viewportWidth <= 760;

  const currentCard = lesson.cards[cardIndex];
  const totalCards = lesson.cards.length;
  const promptTokens = useMemo(
    () => normalizeSpeechText(currentCard?.prompt || "").split(" ").filter(Boolean),
    [currentCard]
  );
  const matchedPromptTokens = useMemo(
    () => countLeadingTokenMatches(currentCard?.prompt || "", liveTranscript),
    [currentCard, liveTranscript]
  );

  const progressLabel = useMemo(() => `${Math.min(cardIndex + 1, totalCards)} / ${totalCards}`, [cardIndex, totalCards]);
  const shellStyle = {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gap: "20px",
  };
  const heroStyle = {
    ...styles.hero,
    padding: isMobile ? "22px 20px" : styles.hero.padding,
    borderRadius: isMobile ? "22px" : styles.hero.borderRadius,
    width: isMobile ? "100%" : isTablet ? "88%" : "72%",
    justifySelf: "center",
    textAlign: "center",
  };
  const boardStyle = {
    ...styles.board,
    padding: isMobile ? "18px" : styles.board.padding,
    borderRadius: isMobile ? "22px" : styles.board.borderRadius,
  };
  const choiceGridStyle = {
    ...styles.choiceGrid,
    gridTemplateColumns: isMobile ? "1fr" : styles.choiceGrid.gridTemplateColumns,
  };
  const responsiveImageStyle = {
    ...styles.image,
    height: isMobile ? "240px" : isTablet ? "280px" : styles.image.height,
  };
  const titleStyle = {
    margin: "10px 0 8px",
    fontSize: isMobile ? "2.6rem" : "clamp(2rem, 4vw, 3.4rem)",
  };
  const mobileSummaryStyle = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "20px",
    padding: "16px 18px",
    boxShadow: "0 12px 30px rgba(22, 33, 39, 0.06)",
    display: "grid",
    gap: "12px",
  };

  const resetProgress = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setCardIndex(0);
    setScore(0);
    setWrongAttempts({});
    setSelectedOptionId(null);
    setLastResult(null);
    setIsComplete(false);
    setShowHelp(false);
    setAutoAdvanceDelayMs(700);
    setPhase("choose");
    setIsListening(false);
    setSpeechStatus("");
    setLiveTranscript("");
    setMicrophoneReady(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    setRecognitionSupported(Boolean(SpeechRecognitionClass));
  }, []);

  useEffect(() => {
    if (!started || lastResult !== "correct") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (cardIndex >= totalCards - 1) {
        setIsComplete(true);
      } else {
        setCardIndex((current) => current + 1);
      }
      setSelectedOptionId(null);
      setLastResult(null);
      setPhase("choose");
      setSpeechStatus("");
      setLiveTranscript("");
    }, autoAdvanceDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [autoAdvanceDelayMs, cardIndex, lastResult, started, totalCards]);

  useEffect(() => {
    if (!started || isComplete || !currentCard || lastResult !== null || phase !== "choose") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      speakText(currentCard.prompt, { voiceMode: "prompt" });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [cardIndex, currentCard, isComplete, lastResult, phase, speakText, started]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  if (!started) {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: "980px", margin: "0 auto", display: "grid", gap: "20px" }}>
          <section style={heroStyle}>
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>Lessons</div>
            <h1 style={titleStyle}>Choose a lesson</h1>
          </section>

          <section style={boardStyle}>
            <div style={{ display: "grid", gap: "16px" }}>
              {lessons.map((lessonSummary) => (
                <button
                  key={lessonSummary.id}
                  type="button"
                  onClick={() => {
                    resetProgress();
                    setStarted(true);
                  }}
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--line)",
                    borderRadius: "22px",
                    background: "var(--surface)",
                    padding: "20px",
                    cursor: "pointer",
                    boxShadow: "0 12px 30px rgba(22, 33, 39, 0.06)",
                  }}
                >
                  <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
                    {lessonSummary.level}
                  </div>
                  <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, marginTop: 8 }}>{lessonSummary.title}</div>
                  <div style={{ marginTop: 10, color: "var(--muted)" }}>Tap to start this lesson.</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (isComplete || !currentCard) {
    return (
      <div style={styles.page}>
        <div style={shellStyle}>
          <main style={styles.main}>
            {isMobile ? (
              <section style={mobileSummaryStyle}>
                <div style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>Lesson Complete</div>
                <strong style={{ fontSize: 20 }}>{lesson.title}</strong>
                <span style={{ color: "var(--muted)" }}>Score: {score} / {totalCards}</span>
              </section>
            ) : null}
            <section style={heroStyle}>
              <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>Lesson Complete</div>
              <h1 style={titleStyle}>Nice work</h1>
              <p style={{ margin: 0, maxWidth: 620, opacity: 0.92 }}>
                You got {score} out of {totalCards} correct on the first try.
              </p>
            </section>
            <section style={boardStyle}>
              <button
                type="button"
                style={styles.nextButton}
                onClick={() => {
                  resetProgress();
                  setStarted(false);
                }}
              >
                Back To Lessons
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const handleChoice = (optionId) => {
    if (lastResult === "correct" || phase !== "choose") {
      return;
    }

    const isCorrect = optionId === currentCard.correct_option_id;
    setSelectedOptionId(optionId);

    if (isCorrect) {
      const praise = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
      const praisePitch = [1.0, 1.1, 1.2, 1.28][Math.floor(Math.random() * 4)];
      playTone([
        { frequency: 880, frequency2: 1320, durationMs: 220, type: "triangle", type2: "sine", volume: 0.12 },
        { frequency: 1175, frequency2: 1760, durationMs: 260, delayMs: 160, type: "triangle", type2: "sine", volume: 0.11 },
        { frequency: 1568, frequency2: 2093, durationMs: 320, delayMs: 340, type: "triangle", type2: "sine", volume: 0.09 },
      ]);
      if (!wrongAttempts[cardIndex]) {
        setScore((current) => current + 1);
      }
      setPhase("speak");
      setSpeechStatus("Good. Now say it.");
      setLastResult(null);
      if (!recognitionSupported) {
        const praiseDelay = speakText(praise, {
          rate: 0.75,
          pitch: praisePitch,
          volume: 1,
          voiceMode: "feedback",
        });
        setAutoAdvanceDelayMs(Math.max(1100, praiseDelay + 180));
        setLastResult("correct");
      } else {
        ensureMicrophoneAccess().then((hasAccess) => {
          if (!hasAccess) {
            finishWithSpeechFallback();
            return;
          }
          window.setTimeout(() => {
            speakText(currentCard.prompt, { voiceMode: "prompt" });
          }, 180);
          window.setTimeout(() => {
            handleSpeechAttempt();
          }, 900);
        });
      }
      return;
    }

    playTone([
      { frequency: 220, durationMs: 300, type: "sawtooth", volume: 0.1 },
      { frequency: 185, durationMs: 340, delayMs: 240, type: "sawtooth", volume: 0.09 },
    ]);
    window.setTimeout(() => {
      speakText("Try again", { voiceMode: "feedback", rate: 0.72, pitch: 0.94 });
    }, 180);
    setAutoAdvanceDelayMs(700);
    setWrongAttempts((current) => ({ ...current, [cardIndex]: true }));
    setLastResult("wrong");
  };

  const finishSpeakingSuccess = () => {
    const praise = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
    const praisePitch = [1.0, 1.1, 1.2, 1.28][Math.floor(Math.random() * 4)];
    playTone([
      { frequency: 880, frequency2: 1320, durationMs: 220, type: "triangle", type2: "sine", volume: 0.12 },
      { frequency: 1175, frequency2: 1760, durationMs: 260, delayMs: 160, type: "triangle", type2: "sine", volume: 0.11 },
      { frequency: 1568, frequency2: 2093, durationMs: 320, delayMs: 340, type: "triangle", type2: "sine", volume: 0.09 },
    ]);
    const praiseDelay = speakText(praise, {
      rate: 0.75,
      pitch: praisePitch,
      volume: 1,
      voiceMode: "feedback",
    });
    setSpeechStatus("Nice. Moving on.");
    setAutoAdvanceDelayMs(Math.max(1100, praiseDelay + 180));
    setLastResult("correct");
  };

  const finishWithSpeechFallback = () => {
    const praise = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
    const praisePitch = [1.0, 1.1, 1.2, 1.28][Math.floor(Math.random() * 4)];
    const praiseDelay = speakText(praise, {
      rate: 0.75,
      pitch: praisePitch,
      volume: 1,
      voiceMode: "feedback",
    });
    setSpeechStatus("Speaking is not available here. Moving on.");
    setAutoAdvanceDelayMs(Math.max(1100, praiseDelay + 180));
    setLastResult("correct");
  };

  const queueSpeechRetry = (statusMessage) => {
    setSpeechStatus(statusMessage);
    setLiveTranscript("");
    window.setTimeout(() => {
      speakText("Try again", { voiceMode: "feedback", rate: 0.72, pitch: 0.94 });
    }, 140);
    window.setTimeout(() => {
      handleSpeechAttempt();
    }, 1500);
  };

  const handleSpeechAttempt = () => {
    const SpeechRecognitionClass =
      typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognitionClass) {
      setSpeechStatus("Speech check is not supported in this browser.");
      return;
    }

    if (isListening) {
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    setSpeechStatus("Listening...");
    setIsListening(true);
    setLiveTranscript("");
    playTone({ frequency: 740, durationMs: 140, type: "sine", volume: 0.08 });

    recognition.onresult = (event) => {
      let transcript = "";
      let finalTranscript = "";

      for (const result of event.results) {
        const piece = result[0]?.transcript || "";
        transcript += `${piece} `;
        if (result.isFinal) {
          finalTranscript += `${piece} `;
        }
      }

      transcript = transcript.trim();
      finalTranscript = finalTranscript.trim();
      setLiveTranscript(transcript);

      if (!finalTranscript) {
        setSpeechStatus("Listening...");
        return;
      }

      const heard = normalizeSpeechText(finalTranscript);
      const expected = normalizeSpeechText(currentCard.prompt);

      const isMatch = heard === expected || heard.includes(expected) || expected.includes(heard);

      if (isMatch) {
        finishSpeakingSuccess();
      } else {
        playTone([
          { frequency: 220, durationMs: 300, type: "sawtooth", volume: 0.1 },
          { frequency: 185, durationMs: 340, delayMs: 240, type: "sawtooth", volume: 0.09 },
        ]);
        queueSpeechRetry(`I heard "${finalTranscript}". Try again.`);
      }
    };

    recognition.onerror = () => {
      playTone([
        { frequency: 220, durationMs: 300, type: "sawtooth", volume: 0.1 },
        { frequency: 185, durationMs: 340, delayMs: 240, type: "sawtooth", volume: 0.09 },
      ]);
      queueSpeechRetry("I could not hear that clearly. Try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const ensureMicrophoneAccess = async () => {
    if (microphoneReady) {
      return true;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setSpeechStatus("This browser cannot request microphone access here.");
      return false;
    }

    if (!window.isSecureContext) {
      setSpeechStatus("Microphone on mobile usually needs HTTPS or localhost. This phone is opening the app over a regular home-network address.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneReady(true);
      setSpeechStatus("Listening will start now.");
      return true;
    } catch (error) {
      setSpeechStatus("Microphone access was blocked. Please allow mic permission in the browser and try again.");
      return false;
    }
  };

  const cardStyleFor = (optionId) => {
    const style = { ...styles.cardButton };
    if (selectedOptionId === optionId && (lastResult === "correct" || phase === "speak")) {
      style.borderColor = "var(--green)";
      style.boxShadow = "0 0 0 6px var(--green-soft), 0 12px 30px rgba(22, 33, 39, 0.08)";
    }
    if (selectedOptionId === optionId && lastResult === "wrong") {
      style.borderColor = "var(--red)";
      style.boxShadow = "0 0 0 6px var(--red-soft), 0 12px 30px rgba(22, 33, 39, 0.08)";
    }
    return style;
  };

  return (
    <div style={styles.page}>
      <div style={shellStyle}>
        <main style={styles.main}>
          {isMobile ? (
            <section style={mobileSummaryStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>Lesson</div>
                  <strong style={{ fontSize: 20 }}>{lesson.title}</strong>
                </div>
                <button
                  type="button"
                  style={{ ...styles.subtleButton, width: "auto", padding: "10px 14px" }}
                  onClick={() => {
                    resetProgress();
                    setStarted(false);
                  }}
                >
                  Lessons
                </button>
              </div>
            </section>
          ) : null}
          <section style={heroStyle}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                aria-label={showHelp ? "Hide help" : "Show help"}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "999px",
                  border: "2px solid rgba(255,255,255,0.28)",
                  background: showHelp ? "#F4C95D" : "rgba(255,255,255,0.14)",
                  color: showHelp ? "#24333A" : "#ffffff",
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: showHelp ? "0 8px 20px rgba(244, 201, 93, 0.28)" : "none",
                }}
                onClick={() => setShowHelp((current) => !current)}
              >
                ?
              </button>
            </div>
            <button
              type="button"
              onClick={() => speakText(currentCard.prompt, { voiceMode: "prompt" })}
              style={{
                border: 0,
                background: "transparent",
                color: "#fff",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                width: "100%",
              }}
              aria-label={`Play pronunciation for ${currentCard.prompt}`}
            >
              <h1 style={titleStyle}>{currentCard.prompt}</h1>
            </button>
            {showHelp ? (
              <div
                style={{
                  marginTop: 8,
                  maxWidth: 620,
                  padding: "14px 16px",
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.96)",
                  lineHeight: 1.5,
                }}
              >
                Choose the image that matches the prompt. Correct answers move forward. Wrong answers stay here and count as a miss.
                After a correct pick, say the phrase out loud to move on.
              </div>
            ) : null}
          </section>

          <section style={boardStyle}>
            <div style={choiceGridStyle}>
              {currentCard.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  style={cardStyleFor(option.id)}
                  onClick={() => handleChoice(option.id)}
                  disabled={phase === "speak"}
                >
                  <img
                    src={`${apiBaseUrl}${option.image_url}`}
                    alt={option.id}
                    style={responsiveImageStyle}
                  />
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              {lastResult === "correct" ? (
                <div style={{ ...styles.feedback, background: "var(--green-soft)", color: "var(--green)" }}>Correct. Moving to the next card...</div>
              ) : null}
              {lastResult === "wrong" ? (
                <div style={{ ...styles.feedback, background: "var(--red-soft)", color: "var(--red)" }}>
                  Not quite. Try again. This card will no longer count as a first-try correct answer.
                </div>
              ) : null}
              {phase === "speak" && lastResult !== "correct" ? (
                <div
                  style={{
                    ...styles.feedback,
                    marginTop: lastResult === "wrong" ? 12 : 0,
                    background: "#e7f3ff",
                    color: "#1a4e7a",
                    display: "grid",
                    gap: "12px",
                  }}
                  >
                    <div>Say: "{currentCard.prompt}"</div>
                    <div style={{ fontWeight: 500 }}>{speechStatus || "Listen, then say the phrase."}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {promptTokens.map((token, index) => (
                        <span
                          key={`${token}-${index}`}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "999px",
                            background: index < matchedPromptTokens ? "#bfe6c8" : "rgba(26, 78, 122, 0.12)",
                            color: index < matchedPromptTokens ? "#1f6a34" : "#1a4e7a",
                            fontWeight: 700,
                            textTransform: "capitalize",
                          }}
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        minHeight: "24px",
                        padding: "10px 12px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.65)",
                        color: "#305874",
                        fontWeight: 500,
                      }}
                    >
                      {liveTranscript ? `I hear: ${liveTranscript}` : "Your speech will appear here as you talk."}
                    </div>
                  </div>
                ) : null}
            </div>

            <div
              style={{
                marginTop: 20,
                padding: "14px 18px",
                borderRadius: "18px",
                background: "var(--surface-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase" }}>Progress</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{progressLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase" }}>Current Score</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{score}</div>
              </div>
              <button
                type="button"
                style={{ ...styles.subtleButton, width: isMobile ? "100%" : "auto", padding: "10px 14px" }}
                onClick={() => {
                  resetProgress();
                  setStarted(false);
                }}
              >
                Lessons
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
