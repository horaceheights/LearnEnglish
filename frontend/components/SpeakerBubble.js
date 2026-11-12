import { useEffect, useRef, useState } from 'react';
import { bubbleLayout, speakerAnchor } from '../../mobile/src/speakerBubble';

const PHOTO_ASPECT = 3 / 2;

/**
 * The speaker bubble over the lesson photo rendered just before it (user decision, 2026-11-12).
 * Mobile and web share the rules in mobile/src/speakerBubble.ts; the bubble is drawn only where the
 * photo fills its box with a centred cover crop, as the shared geometry assumes.
 */
export default function SpeakerBubble({ imageUrl, speakerRole }) {
  const anchor = speakerAnchor(imageUrl, speakerRole);
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  const anchorKey = anchor ? `${anchor.x},${anchor.y}` : '';

  useEffect(() => {
    const image = ref.current?.previousElementSibling;
    if (!anchorKey || !image || image.tagName !== 'IMG') { setBox(null); return undefined; }
    const measure = () => {
      const width = image.offsetWidth;
      const height = image.offsetHeight;
      const style = window.getComputedStyle(image);
      const centred = style.objectPosition === '50% 50%';
      const covers = style.objectFit === 'cover' || Math.abs(width / Math.max(1, height) - PHOTO_ASPECT) < 0.02;
      setBox(centred && covers ? { left: image.offsetLeft, top: image.offsetTop, width, height } : null);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(image);
    return () => observer?.disconnect();
  }, [anchorKey]);

  if (!anchor) return null;
  const layout = box ? bubbleLayout(anchor, box.width, box.height) : null;
  const total = layout ? layout.height + layout.tail : 0;
  return <span ref={ref} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, pointerEvents: 'none', zIndex: 4 }}>
    {layout ? <svg role="img" aria-label="Persona que habla" data-speaker-bubble
      viewBox={`0 0 ${layout.width} ${total}`} width={layout.width} height={total}
      style={{ position: 'absolute', left: box.left + layout.left, top: box.top + layout.top, overflow: 'visible',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
      <path fill="#fffef9" stroke="#173e3b" strokeWidth="1.5" strokeLinejoin="round"
        d={bubblePath(layout.width, layout.height, layout.tail, layout.tailX)} />
      {[-1, 0, 1].map(step => <circle key={step} cx={layout.width / 2 + step * layout.width * 0.2} cy={layout.height / 2}
        r={Math.max(1.5, layout.width * 0.06)} fill={step ? '#e8613c' : '#2f7fd8'} />)}
    </svg> : null}
  </span>;
}

function bubblePath(width, height, tail, tailX) {
  const r = height * 0.4;
  const left = 0.75;
  const right = width - 0.75;
  const top = 0.75;
  const bottom = height - 0.75;
  const half = tail * 0.6;
  const tip = Math.min(Math.max(tailX, left + r + half), right - r - half);
  return [`M ${left + r} ${top}`, `H ${right - r}`, `Q ${right} ${top} ${right} ${top + r}`,
    `V ${bottom - r}`, `Q ${right} ${bottom} ${right - r} ${bottom}`,
    `H ${tip + half}`, `L ${tip} ${bottom + tail}`, `L ${tip - half} ${bottom}`,
    `H ${left + r}`, `Q ${left} ${bottom} ${left} ${bottom - r}`, `V ${top + r}`,
    `Q ${left} ${top} ${left + r} ${top}`, 'Z'].join(' ');
}
