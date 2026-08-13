"use client";

import { useEffect, useState } from "react";
import styles from "./scene-test.module.css";

const FRAME_COUNT = 6;

function RunningScene({ interval = 240, paused = false }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (paused) {
      setFrame(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_COUNT);
    }, interval);
    return () => window.clearInterval(timer);
  }, [interval, paused]);

  return (
    <div className={styles.scene} aria-label={paused ? "Still image of a boy running" : "Animated scene of a boy running"}>
      <div className={styles.strip} style={{ transform: `translateX(-${frame * (100 / FRAME_COUNT)}%)` }}>
        <img src="/lesson-assets/boy-running-scene-frames-v2-a.png" alt="" />
        <img src="/lesson-assets/boy-running-scene-frames-v2-b.png" alt="" />
      </div>
    </div>
  );
}

export default function SceneTestPage() {
  const [speed, setSpeed] = useState("natural");
  const [playing, setPlaying] = useState(true);
  const interval = speed === "slow" ? 480 : 310;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <img src="/spanglish-logo.svg" alt="SpanGlish" />
        <div>
          <span>Scene evaluation</span>
          <h1>Running</h1>
        </div>
      </header>

      <section className={styles.controls} aria-label="Animation controls">
        <button type="button" className={playing ? styles.active : ""} onClick={() => setPlaying((value) => !value)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className={speed === "slow" ? styles.active : ""} onClick={() => setSpeed("slow")}>Slow</button>
        <button type="button" className={speed === "natural" ? styles.active : ""} onClick={() => setSpeed("natural")}>Natural</button>
      </section>

      <section className={styles.compare}>
        <article>
          <p>Current still</p>
          <div className={styles.imageFrame}>
            <img src="/lesson-assets/boy_is_running.webp" alt="A boy running in a park" />
          </div>
        </article>
        <article>
          <p>Proposed short scene</p>
          <div className={styles.imageFrame}>
            <RunningScene interval={interval} paused={!playing} />
          </div>
        </article>
      </section>

      <aside className={styles.note}>
        <strong>The boy is running.</strong>
        <span>Prototype only. It is not connected to any lesson.</span>
      </aside>
    </main>
  );
}
