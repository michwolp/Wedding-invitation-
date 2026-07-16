const PETALS = ['#C99AA8', '#CDB56A', '#A9B98C', '#A8586B', '#E3C9D0'];
const CENTERS = ['#CDB56A', '#A8586B', '#7E9268'];

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function createBurst(x, y, content, color, fontSize) {
  const p = document.createElement('div');
  p.className = 'burst';
  if (typeof content === 'string' && content.startsWith('<')) {
    p.innerHTML = content;
  } else {
    p.textContent = content;
    p.style.color = color;
  }
  if (fontSize) p.style.fontSize = fontSize + 'px';
  p.style.left = x + 'px';
  p.style.top = y + 'px';
  document.body.appendChild(p);
  return p;
}

function initPetalTrail() {
  let lastX = -99, lastY = -99, lastT = 0, live = 0;

  addEventListener('pointermove', e => {
    const now = performance.now();
    if (now - lastT < 70 || Math.hypot(e.clientX - lastX, e.clientY - lastY) < 46 || live > 22) return;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
    live++;
    const s = rand(7, 12);
    const p = createBurst(
      e.clientX, e.clientY,
      `<svg width="${s}" height="${s * 1.5}" viewBox="0 0 8 12"><ellipse cx="4" cy="6" rx="3.2" ry="5.2" fill="${pick(PETALS)}" opacity=".9"/></svg>`,
    );
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: .95 },
      { transform: `translate(${rand(-30, 30)}px,${rand(20, 70)}px) rotate(${rand(-160, 160)}deg)`, opacity: 0 },
    ], { duration: rand(800, 1400), easing: 'ease-out' }).onfinish = () => { p.remove(); live--; };
  }, { passive: true });
}

function initHeartTaps() {
  let liveHearts = 0;
  const NON_INTERACTIVE = 'a,button,input,select,textarea,label,.unit,.floater,.lang-seg,.heart,.butterfly,.stepctl,.btnrow,.choices';

  addEventListener('click', e => {
    if (liveHearts > 24) return;
    if (e.target.closest(NON_INTERACTIVE)) return;
    if (!e.target.closest('body')) return;

    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      liveHearts++;
      const p = createBurst(
        e.clientX + (i ? rand(-26, 26) : 0),
        e.clientY + (i ? rand(-18, 18) : 0),
        '♥︎',
        pick(['#C99AA8', '#A8586B', '#A9B98C', '#CDB56A']),
        rand(16, 30),
      );
      p.animate([
        { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 0 },
        { transform: 'translate(0,-14px) scale(1.15) rotate(-6deg)', opacity: 1, offset: .12 },
        { transform: `translate(${rand(-14, 14)}px,-46px) scale(1) rotate(${rand(-10, 10)}deg)`, opacity: .95, offset: .55 },
        { transform: `translate(${rand(-24, 24)}px,-90px) scale(.9) rotate(${rand(-16, 16)}deg)`, opacity: 0 },
      ], { duration: rand(3800, 5600), easing: 'ease-out' }).onfinish = () => { p.remove(); liveHearts--; };
    }
  });
}

function initButterflies() {
  function butterflySVG(c1, c2) {
    return `<svg width="26" height="22" viewBox="0 0 20 20">
      <g class="wing l"><path d="M9,10 C2,2 -1,6 2,11 C-1,13 3,17 9,11 Z" fill="${c1}"/></g>
      <g class="wing r"><path d="M11,10 C18,2 21,6 18,11 C21,13 17,17 11,11 Z" fill="${c2}"/></g>
      <ellipse cx="10" cy="10.5" rx="1.3" ry="4.2" fill="#4F4A38"/>
    </svg>`;
  }

  function flight(b, fromLeft) {
    const W = innerWidth, H = innerHeight;
    const x0 = fromLeft ? -40 : W + 40;
    const x1 = fromLeft ? W + 40 : -40;
    const y0 = rand(H * .1, H * .7);
    const kf = [];
    for (let i = 0; i <= 6; i++) {
      kf.push({ transform: `translate(${x0 + (x1 - x0) * i / 6}px, ${y0 + Math.sin(i * 1.9) * rand(30, 90)}px) rotate(${rand(-14, 14)}deg)` });
    }
    return b.animate(kf, { duration: rand(14000, 20000), easing: 'linear' });
  }

  function spawn() {
    if (document.querySelectorAll('.butterfly').length >= 2) return;
    const b = document.createElement('div');
    b.className = 'butterfly';
    b.innerHTML = butterflySVG(pick(PETALS), pick(PETALS));
    document.body.appendChild(b);
    const anim = flight(b, Math.random() < .5);
    anim.onfinish = () => b.remove();
    b.addEventListener('click', () => {
      anim.cancel();
      const r = b.getBoundingClientRect();
      b.animate([
        { transform: `translate(${r.left}px,${r.top}px) scale(1)`, opacity: 1 },
        { transform: `translate(${r.left + rand(-200, 200)}px,${-80}px) scale(.6)`, opacity: 0 },
      ], { duration: 900, easing: 'ease-in' }).onfinish = () => b.remove();
    }, { once: true });
  }

  setTimeout(spawn, 4000);
  setInterval(spawn, 16000);
}

function initHeartClick(reduced) {
  const heart = document.querySelector('.heart');
  if (!heart) return;
  heart.style.pointerEvents = 'auto';
  heart.addEventListener('click', ev => {
    for (let i = 0; i < 8; i++) {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(30, 80);
      const p = createBurst(ev.clientX, ev.clientY, '♥︎', '#A8586B');
      p.animate([
        { transform: 'translate(0,0) scale(.6)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(1.4)`, opacity: 0 },
      ], { duration: rand(700, 1100), easing: 'ease-out' }).onfinish = () => p.remove();
    }
    if (!reduced) heart.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease' });
  });
}

export function initEffects() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  initPetalTrail();
  initHeartTaps();
  initButterflies();
  initHeartClick(reduced);
}
