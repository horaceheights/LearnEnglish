import { clockAngles } from '../../mobile/src/teachingClock';

export default function TeachingClocks({ cues = [] }) {
  if (!cues.length) return null;
  return <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 3, display: 'flex', gap: 4, pointerEvents: 'none' }}>
    {cues.map((cue, index) => {
      const angles = clockAngles(cue);
      return <div key={index} style={{ width: 48, textAlign: 'center' }}>
        <svg viewBox="0 0 60 60" role="img" aria-label={`${cue.label ? `${cue.label}: ` : ''}${cue.hour}:${String(cue.minute).padStart(2, '0')}`}>
          <circle cx="30" cy="30" r="28.5" fill="#fffef9" stroke="#173e3b" strokeWidth="2" />
          <g stroke="#627470" strokeWidth="1.3">{Array.from({ length: 12 }, (_, i) => <line key={i} x1="30" y1="5" x2="30" y2="8" transform={`rotate(${i * 30} 30 30)`} />)}</g>
          <g fill="#173e3b" fontSize="7" fontWeight="600" textAnchor="middle"><text x="30" y="15">12</text><text x="45" y="32.5">3</text><text x="30" y="49">6</text><text x="15" y="32.5">9</text></g>
          <line x1="30" y1="30" x2="30" y2="17" transform={`rotate(${angles.hour} 30 30)`} stroke="#173e3b" strokeWidth="3.3" strokeLinecap="round" />
          <line x1="30" y1="31" x2="30" y2="9" transform={`rotate(${angles.minute} 30 30)`} stroke="#173e3b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="30" r="2.2" fill="#173e3b" />
        </svg>
        {cue.label ? <span style={{ background: '#fffef9', color: '#173e3b', fontSize: 10 }}>{cue.label}</span> : null}
      </div>;
    })}
  </div>;
}
