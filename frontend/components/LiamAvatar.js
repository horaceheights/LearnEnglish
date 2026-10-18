"use client";
import { useEffect, useRef } from 'react';
import { LIAM_LAYERS, liamMouthShape, liamPose, liamSpeechLevel } from '../../mobile/src/liamAnimation';
import styles from './LiamAvatar.module.css';

function Layer({ layer }) {
  const { rotate, ...style } = layer.style;
  return <div data-part={layer.name} style={{ boxSizing: 'border-box', borderStyle: 'solid', borderWidth: 0,
    ...style, '--base-rotation': `${rotate || 0}deg`, transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
    {layer.children?.map((child,index) => <Layer key={index} layer={child} />)}
  </div>;
}
export default function LiamAvatar({ speaking = false, active = true, state = speaking ? 'speaking' : 'idle', player }) {
  const root = useRef(null);
  const animationOrigin = useRef(Date.now());
  const envelope = useRef(null);
  const source = player?.currentSrc || player?.src;
  useEffect(() => {
    envelope.current = null;
    if (!active || !speaking || !source || !window.OfflineAudioContext) return;
    const controller = new AbortController();
    // Decode a copy; never reroute the gesture-unlocked audible element.
    void fetch(source, { signal: controller.signal }).then(response => response.arrayBuffer()).then(async bytes => {
      const decoder = new OfflineAudioContext(1, 1, 24000);
      const audio = await decoder.decodeAudioData(bytes);
      const samples = audio.getChannelData(0), step = Math.max(1, Math.round(audio.sampleRate / 30));
      const levels = [];
      for (let i = 0; i < samples.length; i += step) levels.push(liamSpeechLevel(samples.subarray(i, i + step)));
      if (!controller.signal.aborted) envelope.current = levels;
    }).catch(() => {});
    return () => { controller.abort(); envelope.current = null; };
  }, [active, source, speaking]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, mouth = .12;
    const draw = time => {
      if (time - last >= 33 || !active || preference.matches) {
        const level = envelope.current ? envelope.current[Math.floor((player?.currentTime || 0) * 30)] ?? 0 : null;
        const pose = liamPose(Date.now() - animationOrigin.current, state, level, !active || preference.matches);
        mouth = !active || preference.matches || state !== 'speaking' ? .12 : mouth + (pose.mouth - mouth) * .65; pose.mouth = mouth;
        for (const [key,value] of Object.entries(pose)) root.current?.style.setProperty(`--${key}`, String(value));
        for (const [key,value] of Object.entries(liamMouthShape(mouth))) root.current?.style.setProperty(`--mouth-${key}`, `${value}px`);
        last = time;
      }
      if (active && !preference.matches) frame = requestAnimationFrame(draw);
    };
    const refresh = () => { cancelAnimationFrame(frame); draw(performance.now()); };
    preference.addEventListener('change', refresh); refresh();
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', refresh); };
  }, [active, player, state]);
  return <div ref={root} className={styles.avatar} aria-hidden="true"><div className={styles.canvas}>
    <div className={styles.halo} />{LIAM_LAYERS.map((layer,index) => <Layer key={index} layer={layer} />)}
  </div></div>;
}
