// A cylindrical sheet, sampled into narrow textured strips by both renderers.
// The unturned region stays flat; the lifted region rolls through 180 degrees.
export const PAGE_TURN_MS = 720;
export const CURL_STRIPS = 96;
export const CURL_SAMPLES = 61;

export function curlStrip(index: number, progress: number, width: number, direction = 1) {
  const stripWidth = width / CURL_STRIPS;
  const radius = width * 0.14;
  const fold = width - (width + Math.PI * radius) * progress;
  const project = (x: number) => {
    const distance = Math.max(0, x - fold);
    const angle = Math.min(Math.PI, distance / radius);
    const rolledX = distance === 0 ? x : fold + radius * Math.sin(angle) - Math.max(0, distance - Math.PI * radius);
    const depth = radius * (1 - Math.cos(angle));
    const scale = (width * 2.2) / (width * 2.2 + depth);
    return { x: width / 2 + (rolledX - width / 2) * scale, scale, angle };
  };
  const left = project(index * stripWidth);
  const right = project((index + 1) * stripWidth);
  const middle = project((index + 0.5) * stripWidth);
  const center = (left.x + right.x) / 2;
  return {
    x: direction > 0 ? center : width - center,
    scaleX: (right.x - left.x) / stripWidth,
    scaleY: middle.scale,
    back: middle.angle > Math.PI / 2 ? 1 : 0,
    shade: 0.18 * Math.sin(middle.angle) + (middle.angle > Math.PI / 2 ? 0.035 : 0),
  };
}
