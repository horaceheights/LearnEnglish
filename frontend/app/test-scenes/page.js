"use client";

import { useRef, useState } from "react";
import styles from "./scene-test.module.css";

const SCENES = {
  running: {
    title: "Running",
    sentence: "The boy is running.",
    still: "/lesson-assets/boy_is_running.webp",
    video: "/lesson-assets/boy-running-scene-veo-v1.mp4",
  },
  eating: {
    title: "Eating",
    sentence: "The boy is eating.",
    still: "/lesson-assets/boy_is_eating.webp",
    video: "/lesson-assets/boy-eating-scene-v2.mp4",
  },
  sleeping: {
    title: "Sleeping",
    sentence: "The boy is sleeping.",
    still: "/lesson-assets/boy_is_sleeping.webp",
    video: "/lesson-assets/boy-sleeping-scene-v2.mp4",
  },
  walking: {
    title: "Walking",
    sentence: "The boy is walking.",
    still: "/lesson-assets/boy_is_walking.webp",
    video: "/lesson-assets/boy-walking-scene-veo-v1.mp4",
  },
  swimming: {
    title: "Swimming",
    sentence: "The boy is swimming.",
    still: "/lesson-assets/boy_is_swimming.webp",
    video: "/lesson-assets/boy-swimming-scene-v2.mp4",
  },
  drinking: {
    title: "Drinking",
    sentence: "The boy is drinking.",
    still: "/lesson-assets/boy_is_drinking.webp",
    video: "/lesson-assets/boy-drinking-scene-v2.mp4",
  },
  playing: {
    title: "Playing",
    sentence: "The children are playing.",
    still: "/lesson-assets/family_children_playing.webp",
    video: "/lesson-assets/children-playing-scene-v2.mp4",
  },
  talking: {
    title: "Talking",
    sentence: "The parents are talking.",
    still: "/lesson-assets/family_parents_talking.webp",
    video: "/lesson-assets/parents-talking-scene-v2.mp4",
  },
  reading: {
    title: "Reading",
    sentence: "The boy is reading.",
    still: "/lesson-assets/boy_is_reading.webp",
    video: "/lesson-assets/boy-reading-scene-v2.mp4",
  },
  writing: {
    title: "Writing",
    sentence: "The girl is writing.",
    still: "/lesson-assets/girl_is_writing.webp",
    video: "/lesson-assets/girl-writing-scene-v2.mp4",
  },
  studying: {
    title: "Studying",
    sentence: "A brother is studying.",
    still: "/lesson-assets/family_brother_studying.webp",
    video: "/lesson-assets/brother-studying-scene-v2.mp4",
  },
  cooking: {
    title: "Cooking",
    sentence: "The mother is cooking.",
    still: "/lesson-assets/family_mother_cooking.webp",
    video: "/lesson-assets/mother-cooking-scene-v2.mp4",
  },
  batchWalking: {
    title: "Batch test: Walking",
    sentence: "The man is walking.",
    still: "/lesson-assets/man_is_walking.webp",
    video: "/lesson-assets/man-walking-batched-omni-test.mp4",
  },
  batchRunning: {
    title: "Batch test: Running",
    sentence: "The man is running.",
    still: "/lesson-assets/man_is_running.webp",
    video: "/lesson-assets/man-running-batched-omni-test.mp4",
  },
  veoLiteWalking: {
    title: "Approved: Walking",
    sentence: "The boy is walking.",
    still: "/lesson-assets/boy_is_walking.webp",
    video: "/lesson-assets/boy-walking-scene-v2.mp4",
  },
  veoLiteRunning: {
    title: "Approved: Running",
    sentence: "The boy is running.",
    still: "/lesson-assets/boy_is_running.webp",
    video: "/lesson-assets/boy-running-scene-v2.mp4",
  },
};

export default function SceneTestPage() {
  const [sceneId, setSceneId] = useState("running");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const videoRef = useRef(null);
  const scene = SCENES[sceneId];

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const changeSpeed = (nextSpeed) => {
    setSpeed(nextSpeed);
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
  };

  const changeScene = (nextSceneId) => {
    setSceneId(nextSceneId);
    setPlaying(true);
    setSpeed(1);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <img src="/spanglish-logo.svg" alt="SpanGlish" />
        <div>
          <span>Scene evaluation</span>
          <h1>{scene.title}</h1>
        </div>
      </header>

      <nav className={styles.sceneTabs} aria-label="Scenes">
        {Object.entries(SCENES).map(([id, item]) => (
          <button type="button" key={id} className={sceneId === id ? styles.active : ""} onClick={() => changeScene(id)}>
            {item.title}
          </button>
        ))}
      </nav>

      <section className={styles.controls} aria-label="Animation controls">
        <button type="button" className={playing ? styles.active : ""} onClick={togglePlayback}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className={speed === 0.7 ? styles.active : ""} onClick={() => changeSpeed(0.7)}>Slow</button>
        <button type="button" className={speed === 1 ? styles.active : ""} onClick={() => changeSpeed(1)}>Natural</button>
      </section>

      <section className={styles.compare}>
        <article>
          <p>Current still</p>
          <div className={styles.imageFrame}>
            <img src={scene.still} alt={scene.sentence} />
          </div>
        </article>
        <article>
          <p>Proposed short scene</p>
          <div className={styles.imageFrame}>
            <video
              ref={videoRef}
              key={sceneId}
              src={scene.video}
              poster={scene.still}
              muted
              autoPlay
              loop
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              aria-label={`AI-generated scene: ${scene.sentence}`}
            />
          </div>
        </article>
      </section>

      <aside className={styles.note}>
        <strong>{scene.sentence}</strong>
        <span>Prototype only. It is not connected to any lesson.</span>
      </aside>
    </main>
  );
}
