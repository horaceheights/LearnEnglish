export type LiamState = 'idle' | 'thinking' | 'listening' | 'speaking' | 'complete';
export const LIAM_WIDTH = 240;
export const LIAM_HEIGHT = 220;

/** Actual mouth geometry from the approved local portrait, shared by both hosts. */
export function liamMouthShape(mouth: number) {
  const opening = Math.max(0, Math.min(1, (mouth - .12) / .95));
  const width = 36 + opening * 5;
  const height = 2.5 + opening * 23;
  return { width, height, left: 55.5 - width / 2, top: 108 - height * .22 };
}

/** RMS of playback samples, never the learner's microphone. Silence stays shut. */
export function liamSpeechLevel(frames: ArrayLike<number>) {
  if (!frames.length) return 0;
  let energy = 0;
  for (let index = 0; index < frames.length; index++) energy += frames[index] ** 2;
  return Math.max(0, Math.min(1, (Math.sqrt(energy / frames.length) - .008) * 5));
}

export function liamPose(time: number, state: LiamState, level: number | null, reduced = false) {
  if (reduced) return { mouth: .12, blink: 1, x: 0, y: 0, roll: 0, brow: 0, breath: 0 };
  const seconds = time / 1000;
  const speaking = state === 'speaking';
  // An irregular cadence is a playback-gated fallback on devices without samples.
  const fallback = Math.max(0, Math.sin(seconds * 16) * .35 + Math.sin(seconds * 27) * .18 + .25);
  const mouth = speaking ? (level ?? fallback) : 0;
  const blinkTime = time % 4700;
  const blink = blinkTime < 160 ? Math.max(.06, Math.abs(blinkTime - 80) / 80) : 1;
  const attention = state === 'listening' ? -3 : state === 'thinking' ? 2 : 0;
  return {
    mouth: .12 + Math.max(0, Math.min(1, mouth)) * .95,
    blink,
    x: Math.sin(seconds * .85) * (speaking ? 1.5 : .6),
    y: Math.sin(seconds * 1.5) * (speaking ? 1 : .35),
    roll: attention + Math.sin(seconds * .95) * (speaking ? 1.6 : .5),
    brow: speaking ? -mouth * 1.8 : state === 'listening' ? -1.3 : 0,
    breath: Math.sin(seconds * 1.5) * .9,
  };
}

// One portrait definition for native and web; animation is applied by each host.
export type LiamLayer = { name?: string; style: Record<string, string | number>; children?: LiamLayer[] };
const shape = (style: LiamLayer['style'], children?: LiamLayer[], name?: string): LiamLayer => ({ style: { position: 'absolute', ...style }, children, name });
const eye = (left: number) => shape({ left, top: 64, width: 26, height: 13, backgroundColor: '#fff8ed', borderRadius: 10, overflow: 'hidden', borderTopWidth: 2, borderColor: '#925d40' }, [
  shape({ left: 10, top: -1, width: 10, height: 12, backgroundColor: '#795038', borderRadius: 6 }),
  shape({ left: 12, top: 1, width: 6, height: 9, backgroundColor: '#292921', borderRadius: 4 }),
  shape({ left: 13, top: 1, width: 3, height: 3, backgroundColor: '#fff', borderRadius: 2 }),
], 'eye');
export const LIAM_LAYERS: LiamLayer[] = [
  shape({ left: 32, top: 195, width: 180, height: 65, borderRadius: 80, backgroundColor: '#b3d5c9' }),
  shape({ left: 36, top: 171, width: 170, height: 113, borderTopLeftRadius: 67, borderTopRightRadius: 67, backgroundColor: '#245f59', borderWidth: 2, borderColor: '#194d49' }, [
    shape({ left: 17, top: 13, width: 138, height: 97, borderTopLeftRadius: 57, borderTopRightRadius: 57, backgroundColor: '#318477' }),
    shape({ left: 70, top: 19, width: 27, height: 74, backgroundColor: '#2a7166', borderRadius: 10 }),
    shape({ left: 82, top: 47, width: 4, height: 4, backgroundColor: '#cae2d8', borderRadius: 2 }),
    shape({ left: 82, top: 65, width: 4, height: 4, backgroundColor: '#cae2d8', borderRadius: 2 }),
  ], 'body'),
  shape({ left: 99, top: 147, width: 44, height: 46, backgroundColor: '#c98860', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }),
  shape({ left: 101, top: 148, width: 33, height: 40, backgroundColor: '#e7b38b', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }),
  shape({ left: 82, top: 174, width: 29, height: 26, backgroundColor: '#ddede0', borderBottomLeftRadius: 17, borderTopRightRadius: 14, rotate: -24 }),
  shape({ left: 129, top: 174, width: 29, height: 26, backgroundColor: '#ddede0', borderBottomRightRadius: 17, borderTopLeftRadius: 14, rotate: 24 }),
  shape({ left: 53, top: 15, width: 138, height: 169 }, [
    shape({ left: 13, top: 13, width: 112, height: 107, backgroundColor: '#3b302b', borderRadius: 49 }),
    shape({ left: 5, top: 77, width: 23, height: 35, backgroundColor: '#d59971', borderRadius: 13, borderWidth: 2, borderColor: '#bd7f59' }),
    shape({ left: 114, top: 77, width: 22, height: 35, backgroundColor: '#d59971', borderRadius: 13, borderWidth: 2, borderColor: '#bd7f59' }),
    shape({ left: 17, top: 27, width: 108, height: 137, backgroundColor: '#dfaa80', borderTopLeftRadius: 41, borderTopRightRadius: 41, borderBottomLeftRadius: 47, borderBottomRightRadius: 47, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#bc7e58' }, [
      shape({ left: 5, top: 5, width: 89, height: 124, backgroundColor: '#edbd95', borderRadius: 42 }),
      shape({ left: 10, top: 82, width: 21, height: 12, backgroundColor: '#dfa18b', borderRadius: 10, opacity: .55 }),
      shape({ left: 76, top: 82, width: 20, height: 12, backgroundColor: '#dfa18b', borderRadius: 10, opacity: .45 }),
      shape({ left: 15, top: 50, width: 26, height: 6, backgroundColor: '#5a3d2f', borderRadius: 5, rotate: -6 }, undefined, 'brow'),
      shape({ left: 66, top: 50, width: 26, height: 6, backgroundColor: '#5a3d2f', borderRadius: 5, rotate: 5 }, undefined, 'brow'),
      eye(15), eye(65),
      shape({ left: 48, top: 71, width: 13, height: 24, borderBottomWidth: 3, borderRightWidth: 2, borderColor: '#ca916a', borderBottomLeftRadius: 7, borderBottomRightRadius: 7 }),
      shape({ left: 37, top: 101, width: 37, height: 21, borderRadius: 13, backgroundColor: '#713e35', overflow: 'hidden', borderWidth: 2, borderColor: '#ae6b54' }, [
        shape({ left: 2, top: 0, width: 29, height: 6, backgroundColor: '#fff6df', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }),
        shape({ left: 7, top: 12, width: 22, height: 10, backgroundColor: '#ca776c', borderRadius: 10 }),
      ], 'mouth'),
      shape({ left: 46, top: 129, width: 20, height: 3, backgroundColor: '#d29a73', borderRadius: 3 }),
    ]),
    shape({ left: 11, top: 12, width: 113, height: 42, backgroundColor: '#49372d', borderTopLeftRadius: 40, borderTopRightRadius: 48, borderBottomLeftRadius: 12, borderBottomRightRadius: 24, rotate: -10 }),
    shape({ left: 24, top: 8, width: 80, height: 24, backgroundColor: '#634632', borderTopLeftRadius: 30, borderTopRightRadius: 38, borderBottomRightRadius: 20, rotate: -13 }),
    shape({ left: 25, top: 17, width: 64, height: 6, backgroundColor: '#7c5740', borderRadius: 5, rotate: -13, opacity: .65 }),
    shape({ left: 14, top: 41, width: 10, height: 36, backgroundColor: '#49372d', borderBottomLeftRadius: 8, rotate: 5 }),
    shape({ left: 117, top: 39, width: 7, height: 38, backgroundColor: '#3b302b', borderBottomRightRadius: 7 }),
  ], 'head'),
];
