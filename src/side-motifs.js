export function initSideMotifs(document, assetsConfig) {
  const layer = document.getElementById('sideflowers');
  const CFG = assetsConfig?.sideMotifs;
  if (!layer || !CFG) return;

  const rand = (a, b) => a + Math.random() * (b - a);
  const isSmall = file => CFG.small.includes(file);
  let spec = null;

  function buildSpec() {
    const seq = CFG.images.slice();
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(rand(0, i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }
    return Array.from({ length: 120 }, (_, k) => ({
      file: seq[k % seq.length],
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
