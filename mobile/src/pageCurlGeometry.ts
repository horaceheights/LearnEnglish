// A sheet of paper peeled from one edge, sampled into narrow textured strips by
// both renderers. The unturned region stays flat; the lifted region rolls around
// a cylinder that tightens as the corner peels and relaxes as the page falls.
// Only transforms and opacity are animated, so every value here is a number the
// native driver can interpolate.
export const PAGE_TURN_MS = 720;
export const CURL_STRIPS = 96;
export const CURL_SAMPLES = 61;

// The eye sits this many page widths in front of the sheet. Lower is a stronger
// foreshortening of the part of the page standing away from the surface.
const VIEW_DISTANCE = 1.6;
// Light arrives from ahead of and above the fold, so the crest of the roll
// catches it while the far side of the cylinder turns away.
const LIGHT = Math.PI * 0.32;
const FLAT_LIGHT = Math.cos(LIGHT);
// How far the standing curl rides up the page, as a fraction of how far it
// stands off the surface.
const LIFT = 0.18;
// The paper turns from front to back over this angular window rather than at a
// single instant, so the strips do not pop one after another.
const FACE_BLEND = 0.3;

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// A corner peels tightly, then the radius opens out as the page swings over.
function curlRadius(progress: number, width: number) {
  return width * (0.11 + 0.07 * Math.sin(Math.PI * progress));
}

// Where the flat page ends and the roll begins, in unturned page coordinates.
export function curlFold(progress: number, width: number) {
  return width - (width + Math.PI * curlRadius(progress, width)) * progress;
}

// Lambert term against a flat page, so an untouched sheet is neither darkened
// nor glossed and the turn cannot flash as it starts.
function curlLight(angle: number) {
  const lit = Math.max(0, Math.cos(angle - LIGHT));
  const away = Math.max(0, (FLAT_LIGHT - lit) / FLAT_LIGHT);
  const toward = Math.max(0, (lit - FLAT_LIGHT) / (1 - FLAT_LIGHT));
  // Paper stays light even where it turns away; too much darkening reads as
  // painted metal rather than a sheet of a lesson page.
  return { shade: 0.28 * away * away, gloss: 0.3 * toward * toward * toward };
}

// The shadow the standing sheet casts onto the page it is uncovering. It is
// absent while the page lies flat and again once the sheet has left.
export function curlShadow(progress: number) {
  return 0.42 * Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
}

export function curlStrip(index: number, progress: number, width: number, direction = 1) {
  const stripWidth = width / CURL_STRIPS;
  const radius = curlRadius(progress, width);
  const fold = curlFold(progress, width);
  const eye = width * VIEW_DISTANCE;
  const project = (x: number) => {
    const distance = Math.max(0, x - fold);
    const angle = Math.min(Math.PI, distance / radius);
    const overhang = Math.max(0, distance - Math.PI * radius);
    const rolledX = distance === 0 ? x : fold + radius * Math.sin(angle) - overhang;
    // Height off the page, which both foreshortens the strip and rides it up.
    const depth = radius * (1 - Math.cos(angle));
    const scale = eye / (eye + depth);
    return { x: width / 2 + (rolledX - width / 2) * scale, scale, angle, depth };
  };
  const left = project(index * stripWidth);
  const right = project((index + 1) * stripWidth);
  const middle = project((index + 0.5) * stripWidth);
  const center = (left.x + right.x) / 2;
  const light = curlLight(middle.angle);
  const back = smoothstep(Math.PI / 2 - FACE_BLEND / 2, Math.PI / 2 + FACE_BLEND / 2, middle.angle);
  return {
    x: direction > 0 ? center : width - center,
    y: -middle.depth * LIFT * middle.scale,
    scaleX: (right.x - left.x) / stripWidth,
    scaleY: middle.scale,
    back,
    // The reverse of a sheet is matte, so it keeps the shading but loses the sheen.
    shade: light.shade + 0.05 * back,
    gloss: light.gloss * (1 - 0.75 * back),
  };
}
