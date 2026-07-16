const CHUNK = 'Michal <i>&#x2665;&#xFE0E;</i> Dvir <i>&#x2726;</i> 16.10.26 <i>&#x2726;</i> ';

export function initMarquee(document) {
  const halves = document.querySelectorAll('.mq');
  if (!halves.length) return;

  function fill() {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--display);font-weight:400;font-size:1.15rem;letter-spacing:.12em';
    probe.innerHTML = CHUNK;
    document.body.appendChild(probe);
    const chunkW = probe.getBoundingClientRect().width || 200;
    probe.remove();

    let reps = Math.max(4, Math.ceil((innerWidth * 2) / chunkW) + 2);
    halves.forEach(el => { el.innerHTML = CHUNK.repeat(reps); });

    const first = halves[0];
    let guard = 0;
    while (first && first.getBoundingClientRect().width < innerWidth * 1.05 && guard < 20) {
      reps += 3;
      guard++;
      halves.forEach(el => { el.innerHTML = CHUNK.repeat(reps); });
    }
  }

  fill();
  setTimeout(fill, 1200);
  setTimeout(fill, 3000);
  if (document.fonts?.ready) document.fonts.ready.then(fill);

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fill, 250); }, { passive: true });
}
