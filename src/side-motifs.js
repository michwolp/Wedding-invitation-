export function initSideMotifs(document, assetsConfig) {
  const layer = document.getElementById('sideflowers');
  const CFG = assetsConfig?.sideMotifs;
  if (!layer || !CFG) return;

  const rand = (a, b) => a + Math.random() * (b - a);
  const isSmall = file => CFG.small.includes(file);
  let spec = null;

  function buildSpec() {
    const pool = CFG.images.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand(0, i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Lay out 120 slots without repeating an image near itself. A slot's
    // visual neighbours are its row partner (prev slot) and the two slots
    // directly above (same + opposite column, i.e. 2 back), so we forbid
    // reusing any file placed in the last WINDOW slots. Falls back to the
    // least-recently-used file if the pool is small.
    const WINDOW = 3;
    const files = [];
    let cursor = 0;
    for (let k = 0; k < 120; k++) {
      const recent = files.slice(Math.max(0, k - WINDOW));
      let chosen = null;
      for (let step = 0; step < pool.length; step++) {
        const cand = pool[(cursor + step) % pool.length];
        if (!recent.includes(cand)) { chosen = cand; cursor = (cursor + step + 1) % pool.length; break; }
      }
      files.push(chosen ?? pool[cursor++ % pool.length]);
    }

    return files.map((file, k) => ({
      file,
      side: k % 2 ? 'right' : 'left',
      gap: rand(0.8, 1.2),
      jitter: rand(-40, 40),
      opacity: +rand(CFG.minOpacity, 1).toFixed(2),
      sway: +rand(CFG.swayMin, CFG.swayMax).toFixed(1),
      delay: +(-rand(0, 5)).toFixed(1),
    }));
  }

  function build() {
    if (!spec) spec = buildSpec();
    layer.innerHTML = '';
    const pageH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const narrow = innerWidth < 640;
    const rowGap = narrow ? CFG.rowGapPhone : CFG.rowGapDesktop;
    const edge = narrow ? CFG.edgeOffsetPhone : CFG.edgeOffsetDesktop;
    let y = CFG.startY;
    let i = 0;

    while (y < pageH - 120 && i < spec.length) {
      for (let s = 0; s < 2 && i < spec.length; s++, i++) {
        const it = spec[i];
        const small = isSmall(it.file);
        const box = small
          ? (narrow ? CFG.smallBoxPhone : CFG.smallBoxDesktop)
          : (narrow ? CFG.boxPhone : CFG.boxDesktop);
        const img = document.createElement('img');
        img.src = assetsConfig.base + it.file;
        img.style.maxWidth = box + 'px';
        img.style.maxHeight = box + 'px';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.top = (y + it.jitter) + 'px';
        img.style[it.side] = edge + 'px';
        img.style.opacity = it.opacity;
        img.style.setProperty('--sway', it.sway + 's');
        img.style.setProperty('--swayDelay', it.delay + 's');
        layer.appendChild(img);
      }
      y += rowGap * spec[Math.min(i, spec.length - 1)].gap;
    }
  }

  if ('requestIdleCallback' in window) requestIdleCallback(build);
  else setTimeout(build, 300);
  setTimeout(build, 1200);

  let rt;
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(rt);
    rt = setTimeout(build, 300);
  }, { passive: true });
}
