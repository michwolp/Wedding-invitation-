export function initSplash(document) {
  const splash = document.getElementById('splash');
  const couple = document.getElementById('heroCouple');
  if (!splash || !couple) {
    if (splash) splash.classList.add('done');
    return;
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function finish() {
    splash.classList.add('done');
    couple.style.visibility = '';
  }

  function run() {
    if (reduced) { finish(); return; }
    const dest = couple.getBoundingClientRect();
    if (!dest.width) { finish(); return; }

    const fly = couple.cloneNode(true);
    fly.removeAttribute('id');
    fly.className = 'couple-fly';
    const vh = innerHeight;
    const vw = innerWidth;
    const startH = Math.min(vh * 0.42, vw * 0.62 * (dest.height / dest.width));
    const startW = startH * (dest.width / dest.height);
    fly.style.cssText =
      'position:fixed;z-index:210;pointer-events:none;' +
      'height:' + startH + 'px;width:' + startW + 'px;' +
      'left:' + ((vw - startW) / 2) + 'px;top:' + ((vh - startH) / 2) + 'px;' +
      'transition:left .9s cubic-bezier(.5,.05,.3,1),top .9s cubic-bezier(.5,.05,.3,1),width .9s cubic-bezier(.5,.05,.3,1),height .9s cubic-bezier(.5,.05,.3,1);';
    document.body.appendChild(fly);
    couple.style.visibility = 'hidden';

    setTimeout(() => {
      splash.classList.add('fade');
      const d = couple.getBoundingClientRect();
      fly.style.left = d.left + 'px';
      fly.style.top = d.top + 'px';
      fly.style.width = d.width + 'px';
      fly.style.height = d.height + 'px';
    }, 900);

    fly.addEventListener('transitionend', () => { finish(); fly.remove(); }, { once: true });
    setTimeout(() => { if (document.body.contains(fly)) { finish(); fly.remove(); } }, 2600);
  }

  if (document.readyState === 'complete') setTimeout(run, 150);
  else addEventListener('load', () => setTimeout(run, 150));
}
