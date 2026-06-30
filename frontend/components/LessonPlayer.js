"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  finishLessonSession,
  getLearnerByName,
  logCardAttempt,
  saveLearnerProfile,
  startLessonSession,
} from "../lib/api";

const PROFILE_STORAGE_KEY = "learn-english-profile-v1";
const LESSON_IMAGE_VERSION = "20260630-expanded-actions";

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
  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}v=${LESSON_IMAGE_VERSION}`;
}

const PRAISE_PHRASES = [
  "Great",
  "Awesome",
  "Yay",
  "Keep it up",
  "Nice job",
  "Excellent",
];

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
    const voice = options.voiceMode === "feedback" ? feedbackVoice : promptVoice;

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

export default function LessonPlayer({ lesson, lessons }) {
  const [started, setStarted] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
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
  const playTone = useTone();
  const speakText = useSpeech();
  const viewportWidth = useViewportWidth();
  const isTablet = viewportWidth <= 1080;
  const isMobile = viewportWidth <= 760;

  const currentCard = lesson.cards[cardIndex];
  const totalCards = lesson.cards.length;
  const optionCount = currentCard?.options.length || 2;
  const isFourOptionCard = optionCount >= 4;
  const onboardingFinished = onboardingStepIndex >= ONBOARDING_STEPS.length;
  const activeOnboardingStep =
    onboardingStepIndex >= 0 && onboardingStepIndex < ONBOARDING_STEPS.length
      ? ONBOARDING_STEPS[onboardingStepIndex]
      : null;
  const progressLabel = useMemo(
    () => `${Math.min(cardIndex + 1, totalCards)} / ${totalCards}`,
    [cardIndex, totalCards]
  );
  const onboardingProgress = useMemo(() => {
    if (!activeOnboardingStep) {
      return "";
    }

    return `${onboardingStepIndex + 1} / ${ONBOARDING_STEPS.length}`;
  }, [activeOnboardingStep, onboardingStepIndex]);
  const shellStyle = {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gap: isMobile ? "12px" : "20px",
  };
  const heroStyle = {
    ...styles.hero,
    padding: isMobile ? "12px 16px" : "18px 28px",
    borderRadius: isMobile ? "18px" : styles.hero.borderRadius,
    width: isMobile ? "100%" : isTablet ? "88%" : "72%",
    justifySelf: "center",
    textAlign: "center",
  };
  const boardStyle = {
    ...styles.board,
    padding: isMobile ? "12px" : styles.board.padding,
    borderRadius: isMobile ? "18px" : styles.board.borderRadius,
  };
  const choiceGridStyle = {
    ...styles.choiceGrid,
    gridTemplateColumns: isFourOptionCard ? "repeat(2, minmax(0, 1fr))" : isMobile ? "1fr" : styles.choiceGrid.gridTemplateColumns,
    gap: isFourOptionCard ? (isMobile ? "8px" : "12px") : styles.choiceGrid.gap,
  };
  const responsiveImageStyle = {
    ...styles.image,
    height: isFourOptionCard
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
    margin: "4px 0 0",
    fontSize: isMobile ? "1.9rem" : "clamp(2rem, 3.4vw, 3rem)",
    lineHeight: 1.08,
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

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!profileLoaded || !profile || profile.userId) {
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
  }, [profile, profileLoaded]);

  const resetProgress = () => {
    setCardIndex(0);
    setScore(0);
    setWrongAttempts({});
    setSelectedOptionId(null);
    setLastResult(null);
    setIsComplete(false);
    setLessonSessionId(null);
    setShowHelp(shouldShowHelp(profile || draftProfile));
    setAutoAdvanceDelayMs(700);
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
    if (!started || isComplete || !currentCard || lastResult !== null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      speakText(currentCard.prompt, { voiceMode: "prompt" });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [cardIndex, currentCard, isComplete, lastResult, speakText, started]);

  const saveProfile = async () => {
    let nextProfile = { ...draftProfile };
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
    setOnboardingStepIndex(0);
    setStarted(false);
    resetProgress();
  };

  const startNewUser = () => {
    setProfile(null);
    setDraftProfile({});
    setLoginError("");
    setIsCreatingProfile(true);
    setOnboardingStepIndex(0);
    setStarted(false);
    resetProgress();
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

  const startLesson = async () => {
    resetProgress();
    setShowHelp(shouldShowHelp(profile));

    if (profile?.userId) {
      try {
        const session = await startLessonSession({
          userId: profile.userId,
          lessonId: lesson.id,
          totalCards,
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
        lessonId: lesson.id,
        cardIndex,
        prompt: currentCard.prompt,
        selectedOptionId: optionId,
        correctOptionId: currentCard.correct_option_id,
        isCorrect,
        firstTry,
      }).catch((error) => console.error("Could not log card attempt", error));
    }

    if (isCorrect) {
      const praise = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
      const praisePitch = [1.0, 1.1, 1.2, 1.28][Math.floor(Math.random() * 4)];
      playTone([
        { frequency: 880, frequency2: 1320, durationMs: 220, type: "triangle", type2: "sine", volume: 0.12 },
        { frequency: 1175, frequency2: 1760, durationMs: 260, delayMs: 160, type: "triangle", type2: "sine", volume: 0.11 },
        { frequency: 1568, frequency2: 2093, durationMs: 320, delayMs: 340, type: "triangle", type2: "sine", volume: 0.09 },
      ]);
      if (firstTry) {
        setScore((current) => current + 1);
      }
      const praiseDelay = speakText(praise, {
        rate: 0.75,
        pitch: praisePitch,
        volume: 1,
        voiceMode: "feedback",
      });
      setAutoAdvanceDelayMs(Math.max(1100, praiseDelay + 180));
      setLastResult("correct");
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
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
              Bienvenido
            </div>
            <h1 style={titleStyle}>Aprende ingles de forma natural</h1>
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
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: "980px", margin: "0 auto", display: "grid", gap: "20px" }}>
          <section style={heroStyle}>
            {onboardingStepIndex < 0 ? (
              <>
                <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
                  Para hispanohablantes
                </div>
                <h1 style={titleStyle}>Aprende ingles de forma natural</h1>
                <p style={{ margin: "0 auto", maxWidth: 620, opacity: 0.95, lineHeight: 1.6 }}>
                  Un metodo pensado para hispanohablantes. Empieza viendo, escuchando y repitiendo, igual que en la vida real.
                </p>
                <div style={{ maxWidth: 260, margin: "24px auto 0" }}>
                  <button type="button" style={styles.primaryButton} onClick={() => setOnboardingStepIndex(0)}>
                    Comenzar
                  </button>
                </div>
              </>
            ) : onboardingFinished ? (
              <>
                <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
                  Tu camino esta listo
                </div>
                <h1 style={titleStyle}>Empezaremos contigo en mente</h1>
                <p style={{ margin: "0 auto", maxWidth: 620, opacity: 0.95, lineHeight: 1.6 }}>
                  {getRecommendation(draftProfile)}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
                  Perfil inicial
                </div>
                <div style={{ fontSize: 14, opacity: 0.88 }}>{onboardingProgress}</div>
                {activeOnboardingStep.helperText ? (
                  <div style={{ fontSize: 14, opacity: 0.88 }}>{activeOnboardingStep.helperText}</div>
                ) : null}
                <h1 style={titleStyle}>{activeOnboardingStep.title}</h1>
              </>
            )}
          </section>

          <section style={boardStyle}>
            {onboardingStepIndex < 0 ? (
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>
                  Primero vamos a conocerte un poco para que la experiencia se sienta mas clara, mas natural y mas util para ti.
                </div>
                <div
                  style={{
                    borderRadius: "20px",
                    background: "var(--surface-2)",
                    padding: "18px 20px",
                    color: "var(--muted)",
                    lineHeight: 1.6,
                  }}
                >
                  Este primer perfil nos ayudara a ajustar el ritmo, la ayuda disponible y la forma en que te iremos guiando.
                </div>
              </div>
            ) : onboardingFinished ? (
              <div style={{ display: "grid", gap: "18px" }}>
                <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                  Nombre para pruebas
                  <input
                    type="text"
                    value={draftProfile.displayName || ""}
                    onChange={(event) => {
                      setProfileSaveError("");
                      setDraftProfile((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }));
                    }}
                    placeholder="Tu nombre"
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
                {!hasDraftProfileName ? (
                  <div style={{ color: "var(--red)", fontWeight: 700 }}>
                    Escribe tu nombre para continuar.
                  </div>
                ) : null}
                {profileSaveError ? (
                  <div style={{ color: "var(--red)", fontWeight: 700, lineHeight: 1.5 }}>
                    {profileSaveError}
                  </div>
                ) : null}
                <div style={{ display: "grid", gap: "12px", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                  <button
                    type="button"
                    style={styles.subtleButton}
                    onClick={() => setOnboardingStepIndex(ONBOARDING_STEPS.length - 1)}
                  >
                    Revisar
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.primaryButton,
                      opacity: hasDraftProfileName && !isSavingProfile ? 1 : 0.55,
                      cursor: hasDraftProfileName && !isSavingProfile ? "pointer" : "not-allowed",
                    }}
                    disabled={!hasDraftProfileName || isSavingProfile}
                    onClick={saveProfile}
                  >
                    {isSavingProfile ? "Guardando..." : "Continuar a las lecciones"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                {activeOnboardingStep.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleOnboardingChoice(option.id)}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--line)",
                      borderRadius: "20px",
                      background: getStoredValueAsList(draftProfile[activeOnboardingStep.id]).includes(option.id)
                        ? "rgba(47, 143, 98, 0.08)"
                        : "#fff",
                      padding: "18px 20px",
                      cursor: "pointer",
                      boxShadow: "0 12px 30px rgba(22, 33, 39, 0.06)",
                    }}
                  >
                    <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                      {activeOnboardingStep.multiSelect ? (
                        <div
                          aria-hidden="true"
                          style={{
                            width: 22,
                            height: 22,
                            marginTop: 2,
                            borderRadius: activeOnboardingStep.id === "challenge" ? "6px" : "999px",
                            border: getStoredValueAsList(draftProfile[activeOnboardingStep.id]).includes(option.id)
                              ? "2px solid var(--green)"
                              : "2px solid var(--line)",
                            background: getStoredValueAsList(draftProfile[activeOnboardingStep.id]).includes(option.id)
                              ? "var(--green)"
                              : "#fff",
                            boxShadow: getStoredValueAsList(draftProfile[activeOnboardingStep.id]).includes(option.id)
                              ? "inset 0 0 0 4px #fff"
                              : "none",
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{option.label}</div>
                        <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.5 }}>{option.hint}</div>
                      </div>
                    </div>
                  </button>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginTop: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    style={{ ...styles.subtleButton, width: "auto", minWidth: "120px" }}
                    onClick={() => {
                      if (onboardingStepIndex <= 0) {
                        setIsCreatingProfile(false);
                        setOnboardingStepIndex(-1);
                        return;
                      }
                      setOnboardingStepIndex((current) => current - 1);
                    }}
                  >
                    Atras
                  </button>
                  {activeOnboardingStep.multiSelect ? (
                    <button
                      type="button"
                      style={{
                        ...styles.primaryButton,
                        width: "auto",
                        minWidth: "160px",
                        opacity: canContinueOnboarding ? 1 : 0.55,
                        cursor: canContinueOnboarding ? "pointer" : "not-allowed",
                      }}
                      disabled={!canContinueOnboarding}
                      onClick={() => {
                        if (onboardingStepIndex >= ONBOARDING_STEPS.length - 1) {
                          setOnboardingStepIndex(ONBOARDING_STEPS.length);
                        } else {
                          setOnboardingStepIndex((current) => current + 1);
                        }
                      }}
                    >
                      Continuar
                    </button>
                  ) : null}
                </div>
              </div>
            )}
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
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
              Tu ruta
            </div>
            <h1 style={titleStyle}>Lecciones para empezar con claridad</h1>
            <p style={{ margin: "0 auto", maxWidth: 620, opacity: 0.95, lineHeight: 1.6 }}>
              {getRecommendation(profile)}
            </p>
          </section>

          <section style={boardStyle}>
            <div style={{ display: "grid", gap: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
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

              <div style={{ display: "grid", gap: "16px" }}>
                {lessons.map((lessonSummary) => (
                  <button
                    key={lessonSummary.id}
                    type="button"
                    onClick={hasProfileName ? startLesson : startEditingProfile}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--line)",
                      borderRadius: "22px",
                      background: "var(--surface)",
                      padding: "20px",
                      cursor: hasProfileName ? "pointer" : "not-allowed",
                      opacity: hasProfileName ? 1 : 0.6,
                      boxShadow: "0 12px 30px rgba(22, 33, 39, 0.06)",
                    }}
                    aria-disabled={!hasProfileName}
                  >
                    <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
                      {lessonSummary.level}
                    </div>
                    <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, marginTop: 8 }}>{lessonSummary.title}</div>
                    <div style={{ marginTop: 10, color: "var(--muted)", lineHeight: 1.6 }}>
                      {hasProfileName
                        ? "Toca para empezar esta leccion con una experiencia pensada para hispanohablantes."
                        : "Agrega tu nombre para empezar esta leccion."}
                    </div>
                  </button>
                ))}
              </div>
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
                <div style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>
                  Leccion terminada
                </div>
                <strong style={{ fontSize: 20 }}>{lesson.title}</strong>
                <span style={{ color: "var(--muted)" }}>
                  Puntaje: {score} / {totalCards}
                </span>
              </section>
            ) : null}
            <section style={heroStyle}>
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
                onClick={() => {
                  resetProgress();
                  setStarted(false);
                }}
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
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                aria-label={showHelp ? "Ocultar ayuda" : "Mostrar ayuda"}
                style={{
                  width: isMobile ? 34 : 44,
                  height: isMobile ? 34 : 44,
                  borderRadius: "999px",
                  border: "2px solid rgba(255,255,255,0.28)",
                  background: showHelp ? "#F4C95D" : "rgba(255,255,255,0.14)",
                  color: showHelp ? "#24333A" : "#ffffff",
                  fontSize: isMobile ? 18 : 24,
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
          </section>

          <section style={boardStyle}>
            <div style={choiceGridStyle}>
              {currentCard.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  style={{
                    ...cardStyleFor(option.id),
                    borderRadius: isMobile ? "18px" : styles.cardButton.borderRadius,
                    padding: isFourOptionCard ? (isMobile ? "4px" : "6px") : isMobile ? "6px" : styles.cardButton.padding,
                  }}
                  onClick={() => handleChoice(option.id)}
                  disabled={lastResult === "correct"}
                >
                  <img src={lessonImageSrc(option.image_url)} alt={option.id} style={responsiveImageStyle} />
                </button>
              ))}
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
                marginTop: isMobile ? 12 : 20,
                padding: isMobile ? "10px 12px" : "14px 18px",
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
              <button
                type="button"
                style={isMobile ? styles.iconOnlyButton : { ...styles.subtleButton, width: "auto", padding: "10px 14px" }}
                aria-label="Volver a lecciones"
                title="Volver a lecciones"
                onClick={() => {
                  resetProgress();
                  setStarted(false);
                }}
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
