import html2canvas from 'html2canvas';
import { CURL_STRIPS, curlStrip } from '../../mobile/src/pageCurlGeometry';

export async function capturePage(node) {
  const rect = node.getBoundingClientRect();
  if (!rect.width || !rect.height) throw new Error('Page has no layout');
  // Cross-origin media may be drawn on this local canvas. Never read its pixels,
  // serialize it, upload it, or retain it after the transition.
  const texture = await html2canvas(node, { allowTaint: true, useCORS: false, logging: false,
    scale: Math.min(window.devicePixelRatio || 1, 2), backgroundColor: '#f8f5ed', imageTimeout: 500,
    ignoreElements: element => element.tagName === 'AUDIO' || element.tagName === 'SCRIPT' });
  return { texture, rect };
}

export function createPageCurl({ texture, rect }, direction) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.pageCurl = 'true';
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  Object.assign(canvas.style, { position: 'fixed', pointerEvents: 'none', zIndex: '9999',
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const draw = progress => {
    const width = rect.width, height = rect.height, sliceWidth = width / CURL_STRIPS;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    for (let index = 0; index < CURL_STRIPS; index++) {
      const strip = curlStrip(index, progress, width, direction);
      const sourceIndex = direction > 0 ? index : CURL_STRIPS - 1 - index;
      context.save();
      context.translate(strip.x, height / 2);
      context.scale(strip.scaleX, strip.scaleY);
      if (strip.back) {
        context.fillStyle = '#fffdf7';
        context.fillRect(-sliceWidth / 2 - 0.3, -height / 2, sliceWidth + 0.6, height);
      } else {
        context.drawImage(texture, sourceIndex * texture.width / CURL_STRIPS, 0,
          texture.width / CURL_STRIPS, texture.height, -sliceWidth / 2 - 0.3, -height / 2, sliceWidth + 0.6, height);
      }
      context.fillStyle = `rgba(37,48,66,${strip.shade})`;
      context.fillRect(-sliceWidth / 2 - 0.3, -height / 2, sliceWidth + 0.6, height);
      context.restore();
    }
  };
  draw(0);
  document.body.appendChild(canvas);
  return { draw, remove: () => { canvas.remove(); canvas.width = canvas.height = 0; } };
}
