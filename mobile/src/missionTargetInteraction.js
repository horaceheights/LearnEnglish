// Mirrored byte-for-byte on web/mobile; parity is enforced by mission-target-interaction.test.cjs.
const TOUCH = 48;
const GAP = 6;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const overlaps = (a, b, gap = GAP) => a.x < b.x + b.width + gap
  && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap
  && a.y + a.height + gap > b.y;

function missionCueOrder(game, random = Math.random) {
  const order = (game?.cues || []).map((_, index) => index);
  if (game?.kind === 'voice-gate') return order;
  // Only the initial demonstration is fixed. Replay/retry retain this permutation.
  const first = game?.tutorial_mode === 'guided-no-fail' ? 1 : 0;
  for (let i = order.length - 1; i > first; i -= 1) {
    const j = first + Math.floor(random() * (i - first + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Do not accidentally recreate a predictable left-to-right sweep.
  const xs = order.map(i => {
    const t = game.targets.find(target => target.id === game.cues[i].target_id);
    return t.rect.x + t.rect.width / 2;
  });
  if (order.length - first > 2 && xs.slice(first + 1).every((x, i) => x >= xs[first + i])) {
    [order[first], order[first + 1]] = [order[first + 1], order[first]];
  }
  return order;
}

function layoutAtWidth(stageWidth, imageWidth, targets) {
  const imageHeight = imageWidth / 1.5;
  const imageX = (stageWidth - imageWidth) / 2;
  const allHeads = targets.flatMap(t => t.head_anchors || []).map(h => ({
    x: imageX + h.x * imageWidth - imageWidth * .03,
    y: h.y * imageHeight,
    width: imageWidth * .06, height: imageHeight * .12,
  }));
  const placed = [];
  // Place individuals first; the wider group control occupies its own tier if needed.
  const sorted = [...targets].sort((a, b) => (a.head_anchors?.length || 1) - (b.head_anchors?.length || 1));
  for (const target of sorted) {
    const heads = (target.head_anchors?.length ? target.head_anchors : [
      { x: target.rect.x + target.rect.width / 2, y: target.rect.y + target.rect.height / 2 },
    ]).map(h => ({ x: imageX + h.x * imageWidth, y: h.y * imageHeight }));
    const collective = ['Grupo', 'Pareja', 'Familia'].includes(target.label_es);
    const width = collective ? Math.min(100, Math.max(68, imageWidth * .18)) : TOUCH;
    const anchorX = heads.reduce((sum, h) => sum + h.x, 0) / heads.length;
    const anchorY = Math.min(...heads.map(h => h.y));
    const start = { x: clamp(anchorX - width / 2, 2, stageWidth - width - 2),
      y: anchorY - TOUCH - 8, width, height: TOUCH };
    let box = { ...start };
    // Prefer a short sideways pointer over making several tall rows on landscape.
    const maxShift = Math.max(36, stageWidth * (collective ? .24 : .13), (stageWidth - imageWidth) / 2);
    const offsets = [0];
    for (let dx = 6; dx <= maxShift; dx += 6) offsets.push(-dx, dx);
    let bestCost = Infinity;
    for (const offset of offsets) {
      const candidate = { ...start, x: clamp(start.x + offset, 2, stageWidth - width - 2) };
      for (let pass = 0; pass <= placed.length + allHeads.length; pass += 1) {
        const collisions = [...placed, ...allHeads].filter(other => overlaps(candidate, other));
        if (!collisions.length) break;
        candidate.y = Math.min(...collisions.map(other => other.y - TOUCH - GAP));
      }
      const cost = start.y - candidate.y + Math.abs(candidate.x - start.x) * .65;
      if (cost < bestCost) { box = candidate; bestCost = cost; }
    }
    placed.push({ ...box, id: target.id, heads, collective });
  }
  const headroom = Math.max(4, 4 - Math.min(0, ...placed.map(m => m.y)));
  return { width: stageWidth, height: imageHeight + headroom + 4, imageWidth, imageHeight,
    imageX, imageY: headroom,
    markers: targets.map(t => {
      const m = placed.find(p => p.id === t.id);
      return { ...m, y: m.y + headroom, heads: m.heads.map(h => ({ x: h.x, y: h.y + headroom })) };
    }) };
}

// Relocate only explicitly reviewed standing-group capsules. The original scene
// fit and every other marker stay identical, including approved group-only scenes.
function placeChestGroups(layout, targets) {
  const faces = layout.markers.flatMap(m => m.heads).map(h => ({
    x: h.x - layout.imageWidth * .03, y: h.y,
    width: layout.imageWidth * .06, height: layout.imageHeight * .12,
  }));
  const markers = layout.markers.map(marker => {
    const target = targets.find(t => t.id === marker.id);
    const anchor = target.group_chest_anchor;
    const hasIndividualMembers = target.head_anchors?.length > 1
      && target.head_anchors.every(h => targets.some(t => t.label_es === 'Persona'
        && t.head_anchors?.length === 1 && t.head_anchors[0].x === h.x && t.head_anchors[0].y === h.y));
    if (!anchor || !marker.collective || !hasIndividualMembers) return marker;
    const candidate = { ...marker, chest: true,
      x: clamp(layout.imageX + anchor.x * layout.imageWidth - marker.width / 2,
        layout.imageX, layout.imageX + layout.imageWidth - marker.width),
      y: layout.imageY + anchor.y * layout.imageHeight - marker.height / 2 };
    // Keep the complete 48dp touch/pulse envelope below faces even on short phones.
    const blockers = [...faces, ...layout.markers.filter(m => m.id !== marker.id)];
    for (let pass = 0; pass <= blockers.length; pass += 1) {
      const collisions = blockers.filter(other => overlaps(candidate, other));
      if (!collisions.length) break;
      candidate.y = Math.max(...collisions.map(other => other.y + other.height + GAP));
    }
    if (candidate.y + candidate.height > layout.imageY + layout.imageHeight) return marker;
    return candidate;
  });
  return { ...layout, markers };
}

function fitMissionHeadScene(width, height, targets) {
  if (width < 80 || height < 80) return null;
  if (height < 240 && width > height * 1.6) {
    // Short landscape: one clear overhead row, using the free horizontal space.
    // Pointers still terminate at each exact source-image crown, never a crop.
    const imageWidth = Math.min(width - 8, (height - 64) * 1.5);
    const layout = layoutAtWidth(width, imageWidth, targets);
    const ordered = [...layout.markers].sort((a, b) =>
      a.heads.reduce((sum, h) => sum + h.x, 0) / a.heads.length
      - b.heads.reduce((sum, h) => sum + h.x, 0) / b.heads.length);
    const total = ordered.reduce((sum, m) => sum + m.width, 0) + GAP * (ordered.length - 1);
    if (total <= width - 8) {
      let x = (width - total) / 2;
      const markers = ordered.map(m => {
        const marker = { ...m, x, y: 4,
          heads: m.heads.map(h => ({ x: h.x, y: h.y - layout.imageY + 60 })) };
        x += m.width + GAP;
        return marker;
      });
      return placeChestGroups({ ...layout, imageY: 60, height: imageWidth / 1.5 + 64,
        markers: targets.map(t => markers.find(m => m.id === t.id)) }, targets);
    }
  }
  // Search downward because collision tiers make the fit discontinuous.
  for (let imageWidth = Math.min(width - 8, (height - 8) * 1.5); imageWidth >= 64; imageWidth -= 1) {
    const layout = layoutAtWidth(width, imageWidth, targets);
    if (layout.height <= height) return placeChestGroups(layout, targets);
  }
  return null;
}

module.exports = { missionCueOrder, fitMissionHeadScene };
