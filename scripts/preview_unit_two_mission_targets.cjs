// Generates a local QA surface from the actual shared marker-placement function.
// This is NOT the app, an audio test, or human approval. No generation requests.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { fitMissionHeadScene } = require('../mobile/src/missionTargetInteraction');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/imagegen/unit-2-mission-v4');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'docs/product/unit-2-mission-pack.json'), 'utf8'));
const reviews = JSON.parse(fs.readFileSync(path.join(output, 'agent-reviews.json'), 'utf8'));
const sizes = [[328, 410, 'Portrait'], [650, 190, 'Short landscape'], [960, 430, 'Desktop']];
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const result = [];
let figures = '';
for (const [width, height, label] of sizes) {
  figures += `<section><h2>${label} — scene area ${width}×${height}</h2><div class="grid">`;
  for (const beat of pack.beats) {
    const review = reviews[beat.asset];
    assert.equal(review?.disposition, 'usable', `${beat.asset} is not reviewed`);
    const targets = review.targets.map((geometry, i) => ({...geometry, subject_kind: 'object', id: `${beat.asset}-${i+1}`, label_es: beat.translations[i]}));
    const frame = fitMissionHeadScene(width, height, targets);
    assert.ok(frame && frame.height <= height, `${beat.asset}: no fitting layout`);
    assert.equal(frame.markers.length, targets.length);
    for (const m of frame.markers) {
      assert.ok(m.width >= 48 && m.height >= 48);
      assert.ok(m.x >= 0 && m.y >= 0 && m.x+m.width <= width && m.y+m.height <= height);
      for (const other of frame.markers) if (m.id !== other.id) {
        assert.ok(m.x + m.width <= other.x || other.x + other.width <= m.x || m.y + m.height <= other.y || other.y + other.height <= m.y, `${beat.asset}: overlapping touch targets`);
      }
    }
    result.push({asset: beat.asset, width, height, image_width: frame.imageWidth, frame_height: frame.height, touch_targets: frame.markers.length, geometry_pass: true});
    const lines = frame.markers.flatMap(m => (m.leaderHeads || m.heads).map(h => `<line x1="${m.leaderFrom?.x ?? m.x+m.width/2}" y1="${m.leaderFrom?.y ?? m.y+41}" x2="${h.x}" y2="${h.y-3}" stroke="#087a6b" stroke-width="1.5"/>`)).join('');
    const markers = frame.markers.map((m,i) => `<button class="marker ${m.collective?'group':''}" style="left:${m.x}px;top:${m.y}px;width:${m.width}px;height:${m.height}px" title="${escape(beat.cues[i])}" onclick="this.classList.toggle('selected')">${i+1}</button>`).join('');
    figures += `<figure><figcaption>${beat.id} ${escape(beat.asset)}</figcaption><div class="scene" style="width:${width}px;height:${height}px"><img src="${beat.asset}.png" style="left:${frame.imageX}px;top:${frame.imageY}px;width:${frame.imageWidth}px;height:${frame.imageHeight}px" alt="${escape(beat.cues.join(' '))}"><svg width="${width}" height="${height}">${lines}</svg>${markers}</div><p>${beat.cues.map((cue,i)=>`${i+1}. ${escape(cue)}`).join(' · ')}</p></figure>`;
  }
  figures += '</div></section>';
}
fs.writeFileSync(path.join(output, 'target-preview.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Unit 2 marker QA — not the app</title><style>body{margin:24px;background:#edf3f1;color:#163c35;font:16px system-ui}h1{margin-bottom:4px}.grid{display:flex;flex-wrap:wrap;gap:20px}figure{margin:0;padding:14px;background:white;border-radius:14px;max-width:960px}figcaption{font-weight:700;margin-bottom:8px}p{max-width:640px;font-size:13px}.scene{position:relative;background:#e1eeea;overflow:hidden}img,svg{position:absolute}svg{pointer-events:none}.marker{position:absolute;border:0;background:transparent;color:#fff;font-weight:700;cursor:pointer}.marker::before{content:'';position:absolute;inset:8px;border-radius:50%;background:#087a6b;z-index:0}.marker.group::before{border-radius:18px}.marker{isolation:isolate}.marker::before{z-index:-1}.marker.selected::before{background:#bb6b00}</style><h1>Unit 2 — marker geometry QA</h1><p>Uses the real app placement function and inspected source pixels. Numbers identify answer bindings only in this QA tool. Click toggles marker state. This is not a working lesson or an audio/device verification.</p>${figures}</html>`);
fs.writeFileSync(path.join(output, 'target-layout-results.json'), JSON.stringify(result, null, 2)+'\n');
console.log(JSON.stringify({layouts: result.length, geometry_pass: true, html: path.join(output, 'target-preview.html')}));
