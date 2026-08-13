"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  finishLessonSession,
  getApiBaseUrl,
  getCourseAudioUrl,
  getPronunciationStreamingToken,
  interpretAzurePronunciation,
  getLearnerByName,
  getLesson,
  logCardAttempt,
  preloadCourseAudio,
  saveLearnerProfile,
  scorePronunciationAudio,
  startLessonSession,
} from "../lib/api";
import { WavAudioRecorder } from "../lib/WavAudioRecorder";

const PROFILE_STORAGE_KEY = "learn-english-profile-v1";
const LESSON_IMAGE_VERSION = "20260710-objects-places-1-6";
const SPANGLISH_LOGO_SRC = "/spanglish-logo.svg";
const COURSE_AUDIO_PRELOAD_AHEAD = 8;
const DEFAULT_PROFILE = {
  level: "new",
  immediateGoal: "unsure",
  learningMode: "natural_guided",
  confidence: "trying",
  sessionLength: "short",
  challenge: [],
};

const COURSE_MENU_VISUALS = {
  units: {
    "unit-1": {
      title: "People, Actions, and Basic Sentences",
      description: "Aprende a reconocer personas, acciones y frases cortas con imagenes claras.",
      images: ["boy.webp", "girl_is_reading.webp", "they_boy_girl_are_running.webp"],
      accent: "#ffe1ad",
    },
  },
  lessons: {
    "lesson-1": {
      description: "Empieza con boy, girl, man, woman; luego une pronombres y acciones.",
      images: ["man_is_walking.webp", "woman_is_reading.webp"],
    },
  },
  subLessons: {
    "lesson-1-people-actions": {
      description: "Personas y acciones basicas con imagenes.",
      image: "boy_is_reading.webp",
      accent: "#ffe8c7",
    },
    "lesson-2-pronouns": {
      description: "He, she y they con una o dos personas.",
      image: "they_boy_girl.webp",
      accent: "#dff4ef",
    },
    "lesson-4-family-members": {
      description: "Familia cercana: bebes, ninos, hermanos y hermanas.",
      image: "family_all_members.webp",
      accent: "#ffe7bd",
    },
    "lesson-4-family-members-continued": {
      description: "Familia: adultos, padres, madres y abuelos.",
      image: "family_grandparents.webp",
      accent: "#f1e4fa",
    },
    "lesson-6-objects-places": {
      description: "Objetos y lugares comunes para preparar colores, numeros y ubicaciones.",
      image: "place_school.webp",
      accent: "#ffe8c7",
    },
  },
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px 48px",
  },
  main: {
    display: "grid",
    gap: "20px",
  },
  hero: {
    background: "linear-gradient(135deg, #fff8ed 0%, #ffe5bd 58%, #dff4ef 100%)",
    borderRadius: "28px",
    color: "var(--text)",
    padding: "28px",
    border: "1px solid rgba(218, 178, 119, 0.72)",
    boxShadow: "0 22px 54px rgba(92, 61, 22, 0.12)",
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
    border: "4px solid var(--text)",
    borderRadius: "24px",
    overflow: "hidden",
    background: "#fff",
    padding: "10px",
    cursor: "pointer",
    transition: "transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease",
    boxShadow: "0 12px 30px rgba(22, 33, 39, 0.08)",
  },
  iconOnlyButton: {
    width: "40px",
    height: "40px",
    border: "1px solid var(--line)",
    borderRadius: "999px",
    background: "#fff",
    color: "var(--text)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "380px",
    objectFit: "contain",
    objectPosition: "center",
    display: "block",
    borderRadius: "18px",
    background: "var(--surface-2)",
  },
  feedback: {
    borderRadius: "20px",
    padding: "16px 18px",
    fontWeight: 600,
  },
  primaryButton: {
    border: 0,
    borderRadius: "16px",
    background: "linear-gradient(135deg, var(--orange), #e96f42)",
    color: "#fff",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 700,
    width: "100%",
    boxShadow: "0 10px 22px rgba(233, 111, 66, 0.22)",
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
  profileIconButton: {
    width: "44px",
    height: "44px",
    border: "1px solid var(--line)",
    borderRadius: "999px",
    background: "var(--surface)",
    color: "var(--green)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 28px rgba(22, 33, 39, 0.08)",
  },
};

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4.75 20.25c.85-3.55 3.32-5.35 7.25-5.35s6.4 1.8 7.25 5.35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpanGlishLogo({ compact = false, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      aria-label="SpanGlish!"
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        width: compact ? "212px" : "318px",
        maxWidth: "84vw",
        minHeight: compact ? "78px" : "112px",
        margin: compact ? "0 auto 4px" : "0 auto 8px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "12px 20px" : "16px 28px",
        background: "linear-gradient(135deg, #ffe7bd, #ffd48d)",
        border: "3px solid rgba(255, 255, 255, 0.72)",
        borderRadius: "54% 46% 55% 45% / 48% 56% 44% 52%",
        boxShadow: "0 12px 26px rgba(92, 61, 22, 0.16)",
        overflow: "hidden",
        cursor: onClick ? "pointer" : undefined,
        font: "inherit",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: compact ? "70px" : "92px",
          height: compact ? "70px" : "92px",
          left: compact ? "10px" : "18px",
          top: compact ? "-14px" : "-18px",
          borderRadius: "999px",
          background: "#ffeecf",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: compact ? "88px" : "118px",
          height: compact ? "88px" : "118px",
          right: compact ? "4px" : "10px",
          bottom: compact ? "-30px" : "-38px",
          borderRadius: "999px",
          background: "#ffc978",
          opacity: 0.72,
        }}
      />
      <img
        src={SPANGLISH_LOGO_SRC}
        alt=""
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          position: "relative",
        }}
      />
    </Wrapper>
  );
}

function MiniSpanGlishLogo({ onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      aria-label="SpanGlish!"
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        width: "116px",
        height: "42px",
        borderRadius: "999px",
        background: "rgba(255, 232, 199, 0.92)",
        border: "1px solid rgba(218, 178, 119, 0.72)",
        boxShadow: "0 8px 18px rgba(92, 61, 22, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 10px",
        overflow: "hidden",
        cursor: onClick ? "pointer" : undefined,
        font: "inherit",
      }}
    >
      <img src={SPANGLISH_LOGO_SRC} alt="" style={{ width: "100%", height: "auto", display: "block" }} />
    </Wrapper>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M4 10.75 12 4l8 6.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6.75 10.5v8.25h10.5V10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function lessonImageSrc(imageUrl) {
  const source = imageUrl.startsWith("http") ? imageUrl : `${getApiBaseUrl()}${imageUrl}`;
  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${source}${separator}v=${LESSON_IMAGE_VERSION}`;
}

function menuImageSrc(name) {
  return lessonImageSrc(`/lesson-assets/${name}`);
}

function getUnitVisual(unitId) {
  return COURSE_MENU_VISUALS.units[unitId] || COURSE_MENU_VISUALS.units["unit-1"];
}

function getLessonVisual(lessonId) {
  return COURSE_MENU_VISUALS.lessons[lessonId] || COURSE_MENU_VISUALS.lessons["lesson-1"];
}

function getSubLessonVisual(lessonId) {
  return COURSE_MENU_VISUALS.subLessons[lessonId] || COURSE_MENU_VISUALS.subLessons["lesson-1-people-actions"];
}

function isSecureRecordingContext() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.isSecureContext || ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

const PRAISE_PHRASES = [
  "Great",
  "Awesome",
  "Yay",
  "Good job",
  "Keep it up",
  "Nice job",
  "Excellent",
];

const FEEDBACK_AUDIO_PHRASES = [...PRAISE_PHRASES, "Try again"];

const ING_PRONUNCIATION_PARTS = {
  drinking: ["drink", "ing"],
  eating: ["eat", "ing"],
  reading: ["read", "ing"],
  running: ["run", "ning"],
  sitting: ["sit", "ting"],
  sleeping: ["sleep", "ing"],
  standing: ["stand", "ing"],
  swimming: ["swim", "ming"],
  walking: ["walk", "ing"],
  writing: ["writ", "ing"],
};

function buildPronunciationSpeechParts(text, { splitIngWords = false, pauseMs = 280, partPauseMs = 130 } = {}) {
  const words = String(text || "").match(/[A-Za-z']+/g) || [];

  return words.flatMap((word) => {
    const ingParts = splitIngWords ? ING_PRONUNCIATION_PARTS[word.toLowerCase()] : null;
    if (!ingParts) {
      return [{ text: word, word, pauseAfterMs: pauseMs }];
    }

    return ingParts.map((part, index) => ({
      text: part,
      word,
      pauseAfterMs: index === ingParts.length - 1 ? pauseMs : partPauseMs,
    }));
  });
}

function wordAtSpeechBoundary(text, charIndex) {
  const source = String(text || "");
  const matches = [...source.matchAll(/[A-Za-z']+/g)];
  const match = matches.find((item) => {
    const start = item.index ?? 0;
    const end = start + item[0].length;
    return charIndex >= start && charIndex < end;
  });

  return match?.[0] || "";
}

const ONBOARDING_STEPS = [
  {
    id: "level",
    title: "Cuanto ingles sabes en este momento?",
    options: [
      {
        id: "zero",
        label: "Estoy empezando desde cero",
        hint: "Iremos paso a paso con frases muy simples.",
      },
      {
        id: "some",
        label: "Se algunas palabras y frases",
        hint: "Partiremos de lo basico, pero avanzaremos un poco mas rapido.",
      },
      {
        id: "simple",
        label: "Puedo entender ingles sencillo",
        hint: "Podremos combinar mas ideas desde el inicio.",
      },
    ],
  },
  {
    id: "immediateGoal",
    title: "Que te gustaria lograr primero con tu ingles?",
    options: [
      {
        id: "basic",
        label: "Empezar a entender y usar frases basicas",
        hint: "Nos enfocaremos en una base clara y util.",
      },
      {
        id: "confidence",
        label: "Hablar con mas confianza",
        hint: "Buscaremos que te sientas comodo usando el idioma.",
      },
      {
        id: "work",
        label: "Mejorar para el trabajo",
        hint: "Luego iremos llevando el ingles hacia situaciones laborales.",
      },
      {
        id: "school",
        label: "Mejorar para la escuela o mis estudios",
        hint: "Mas adelante podremos explicar mejor la estructura y la gramatica.",
      },
      {
        id: "living",
        label: "Prepararme para vivir en un entorno en ingles",
        hint: "Te guiaremos hacia situaciones reales del dia a dia.",
      },
      {
        id: "unsure",
        label: "Todavia no estoy seguro(a)",
        hint: "Empezaremos por una ruta general y clara.",
      },
    ],
  },
  {
    id: "learningMode",
    title: "Como te gustaria aprender?",
    options: [
      {
        id: "natural_only",
        label: "De forma natural, sin muchas explicaciones",
        hint: "Ver, escuchar y repetir primero.",
      },
      {
        id: "natural_guided",
        label: "De forma natural, con ayuda cuando la necesite",
        hint: "Inmersion primero, con apoyo cuando haga falta.",
      },
      {
        id: "natural_explanations",
        label: "De forma natural, pero tambien con explicaciones",
        hint: "Primero usar el idioma y despues entender mejor la estructura.",
      },
    ],
  },
  {
    id: "confidence",
    title: "Como te sientes normalmente al aprender ingles?",
    options: [
      {
        id: "nervous",
        label: "Me pongo nervioso(a) facilmente",
        hint: "Haremos la experiencia mas tranquila y guiada.",
      },
      {
        id: "trying",
        label: "Puedo intentar aunque me equivoque",
        hint: "Seguiremos un ritmo equilibrado.",
      },
      {
        id: "comfortable",
        label: "Me siento comodo(a) probando y aprendiendo",
        hint: "Podremos avanzar con un poco mas de libertad.",
      },
    ],
  },
  {
    id: "sessionLength",
    title: "Cuanto tiempo quieres estudiar por sesion?",
    options: [
      {
        id: "short",
        label: "Unos 5 minutos",
        hint: "Te recomendaremos avances cortos y constantes.",
      },
      {
        id: "medium",
        label: "Entre 10 y 15 minutos",
        hint: "Tendras un ritmo equilibrado para practicar.",
      },
      {
        id: "long",
        label: "20 minutos o mas",
        hint: "Podremos trabajar lecciones mas amplias en cada sesion.",
      },
    ],
  },
  {
    id: "challenge",
    title: "Que sientes que mas te cuesta en este momento?",
    multiSelect: true,
    helperText: "Puedes elegir una o varias opciones.",
    options: [
      {
        id: "pronunciation",
        label: "Pronunciar algunos sonidos",
        hint: "Mas adelante te daremos apoyo especial para sonidos dificiles.",
      },
      {
        id: "listening",
        label: "Entender lo que escucho",
        hint: "Pondremos atencion en comprension y repeticion clara.",
      },
      {
        id: "memory",
        label: "Recordar palabras",
        hint: "Reforzaremos con repeticion y asociaciones visuales.",
      },
      {
        id: "sentences",
        label: "Formar oraciones completas",
        hint: "Trabajaremos frases utiles desde temprano.",
      },
      {
        id: "everything",
        label: "Me cuesta un poco de todo",
        hint: "Empezaremos con una ruta mas guiada y amplia.",
      },
      {
        id: "unsure",
        label: "Todavia no estoy seguro(a)",
        hint: "Te guiaremos y descubriremos eso contigo.",
      },
    ],
  },
];

function useTone() {
  const audioContextRef = useRef(null);

  const getAudioContext = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    return audioContextRef.current;
  }, []);

  useEffect(() => {
    const unlockToneAudio = () => {
      const context = getAudioContext();
      if (context?.state === "suspended") {
        context.resume().catch(() => {});
      }
    };

    window.addEventListener("pointerdown", unlockToneAudio, { passive: true });
    window.addEventListener("touchstart", unlockToneAudio, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockToneAudio);
      window.removeEventListener("touchstart", unlockToneAudio);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [getAudioContext]);

  return useCallback(async (notes) => {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume().catch(() => {});
    }
    const now = context.currentTime;
    const sequence = Array.isArray(notes) ? notes : [notes];
    const sequenceDurationMs = sequence.reduce(
      (duration, note) => Math.max(duration, (note.delayMs || 0) + note.durationMs),
      0
    );

    sequence.forEach((note) => {
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

    await new Promise((resolve) => window.setTimeout(resolve, sequenceDurationMs + 35));
  }, [getAudioContext]);
}

function useSpeech() {
  const [voices, setVoices] = useState([]);
  const speechSequenceRef = useRef(0);
  const audioRef = useRef(null);
  const courseAudioContextRef = useRef(null);
  const courseAudioSourceRef = useRef(null);
  const decodedCourseAudioRef = useRef(new Map());
  const speechTimersRef = useRef([]);
  const audioProgressFrameRef = useRef(null);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const unlockCourseAudio = () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!courseAudioContextRef.current) {
        courseAudioContextRef.current = new AudioContextClass();
      }

      if (courseAudioContextRef.current.state === "suspended") {
        courseAudioContextRef.current.resume().catch(() => {});
      }
    };

    window.addEventListener("pointerdown", unlockCourseAudio, { passive: true });
    window.addEventListener("touchstart", unlockCourseAudio, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockCourseAudio);
      window.removeEventListener("touchstart", unlockCourseAudio);
      if (courseAudioSourceRef.current) {
        try {
          courseAudioSourceRef.current.stop();
        } catch (error) {
          // The source may already be stopped.
        }
        try {
          courseAudioSourceRef.current.disconnect();
        } catch (error) {
          // The source may already be disconnected.
        }
        courseAudioSourceRef.current = null;
      }
      if (courseAudioContextRef.current) {
        courseAudioContextRef.current.close().catch(() => {});
        courseAudioContextRef.current = null;
      }
      decodedCourseAudioRef.current.clear();
    };
  }, []);

  const chooseVoice = useCallback(
    (mode) => {
      const englishVoices = voices.filter((item) => item.lang?.toLowerCase().startsWith("en"));
      const scoredVoices = englishVoices
        .map((voice) => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          let score = 0;

          if (lang === "en-us") score += 30;
          if (name.includes("natural") || name.includes("neural") || name.includes("online")) score += 35;
          if (name.includes("google")) score += 20;
          if (["aria", "jenny", "ava", "emma", "sonia", "libby", "brian", "guy"].some((item) => name.includes(item))) score += 18;
          if (voice.localService) score += 4;
          if (name.includes("desktop") || name.includes("david") || name.includes("zira")) score -= 12;

          return { voice, score };
        })
        .sort((left, right) => right.score - left.score);

      if (mode === "feedback" && scoredVoices[1]) {
        return scoredVoices[1].voice;
      }

      return scoredVoices[0]?.voice || englishVoices[0] || voices[0];
    },
    [voices]
  );

  const clearSpeechTimers = useCallback(() => {
    speechTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    speechTimersRef.current = [];
  }, []);

  const scheduleSpeechTimer = useCallback((callback, delayMs) => {
    const timerId = window.setTimeout(callback, delayMs);
    speechTimersRef.current.push(timerId);
    return timerId;
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioProgressFrameRef.current) {
      window.cancelAnimationFrame(audioProgressFrameRef.current);
      audioProgressFrameRef.current = null;
    }
    if (courseAudioSourceRef.current) {
      try {
        courseAudioSourceRef.current.stop();
      } catch (error) {
        // The source may already be stopped.
      }
      try {
        courseAudioSourceRef.current.disconnect();
      } catch (error) {
        // The source may already be disconnected.
      }
      courseAudioSourceRef.current = null;
    }
    if (audioRef.current) {
      const objectUrl = audioRef.current.__objectUrl;
      audioRef.current.pause();
      audioRef.current.src = "";
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      audioRef.current = null;
    }
  }, []);

  const getCourseAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      throw new Error("Audio playback is not available.");
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not available.");
    }

    if (!courseAudioContextRef.current) {
      courseAudioContextRef.current = new AudioContextClass();
    }

    if (courseAudioContextRef.current.state === "suspended") {
      await courseAudioContextRef.current.resume();
    }

    return courseAudioContextRef.current;
  }, []);

  const decodeCourseAudio = useCallback(async (url, context) => {
    const cachedAudio = decodedCourseAudioRef.current.get(url);
    if (cachedAudio) {
      return cachedAudio;
    }

    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Could not fetch course audio: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
    decodedCourseAudioRef.current.set(url, audioBuffer);
    return audioBuffer;
  }, []);

  const speakWithBrowserVoice = useCallback((text, options = {}, sequenceId = null) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return 0;
    }

    window.speechSynthesis.cancel();

    const voice = chooseVoice(options.voiceMode);
    const makeUtterance = (spokenText) => {
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = options.lang || "en-US";
      utterance.rate = options.rate ?? (options.voiceMode === "feedback" ? 0.78 : 0.68);
      utterance.pitch = options.pitch ?? 1.03;
      utterance.volume = options.volume ?? 1;

      if (voice) {
        utterance.voice = voice;
      }

      return utterance;
    };

    if (options.wordByWord) {
      const pauseMs = options.wordPauseMs ?? 280;
      const partPauseMs = options.wordPartPauseMs ?? 130;
      const speechParts = buildPronunciationSpeechParts(text, {
        splitIngWords: options.splitIngWords,
        pauseMs,
        partPauseMs,
      });
      let partIndex = 0;

      const speakNextWord = () => {
        if (sequenceId && speechSequenceRef.current !== sequenceId) {
          return;
        }

        if (partIndex >= speechParts.length) {
          if (options.repeatFullAfter) {
            const fullUtterance = makeUtterance(text);
            fullUtterance.rate = options.repeatFullRate ?? 0.72;
            fullUtterance.pitch = options.repeatFullPitch ?? fullUtterance.pitch;
            if (typeof options.onRepeatStart === "function") {
              options.onRepeatStart();
            }
            if (typeof options.onRepeatPartStart === "function") {
              fullUtterance.onboundary = (event) => {
                const word = wordAtSpeechBoundary(text, event.charIndex);
                if (word) {
                  options.onRepeatPartStart({ text: word, word });
                }
              };
            }
            fullUtterance.onend = () => {
              if (speechSequenceRef.current === sequenceId && typeof options.onEnd === "function") {
                options.onEnd();
              }
            };
            window.setTimeout(() => {
              if (!sequenceId || speechSequenceRef.current === sequenceId) {
                if (typeof options.onRepeatPartStart === "function") {
                  const repeatWords = String(text || "").match(/[A-Za-z']+/g) || [];
                  const repeatRate = options.repeatFullRate ?? 0.72;
                  let repeatElapsedMs = 0;
                  repeatWords.forEach((word) => {
                    const scheduledAt = repeatElapsedMs;
                    window.setTimeout(() => {
                      if (!sequenceId || speechSequenceRef.current === sequenceId) {
                        options.onRepeatPartStart({ text: word, word });
                      }
                    }, scheduledAt);
                    repeatElapsedMs += Math.max(260, word.length * (95 / repeatRate));
                  });
                }
                window.speechSynthesis.speak(fullUtterance);
              }
            }, options.repeatFullPauseMs ?? 350);
          } else if (typeof options.onEnd === "function") {
            options.onEnd();
          }
          return;
        }

        const currentPart = speechParts[partIndex];
        const utterance = makeUtterance(currentPart.text);
        partIndex += 1;
        if (typeof options.onPartStart === "function") {
          options.onPartStart(currentPart);
        }
        utterance.onend = () => {
          window.setTimeout(speakNextWord, currentPart.pauseAfterMs);
        };
        window.speechSynthesis.speak(utterance);
      };

      speakNextWord();
      const characterMs = (options.rate ?? 0.62) < 0.6 ? 260 : 230;
      return Math.max(
        1200,
        speechParts.reduce((total, part) => total + part.text.length * characterMs + part.pauseAfterMs, 0) +
          (options.repeatFullAfter ? String(text || "").length * 120 + (options.repeatFullPauseMs ?? 350) : 0)
      );
    }

    const utterance = makeUtterance(text);
    if (typeof options.onEnd === "function") {
      utterance.onend = () => {
        if (!sequenceId || speechSequenceRef.current === sequenceId) {
          options.onEnd();
        }
      };
    }

    window.speechSynthesis.speak(utterance);
    return Math.max(900, text.length * 120);
  }, [chooseVoice]);

  const schedulePartHighlights = useCallback((parts, callback, sequenceId, speedFactor = 1) => {
    if (typeof callback !== "function") {
      return 0;
    }

    let elapsedMs = 0;
    parts.forEach((part) => {
      const scheduledAt = elapsedMs;
      scheduleSpeechTimer(() => {
        if (speechSequenceRef.current === sequenceId) {
          callback(part);
        }
      }, scheduledAt);
      elapsedMs += Math.max(260, part.text.length * 150 * speedFactor) + part.pauseAfterMs;
    });
    return elapsedMs;
  }, [scheduleSpeechTimer]);

  const playAudioUrl = useCallback((url, sequenceId, options = {}) => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Audio playback is not available."));
        return;
      }

      const playWithHtmlAudio = () => {
        let objectUrl = null;
        let settled = false;
        let started = false;
        let readyTimerId = null;
        const loadStartedAt = window.performance.now();
        let bufferedAt = null;
        let playbackStartedAt = null;
        let waitingEvents = 0;

        const cleanup = () => {
          if (readyTimerId) {
            window.clearTimeout(readyTimerId);
            readyTimerId = null;
          }
          if (audioProgressFrameRef.current) {
            window.cancelAnimationFrame(audioProgressFrameRef.current);
            audioProgressFrameRef.current = null;
          }
        };

        const updatePlaybackProgress = () => {
          if (speechSequenceRef.current !== sequenceId || audio.paused || audio.ended) {
            return;
          }
          if (typeof options.onProgress === "function") {
            options.onProgress({
              currentTime: audio.currentTime || 0,
              duration: Number.isFinite(audio.duration) ? audio.duration : 0,
            });
          }
          audioProgressFrameRef.current = window.requestAnimationFrame(updatePlaybackProgress);
        };

        const finish = () => {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
            audio.__objectUrl = null;
          }
        };

        const audio = new Audio();
        audio.preload = "auto";
        audio.playsInline = true;
        audioRef.current = audio;
        audio.onended = () => {
          cleanup();
          finish();
          if (options.diagnosticsLabel) {
            console.info("Course audio timing", {
              label: options.diagnosticsLabel,
              buffered_ms: bufferedAt ? Math.round(bufferedAt - loadStartedAt) : null,
              playback_ms: playbackStartedAt ? Math.round(window.performance.now() - playbackStartedAt) : null,
              waiting_events: waitingEvents,
            });
          }
          if (speechSequenceRef.current === sequenceId && !settled) {
            settled = true;
            resolve();
          }
        };
        audio.onerror = () => {
          cleanup();
          finish();
          if (!settled) {
            settled = true;
            reject(new Error("Could not play course audio."));
          }
        };
        audio.onwaiting = () => {
          waitingEvents += 1;
        };

        const startPlayback = () => {
          if (started || speechSequenceRef.current !== sequenceId) {
            return;
          }
          started = true;
          cleanup();
          try {
            audio.currentTime = 0;
          } catch (error) {
            // Some mobile browsers disallow setting currentTime until metadata is fully ready.
          }
          audio.play()
            .then(() => {
              playbackStartedAt = window.performance.now();
              if (speechSequenceRef.current === sequenceId && typeof options.onStarted === "function") {
                options.onStarted();
              }
              if (speechSequenceRef.current === sequenceId && typeof options.onProgress === "function") {
                updatePlaybackProgress();
              }
            })
            .catch((error) => {
              finish();
              if (!settled) {
                settled = true;
                reject(error);
              }
            });
        };

        audio.addEventListener("canplaythrough", startPlayback, { once: true });
        audio.addEventListener("canplay", startPlayback, { once: true });

        if (options.directUrl) {
          audio.src = url;
          audio.load();
          startPlayback();
          return;
        }

        (async () => {
          try {
            const response = await fetch(url, { cache: "force-cache" });
            if (!response.ok) {
              throw new Error(`Could not fetch course audio: ${response.status}`);
            }
            const blob = await response.blob();
            bufferedAt = window.performance.now();
            if (speechSequenceRef.current !== sequenceId) {
              return;
            }
            objectUrl = URL.createObjectURL(blob);
            audio.__objectUrl = objectUrl;
            audio.src = objectUrl;
          } catch (error) {
            if (speechSequenceRef.current !== sequenceId) {
              return;
            }
            audio.src = url;
          }
          audio.load();
          if (audio.readyState >= 3) {
            startPlayback();
          } else {
            readyTimerId = window.setTimeout(startPlayback, 1800);
          }
        })();
      };

      if (options.directUrl || options.htmlAudio) {
        playWithHtmlAudio();
        return;
      }

      (async () => {
        let settled = false;
        try {
          const context = await getCourseAudioContext();
          const audioBuffer = await decodeCourseAudio(url, context);
          if (speechSequenceRef.current !== sequenceId) {
            return;
          }

          if (courseAudioSourceRef.current) {
            try {
              courseAudioSourceRef.current.stop();
            } catch (error) {
              // The source may already be stopped.
            }
            try {
              courseAudioSourceRef.current.disconnect();
            } catch (error) {
              // The source may already be disconnected.
            }
            courseAudioSourceRef.current = null;
          }

          const source = context.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(context.destination);
          courseAudioSourceRef.current = source;
          source.onended = () => {
            if (courseAudioSourceRef.current === source) {
              courseAudioSourceRef.current = null;
            }
            try {
              source.disconnect();
            } catch (error) {
              // The source may already be disconnected.
            }
            if (speechSequenceRef.current === sequenceId && !settled) {
              settled = true;
              resolve();
            }
          };
          source.start(0);
          if (typeof options.onStarted === "function") {
            options.onStarted();
          }
        } catch (error) {
          console.info("Web Audio playback unavailable, falling back to HTML audio", error);
          if (speechSequenceRef.current === sequenceId) {
            playWithHtmlAudio();
          }
        }
      })();
    });
  }, [decodeCourseAudio, getCourseAudioContext]);

  const playMediaTone = useCallback(async ({
    frequency = 740,
    frequency2 = 988,
    durationMs = 180,
    volume = 0.9,
  } = {}) => {
    if (typeof window === "undefined") {
      return false;
    }

    const sampleRate = 22050;
    const sampleCount = Math.ceil((durationMs / 1000) * sampleRate);
    const wavBuffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(wavBuffer);
    const writeText = (offset, value) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    };

    writeText(0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, "data");
    view.setUint32(40, sampleCount * 2, true);

    for (let index = 0; index < sampleCount; index += 1) {
      const time = index / sampleRate;
      const progress = index / sampleCount;
      const envelope = Math.min(1, progress / 0.08, (1 - progress) / 0.12);
      const sample =
        (Math.sin(2 * Math.PI * frequency * time) +
          0.55 * Math.sin(2 * Math.PI * frequency2 * time)) /
        1.55;
      view.setInt16(44 + index * 2, Math.round(sample * envelope * 32767), true);
    }

    const objectUrl = URL.createObjectURL(new Blob([wavBuffer], { type: "audio/wav" }));
    const audio = new Audio(objectUrl);
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = Math.min(1, Math.max(0, volume));

    return new Promise((resolve) => {
      let settled = false;
      const finish = (played) => {
        if (settled) {
          return;
        }
        settled = true;
        URL.revokeObjectURL(objectUrl);
        resolve(played);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    });
  }, []);

  const speakText = useCallback((text, options = {}) => {
    if (typeof window === "undefined") {
      return 0;
    }

    speechSequenceRef.current += 1;
    const sequenceId = speechSequenceRef.current;
    clearSpeechTimers();
    stopAudioPlayback();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const useFallback = () => speakWithBrowserVoice(text, options, sequenceId);

    if (options.disableCourseAudio) {
      return useFallback();
    }

    const lang = options.lang || "en-US";

    if (options.wordByWord) {
      const pauseMs = options.wordPauseMs ?? 280;
      const partPauseMs = options.wordPartPauseMs ?? 130;
      const speechParts = buildPronunciationSpeechParts(text, {
        splitIngWords: options.splitIngWords,
        pauseMs,
        partPauseMs,
      });
      const repeatWords = (String(text || "").match(/[A-Za-z']+/g) || []).map((word) => ({
        text: word,
        word,
        pauseAfterMs: Math.max(220, word.length * 55),
      }));
      const shouldRepeatFull = Boolean(options.repeatFullAfter);
      const slowPartWeights = speechParts.map(
        (part) =>
          Math.max(260, part.text.length * 150 * (options.rate && options.rate < 0.6 ? 1.2 : 1)) +
          part.pauseAfterMs
      );
      const slowPartTotal = slowPartWeights.reduce((total, value) => total + value, 0);
      let highlightedSlowPartIndex = -1;

      const highlightFromAudioClock = ({ currentTime, duration }) => {
        if (!duration || typeof options.onPartStart !== "function") {
          return;
        }
        const timelinePosition = Math.min(1, currentTime / duration) * slowPartTotal;
        let elapsed = 0;
        let partIndex = speechParts.length - 1;
        for (let index = 0; index < slowPartWeights.length; index += 1) {
          elapsed += slowPartWeights[index];
          if (timelinePosition < elapsed) {
            partIndex = index;
            break;
          }
        }
        if (partIndex !== highlightedSlowPartIndex) {
          highlightedSlowPartIndex = partIndex;
          options.onPartStart(speechParts[partIndex]);
        }
      };

      const slowHighlightMs = speechParts.reduce(
        (total, part) =>
          total +
          Math.max(260, part.text.length * 150 * (options.rate && options.rate < 0.6 ? 1.2 : 1)) +
          part.pauseAfterMs,
        0
      );
      const estimatedRepeatMs = shouldRepeatFull
        ? Math.max(1000, repeatWords.reduce((total, part) => total + part.text.length * 95 + part.pauseAfterMs, 0))
        : 0;
      const slowUrl = getCourseAudioUrl({
        text,
        mode: "pronunciation_slow",
        lang,
        variant: options.splitIngWords ? "split-ing" : "default",
      });

      (async () => {
        try {
          await playAudioUrl(slowUrl, sequenceId, {
            directUrl: options.directCourseAudio,
            htmlAudio: options.bufferedCourseAudio,
            diagnosticsLabel: options.bufferedCourseAudio ? "pronunciation-model" : undefined,
            onProgress: options.bufferedCourseAudio ? highlightFromAudioClock : undefined,
            onStarted: () => {
              if (!options.bufferedCourseAudio) {
                schedulePartHighlights(
                  speechParts,
                  options.onPartStart,
                  sequenceId,
                  options.rate && options.rate < 0.6 ? 1.2 : 1
                );
              }
            },
          });
          if (speechSequenceRef.current !== sequenceId) {
            return;
          }
          clearSpeechTimers();
          if (shouldRepeatFull) {
            const repeatUrl = getCourseAudioUrl({
              text,
              mode: "pronunciation_repeat",
              lang,
              variant: "medium-slow",
            });
            if (typeof options.onRepeatStart === "function") {
              options.onRepeatStart();
            }
            await new Promise((resolve) => scheduleSpeechTimer(resolve, options.repeatFullPauseMs ?? 350));
            if (speechSequenceRef.current !== sequenceId) {
              return;
            }
            await playAudioUrl(repeatUrl, sequenceId, {
              directUrl: options.directCourseAudio,
              onStarted: () => schedulePartHighlights(repeatWords, options.onRepeatPartStart, sequenceId, 0.75),
            });
          }
          if (speechSequenceRef.current === sequenceId && typeof options.onEnd === "function") {
            options.onEnd();
          }
        } catch (error) {
          console.info("Course audio unavailable, falling back to browser speech", error);
          clearSpeechTimers();
          if (speechSequenceRef.current === sequenceId) {
            speakWithBrowserVoice(text, options, sequenceId);
          }
        }
      })();

      return Math.max(2600, slowHighlightMs + estimatedRepeatMs + (shouldRepeatFull ? options.repeatFullPauseMs ?? 350 : 0));
    }

    const url = getCourseAudioUrl({
      text,
      mode: options.voiceMode === "feedback" ? "feedback" : "prompt",
      lang,
      variant: options.voiceMode || "default",
    });

    playAudioUrl(url, sequenceId)
      .then(() => {
        if (speechSequenceRef.current === sequenceId && typeof options.onEnd === "function") {
          options.onEnd();
        }
      })
      .catch((error) => {
        console.info("Course audio unavailable, falling back to browser speech", error);
        if (speechSequenceRef.current === sequenceId) {
          speakWithBrowserVoice(text, options, sequenceId);
        }
      });

    return Math.max(900, text.length * 120);
  }, [
    clearSpeechTimers,
    playAudioUrl,
    schedulePartHighlights,
    scheduleSpeechTimer,
    speakWithBrowserVoice,
    stopAudioPlayback,
  ]);

  return useMemo(() => ({ speakText, playMediaTone }), [playMediaTone, speakText]);
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

function getOption(stepId, optionId) {
  const step = ONBOARDING_STEPS.find((item) => item.id === stepId);
  return step?.options.find((option) => option.id === optionId) || null;
}

function getOptionLabel(stepId, optionId) {
  return getOption(stepId, optionId)?.label || "";
}

function getStoredValueAsList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function getOptionLabels(stepId, optionIds) {
  return getStoredValueAsList(optionIds)
    .map((optionId) => getOptionLabel(stepId, optionId))
    .filter(Boolean);
}

function getRecommendation(profile) {
  if (!profile) {
    return "";
  }

  if (profile.immediateGoal === "school") {
    return "Empezaremos de forma natural y mas adelante podremos sumar explicaciones de estructura y gramatica para tus estudios.";
  }

  if (profile.immediateGoal === "basic") {
    return "Empezaremos con frases sencillas, imagenes claras y mucha repeticion para darte una base util.";
  }

  if (profile.immediateGoal === "confidence") {
    return "Nos enfocaremos en que te sientas mas seguro(a) usando frases cortas y claras desde el inicio.";
  }

  if (profile.immediateGoal === "work") {
    return "Construiremos primero una base clara y despues iremos llevando tu ingles hacia situaciones de trabajo.";
  }

  if (profile.immediateGoal === "living") {
    return "Te guiaremos poco a poco hacia el ingles que sirve para moverte en situaciones reales.";
  }

  return "Te daremos una base clara y natural para que descubras tu mejor camino con el ingles.";
}

function getProfileBullets(profile) {
  if (!profile) {
    return [];
  }

  const bullets = [
    `Nivel actual: ${getOptionLabel("level", profile.level)}`,
    `Objetivo inmediato: ${getOptionLabel("immediateGoal", profile.immediateGoal)}`,
    `Forma de aprender: ${getOptionLabel("learningMode", profile.learningMode)}`,
    `Tiempo por sesion: ${getOptionLabel("sessionLength", profile.sessionLength)}`,
  ];

  const challengeLabels = getOptionLabels("challenge", profile.challenge);
  if (challengeLabels.length > 0) {
    bullets.push(`Lo que mas te cuesta: ${challengeLabels.join(", ")}`);
  }

  return bullets;
}

function shouldShowHelp(profile) {
  if (!profile) {
    return false;
  }

  return profile.learningMode !== "natural_only" || profile.confidence === "nervous";
}

function getWrongFeedback(profile) {
  if (profile?.confidence === "nervous") {
    return "No pasa nada. Intentalo otra vez. Esta tarjeta ya no contara como acierto al primer intento.";
  }

  return "No fue esa. Intentalo otra vez. Esta tarjeta ya no contara como acierto al primer intento.";
}

function summarizePronunciationScore(result) {
  const textScore = result?.text_score;
  const wordScores = textScore?.word_score_list || [];
  const azureScores = textScore?.azure_scores || {};
  const pronunciation =
    textScore?.quality_score ??
    null;
  const weakestWord = wordScores
    .filter((word) => typeof word.quality_score === "number")
    .sort((left, right) => left.quality_score - right.quality_score)[0];
  const weakestSyllable = weakestWord
    ? (weakestWord.syllable_score_list || [])
        .filter((syllable) => typeof syllable.quality_score === "number")
        .sort((left, right) => left.quality_score - right.quality_score)[0]
    : null;
  const weakestPhone = weakestWord
    ? (weakestWord.phone_score_list || [])
        .filter((phone) => typeof phone.quality_score === "number")
        .sort((left, right) => left.quality_score - right.quality_score)[0]
    : null;

  return {
    pronunciation,
    accuracy: azureScores.accuracy ?? pronunciation,
    fluency: azureScores.fluency ?? null,
    completeness: azureScores.completeness ?? null,
    wordScores,
    weakestWord,
    weakestSyllable,
    weakestPhone,
  };
}

function normalizeAzureStreamingResult(payload, recognizedText, elapsedMs) {
  const best = (payload?.NBest || [])[0] || {};
  const assessment = best.PronunciationAssessment || best;
  const wordScores = (best.Words || []).map((word) => {
    const wordAssessment = word.PronunciationAssessment || word;
    return {
      word: word.Word,
      quality_score: wordAssessment.AccuracyScore,
      error_type: wordAssessment.ErrorType,
      syllable_score_list: (word.Syllables || []).map((syllable) => ({
        letters: syllable.Grapheme || syllable.Syllable,
        quality_score: (syllable.PronunciationAssessment || syllable).AccuracyScore,
      })),
      phone_score_list: (word.Phonemes || []).map((phone) => ({
        phone: phone.Phoneme,
        quality_score: (phone.PronunciationAssessment || phone).AccuracyScore,
      })),
    };
  });
  const syllableScores = wordScores
    .flatMap((word) => word.syllable_score_list || [])
    .map((syllable) => syllable.quality_score)
    .filter((score) => typeof score === "number");
  const syllableAccuracy = syllableScores.length
    ? syllableScores.reduce((total, score) => total + score, 0) / syllableScores.length
    : null;
  const soundAccuracy = Math.max(
    assessment.AccuracyScore ?? 0,
    syllableAccuracy ?? 0
  );

  return {
    provider: "azure-streaming",
    recognized_text: recognizedText || payload?.DisplayText || best.Display,
    text_score: {
      // PronScore includes fluency; sound accuracy must remain independent so
      // deliberately segmented beginner speech is not labeled incorrect.
      quality_score: soundAccuracy,
      word_score_list: wordScores,
      azure_scores: {
        accuracy: assessment.AccuracyScore,
        fluency: assessment.FluencyScore,
        completeness: assessment.CompletenessScore,
        prosody: assessment.ProsodyScore,
      },
    },
    _client_timing: {
      total_ms: Math.round(elapsedMs),
      transport: "azure-browser-streaming",
    },
  };
}

function promptParts(prompt) {
  return prompt.match(/[A-Za-z]+|[^A-Za-z]+/g) || [prompt];
}

const LIVE_PRONUNCIATION_SYLLABLES = {
  adult: ["ad", "ult"],
  adults: ["ad", "ults"],
  babies: ["ba", "bies"],
  baby: ["ba", "by"],
  brother: ["bro", "ther"],
  brothers: ["bro", "thers"],
  building: ["build", "ing"],
  children: ["chil", "dren"],
  cooking: ["cook", "ing"],
  eating: ["eat", "ing"],
  family: ["fam", "i", "ly"],
  father: ["fa", "ther"],
  grandfather: ["grand", "fa", "ther"],
  grandmother: ["grand", "mo", "ther"],
  grandparents: ["grand", "par", "ents"],
  listen: ["lis", "ten"],
  mother: ["mo", "ther"],
  parents: ["par", "ents"],
  playing: ["play", "ing"],
  reading: ["read", "ing"],
  running: ["run", "ning"],
  sister: ["sis", "ter"],
  sisters: ["sis", "ters"],
  sitting: ["sit", "ting"],
  sleeping: ["sleep", "ing"],
  standing: ["stand", "ing"],
  studying: ["stud", "y", "ing"],
  swimming: ["swim", "ming"],
  talking: ["talk", "ing"],
  walking: ["walk", "ing"],
  woman: ["wo", "man"],
  working: ["work", "ing"],
  writing: ["writ", "ing"],
};

function pronunciationSpeechTokens(text) {
  return String(text || "").toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
}

function readablePronunciationSyllables(word) {
  const normalized = pronunciationSpeechTokens(word)[0] || String(word || "").toLowerCase();
  if (LIVE_PRONUNCIATION_SYLLABLES[normalized]) return LIVE_PRONUNCIATION_SYLLABLES[normalized];
  if (normalized.endsWith("ing") && normalized.length > 5) {
    const stem = normalized.slice(0, -3);
    const final = stem.at(-1);
    const preceding = stem.at(-2);
    return final && final === preceding ? [stem.slice(0, -1), `${final}ing`] : [stem, "ing"];
  }
  return [normalized];
}

function pronunciationReferenceSyllables(text) {
  return pronunciationSpeechTokens(text).flatMap((word, wordIndex) =>
    readablePronunciationSyllables(word).map((label, syllableIndex) => ({
      key: `${wordIndex}:${syllableIndex}`,
      label,
      syllableIndex,
      word,
      wordIndex,
    }))
  );
}

function livePronunciationSyllables(referenceText, recognizedText) {
  const expectedWords = pronunciationSpeechTokens(referenceText);
  const slots = pronunciationReferenceSyllables(referenceText);
  const heard = [];
  const recognizedKeys = [];
  let cursor = 0;

  pronunciationSpeechTokens(recognizedText).forEach((observedToken, observedIndex) => {
    let wordIndex = expectedWords.findIndex((word, index) => index >= cursor && word === observedToken);
    if (wordIndex < 0) wordIndex = expectedWords.findIndex((word) => word === observedToken);

    let matchingSlots = wordIndex >= 0 ? slots.filter((slot) => slot.wordIndex === wordIndex) : [];
    if (wordIndex < 0) {
      const orderedIndexes = [
        ...expectedWords.map((_, index) => index).filter((index) => index >= cursor),
        ...expectedWords.map((_, index) => index).filter((index) => index < cursor).reverse(),
      ];
      for (const candidateIndex of orderedIndexes) {
        const wordSlots = slots.filter((slot) => slot.wordIndex === candidateIndex);
        for (let start = 0; start < wordSlots.length; start += 1) {
          let combined = "";
          for (let end = start; end < wordSlots.length; end += 1) {
            combined += wordSlots[end].label;
            if (combined === observedToken) {
              wordIndex = candidateIndex;
              matchingSlots = wordSlots.slice(start, end + 1);
              break;
            }
          }
          if (wordIndex >= 0) break;
        }
        if (wordIndex >= 0) break;
      }
    }

    if (matchingSlots.length) {
      heard.push(...matchingSlots);
      recognizedKeys.push(...matchingSlots.map((slot) => slot.key));
      const wordSlots = slots.filter((slot) => slot.wordIndex === wordIndex);
      if (matchingSlots.at(-1)?.syllableIndex === wordSlots.at(-1)?.syllableIndex) cursor = wordIndex + 1;
      else cursor = wordIndex;
    } else {
      heard.push({ key: `extra:${observedIndex}:${observedToken}`, label: observedToken, wordIndex: -1 });
    }
  });

  return { heard, recognizedKeys: [...new Set(recognizedKeys)] };
}

function normalizePronunciationWord(word) {
  return String(word || "").toLowerCase().replace(/[^a-z]/g, "");
}

function findWordScore(summary, word) {
  const key = normalizePronunciationWord(word);
  if (!key) {
    return null;
  }

  return summary?.wordScores?.find((item) => normalizePronunciationWord(item.word) === key) || null;
}

function pronunciationPromptFromOption(optionId) {
  const parts = String(optionId || "").split("-");
  const action = parts[parts.length - 1];
  const actionWords = [
    "running",
    "walking",
    "swimming",
    "eating",
    "drinking",
    "reading",
    "writing",
    "sleeping",
    "sitting",
    "standing",
    "playing",
    "working",
    "cooking",
    "talking",
    "studying",
  ];
  const hasAction = actionWords.includes(action);
  const people = hasAction ? parts.slice(0, -1) : parts;

  if (people.length > 1) {
    return hasAction ? `They are ${action}.` : "They";
  }

  const person = people[0];
  if (!person) {
    return "";
  }

  if (hasAction) {
    return `The ${person} is ${action}.`;
  }

  return `The ${person}`;
}

function optionPracticePrompt(option) {
  return option?.label || pronunciationPromptFromOption(option?.id);
}

function pronunciationThresholds(level) {
  if (String(level || "").toUpperCase().includes("A1")) {
    return {
      passAccuracy: 30,
      minimumCompleteness: 60,
      greenWord: 65,
      orangeWord: 25,
    };
  }

  return {
    passAccuracy: 65,
    minimumCompleteness: 75,
    greenWord: 75,
    orangeWord: 55,
  };
}

function pronunciationExerciseType(text) {
  const wordCount = String(text || "").match(/[A-Za-z']+/g)?.length || 0;
  if (wordCount <= 1) return "WORD";
  if (wordCount <= 4) return "SHORT_PHRASE";
  return "SENTENCE";
}

const NO_SPEECH_LISTEN_MS = 3000;
const MAX_NO_SPEECH_ROUNDS = 3;
const NO_SPEECH_REPLAY_DELAY_MS = 900;

function getPronunciationAdvice(summary) {
  if (!summary?.weakestWord) {
    return "Intentalo otra vez con sonidos claros y despacio.";
  }

  const word = summary.weakestWord.word;
  const syllable = summary.weakestSyllable?.letters;
  const phone = summary.weakestPhone?.phone;

  if (phone === "dh" || phone === "th") {
    return `En "${word}", coloca la punta de la lengua suavemente entre los dientes. Saca un poco de aire y, si suena como "the", usa la voz.`;
  }

  if (phone === "r") {
    return `En "${word}", no hagas la r como en espanol. Levanta un poco el centro de la lengua y redondea ligeramente los labios.`;
  }

  if (phone === "ih" || phone === "iy") {
    return `En "${word}", cuida la vocal. Sonrie un poco, manten la boca relajada y haz el sonido corto y claro.`;
  }

  if (syllable) {
    return `En "${word}", practica primero la parte "${syllable}". Dila despacio, luego repite toda la frase.`;
  }

  return `Practica "${word}" despacio. Mira la posicion de tu boca, dilo una vez solo, y luego repite toda la frase.`;
}

function getMouthCoachType(summary) {
  const phone = summary?.weakestPhone?.phone;
  const word = normalizePronunciationWord(summary?.weakestWord?.word);
  const syllable = normalizePronunciationWord(summary?.weakestSyllable?.letters);

  if (phone === "dh" || phone === "th" || word.startsWith("th")) {
    return "th";
  }

  if (phone === "r" || word.includes("r")) {
    return "r";
  }

  if (word.startsWith("w") || phone === "w") {
    return "w";
  }

  if (word.endsWith("ing") || syllable.includes("ing") || syllable.includes("ning") || syllable.includes("ming")) {
    return "ing";
  }

  if (phone === "ih" || phone === "iy") {
    return "vowel";
  }

  return "clear";
}

function mouthCoachConfig(type) {
  return {
    th: {
      title: "Lengua entre dientes",
      cue: "Toca los dientes con la lengua y deja salir aire.",
      steps: ["abre", "lengua adelante", "aire"],
      lipRx: "67;70;70;67",
      lipRy: "34;37;35;34",
      mouthRx: "43;47;46;43",
      mouthRy: "18;21;19;18",
      tongueMove: "0 13;0 -6;0 0;0 13",
      tongueTipOpacity: "0.15;1;0.82;0.15",
      arrow: "M154 57 C139 48 130 47 119 55",
    },
    r: {
      title: "R suave",
      cue: "Redondea un poco los labios y levanta la lengua sin tocar.",
      steps: ["redondea", "lengua arriba", "suave"],
      lipRx: "58;50;54;58",
      lipRy: "35;39;37;35",
      mouthRx: "37;31;34;37",
      mouthRy: "19;23;21;19",
      tongueMove: "0 12;0 -12;0 -7;0 12",
      tongueTipOpacity: "0.1;0.55;0.35;0.1",
      arrow: "M151 80 C136 61 123 55 108 59",
    },
    w: {
      title: "Labios redondos",
      cue: "Haz los labios redondos primero, luego abre para la palabra.",
      steps: ["redondea", "empuja", "abre"],
      lipRx: "66;43;55;66",
      lipRy: "32;42;37;32",
      mouthRx: "42;24;34;42",
      mouthRy: "17;25;21;17",
      tongueMove: "0 8;0 9;0 4;0 8",
      tongueTipOpacity: "0.12;0.18;0.14;0.12",
      arrow: "M151 43 C132 37 115 39 98 48",
    },
    ing: {
      title: "Final -ing",
      cue: "La parte de atras de la lengua sube. El sonido sale por la nariz.",
      steps: ["base", "lengua atras", "nariz"],
      lipRx: "64;66;62;64",
      lipRy: "32;35;32;32",
      mouthRx: "42;45;40;42",
      mouthRy: "17;20;17;17",
      tongueMove: "0 12;13 -10;16 -14;0 12",
      tongueTipOpacity: "0.12;0.28;0.2;0.12",
      arrow: "M151 75 C136 64 125 58 111 52",
    },
    vowel: {
      title: "Vocal corta",
      cue: "Relaja la boca y haz la vocal pequena y clara.",
      steps: ["relaja", "sonrie", "corto"],
      lipRx: "62;70;64;62",
      lipRy: "31;29;30;31",
      mouthRx: "39;47;40;39",
      mouthRy: "16;15;15;16",
      tongueMove: "0 10;0 5;0 6;0 10",
      tongueTipOpacity: "0.1;0.15;0.14;0.1",
      arrow: "M151 52 C136 51 122 51 107 52",
    },
    clear: {
      title: "Mira la boca",
      cue: "Abre, coloca la lengua y repite despacio.",
      steps: ["abre", "coloca", "repite"],
      lipRx: "62;67;64;62",
      lipRy: "31;35;33;31",
      mouthRx: "39;44;41;39",
      mouthRy: "16;20;18;16",
      tongueMove: "0 11;0 1;0 5;0 11",
      tongueTipOpacity: "0.12;0.4;0.25;0.12",
      arrow: "M151 63 C136 57 122 55 108 58",
    },
  }[type] || {
    title: "Mira la boca",
    cue: "Abre, coloca la lengua y repite despacio.",
    steps: ["abre", "coloca", "repite"],
    lipRx: "62;67;64;62",
    lipRy: "31;35;33;31",
    mouthRx: "39;44;41;39",
    mouthRy: "16;20;18;16",
    tongueMove: "0 11;0 1;0 5;0 11",
    tongueTipOpacity: "0.12;0.4;0.25;0.12",
    arrow: "M151 63 C136 57 122 55 108 58",
  };
}

function getPronunciationOutcome(summary, level, result = null) {
  const interpreted = result?.feature_flags?.pedagogicalScoring === false
    ? null
    : result?.interpreted;
  if (interpreted) {
    return {
      accepted: interpreted.passed,
      title: interpreted.passed ? "Muy bien" : "Practiquemos una parte",
      message: result?.feedback?.messages?.es || (interpreted.passed ? "Suena bien." : "Escucha e inténtalo otra vez."),
    };
  }
  const thresholds = pronunciationThresholds(level);
  const accuracy = summary?.accuracy ?? summary?.pronunciation;
  const completeness = summary?.completeness;

  if (typeof accuracy !== "number") {
    return {
      accepted: false,
      title: "Intenta otra vez",
      message: "No pude revisar eso con claridad. Intenta decir la frase otra vez.",
    };
  }

  if (typeof completeness === "number" && completeness < thresholds.minimumCompleteness) {
    return {
      accepted: false,
      title: "Intenta otra vez",
      message: "Escuche solo una parte de la frase. Toma tu tiempo e intenta decir todas las palabras.",
    };
  }

  if (accuracy >= thresholds.passAccuracy) {
    return {
      accepted: true,
      title: "Nice",
      message: "Suena bien. Sigue asi.",
    };
  }

  return {
    accepted: false,
    title: "Intenta otra vez",
    message: getPronunciationAdvice(summary),
  };
}

export default function LessonPlayer({ lesson, lessons, testMode = false }) {
  const [activeLesson, setActiveLesson] = useState(lesson);
  const [started, setStarted] = useState(testMode);
  const [profileLoaded, setProfileLoaded] = useState(testMode);
  const [profile, setProfile] = useState(
    testMode
      ? {
          ...DEFAULT_PROFILE,
          displayName: "Pronunciation Test",
        }
      : null
  );
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [profileSaveError, setProfileSaveError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState({});
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(-1);
  const [cardIndex, setCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState({});
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [autoAdvanceDelayMs, setAutoAdvanceDelayMs] = useState(700);
  const [showHelp, setShowHelp] = useState(false);
  const [lessonSessionId, setLessonSessionId] = useState(null);
  const [loadingLessonId, setLoadingLessonId] = useState(null);
  const [lessonLoadError, setLessonLoadError] = useState("");
  const [pronunciationStatus, setPronunciationStatus] = useState("Getting ready...");
  const [isPronunciationRecording, setIsPronunciationRecording] = useState(false);
  const [isPronunciationScoring, setIsPronunciationScoring] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState(null);
  const [pronunciationError, setPronunciationError] = useState("");
  const [pronunciationNoSpeechFailure, setPronunciationNoSpeechFailure] = useState(false);
  const [pronunciationAttempt, setPronunciationAttempt] = useState(0);
  const [pronunciationSpokenWordCount, setPronunciationSpokenWordCount] = useState(0);
  const [pronunciationRecognizedSyllableKeys, setPronunciationRecognizedSyllableKeys] = useState([]);
  const [activePronunciationOptionIndex, setActivePronunciationOptionIndex] = useState(0);
  const [completedPronunciationOptions, setCompletedPronunciationOptions] = useState([]);
  const [completedPronunciationResults, setCompletedPronunciationResults] = useState({});
  const [modelSpeechPart, setModelSpeechPart] = useState(null);
  const pronunciationRecorderRef = useRef(null);
  const pronunciationRecognitionRef = useRef(null);
  const azurePronunciationRecognizerRef = useRef(null);
  const azureStreamingPreparationRef = useRef({ promise: null, expiresAt: 0 });
  const pronunciationChunksRef = useRef([]);
  const pronunciationStreamRef = useRef(null);
  const pronunciationAudioContextRef = useRef(null);
  const pronunciationMonitorRef = useRef(null);
  const pronunciationStartTimeoutRef = useRef(null);
  const pronunciationTimeoutRef = useRef(null);
  const pronunciationHasSpeechRef = useRef(false);
  const pronunciationNoSpeechRoundRef = useRef(0);
  const beginPronunciationRecordingRef = useRef(null);
  const pronunciationSilenceStartedAtRef = useRef(null);
  const pronunciationStartedAtRef = useRef(0);
  const pronunciationShouldScoreRef = useRef(true);
  const pronunciationCardKeyRef = useRef("");
  const pronunciationToneKeyRef = useRef("");
  const spokenPromptKeyRef = useRef("");
  const preloadedAudioKeysRef = useRef(new Set());
  const playTone = useTone();
  const { speakText, playMediaTone } = useSpeech();
  const viewportWidth = useViewportWidth();
  const isTablet = viewportWidth <= 1080;
  const isMobile = viewportWidth <= 760;
  const playReadyCue = useCallback(async () => {
    const playedThroughMedia = await playMediaTone({
      frequency: 740,
      frequency2: 988,
      durationMs: 180,
      volume: 1,
    });
    if (!playedThroughMedia) {
      await playTone({
        frequency: 740,
        frequency2: 988,
        durationMs: 180,
        type: "sine",
        type2: "triangle",
        volume: 0.85,
      });
    }
  }, [playMediaTone, playTone]);

  const currentCard = activeLesson.cards[cardIndex];
  const totalCards = activeLesson.cards.length;
  const isPronunciationCard =
    activeLesson.id === "lesson-3-pronunciation" || currentCard?.stage === "Pronunciation Practice";
  const cardPromptText = currentCard ? currentCard.audio_text ?? currentCard.prompt : "";
  const cardPromptVoiceMode = cardPromptText.trim().toLowerCase() === "what is it?" ? "question" : "prompt";
  const isRecognitionLesson =
    activeLesson.id === "lesson-1-people-actions" ||
    activeLesson.id === "lesson-2-pronouns" ||
    activeLesson.id === "lesson-4-family-members" ||
    activeLesson.id === "lesson-4-family-members-continued" ||
    activeLesson.id === "lesson-6-objects-places";
  const optionCount = currentCard?.options.length || 2;
  const activePronunciationOption = isPronunciationCard ? currentCard?.options[activePronunciationOptionIndex] : null;
  const activePronunciationPrompt =
    isPronunciationCard && activePronunciationOption
      ? optionPracticePrompt(activePronunciationOption)
      : currentCard?.prompt || "";
  const pronunciationTargetSyllables = useMemo(
    () => pronunciationReferenceSyllables(activePronunciationPrompt),
    [activePronunciationPrompt]
  );
  const pronunciationRecognizedSyllableSet = useMemo(
    () => new Set(pronunciationRecognizedSyllableKeys),
    [pronunciationRecognizedSyllableKeys]
  );
  const isFourOptionCard = optionCount >= 4;
  const isThreeOptionCard = optionCount === 3;
  const isSingleOptionCard = optionCount === 1;
  const onboardingFinished = onboardingStepIndex >= ONBOARDING_STEPS.length;
  const activeOnboardingStep =
    onboardingStepIndex >= 0 && onboardingStepIndex < ONBOARDING_STEPS.length
      ? ONBOARDING_STEPS[onboardingStepIndex]
      : null;
  const progressLabel = useMemo(
    () => `${Math.min(cardIndex + 1, totalCards)} / ${totalCards}`,
    [cardIndex, totalCards]
  );
  const pronunciationSummary = useMemo(
    () => summarizePronunciationScore(pronunciationResult),
    [pronunciationResult]
  );
  const pronunciationOutcome = useMemo(
    () => getPronunciationOutcome(pronunciationSummary, activeLesson.level, pronunciationResult),
    [activeLesson.level, pronunciationResult, pronunciationSummary]
  );
  const onboardingProgress = useMemo(() => {
    if (!activeOnboardingStep) {
      return "";
    }

    return `${onboardingStepIndex + 1} / ${ONBOARDING_STEPS.length}`;
  }, [activeOnboardingStep, onboardingStepIndex]);
  const curriculumUnits = useMemo(() => {
    const units = [];
    const unitMap = new Map();

    lessons.forEach((lessonSummary) => {
      const unitKey = lessonSummary.unit_id || "unit-1";
      const lessonKey = lessonSummary.lesson_id || "lesson-1";

      if (!unitMap.has(unitKey)) {
        const unit = {
          id: unitKey,
          title: lessonSummary.unit_title || "Unit 1",
          lessons: [],
          lessonMap: new Map(),
        };
        unitMap.set(unitKey, unit);
        units.push(unit);
      }

      const unit = unitMap.get(unitKey);
      if (!unit.lessonMap.has(lessonKey)) {
        const lessonGroup = {
          id: lessonKey,
          title: lessonSummary.lesson_title || "Lesson 1",
          subLessons: [],
        };
        unit.lessonMap.set(lessonKey, lessonGroup);
        unit.lessons.push(lessonGroup);
      }

      unit.lessonMap.get(lessonKey).subLessons.push(lessonSummary);
    });

    return units.map((unit) => ({
      ...unit,
      lessonMap: undefined,
    }));
  }, [lessons]);
  const shellStyle = {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gap: isMobile ? "8px" : "20px",
  };
  const compactPracticeHeader = isPronunciationCard && (isMobile || isTablet);
  const heroStyle = {
    ...styles.hero,
    padding: compactPracticeHeader ? (isMobile ? "7px 10px" : "10px 18px") : isMobile ? "14px 18px" : "20px 30px 22px",
    borderRadius: isMobile ? "18px" : styles.hero.borderRadius,
    width: compactPracticeHeader ? "100%" : isMobile ? "100%" : isTablet ? "82%" : "64%",
    justifySelf: "center",
    textAlign: "center",
  };
  const boardStyle = {
    ...styles.board,
    padding: isMobile ? (isPronunciationCard ? "8px" : "12px") : styles.board.padding,
    borderRadius: isMobile ? "18px" : styles.board.borderRadius,
  };
  const choiceGridStyle = {
    ...styles.choiceGrid,
    gridTemplateColumns: isSingleOptionCard
      ? "minmax(0, 720px)"
      : isFourOptionCard
        ? "repeat(2, minmax(0, 1fr))"
        : isMobile
          ? "1fr"
          : styles.choiceGrid.gridTemplateColumns,
    justifyContent: isSingleOptionCard ? "center" : undefined,
    gap: isPronunciationCard && isMobile ? "10px" : isFourOptionCard ? (isMobile ? "8px" : "12px") : styles.choiceGrid.gap,
  };
  const centeredThirdOptionStyle = {
    gridColumn: "1 / -1",
    width: "calc((100% - 18px) / 2)",
    justifySelf: "center",
  };
  const responsiveImageStyle = {
    ...styles.image,
    height: isPronunciationCard && isMobile
      ? "min(25vh, 180px)"
      : isSingleOptionCard
        ? isMobile
          ? "min(48vh, 320px)"
          : isTablet
            ? "400px"
            : "460px"
      : isFourOptionCard
      ? isMobile
        ? "min(24vh, 150px)"
        : isTablet
          ? "160px"
          : "176px"
      : isMobile
        ? "min(36vh, 240px)"
        : isTablet
          ? "340px"
          : styles.image.height,
  };
  const titleStyle = {
    margin: compactPracticeHeader ? 0 : "6px 0 0",
    fontSize: compactPracticeHeader
      ? isMobile
        ? "1.02rem"
        : "1.22rem"
      : isMobile
        ? "1.42rem"
        : "clamp(1.65rem, 2.35vw, 2.32rem)",
    lineHeight: 1.12,
    letterSpacing: 0,
  };
  const newWordHighlightStyle = {
    display: "inline-block",
    margin: "0 0.08em",
    padding: isMobile ? "0.02em 0.14em" : "0.03em 0.16em",
    borderRadius: "0.34em",
    background: "rgba(244, 201, 93, 0.34)",
    boxShadow: "inset 0 -0.18em 0 rgba(233, 111, 66, 0.22)",
    color: "#8a4f00",
    fontWeight: 950,
  };
  const sloganStyle = {
    ...titleStyle,
    margin: "4px 0 0",
    fontSize: isMobile ? "1.16rem" : "clamp(1.25rem, 1.8vw, 1.78rem)",
    lineHeight: 1.14,
    fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif',
    color: "#17373b",
    textShadow: "0 2px 0 #fff3d9, 0 5px 12px rgba(92, 61, 22, 0.18)",
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
  const pronunciationCue = isPronunciationRecording
    ? { color: "var(--muted)", isActive: true }
    : { color: "var(--muted)", isActive: false };

  const renderHighlightedTitle = (text) => {
    const focusWordsByStage = {
      "More People": new Set(["and", "are"]),
      "New Grammar": new Set(["not"]),
      Grammar: new Set(["is", "are"]),
    };
    const focusWords = focusWordsByStage[currentCard?.stage];

    if (!focusWords || !text) {
      return text;
    }

    return text.split(/(\b[A-Za-z']+\b)/g).map((part, index) => {
      if (focusWords.has(part.toLowerCase())) {
        return (
          <span key={`${part}-${index}`} style={newWordHighlightStyle}>
            {part}
          </span>
        );
      }
      return part;
    });
  };
  const renderListeningCue = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "6px" : "12px",
        color: pronunciationCue.color,
        fontWeight: 800,
        minHeight: isMobile ? 20 : 28,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: isMobile ? 14 : 18,
          height: isMobile ? 14 : 18,
          borderRadius: "999px",
          background: pronunciationCue.color,
          boxShadow: `0 0 0 ${isMobile ? 6 : 8}px rgba(94, 109, 115, 0.14)`,
          animation: pronunciationCue.isActive ? "listeningPulse 850ms ease-in-out infinite" : "none",
          flex: "0 0 auto",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 2 : 3, height: isMobile ? 18 : 22 }} aria-hidden="true">
        {[0, 1, 2, 3].map((bar) => (
          <span
            key={bar}
            style={{
              width: isMobile ? 4 : 5,
              height: isMobile ? 16 : 20,
              borderRadius: "999px",
              background: pronunciationCue.color,
              transformOrigin: "center",
              opacity: pronunciationCue.isActive ? 1 : 0.25,
              animation: pronunciationCue.isActive ? `listeningBar 620ms ease-in-out ${bar * 90}ms infinite` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
  const playPronunciationModel = (text, optionId = activePronunciationOption?.id) => {
    return speakText(text, {
      voiceMode: "prompt",
      wordByWord: true,
      splitIngWords: true,
      repeatFullAfter: false,
      wordPauseMs: 220,
      wordPartPauseMs: 140,
      rate: 0.62,
      onPartStart: (part) => setModelSpeechPart({ ...part, optionId }),
      onEnd: () => setModelSpeechPart(null),
    });
  };
  const renderPronunciationWord = (
    word,
    index,
    spokenWordIndex,
    summary = pronunciationSummary,
    result = pronunciationResult,
    options = {}
  ) => {
    const { optionId = activePronunciationOption?.id, interactive = false } = options;
    const wordScore = findWordScore(summary, word);
    const qualityScore = wordScore?.quality_score;
    const hasGrading = Boolean(result);
    const attemptAccepted = hasGrading ? getPronunciationOutcome(summary, activeLesson.level, result).accepted : false;
    const thresholds = pronunciationThresholds(activeLesson.level);
    const wordErrorType = String(wordScore?.error_type || "").toLowerCase();
    const hasWordScores = Boolean(summary?.wordScores?.length);
    const isGoodFinalWord = hasGrading
      && wordErrorType !== "omission"
      && (typeof qualityScore === "number"
        ? qualityScore >= thresholds.greenWord
        : !hasWordScores && attemptAccepted);
    const isSpokenWord =
      !hasGrading &&
      isPronunciationRecording &&
      optionId === activePronunciationOption?.id &&
      spokenWordIndex < pronunciationSpokenWordCount;
    const isCurrentSpokenWord =
      isSpokenWord && spokenWordIndex === pronunciationSpokenWordCount - 1;
    const tokenBackground = hasGrading
      ? isGoodFinalWord ? "#dff4e7" : "#fff2cf"
      : isCurrentSpokenWord
        ? "#d9eef5"
        : isSpokenWord
          ? "#edf7f9"
          : "#fffdf9";
    const tokenColor = hasGrading ? isGoodFinalWord ? "#17623f" : "#8a5b10" : isSpokenWord ? "#176777" : "transparent";
    const tokenBorder = hasGrading
      ? isGoodFinalWord ? "rgba(47, 143, 98, 0.5)" : "rgba(191, 114, 0, 0.52)"
      : isSpokenWord
        ? "rgba(23, 103, 119, 0.42)"
        : "rgba(36, 51, 58, 0.1)";
    const tokenShadow = isCurrentSpokenWord
        ? "0 0 0 3px rgba(23, 103, 119, 0.16)"
        : "none";

    const tokenStyle = {
      display: "inline-flex",
      alignItems: "center",
      border: `1px solid ${tokenBorder}`,
      borderRadius: hasGrading ? "8px" : "14px",
      background: tokenBackground,
      color: tokenColor,
      padding: hasGrading ? "4px 7px" : isMobile ? "6px 9px" : "8px 12px",
      fontSize: hasGrading ? 13 : isMobile ? 18 : 24,
      fontWeight: 800,
      lineHeight: 1,
      boxShadow: tokenShadow,
    };
    const tokenTitle = hasGrading
      ? `${word}: ${isGoodFinalWord ? "bien" : "necesita mejorar"}`
      : `Escuchar ${word}`;

    if (interactive) {
      return (
        <button
          key={`${word}-${index}`}
          type="button"
          style={{
            ...tokenStyle,
            cursor: "pointer",
            appearance: "none",
            fontFamily: "inherit",
          }}
          title={tokenTitle}
          aria-label={`Escuchar ${word}`}
          onClick={(event) => {
            event.stopPropagation();
            playPronunciationModel(word, optionId);
          }}
        >
          {word}
        </button>
      );
    }

    return (
      <span key={`${word}-${index}`} style={tokenStyle} title={tokenTitle}>
      {word}
      </span>
    );
  };
  const renderPronunciationPhrase = (
    phrase = activePronunciationPrompt,
    summary = pronunciationSummary,
    result = pronunciationResult,
    options = {}
  ) => {
    let spokenWordIndex = 0;

    return promptParts(phrase).map((part, index) => {
      if (!/[A-Za-z]+/.test(part)) {
        return <span key={`${part}-${index}`}>{part}</span>;
      }

      const renderedWord = renderPronunciationWord(part, index, spokenWordIndex, summary, result, options);
      spokenWordIndex += 1;
      return renderedWord;
    });
  };
  const renderLivePronunciationSyllableProgress = () => (
    <div
      aria-live="polite"
      style={{ display: "flex", flexWrap: "wrap", gap: 4, width: "100%" }}
    >
      {pronunciationTargetSyllables.map((syllable) => {
        const recognized = pronunciationRecognizedSyllableSet.has(syllable.key);
        return (
          <span
            key={syllable.key}
            aria-label={`${syllable.label}, ${recognized ? "reconocida" : "pendiente"}`}
            style={{
              border: `1.5px solid ${recognized ? "#2f8f62" : "#b8c3c8"}`,
              borderRadius: 7,
              background: recognized ? "#dff4e7" : "#fff",
              color: recognized ? "#17623f" : "#64747b",
              fontSize: 12,
              fontWeight: 900,
              padding: "3px 7px",
            }}
          >
            {syllable.label}
          </span>
        );
      })}
    </div>
  );
  const renderEmptyPronunciationPhrase = (phrase, options = {}) => {
    const { optionId = activePronunciationOption?.id, interactive = false } = options;
    return promptParts(phrase).map((part, index) => {
      if (!/[A-Za-z]+/.test(part)) {
        return <span key={`${part}-${index}`}>{part}</span>;
      }

      const emptyTokenStyle = {
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid rgba(36, 51, 58, 0.12)",
        borderRadius: "12px",
        background: "#fffdf9",
        color: "transparent",
        padding: isMobile ? "5px 8px" : "7px 10px",
        fontSize: isMobile ? 16 : 20,
        fontWeight: 800,
        lineHeight: 1,
        userSelect: "none",
      };

      if (interactive) {
        return (
          <button
            key={`${part}-${index}`}
            type="button"
            style={{
              ...emptyTokenStyle,
              appearance: "none",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
            title={`Escuchar ${part}`}
            aria-label={`Escuchar ${part}`}
            onClick={(event) => {
              event.stopPropagation();
              playPronunciationModel(part, optionId);
            }}
          >
            {part}
          </button>
        );
      }

      return (
        <span key={`${part}-${index}`} style={emptyTokenStyle}>
          {part}
        </span>
      );
    });
  };
  const renderPronunciationPromptHeader = (phrase, optionId, isActive) => {
    const activePart = isActive && modelSpeechPart?.optionId === optionId ? modelSpeechPart : null;

    return promptParts(phrase).map((part, index) => {
      if (!/[A-Za-z]+/.test(part)) {
        return <span key={`${part}-${index}`}>{part}</span>;
      }

      const normalizedWord = part.toLowerCase();
      const normalizedActiveWord = activePart?.word?.toLowerCase();
      const normalizedActiveText = activePart?.text?.toLowerCase();
      const ingParts = ING_PRONUNCIATION_PARTS[normalizedWord];
      const shouldHighlightWhole = normalizedActiveText === normalizedWord || normalizedActiveWord === normalizedWord && !ingParts;
      const activePartIndex = ingParts && normalizedActiveWord === normalizedWord && normalizedActiveText
        ? normalizedWord.indexOf(normalizedActiveText)
        : -1;

      if (activePartIndex >= 0) {
        const before = part.slice(0, activePartIndex);
        const middle = part.slice(activePartIndex, activePartIndex + normalizedActiveText.length);
        const after = part.slice(activePartIndex + normalizedActiveText.length);

        return (
          <span key={`${part}-${index}`}>
            {before}
            <span
              style={{
                background: "#fff1c7",
                borderRadius: "8px",
                padding: "0 3px",
                color: "#7a4d00",
              }}
            >
              {middle}
            </span>
            {after}
          </span>
        );
      }

      return (
        <span
          key={`${part}-${index}`}
          style={
            shouldHighlightWhole
              ? {
                  background: "#fff1c7",
                  borderRadius: "8px",
                  padding: "0 3px",
                  color: "#7a4d00",
                }
              : undefined
          }
        >
          {part}
        </span>
      );
    });
  };
  const renderMouthCoach = (summary = pronunciationSummary) => {
    const type = getMouthCoachType(summary);
    const coach = mouthCoachConfig(type);
    const duration = "1.8s";

    return (
      <div
        style={{
          border: "1px solid rgba(218, 178, 119, 0.55)",
          borderRadius: "14px",
          background: "linear-gradient(135deg, #fff8e8, #fffdf9)",
          padding: isMobile ? "9px" : "12px",
          display: "grid",
          gap: isMobile ? 7 : 9,
          minWidth: isMobile ? "100%" : 300,
          flex: isMobile ? "1 1 100%" : "0 1 330px",
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 900, color: "#7a4d00" }}>{coach.title}</div>
          <div style={{ fontSize: isMobile ? 12 : 13, color: "var(--muted)", lineHeight: 1.25 }}>{coach.cue}</div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1fr) 92px",
            alignItems: "center",
            gap: isMobile ? 8 : 10,
          }}
        >
          <svg
            viewBox="0 0 220 150"
            width="100%"
            height={isMobile ? 128 : 142}
            role="img"
            aria-label={`${coach.title}: animacion de labios, dientes y lengua`}
            style={{ display: "block", maxWidth: 260, justifySelf: "center" }}
          >
            <defs>
              <radialGradient id={`mouthGlow-${type}`} cx="50%" cy="42%" r="65%">
                <stop offset="0%" stopColor="#fff2ec" />
                <stop offset="100%" stopColor="#f5b0a9" />
              </radialGradient>
              <linearGradient id={`tongueGrad-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f58a91" />
                <stop offset="100%" stopColor="#d84f61" />
              </linearGradient>
            </defs>

            <rect x="9" y="9" width="202" height="132" rx="24" fill="#fffaf1" stroke="rgba(218,178,119,0.45)" />
            <g transform="translate(4 4)">
              <ellipse cx="102" cy="73" rx="70" ry="38" fill={`url(#mouthGlow-${type})`} stroke="#d87477" strokeWidth="3">
                <animate attributeName="rx" values={coach.lipRx} dur={duration} repeatCount="indefinite" />
                <animate attributeName="ry" values={coach.lipRy} dur={duration} repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="102" cy="73" rx="44" ry="20" fill="#382428">
                <animate attributeName="rx" values={coach.mouthRx} dur={duration} repeatCount="indefinite" />
                <animate attributeName="ry" values={coach.mouthRy} dur={duration} repeatCount="indefinite" />
              </ellipse>

              <path d="M61 63 Q102 48 143 63 L137 74 Q102 67 67 74 Z" fill="#fffdf9" stroke="#e8ded1" strokeWidth="1.5" />
              <path d="M67 91 Q102 104 137 91 L132 99 Q102 112 72 99 Z" fill="#fff8ee" opacity="0.92" />

              <g>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={coach.tongueMove}
                  dur={duration}
                  repeatCount="indefinite"
                />
                <path
                  d="M57 88 C73 68 91 65 105 73 C121 82 135 83 148 88 C136 113 73 113 57 88 Z"
                  fill={`url(#tongueGrad-${type})`}
                  stroke="#bd3f52"
                  strokeWidth="2"
                />
                <path d="M75 91 C91 101 116 101 132 91" fill="none" stroke="#f7a2a8" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
              </g>

              <path d="M100 50 L107 50 L107 98 L100 98 Z" fill="#f58a91" opacity="0.1">
                <animate attributeName="opacity" values={coach.tongueTipOpacity} dur={duration} repeatCount="indefinite" />
              </path>

              <path d={coach.arrow} fill="none" stroke="#00866f" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
              <path d="M119 55 L129 52 L125 63" fill="none" stroke="#00866f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            </g>
          </svg>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "1fr",
              gap: 6,
            }}
          >
            {coach.steps.map((step, index) => (
              <div
                key={step}
                style={{
                  borderRadius: "999px",
                  background: index === 1 ? "#dff6e9" : "#fff",
                  border: "1px solid rgba(36, 51, 58, 0.12)",
                  color: index === 1 ? "var(--green)" : "var(--muted)",
                  padding: isMobile ? "6px 7px" : "7px 9px",
                  textAlign: "center",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (testMode) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        setDraftProfile(parsedProfile);
        setLoginName(parsedProfile.displayName || "");
      }
    } catch (error) {
      console.error("Could not load stored profile", error);
    } finally {
      setProfileLoaded(true);
    }
  }, [testMode]);

  useEffect(() => {
    setActiveLesson(lesson);
  }, [lesson]);

  useEffect(() => {
    if (testMode || !profileLoaded || !profile || profile.userId) {
      return;
    }

    let isActive = true;

    saveLearnerProfile(profile)
      .then((savedUser) => {
        if (!isActive) {
          return;
        }

        const nextProfile = {
          ...profile,
          userId: savedUser.id,
          displayName: savedUser.display_name,
        };
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
        setProfile(nextProfile);
        setDraftProfile(nextProfile);
      })
      .catch((error) => console.error("Could not register existing learner profile", error));

    return () => {
      isActive = false;
    };
  }, [profile, profileLoaded, testMode]);

  const resetProgress = () => {
    stopPronunciationCapture();
    setCardIndex(0);
    setScore(0);
    setWrongAttempts({});
    setSelectedOptionId(null);
    setLastResult(null);
    setIsComplete(false);
    setLessonSessionId(null);
    setShowHelp(shouldShowHelp(profile || draftProfile));
    setAutoAdvanceDelayMs(700);
    resetPronunciationPractice();
  };

  const goToLessons = () => {
    resetProgress();
    setStarted(false);
  };

  const resetPronunciationPractice = () => {
    setPronunciationStatus("Getting ready...");
    setIsPronunciationRecording(false);
    setIsPronunciationScoring(false);
    setPronunciationResult(null);
    setPronunciationError("");
    setPronunciationNoSpeechFailure(false);
    setPronunciationAttempt(0);
    setPronunciationSpokenWordCount(0);
    setPronunciationRecognizedSyllableKeys([]);
    setActivePronunciationOptionIndex(0);
    setCompletedPronunciationOptions([]);
    setCompletedPronunciationResults({});
    setModelSpeechPart(null);
    pronunciationCardKeyRef.current = "";
    pronunciationToneKeyRef.current = "";
    pronunciationChunksRef.current = [];
    pronunciationNoSpeechRoundRef.current = 0;
  };

  const clearPronunciationMonitoring = () => {
    if (pronunciationMonitorRef.current) {
      window.cancelAnimationFrame(pronunciationMonitorRef.current);
      pronunciationMonitorRef.current = null;
    }
    if (pronunciationStartTimeoutRef.current) {
      window.clearTimeout(pronunciationStartTimeoutRef.current);
      pronunciationStartTimeoutRef.current = null;
    }
    if (pronunciationTimeoutRef.current) {
      window.clearTimeout(pronunciationTimeoutRef.current);
      pronunciationTimeoutRef.current = null;
    }
    if (pronunciationAudioContextRef.current) {
      pronunciationAudioContextRef.current.close().catch(() => {});
      pronunciationAudioContextRef.current = null;
    }
    if (pronunciationRecognitionRef.current) {
      pronunciationRecognitionRef.current.onresult = null;
      pronunciationRecognitionRef.current.onerror = null;
      pronunciationRecognitionRef.current.onend = null;
      try {
        pronunciationRecognitionRef.current.stop();
      } catch (error) {
        // Recognition may already be stopped.
      }
      pronunciationRecognitionRef.current = null;
    }
    if (azurePronunciationRecognizerRef.current) {
      try {
        azurePronunciationRecognizerRef.current.close();
      } catch (error) {
        // The recognizer may already be closed.
      }
      azurePronunciationRecognizerRef.current = null;
    }
  };

  const stopPronunciationCapture = ({ shouldScore = false } = {}) => {
    pronunciationShouldScoreRef.current = shouldScore;
    clearPronunciationMonitoring();
    if (pronunciationRecorderRef.current && pronunciationRecorderRef.current.state !== "inactive") {
      pronunciationRecorderRef.current.stop();
    }
    pronunciationRecorderRef.current = null;
    if (pronunciationStreamRef.current) {
      pronunciationStreamRef.current.getTracks().forEach((track) => track.stop());
      pronunciationStreamRef.current = null;
    }
  };

  const handlePronunciationNoSpeech = () => {
    pronunciationNoSpeechRoundRef.current += 1;
    setPronunciationAttempt((current) => Math.max(0, current - 1));
    setPronunciationResult(null);
    setIsPronunciationRecording(false);
    setIsPronunciationScoring(false);
    setPronunciationStatus("No puedo escucharte.");

    if (pronunciationNoSpeechRoundRef.current >= MAX_NO_SPEECH_ROUNDS) {
      setPronunciationNoSpeechFailure(true);
      setPronunciationError("No puedo escucharte.");
      return;
    }

    setPronunciationNoSpeechFailure(false);
    setPronunciationError("");
    pronunciationStartTimeoutRef.current = window.setTimeout(() => {
      void beginPronunciationRecordingRef.current?.({
        isRetry: true,
        preserveNoSpeechRounds: true,
      });
    }, NO_SPEECH_REPLAY_DELAY_MS);
  };

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
    }, autoAdvanceDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [autoAdvanceDelayMs, cardIndex, lastResult, started, totalCards]);

  useEffect(() => {
    resetPronunciationPractice();
    spokenPromptKeyRef.current = "";

    return () => {
      stopPronunciationCapture();
    };
  }, [cardIndex, activeLesson.id]);

  useEffect(() => {
    if (!isRecognitionLesson || isPronunciationCard || !started || isComplete || !currentCard || lastResult !== null) {
      return undefined;
    }

    const promptKey = `${activeLesson.id}-${cardIndex}-${currentCard.prompt}`;
    if (spokenPromptKeyRef.current === promptKey) {
      return undefined;
    }
    spokenPromptKeyRef.current = promptKey;

    const timeoutId = window.setTimeout(() => {
      if (cardPromptText.trim()) {
        speakText(cardPromptText, { voiceMode: cardPromptVoiceMode });
      }
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeLesson.id,
    cardIndex,
    cardPromptText,
    cardPromptVoiceMode,
    currentCard,
    isComplete,
    isPronunciationCard,
    isRecognitionLesson,
    lastResult,
    speakText,
    started,
  ]);

  useEffect(() => {
    if (!started || isComplete || !activeLesson.cards?.length) {
      return;
    }

    const cardsToPreload = activeLesson.cards.slice(cardIndex, cardIndex + COURSE_AUDIO_PRELOAD_AHEAD);
    const audioItems = cardsToPreload.flatMap((card) => {
      if (card.stage === "Pronunciation Practice" || activeLesson.id === "lesson-3-pronunciation") {
        return (card.options || []).flatMap((option) => {
          const prompt = optionPracticePrompt(option);
          const words = String(prompt || "").match(/[A-Za-z']+/g) || [];
          return [
            {
              text: prompt,
              mode: "pronunciation_slow",
              variant: "split-ing",
            },
            ...words.map((word) => ({
              text: word,
              mode: "pronunciation_slow",
              variant: "split-ing",
            })),
          ];
        });
      }

      const promptAudioText = card.audio_text ?? card.prompt;
      return card.prompt
        ? [
            {
              text: promptAudioText,
              mode: "prompt",
              variant: String(promptAudioText).trim().toLowerCase() === "what is it?" ? "question" : "prompt",
            },
            ...(card.answer_audio_text
              ? [
                  {
                    text: card.answer_audio_text,
                    mode: "prompt",
                    variant: "answer",
                  },
                ]
              : []),
          ]
        : [];
    });

    const uniqueAudioItems = Array.from(
      new Map(audioItems.filter((item) => item.text?.trim()).map((item) => [`${item.mode}|${item.variant}|${item.text}`, item])).values()
    );

    uniqueAudioItems.forEach((item) => {
      const key = `${activeLesson.id}|${item.mode}|${item.variant}|${item.text}`;
      if (preloadedAudioKeysRef.current.has(key)) {
        return;
      }
      preloadedAudioKeysRef.current.add(key);
      preloadCourseAudio({
        text: item.text,
        mode: item.mode,
        lang: "en-US",
        variant: item.variant,
      }).catch((error) => {
        console.info("Could not preload course audio", item.text, error);
      });
    });
  }, [activeLesson.cards, activeLesson.id, activePronunciationPrompt, cardIndex, isComplete, started]);

  useEffect(() => {
    if (!started) {
      return;
    }

    FEEDBACK_AUDIO_PHRASES.forEach((phrase) => {
      const key = `feedback|${phrase}`;
      if (preloadedAudioKeysRef.current.has(key)) {
        return;
      }
      preloadedAudioKeysRef.current.add(key);
      preloadCourseAudio({
        text: phrase,
        mode: "feedback",
        lang: "en-US",
        variant: "feedback",
      }).catch((error) => {
        console.info("Could not preload feedback audio", phrase, error);
      });
    });
  }, [started]);

  useEffect(() => {
    if (!isPronunciationCard || !started || isComplete || !currentCard || lastResult === "correct") {
      return undefined;
    }

    const cardKey = `${activeLesson.id}-${cardIndex}-${activePronunciationOptionIndex}-${activePronunciationPrompt}`;
    if (pronunciationCardKeyRef.current === cardKey) {
      return undefined;
    }
    pronunciationCardKeyRef.current = cardKey;

    const timeoutId = window.setTimeout(() => {
      beginPronunciationRecording();
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeLesson.id,
    activePronunciationOptionIndex,
    activePronunciationPrompt,
    cardIndex,
    currentCard,
    isComplete,
    isPronunciationCard,
    lastResult,
    started,
  ]);

  useEffect(() => {
    const resultCardKey = `${activeLesson.id}-${cardIndex}-${activePronunciationOptionIndex}-${activePronunciationPrompt}`;
    if (
      !isPronunciationCard ||
      !started ||
      isComplete ||
      !currentCard ||
      lastResult === "correct" ||
      !pronunciationResult ||
      !(pronunciationOutcome.accepted || pronunciationAttempt >= 2) ||
      !activePronunciationOption ||
      pronunciationCardKeyRef.current !== resultCardKey
    ) {
      return undefined;
    }

    const toneKey = `${cardIndex}-${activePronunciationOption.id}-${pronunciationAttempt}-correct`;
    if (pronunciationOutcome.accepted && pronunciationToneKeyRef.current !== toneKey) {
      pronunciationToneKeyRef.current = toneKey;
      playTone([
        { frequency: 880, frequency2: 1320, durationMs: 180, type: "triangle", type2: "sine", volume: 0.12 },
        { frequency: 1175, frequency2: 1760, durationMs: 220, delayMs: 130, type: "triangle", type2: "sine", volume: 0.11 },
      ]);
    }

    const timeoutId = window.setTimeout(() => {
      const completedId = activePronunciationOption.id;
      setCompletedPronunciationResults((current) => ({
        ...current,
        [completedId]: pronunciationResult,
      }));
      setCompletedPronunciationOptions((current) =>
        current.includes(completedId) ? current : [...current, completedId]
      );

      const nextIndex = activePronunciationOptionIndex + 1;
      if (nextIndex < currentCard.options.length) {
        setPronunciationResult(null);
        setPronunciationError("");
        setPronunciationAttempt(0);
        pronunciationCardKeyRef.current = "";
        setActivePronunciationOptionIndex(nextIndex);
        return;
      }

      setAutoAdvanceDelayMs(0);
      if (pronunciationOutcome.accepted) setScore((current) => current + 1);
      setLastResult("correct");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeLesson.id,
    activePronunciationOption,
    activePronunciationOptionIndex,
    activePronunciationPrompt,
    cardIndex,
    currentCard,
    isComplete,
    isPronunciationCard,
    lastResult,
    playTone,
    pronunciationOutcome.accepted,
    pronunciationResult,
    pronunciationAttempt,
    started,
  ]);

  useEffect(() => {
    const resultCardKey = `${activeLesson.id}-${cardIndex}-${activePronunciationOptionIndex}-${activePronunciationPrompt}`;
    if (
      !isPronunciationCard ||
      !started ||
      isComplete ||
      !currentCard ||
      lastResult === "correct" ||
      !pronunciationResult ||
      pronunciationOutcome.accepted ||
      pronunciationAttempt >= 2 ||
      !activePronunciationOption ||
      pronunciationCardKeyRef.current !== resultCardKey
    ) {
      return;
    }

    const toneKey = `${cardIndex}-${activePronunciationOption.id}-${pronunciationAttempt}-wrong`;
    if (pronunciationToneKeyRef.current === toneKey) {
      return;
    }

    pronunciationToneKeyRef.current = toneKey;
    playTone([
      { frequency: 220, durationMs: 260, type: "sawtooth", volume: 0.1 },
      { frequency: 185, durationMs: 300, delayMs: 210, type: "sawtooth", volume: 0.09 },
    ]);
    const retryTimer = window.setTimeout(() => {
      beginPronunciationRecording({ isRetry: true });
    }, 3000);
    return () => window.clearTimeout(retryTimer);
  }, [
    activeLesson.id,
    activePronunciationOption,
    activePronunciationOptionIndex,
    activePronunciationPrompt,
    cardIndex,
    currentCard,
    isComplete,
    isPronunciationCard,
    lastResult,
    playTone,
    pronunciationAttempt,
    pronunciationOutcome.accepted,
    pronunciationResult,
    started,
  ]);

  const scorePronunciationBlob = async (audioBlob) => {
    if (!audioBlob || !currentCard) {
      return;
    }

    setIsPronunciationScoring(true);
    setPronunciationStatus("Scoring pronunciation...");
    setPronunciationError("");

    try {
      const result = await scorePronunciationAudio({
        text: activePronunciationPrompt,
        audioBlob,
        userId: profile?.userId,
        level: activeLesson.level,
        exerciseType: pronunciationExerciseType(activePronunciationPrompt),
      });
      if (result?._client_timing) {
        console.info("Pronunciation scoring timing", result._client_timing);
      }
      setPronunciationResult(result);
      setPronunciationStatus("Checked.");
    } catch (error) {
      console.error("Pronunciation scoring failed", error);
      if (error.code === "error_no_speech" || error.message === "NO_SPEECH_DETECTED") {
        handlePronunciationNoSpeech();
      } else if (error.status === 503 || /Azure Speech is not configured/i.test(error.message || "")) {
        setPronunciationError("El servicio de pronunciacion no esta configurado. Intentalo mas tarde.");
        setPronunciationStatus("Pronunciation service is not configured.");
      } else {
        setPronunciationError("No pude revisar eso. Intentalo otra vez.");
        setPronunciationStatus("Pronunciation scoring failed.");
      }
    } finally {
      setIsPronunciationScoring(false);
    }
  };

  const prepareAzureStreaming = () => {
    const cached = azureStreamingPreparationRef.current;
    if (cached.promise && cached.expiresAt > Date.now()) {
      return cached.promise;
    }

    const promise = Promise.all([
      import("microsoft-cognitiveservices-speech-sdk"),
      getPronunciationStreamingToken(),
    ]).then(([SpeechSDK, tokenInfo]) => ({ SpeechSDK, tokenInfo }));

    azureStreamingPreparationRef.current = {
      promise,
      expiresAt: Date.now() + 7 * 60 * 1000,
    };
    promise.catch(() => {
      if (azureStreamingPreparationRef.current.promise === promise) {
        azureStreamingPreparationRef.current = { promise: null, expiresAt: 0 };
      }
    });
    return promise;
  };

  const scorePronunciationWithAzureStreaming = async (preparedStreaming) => {
    const startedAt = window.performance.now();
    let SpeechSDK;
    let tokenInfo;

    try {
      ({ SpeechSDK, tokenInfo } = await (preparedStreaming || prepareAzureStreaming()));
    } catch (error) {
      console.info("Azure browser streaming is unavailable; using recorded-audio fallback", error);
      return false;
    }

    let recognizer = null;
    let audioConfig = null;
    let assessmentConfig = null;
    let speechConfig = null;
    let settled = false;
    let timeoutId = null;

    const closeRecognizer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (azurePronunciationRecognizerRef.current === recognizer) {
        azurePronunciationRecognizerRef.current = null;
      }
      try {
        recognizer?.close();
      } catch (error) {
        // The recognizer may already be closed.
      }
      try {
        audioConfig?.close();
      } catch (error) {
        // The microphone input may already be closed.
      }
      try {
        assessmentConfig?.close();
        speechConfig?.close();
      } catch (error) {
        // SDK resources may already be released with the recognizer.
      }
    };

    try {
      speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(tokenInfo.token, tokenInfo.region);
      speechConfig.speechRecognitionLanguage = tokenInfo.locale || "en-US";
      speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
      const exerciseType = pronunciationExerciseType(activePronunciationPrompt);
      speechConfig.setProperty(
        SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs,
        exerciseType === "SENTENCE" ? "1000" : "1800"
      );
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "4000");
      audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      assessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
        activePronunciationPrompt,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        // The streaming recognizer powers the live "heard" sequence. Keep
        // insertions and repetitions in the transcript; the backend applies
        // the learner-level grading policy to the finalized assessment.
        true
      );
      assessmentConfig.phonemeAlphabet = "IPA";
      assessmentConfig.enableProsodyAssessment?.();
      assessmentConfig.applyTo(recognizer);
      recognizer.sessionStarted = () => {
        setPronunciationSpokenWordCount(0);
        setPronunciationRecognizedSyllableKeys([]);
        setIsPronunciationRecording(true);
        setPronunciationStatus("Now you say it.");
      };
      recognizer.recognizing = (_sender, event) => {
        const recognizedText = String(event?.result?.text || "");
        if (recognizedText) {
          const firstSpeech = !pronunciationHasSpeechRef.current;
          pronunciationHasSpeechRef.current = true;
          pronunciationNoSpeechRoundRef.current = 0;
          if (firstSpeech) setPronunciationStatus("Te escucho…");
        }
        const recognizedWords = recognizedText.match(/[A-Za-z']+/g) || [];
        const expectedWordCount = String(activePronunciationPrompt).match(/[A-Za-z']+/g)?.length || 0;
        const nextWordCount = Math.min(recognizedWords.length, expectedWordCount);
        setPronunciationSpokenWordCount((currentCount) => Math.max(currentCount, nextWordCount));
        const syllableEvidence = livePronunciationSyllables(activePronunciationPrompt, recognizedText);
        const observedTokens = pronunciationSpeechTokens(recognizedText);
        const lastObservedToken = observedTokens.at(-1);
        const expectedWords = pronunciationSpeechTokens(activePronunciationPrompt);
        const predictedWordIndex = lastObservedToken ? expectedWords.indexOf(lastObservedToken) : -1;
        const predictedWordSyllableKeys = new Set(
          pronunciationTargetSyllables
            .filter((syllable) => syllable.wordIndex === predictedWordIndex)
            .map((syllable) => syllable.key)
        );
        const newlyRecognizedKeys = syllableEvidence.recognizedKeys.filter(
          (key) => !predictedWordSyllableKeys.has(key)
        );
        setPronunciationRecognizedSyllableKeys((current) => [
          ...new Set([...current, ...newlyRecognizedKeys]),
        ]);
      };
      azurePronunciationRecognizerRef.current = recognizer;
    } catch (error) {
      closeRecognizer();
      console.info("Could not initialize Azure browser pronunciation assessment", error);
      return false;
    }

    setPronunciationError("");
    setPronunciationNoSpeechFailure(false);
    setPronunciationResult(null);
    setPronunciationSpokenWordCount(0);
    setPronunciationRecognizedSyllableKeys([]);
    setIsPronunciationRecording(false);
    setPronunciationStatus("Get ready...");
    await playReadyCue();

    return new Promise((resolve) => {
      const finish = async (callback) => {
        if (settled) {
          return;
        }
        settled = true;
        closeRecognizer();
        setIsPronunciationRecording(false);
        await callback();
        resolve(true);
      };

      timeoutId = window.setTimeout(() => {
        if (pronunciationHasSpeechRef.current) {
          return;
        }
        void finish(() => {
          handlePronunciationNoSpeech();
        });
      }, NO_SPEECH_LISTEN_MS);

      recognizer.recognizeOnceAsync(
        (result) => {
          void finish(async () => {
            if (result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) {
              handlePronunciationNoSpeech();
              return;
            }

            setPronunciationNoSpeechFailure(false);
            setIsPronunciationScoring(true);
            setPronunciationStatus("Checking...");
            try {
              const rawPayload = result.properties.getProperty(SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult);
              const payload = JSON.parse(rawPayload || "{}");
              const normalized = await interpretAzurePronunciation({
                expectedText: activePronunciationPrompt,
                payload,
                level: activeLesson.level,
                exerciseType: pronunciationExerciseType(activePronunciationPrompt),
              }).catch(() => normalizeAzureStreamingResult(
                payload,
                result.text,
                window.performance.now() - startedAt
              ));
              console.info("Pronunciation streaming timing", normalized._client_timing);
              setPronunciationResult(normalized);
              setPronunciationStatus("Checked.");
            } catch (error) {
              console.error("Could not read Azure pronunciation result", error);
              setPronunciationError("No pude revisar eso. Intentalo otra vez.");
              setPronunciationStatus("Pronunciation scoring failed.");
            } finally {
              setIsPronunciationScoring(false);
            }
          });
        },
        (error) => {
          void finish(() => {
            console.error("Azure pronunciation streaming failed", error);
            setIsPronunciationScoring(false);
            setPronunciationError("No pude revisar eso. Intentalo otra vez.");
            setPronunciationStatus("Pronunciation scoring failed.");
          });
        }
      );
    });
  };

  const beginPronunciationRecording = async ({ isRetry = false, preserveNoSpeechRounds = false } = {}) => {
    if (!currentCard || !activePronunciationPrompt || isPronunciationRecording || isPronunciationScoring) {
      return;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
      const isInsecureOrigin = typeof window !== "undefined" && !isSecureRecordingContext();
      const message = isInsecureOrigin
        ? "El microfono necesita HTTPS o abrir la app en localhost en este dispositivo."
        : "Este navegador no permite grabar audio aqui.";
      setPronunciationError(message);
      setPronunciationStatus(message);
      return;
    }

    setPronunciationError("");
    setPronunciationNoSpeechFailure(false);
    setPronunciationResult(null);
    if (!preserveNoSpeechRounds) {
      pronunciationNoSpeechRoundRef.current = 0;
      setPronunciationAttempt((current) => current + 1);
    }
    setPronunciationStatus("Listen...");
    pronunciationChunksRef.current = [];
    pronunciationHasSpeechRef.current = false;
    pronunciationSilenceStartedAtRef.current = null;
    pronunciationShouldScoreRef.current = true;
    const azureStreamingPreparation = prepareAzureStreaming();
    azureStreamingPreparation?.catch(() => {
      // The existing recorded-audio path remains available as a fallback.
    });

    let listeningStarted = false;
    const prepareCapture = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new WavAudioRecorder(stream);
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("This browser cannot detect when speech ends.");
      }
      const audioContext = new AudioContextClass();
      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => {});
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const samples = new Uint8Array(analyser.fftSize);
      source.connect(analyser);

      pronunciationStreamRef.current = stream;
      pronunciationRecorderRef.current = recorder;
      pronunciationAudioContextRef.current = audioContext;

      return { stream, recorder, analyser, samples };
    };
    const scheduleListeningStart = (delayMs) => {
      if (listeningStarted) {
        return;
      }
      if (pronunciationStartTimeoutRef.current) {
        window.clearTimeout(pronunciationStartTimeoutRef.current);
      }
      pronunciationStartTimeoutRef.current = window.setTimeout(startListening, delayMs);
    };
    const startListening = async () => {
      if (listeningStarted) {
        return;
      }
      listeningStarted = true;
      setModelSpeechPart(null);
      if (pronunciationStartTimeoutRef.current) {
        window.clearTimeout(pronunciationStartTimeoutRef.current);
        pronunciationStartTimeoutRef.current = null;
      }

      try {
        setPronunciationStatus("Get ready...");
        const handledByAzureStreaming = await scorePronunciationWithAzureStreaming(azureStreamingPreparation);
        if (handledByAzureStreaming) {
          return;
        }
        const { stream, recorder, analyser, samples } = await prepareCapture();

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            pronunciationChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const shouldScore = pronunciationShouldScoreRef.current;
          clearPronunciationMonitoring();
          stream.getTracks().forEach((track) => track.stop());
          pronunciationStreamRef.current = null;
          pronunciationRecorderRef.current = null;
          setIsPronunciationRecording(false);

          const audioBlob = new Blob(pronunciationChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          pronunciationChunksRef.current = [];

          if (shouldScore) {
            scorePronunciationBlob(audioBlob);
          }
        };

        await playReadyCue();
        recorder.start();
        setIsPronunciationRecording(true);
        setPronunciationStatus("Now you say it.");
        pronunciationStartedAtRef.current = window.performance.now();

        const minListenMs = Math.min(Math.max(activePronunciationPrompt.length * 180, 900), 1800);
        const silenceMs = 850;
        const maxListenMs = Math.min(Math.max(activePronunciationPrompt.length * 420, 4200), 7600);
        const voiceThreshold = 0.022;

        const monitor = () => {
          if (!pronunciationRecorderRef.current || pronunciationRecorderRef.current.state === "inactive") {
            return;
          }

          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            const centered = (sample - 128) / 128;
            sum += centered * centered;
          }
          const volume = Math.sqrt(sum / samples.length);
          const now = window.performance.now();
          const elapsed = now - pronunciationStartedAtRef.current;

          if (volume > voiceThreshold) {
            const firstSpeech = !pronunciationHasSpeechRef.current;
            pronunciationHasSpeechRef.current = true;
            pronunciationNoSpeechRoundRef.current = 0;
            pronunciationSilenceStartedAtRef.current = null;
            if (firstSpeech) {
              setPronunciationStatus("Te escucho…");
            }
          } else if (pronunciationHasSpeechRef.current && elapsed > minListenMs) {
            if (!pronunciationSilenceStartedAtRef.current) {
              pronunciationSilenceStartedAtRef.current = now;
            }
            if (now - pronunciationSilenceStartedAtRef.current >= silenceMs) {
              setPronunciationStatus("Checking...");
              stopPronunciationCapture({ shouldScore: true });
              return;
            }
          }

          if (!pronunciationHasSpeechRef.current) {
            if (elapsed >= NO_SPEECH_LISTEN_MS) {
              stopPronunciationCapture({ shouldScore: false });
              handlePronunciationNoSpeech();
              return;
            }
          } else if (elapsed >= maxListenMs) {
            setPronunciationStatus("Checking...");
            stopPronunciationCapture({ shouldScore: true });
            return;
          }

          pronunciationMonitorRef.current = window.requestAnimationFrame(monitor);
        };

        pronunciationMonitorRef.current = window.requestAnimationFrame(monitor);
        pronunciationTimeoutRef.current = window.setTimeout(() => {
          if (pronunciationRecorderRef.current && pronunciationRecorderRef.current.state !== "inactive") {
            if (!pronunciationHasSpeechRef.current) {
              stopPronunciationCapture({ shouldScore: false });
              handlePronunciationNoSpeech();
              return;
            }
          }
        }, NO_SPEECH_LISTEN_MS);
      } catch (error) {
        stopPronunciationCapture({ shouldScore: false });
        setPronunciationError(error.message || "Could not start recording.");
        setPronunciationStatus("Recording failed.");
      }
    };

    const speechDelay = speakText(activePronunciationPrompt, {
      voiceMode: "prompt",
      wordByWord: true,
      splitIngWords: true,
      repeatFullAfter: false,
      bufferedCourseAudio: isMobile,
      wordPauseMs: isRetry ? 300 : 220,
      wordPartPauseMs: isRetry ? 180 : 140,
      rate: isRetry ? 0.56 : 0.62,
      pitch: isRetry ? 1.04 : undefined,
      onPartStart: (part) => {
        setModelSpeechPart({ ...part, optionId: activePronunciationOption?.id });
      },
      onEnd: () => {
        setModelSpeechPart(null);
        scheduleListeningStart(isRetry ? 240 : 140);
      },
    });
    const startDelay = Math.min(Math.max(speechDelay + 8000, 10000), 16000);
    pronunciationStartTimeoutRef.current = window.setTimeout(startListening, startDelay);
  };
  beginPronunciationRecordingRef.current = beginPronunciationRecording;

  const saveProfile = async (profileToSave = draftProfile) => {
    const displayName = String(profileToSave.displayName || loginName || "").trim();
    if (!displayName) {
      setProfileSaveError("Escribe tu nombre para continuar.");
      return;
    }

    let nextProfile = {
      ...DEFAULT_PROFILE,
      ...profileToSave,
      displayName,
    };
    setProfileSaveError("");
    setIsSavingProfile(true);

    try {
      const savedUser = await saveLearnerProfile(nextProfile);
      nextProfile = {
        ...savedUser.profile,
        userId: savedUser.id,
        displayName: savedUser.display_name,
      };
    } catch (error) {
      console.error("Could not save learner profile", error);
      setProfileSaveError(
        "No pude guardar el perfil. Revisa que el backend de Render este activo y que Vercel tenga NEXT_PUBLIC_API_BASE_URL configurado."
      );
      setIsSavingProfile(false);
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    }
    setProfile(nextProfile);
    setDraftProfile(nextProfile);
    setLoginName(nextProfile.displayName || "");
    setIsCreatingProfile(false);
    setStarted(false);
    setShowHelp(shouldShowHelp(nextProfile));
    setIsSavingProfile(false);
  };

  const startEditingProfile = () => {
    setDraftProfile(profile || {});
    setProfile(null);
    setIsCreatingProfile(true);
    setOnboardingStepIndex(-1);
    setStarted(false);
    resetProgress();
  };

  const startNewUser = () => {
    const name = loginName.trim();
    setProfile(null);
    setLoginError("");
    setDraftProfile({
      ...DEFAULT_PROFILE,
      displayName: name,
    });
    setIsCreatingProfile(true);
    setOnboardingStepIndex(-1);
    setStarted(false);
    resetProgress();

    if (name) {
      saveProfile({
        ...DEFAULT_PROFILE,
        displayName: name,
      });
    }
  };

  const loginExistingUser = async () => {
    const name = loginName.trim();
    if (!name) {
      setLoginError("Escribe tu nombre para entrar.");
      return;
    }

    setLoginError("");

    try {
      const savedUser = await getLearnerByName(name);
      const nextProfile = {
        ...savedUser.profile,
        userId: savedUser.id,
        displayName: savedUser.display_name,
      };
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      setIsCreatingProfile(false);
      setOnboardingStepIndex(-1);
    } catch (error) {
      console.error("Could not find learner profile", error);
      setLoginError("No encontramos ese usuario. Toca Nuevo usuario para crear un perfil.");
    }
  };

  const startLesson = async (lessonId = activeLesson.id) => {
    let lessonToStart = activeLesson;
    setLessonLoadError("");

    if (lessonId !== activeLesson.id) {
      setLoadingLessonId(lessonId);
      try {
        lessonToStart = await getLesson(lessonId);
        setActiveLesson(lessonToStart);
      } catch (error) {
        console.error("Could not load selected lesson", error);
        setLessonLoadError("No pudimos cargar esa leccion. Intentalo otra vez.");
        setLoadingLessonId(null);
        return;
      }
      setLoadingLessonId(null);
    }

    resetProgress();
    setShowHelp(shouldShowHelp(profile));

    if (profile?.userId) {
      try {
        const session = await startLessonSession({
          userId: profile.userId,
          lessonId: lessonToStart.id,
          totalCards: lessonToStart.cards.length,
        });
        setLessonSessionId(session.id);
      } catch (error) {
        console.error("Could not start lesson session", error);
      }
    }

    setStarted(true);
  };

  const handleOnboardingChoice = (optionId) => {
    if (!activeOnboardingStep) {
      return;
    }

    if (activeOnboardingStep.multiSelect) {
      const exclusiveOptions = new Set(["everything", "unsure"]);
      const currentSelections = getStoredValueAsList(draftProfile[activeOnboardingStep.id]);
      const isSelected = currentSelections.includes(optionId);

      let nextSelections;
      if (isSelected) {
        nextSelections = currentSelections.filter((item) => item !== optionId);
      } else if (exclusiveOptions.has(optionId)) {
        nextSelections = [optionId];
      } else {
        nextSelections = [...currentSelections.filter((item) => !exclusiveOptions.has(item)), optionId];
      }

      setDraftProfile((current) => ({
        ...current,
        [activeOnboardingStep.id]: nextSelections,
      }));
      return;
    }

    const nextProfile = {
      ...draftProfile,
      [activeOnboardingStep.id]: optionId,
    };

    setDraftProfile(nextProfile);
    if (onboardingStepIndex >= ONBOARDING_STEPS.length - 1) {
      setOnboardingStepIndex(ONBOARDING_STEPS.length);
      return;
    }

    setOnboardingStepIndex((current) => current + 1);
  };

  const handleChoice = (optionId) => {
    if (lastResult === "correct") {
      return;
    }

    const isCorrect = optionId === currentCard.correct_option_id;
    const firstTry = !wrongAttempts[cardIndex];
    setSelectedOptionId(optionId);

    if (profile?.userId && lessonSessionId) {
      logCardAttempt({
        sessionId: lessonSessionId,
        userId: profile.userId,
        lessonId: activeLesson.id,
        cardIndex,
        prompt: currentCard.prompt,
        selectedOptionId: optionId,
        correctOptionId: currentCard.correct_option_id,
        isCorrect,
        firstTry,
      }).catch((error) => console.error("Could not log card attempt", error));
    }

    if (isCorrect) {
      setLastResult("correct");
      setAutoAdvanceDelayMs(currentCard.answer_audio_text ? 2600 : 1000);
      if (firstTry) {
        setScore((current) => current + 1);
      }

      const praise = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
      const praisePitch = [1.0, 1.1, 1.2, 1.28][Math.floor(Math.random() * 4)];
      playTone([
        { frequency: 880, frequency2: 1320, durationMs: 220, type: "triangle", type2: "sine", volume: 0.12 },
        { frequency: 1175, frequency2: 1760, durationMs: 260, delayMs: 160, type: "triangle", type2: "sine", volume: 0.11 },
      ]);
      if (currentCard.answer_audio_text) {
        window.setTimeout(() => {
          const answerSpeechMs = speakText(currentCard.answer_audio_text, {
            voiceMode: "answer",
            rate: 0.74,
            volume: 1,
          });
          setAutoAdvanceDelayMs(Math.max(1800, answerSpeechMs + 450));
        }, 0);
      } else {
        window.setTimeout(() => {
          playTone([
            { frequency: 1568, frequency2: 2093, durationMs: 320, type: "triangle", type2: "sine", volume: 0.09 },
          ]);
          speakText(praise, {
            rate: 0.75,
            pitch: praisePitch,
            volume: 1,
            voiceMode: "feedback",
          });
        }, 0);
      }
      return;
    }

    setAutoAdvanceDelayMs(700);
    setWrongAttempts((current) => ({ ...current, [cardIndex]: true }));
    setLastResult("wrong");
    window.setTimeout(() => {
      playTone([
        { frequency: 220, durationMs: 300, type: "sawtooth", volume: 0.1 },
        { frequency: 185, durationMs: 340, delayMs: 240, type: "sawtooth", volume: 0.09 },
      ]);
      speakText("Try again", { voiceMode: "feedback", rate: 0.72, pitch: 0.94 });
    }, 0);
  };

  const cardStyleFor = (optionId) => {
    const style = { ...styles.cardButton };
    if (selectedOptionId === optionId && lastResult === "correct") {
      style.borderColor = "var(--green)";
      style.boxShadow = "0 0 0 6px var(--green-soft), 0 12px 30px rgba(22, 33, 39, 0.08)";
    }
    if (selectedOptionId === optionId && lastResult === "wrong") {
      style.borderColor = "var(--red)";
      style.boxShadow = "0 0 0 6px var(--red-soft), 0 12px 30px rgba(22, 33, 39, 0.08)";
    }
    return style;
  };

  const canContinueOnboarding = activeOnboardingStep?.multiSelect
    ? getStoredValueAsList(draftProfile[activeOnboardingStep.id]).length > 0
    : true;
  const hasProfileName = Boolean(profile?.displayName?.trim());
  const hasDraftProfileName = Boolean(draftProfile.displayName?.trim());

  useEffect(() => {
    if (!isComplete || !lessonSessionId) {
      return;
    }

    finishLessonSession({
      sessionId: lessonSessionId,
      score,
      totalCards,
    }).catch((error) => console.error("Could not finish lesson session", error));
  }, [isComplete, lessonSessionId, score, totalCards]);

  if (!profileLoaded) {
    return null;
  }

  if (!profile && !isCreatingProfile) {
    const canLogin = Boolean(loginName.trim());

    return (
      <div style={styles.page}>
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "grid", gap: "20px" }}>
          <section style={heroStyle}>
            <SpanGlishLogo compact={isMobile} />
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
              Bienvenido
            </div>
            <h1 style={sloganStyle}>Aprende ingles de forma natural</h1>
            <p style={{ margin: "0 auto", maxWidth: 560, opacity: 0.95, lineHeight: 1.6 }}>
              Entra con tu nombre para continuar tu practica.
            </p>
          </section>

          <section style={boardStyle}>
            <div style={{ display: "grid", gap: "16px" }}>
              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Nombre
                <input
                  type="text"
                  value={loginName}
                  onChange={(event) => {
                    setLoginName(event.target.value);
                    setLoginError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canLogin) {
                      loginExistingUser();
                    }
                  }}
                  placeholder="Tu nombre"
                  autoComplete="name"
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    font: "inherit",
                    background: "#fff",
                  }}
                />
              </label>

              {loginError ? <div style={{ color: "var(--red)", fontWeight: 700 }}>{loginError}</div> : null}

              <div style={{ display: "grid", gap: "12px", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    opacity: canLogin ? 1 : 0.55,
                    cursor: canLogin ? "pointer" : "not-allowed",
                  }}
                  disabled={!canLogin}
                  onClick={loginExistingUser}
                >
                  Entrar
                </button>
                <button type="button" style={styles.subtleButton} onClick={startNewUser}>
                  Nuevo usuario
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!profile) {
    const canCreateProfile = Boolean(String(draftProfile.displayName || "").trim());

    return (
      <div style={styles.page}>
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "grid", gap: "20px" }}>
          <section style={heroStyle}>
            <SpanGlishLogo compact={isMobile} />
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
              Nuevo usuario
            </div>
            <h1 style={sloganStyle}>Crea tu perfil</h1>
            <p style={{ margin: "0 auto", maxWidth: 560, opacity: 0.95, lineHeight: 1.6 }}>
              Solo necesitamos tu nombre para empezar.
            </p>
          </section>

          <section style={boardStyle}>
            <div style={{ display: "grid", gap: "18px" }}>
              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Nombre
                <input
                  type="text"
                  value={draftProfile.displayName || ""}
                  onChange={(event) => {
                    setProfileSaveError("");
                    setDraftProfile((current) => ({
                      ...DEFAULT_PROFILE,
                      ...current,
                      displayName: event.target.value,
                    }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canCreateProfile && !isSavingProfile) {
                      saveProfile();
                    }
                  }}
                  placeholder="Tu nombre"
                  autoComplete="name"
                  required
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    font: "inherit",
                    background: "#fff",
                  }}
                />
              </label>
              {profileSaveError ? (
                <div style={{ color: "var(--red)", fontWeight: 700, lineHeight: 1.5 }}>
                  {profileSaveError}
                </div>
              ) : null}
              <div style={{ display: "grid", gap: "12px", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                <button
                  type="button"
                  style={styles.subtleButton}
                  onClick={() => {
                    setIsCreatingProfile(false);
                    setProfileSaveError("");
                  }}
                >
                  Atras
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    opacity: canCreateProfile && !isSavingProfile ? 1 : 0.55,
                    cursor: canCreateProfile && !isSavingProfile ? "pointer" : "not-allowed",
                  }}
                  disabled={!canCreateProfile || isSavingProfile}
                  onClick={() => saveProfile()}
                >
                  {isSavingProfile ? "Guardando..." : "Continuar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: "980px", margin: "0 auto", display: "grid", gap: "20px" }}>
          <section style={heroStyle}>
            <SpanGlishLogo compact={isMobile} onClick={goToLessons} />
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
              Tu ruta
            </div>
            <h1 style={sloganStyle}>Lecciones para empezar con claridad</h1>
            <p style={{ margin: "0 auto", maxWidth: 620, opacity: 0.95, lineHeight: 1.6 }}>
              {getRecommendation(profile)}
            </p>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
              Las voces de practica pueden ser generadas con IA.
            </div>
          </section>

          <section style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "24px",
                padding: isMobile ? "16px" : "22px 24px",
                boxShadow: "0 14px 34px rgba(22, 33, 39, 0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>
                Welcome {profile.displayName || "Student"}
              </div>
              <button
                type="button"
                style={styles.profileIconButton}
                onClick={startEditingProfile}
                aria-label="Ajustar mi perfil"
                title="Ajustar mi perfil"
              >
                <UserIcon />
              </button>
            </div>

            {lessonLoadError ? <div style={{ color: "var(--red)", fontWeight: 700 }}>{lessonLoadError}</div> : null}

            {curriculumUnits.map((unit) => {
              const unitVisual = getUnitVisual(unit.id);

              return (
                <section key={unit.id} style={{ display: "grid", gap: "16px" }}>
                  <div
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "28px",
                      background: `linear-gradient(135deg, ${unitVisual.accent}, #fffdf8 58%, #e7f7f3)`,
                      boxShadow: "0 18px 42px rgba(22, 33, 39, 0.08)",
                      padding: isMobile ? "18px" : "24px",
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
                      gap: "20px",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "grid", gap: "10px" }}>
                      <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                        {unit.title}
                      </div>
                      <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, lineHeight: 1.08 }}>
                        {unitVisual.title}
                      </div>
                      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.55, maxWidth: 560 }}>
                        {unitVisual.description}
                      </p>
                    </div>

                    <div
                      style={{
                        minHeight: isMobile ? 142 : 188,
                        position: "relative",
                      }}
                      aria-hidden="true"
                    >
                      {unitVisual.images.map((imageName, imageIndex) => (
                        <img
                          key={imageName}
                          src={menuImageSrc(imageName)}
                          alt=""
                          style={{
                            position: "absolute",
                            width: isMobile ? "42%" : "44%",
                            aspectRatio: "4 / 3",
                            objectFit: "contain",
                            objectPosition: "center",
                            borderRadius: "18px",
                            border: "5px solid rgba(255, 255, 255, 0.82)",
                            boxShadow: "0 16px 28px rgba(22, 33, 39, 0.15)",
                            left: imageIndex === 0 ? "0%" : imageIndex === 1 ? "28%" : "55%",
                            top: imageIndex === 0 ? "30%" : imageIndex === 1 ? "3%" : "38%",
                            transform: imageIndex === 0 ? "rotate(-5deg)" : imageIndex === 1 ? "rotate(3deg)" : "rotate(6deg)",
                            background: "var(--surface-2)",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {unit.lessons.map((lessonGroup) => {
                    const lessonVisual = getLessonVisual(lessonGroup.id);

                    return (
                      <section key={lessonGroup.id} style={{ display: "grid", gap: "12px" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "auto 1fr",
                            alignItems: "center",
                            gap: "14px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              minWidth: isMobile ? "unset" : "150px",
                            }}
                            aria-hidden="true"
                          >
                            {lessonVisual.images.map((imageName) => (
                              <img
                                key={imageName}
                                src={menuImageSrc(imageName)}
                                alt=""
                                style={{
                                  width: 68,
                                  height: 52,
                                  objectFit: "contain",
                                  objectPosition: "center",
                                  background: "var(--surface-2)",
                                  borderRadius: "14px",
                                  border: "3px solid #fff",
                                  boxShadow: "0 10px 18px rgba(22, 33, 39, 0.12)",
                                }}
                              />
                            ))}
                          </div>
                          <div style={{ display: "grid", gap: "4px" }}>
                            <div style={{ fontSize: isMobile ? 21 : 24, fontWeight: 800 }}>{lessonGroup.title}</div>
                            <div style={{ color: "var(--muted)", lineHeight: 1.45 }}>{lessonVisual.description}</div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                            gap: "14px",
                          }}
                        >
                          {lessonGroup.subLessons.map((lessonSummary) => {
                            const subLessonVisual = getSubLessonVisual(lessonSummary.id);
                            const subLessonTitle = `${lessonSummary.sub_lesson_id || lessonSummary.title} ${lessonSummary.sub_lesson_title || ""}`;

                            return (
                              <button
                                key={lessonSummary.id}
                                type="button"
                                onClick={hasProfileName ? () => startLesson(lessonSummary.id) : startEditingProfile}
                                style={{
                                  textAlign: "left",
                                  border: "1px solid var(--line)",
                                  borderRadius: "22px",
                                  background: "var(--surface)",
                                  padding: "10px",
                                  cursor: hasProfileName ? "pointer" : "not-allowed",
                                  opacity: hasProfileName ? 1 : 0.6,
                                  boxShadow: "0 12px 30px rgba(22, 33, 39, 0.06)",
                                  overflow: "hidden",
                                  display: "grid",
                                  gap: "12px",
                                }}
                                aria-disabled={!hasProfileName}
                                disabled={loadingLessonId === lessonSummary.id}
                              >
                                <div
                                  style={{
                                    minHeight: 140,
                                    borderRadius: "16px",
                                    background: subLessonVisual.accent,
                                    overflow: "hidden",
                                    position: "relative",
                                  }}
                                >
                                  <img
                                    src={menuImageSrc(subLessonVisual.fallbackImage || subLessonVisual.image)}
                                    alt=""
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      minHeight: 140,
                                      objectFit: "contain",
                                      objectPosition: "center",
                                      display: "block",
                                    }}
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      background: "linear-gradient(180deg, transparent 45%, rgba(22, 33, 39, 0.54))",
                                    }}
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      left: 12,
                                      bottom: 10,
                                      color: "#fff",
                                      fontSize: 12,
                                      letterSpacing: "0.08em",
                                      textTransform: "uppercase",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {lessonSummary.level}
                                  </div>
                                </div>

                                <div style={{ display: "grid", gap: "7px", padding: "0 4px 6px" }}>
                                  <div style={{ fontSize: isMobile ? 22 : 24, fontWeight: 800, lineHeight: 1.08 }}>
                                    {subLessonTitle}
                                  </div>
                                  <div style={{ color: "var(--muted)", lineHeight: 1.45 }}>
                                    {subLessonVisual.description}
                                  </div>
                                  <div style={{ color: "var(--teal)", fontWeight: 800, marginTop: 2 }}>
                                    {hasProfileName
                                      ? loadingLessonId === lessonSummary.id
                                        ? "Cargando..."
                                        : "Empezar"
                                      : "Agrega tu nombre"}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </section>
              );
            })}
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
                <div style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>
                  Leccion terminada
                </div>
                <strong style={{ fontSize: 20 }}>{activeLesson.title}</strong>
                <span style={{ color: "var(--muted)" }}>
                  Puntaje: {score} / {totalCards}
                </span>
              </section>
            ) : null}
            <section style={heroStyle}>
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: isMobile ? 4 : 8 }}>
                <MiniSpanGlishLogo onClick={goToLessons} />
              </div>
              <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
                Leccion terminada
              </div>
              <h1 style={titleStyle}>Buen trabajo</h1>
              <p style={{ margin: 0, maxWidth: 620, opacity: 0.92 }}>
                Obtuviste {score} de {totalCards} correctas al primer intento.
              </p>
            </section>
            <section style={boardStyle}>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={goToLessons}
              >
                Volver a las lecciones
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? "10px 10px 18px" : styles.page.padding }}>
      <div style={shellStyle}>
          <main style={{ ...styles.main, gap: isMobile ? "10px" : styles.main.gap }}>
          <section style={heroStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: compactPracticeHeader ? "8px" : "12px",
              }}
            >
              <MiniSpanGlishLogo onClick={goToLessons} />
              {compactPracticeHeader ? (
                <button
                  type="button"
                  onClick={() =>
                    playPronunciationModel(activePronunciationPrompt)
                  }
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "var(--text)",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    minWidth: 0,
                    flex: "1 1 auto",
                    textAlign: "center",
                  }}
                  aria-label={`Play pronunciation for ${activePronunciationPrompt}`}
                >
                  <h1
                    style={{
                      ...titleStyle,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Pronunciation
                  </h1>
                </button>
              ) : null}
              <button
                type="button"
                aria-label={showHelp ? "Ocultar ayuda" : "Mostrar ayuda"}
                style={{
                  width: compactPracticeHeader ? (isMobile ? 30 : 36) : isMobile ? 34 : 44,
                  height: compactPracticeHeader ? (isMobile ? 30 : 36) : isMobile ? 34 : 44,
                  borderRadius: "999px",
                  border: "2px solid rgba(218, 178, 119, 0.58)",
                  background: showHelp ? "#F4C95D" : "rgba(255,255,255,0.74)",
                  color: "#24333A",
                  fontSize: compactPracticeHeader ? (isMobile ? 16 : 20) : isMobile ? 18 : 24,
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
            {!compactPracticeHeader ? (
              <button
                type="button"
                onClick={() =>
                  isPronunciationCard
                    ? playPronunciationModel(activePronunciationPrompt)
                    : cardPromptText.trim()
                      ? speakText(cardPromptText, { voiceMode: cardPromptVoiceMode })
                      : undefined
                }
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--text)",
                  padding: 0,
                  margin: 0,
                  cursor: "pointer",
                  width: "100%",
                }}
                aria-label={`Play pronunciation for ${isPronunciationCard ? activePronunciationPrompt : currentCard.prompt}`}
              >
                {currentCard.stage ? (
                  <div
                    style={{
                      marginTop: isMobile ? 4 : 6,
                      fontSize: isMobile ? 11 : 12,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      fontWeight: 800,
                    }}
                  >
                    {currentCard.stage}
                  </div>
                ) : null}
                <h1 style={titleStyle}>
                  {isPronunciationCard ? "Pronunciation Practice" : renderHighlightedTitle(currentCard.prompt)}
                </h1>
              </button>
            ) : null}
          </section>

          <section style={boardStyle}>
            {currentCard.prompt_image_url ? (
              <div
                style={{
                  width: "min(100%, 760px)",
                  margin: isMobile ? "0 auto 10px" : "0 auto 16px",
                  borderRadius: isMobile ? "18px" : "22px",
                  overflow: "hidden",
                  border: "3px solid rgba(36, 51, 58, 0.12)",
                  background: "#f2ebde",
                  boxShadow: "0 14px 30px rgba(22, 33, 39, 0.1)",
                }}
              >
                <img
                  src={lessonImageSrc(currentCard.prompt_image_url)}
                  alt={currentCard.prompt}
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "16 / 9",
                    objectFit: "contain",
                    objectPosition: "center",
                  }}
                />
              </div>
            ) : null}
            <div style={choiceGridStyle}>
              {currentCard.options.map((option, optionIndex) => {
                const optionPrompt = optionPracticePrompt(option);
                const optionLabel = option.label || optionPrompt || option.id;
                const hasOptionImage = Boolean(option.image_url);
                const isActivePronunciationOption =
                  isPronunciationCard && optionIndex === activePronunciationOptionIndex && lastResult !== "correct";
                const isCompletedPronunciationOption =
                  isPronunciationCard && completedPronunciationOptions.includes(option.id);
                const completedPronunciationResult = isPronunciationCard ? completedPronunciationResults[option.id] : null;
                const completedPronunciationSummary = completedPronunciationResult
                  ? summarizePronunciationScore(completedPronunciationResult)
                  : null;
                const pronunciationCardStyle = isPronunciationCard
                  ? {
                      cursor: "default",
                      border: isActivePronunciationOption
                        ? "4px solid var(--text)"
                        : isCompletedPronunciationOption
                          ? "3px solid rgba(47, 143, 98, 0.32)"
                          : "3px solid rgba(36, 51, 58, 0.12)",
                      boxShadow: isActivePronunciationOption
                        ? "0 14px 30px rgba(22, 33, 39, 0.14)"
                        : isCompletedPronunciationOption
                          ? "0 10px 24px rgba(47, 143, 98, 0.12)"
                          : styles.cardButton.boxShadow,
                    }
                  : {};
                const CardTag = isPronunciationCard ? "div" : "button";

                return (
                  <CardTag
                    key={option.id}
                    {...(isPronunciationCard ? { role: "group" } : { type: "button" })}
                    style={{
                      ...cardStyleFor(option.id),
                      ...pronunciationCardStyle,
                      ...(isThreeOptionCard && !isMobile && optionIndex === 2 ? centeredThirdOptionStyle : {}),
                      borderRadius: isMobile ? "18px" : styles.cardButton.borderRadius,
                      padding: isPronunciationCard
                        ? isMobile
                          ? "8px"
                          : "10px"
                        : isFourOptionCard
                          ? isMobile
                            ? "4px"
                            : "6px"
                          : isMobile
                            ? "6px"
                            : styles.cardButton.padding,
                    }}
                    onClick={isPronunciationCard ? undefined : () => handleChoice(option.id)}
                    {...(!isPronunciationCard ? { disabled: lastResult === "correct" } : {})}
                  >
                    {isPronunciationCard ? (
                      <div
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "16px",
                          background: isCompletedPronunciationOption
                              ? "#ecfff3"
                              : "#fff",
                          padding: isMobile ? "7px" : "10px",
                          marginBottom: isMobile ? 7 : 10,
                          display: "grid",
                          gap: isMobile ? "6px" : "8px",
                          minHeight: isMobile ? 0 : 92,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: isMobile ? "8px" : "12px",
                            fontSize: isMobile ? 18 : 22,
                            fontWeight: 800,
                            lineHeight: 1.15,
                            color: "var(--text)",
                            textAlign: "left",
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              border: 0,
                              background: "transparent",
                              color: "inherit",
                              padding: 0,
                              margin: 0,
                              minWidth: 0,
                              textAlign: "left",
                              font: "inherit",
                              fontWeight: "inherit",
                              cursor: "pointer",
                            }}
                            aria-label={`Escuchar frase ${optionPrompt}`}
                            title={`Escuchar frase ${optionPrompt}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              playPronunciationModel(optionPrompt, option.id);
                            }}
                          >
                            {renderPronunciationPromptHeader(optionPrompt, option.id, isActivePronunciationOption)}
                          </button>
                          {isActivePronunciationOption ? (
                            <span style={{ flex: "0 0 auto" }}>{renderListeningCue()}</span>
                          ) : null}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: isMobile ? "6px" : "8px" }}>
                          {isActivePronunciationOption && isPronunciationRecording
                            ? renderLivePronunciationSyllableProgress()
                            : isActivePronunciationOption
                            ? renderPronunciationPhrase(optionPrompt, pronunciationSummary, pronunciationResult, {
                                interactive: true,
                                optionId: option.id,
                              })
                            : completedPronunciationResult
                              ? renderPronunciationPhrase(
                                  optionPrompt,
                                  completedPronunciationSummary,
                                  completedPronunciationResult,
                                  { interactive: true, optionId: option.id }
                                )
                              : renderEmptyPronunciationPhrase(optionPrompt, { interactive: true, optionId: option.id })}
                        </div>
                        {isActivePronunciationOption && pronunciationResult ? (
                          <div
                            className={pronunciationOutcome.accepted ? "pronunciation-success-message" : undefined}
                            style={{
                              color: pronunciationOutcome.accepted ? "var(--green)" : "#7a4d00",
                              fontSize: 13,
                              fontWeight: 700,
                              lineHeight: 1.35,
                              textAlign: "left",
                            }}
                          >
                            {pronunciationOutcome.accepted ? "✨ " : ""}
                            {pronunciationOutcome.message}
                            {pronunciationOutcome.accepted ? " ✨" : ""}
                            {!pronunciationOutcome.accepted && pronunciationAttempt >= 2
                              ? " Seguimos practicando en la próxima tarjeta."
                              : ""}
                          </div>
                        ) : null}
                        {isActivePronunciationOption && (pronunciationError || (pronunciationResult && !pronunciationOutcome.accepted)) ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: isMobile ? 8 : 10,
                            }}
                          >
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: "1 1 260px" }}>
                              {pronunciationError ? (
                                <div style={{ color: "var(--red)", fontWeight: 700, lineHeight: 1.35, textAlign: "left" }}>
                                  {pronunciationError}
                                </div>
                              ) : null}
                              {pronunciationNoSpeechFailure ? (
                                <button
                                  type="button"
                                  disabled={isPronunciationRecording || isPronunciationScoring}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void beginPronunciationRecording({ isRetry: true });
                                  }}
                                  style={{
                                    border: 0,
                                    borderRadius: 999,
                                    background: "var(--green)",
                                    color: "#fff",
                                    cursor: isPronunciationRecording || isPronunciationScoring ? "default" : "pointer",
                                    font: "inherit",
                                    fontWeight: 800,
                                    padding: "9px 16px",
                                    opacity: isPronunciationRecording || isPronunciationScoring ? 0.6 : 1,
                                  }}
                                >
                                  Reintentar
                                </button>
                              ) : null}
                            </div>
                            {pronunciationResult && !pronunciationOutcome.accepted ? renderMouthCoach(pronunciationSummary) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {hasOptionImage ? (
                      <img src={lessonImageSrc(option.image_url)} alt={optionLabel} style={responsiveImageStyle} />
                    ) : (
                      <div
                        style={{
                          minHeight: isMobile ? 116 : 172,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: isMobile ? "14px" : "18px",
                          background: "linear-gradient(135deg, #fffdf9, #fff4df)",
                          border: "1px solid rgba(218, 178, 119, 0.56)",
                          color: "var(--text)",
                          fontSize: isMobile ? 26 : 38,
                          fontWeight: 900,
                          lineHeight: 1.12,
                          textAlign: "center",
                          padding: isMobile ? "18px 14px" : "28px 20px",
                        }}
                      >
                        {optionLabel}
                      </div>
                    )}
                  </CardTag>
                );
              })}
            </div>

            <div style={{ marginTop: 20 }}>
              {lastResult === "correct" ? (
                <div style={{ ...styles.feedback, background: "var(--green-soft)", color: "var(--green)" }}>
                  Correcto. Vamos a la siguiente tarjeta...
                </div>
              ) : null}
              {lastResult === "wrong" ? (
                <div style={{ ...styles.feedback, background: "var(--red-soft)", color: "var(--red)" }}>
                  {getWrongFeedback(profile)}
                </div>
              ) : null}
            </div>

            <div
              style={{
                marginTop: isMobile ? 10 : 20,
                padding: isMobile ? "8px 10px" : "14px 18px",
                borderRadius: isMobile ? "14px" : "18px",
                background: "var(--surface-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: isMobile ? 10 : 14,
              }}
            >
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase" }}>
                  Progreso
                </div>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>{progressLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase" }}>
                  Puntaje
                </div>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>{score}</div>
              </div>
              {!isMobile ? (
                <div style={{ color: "var(--muted)", fontSize: 12 }}>Voz de practica generada con IA.</div>
              ) : null}
              <button
                type="button"
                style={isMobile ? styles.iconOnlyButton : { ...styles.subtleButton, width: "auto", padding: "10px 14px" }}
                aria-label="Volver a lecciones"
                title="Volver a lecciones"
                onClick={goToLessons}
              >
                {isMobile ? <HomeIcon /> : "Lecciones"}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
