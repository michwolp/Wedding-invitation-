const PETALS = ['#C99AA8', '#CDB56A', '#A9B98C', '#A8586B', '#E3C9D0'];
const CENTERS = ['#CDB56A', '#A8586B', '#7E9268'];

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function flowerSVG(size, pc, pc2, cc, white) {
  let outer = '', inner = '';
  for (let i = 0; i < 5; i++) {
    outer += `<ellipse cx="0" cy="-5.4" rx="2.7" ry="4" fill="${white ? '#FFFFFF' : pc}" stroke="${white ? '#4F4A38' : 'none'}" stroke-width="${white ? 0.5 : 0}" transform="rotate(${i * 72})"/>`;
    inner += `<ellipse cx="0" cy="-3" rx="1.5" ry="2.3" fill="${white ? '#FFFFFF' : pc2}" opacity=".9" transform="rotate(${i * 72 + 36})"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="-9 -9 18 18"><g>${outer}${inner}<circle r="1.5" fill="${cc}"/></g></svg>`;
}

function burstPetals(x, y) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'burst';
    const s = rand(8, 14);
    p.innerHTML = `<svg width="${s}" height="${s * 1.5}" viewBox="0 0 8 12"><ellipse cx="4" cy="6" rx="3.4" ry="5.4" fill="${pick(PETALS)}"/></svg>`;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);
    const ang = rand(0, Math.PI * 2);
    const dist = rand(40, 110);
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist - 30}px) rotate(${rand(-200, 200)}deg)`, opacity: 0 },
    ], { duration: rand(600, 1000), easing: 'cubic-bezier(.2,.6,.3,1)' }).onfinish = () => p.remove();
  }
}

export function initScenery() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frag = document.createDocumentFragment();
  const parallaxed = [];

  // blobs
  [
    { c: '201,154,168', x: '-8%', y: '5%', s: 340, dx: 60, dy: 40, dur: 38 },
    { c: '205,181,106', x: '75%', y: '-6%', s: 300, dx: -50, dy: 60, dur: 46 },
    { c: '169,185,140', x: '70%', y: '70%', s: 380, dx: -70, dy: -40, dur: 52 },
    { c: '201,154,168', x: '-10%', y: '75%', s: 280, dx: 80, dy: -50, dur: 44 },
    { c: '168,88,107', x: '35%', y: '35%', s: 240, dx: 40, dy: 70, dur: 60 },
  ].forEach(b => {
    const d = document.createElement('div');
    d.className = 'blob';
    d.style.cssText = `left:${b.x};top:${b.y};width:${b.s}px;height:${b.s}px;` +
      `background:radial-gradient(circle, rgba(${b.c},.20), transparent 70%);` +
      `--dx:${b.dx}px;--dy:${b.dy}px;--dur:${b.dur}s`;
    frag.appendChild(d);
  });

  function makeFloater(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'fwrap' + (opts.front ? ' front' : '');
    const d = document.createElement('div');
    d.className = 'floater' + (opts.clickable ? ' clickable' : '');
    d.innerHTML = opts.html;
    d.style.opacity = opts.opacity;
    d.style.setProperty('--fx', rand(-40, 40) + 'px');
    d.style.setProperty('--fy', rand(-120, -30) + 'px');
    d.style.setProperty('--fdur', rand(18, 40) + 's');
    d.style.setProperty('--fdelay', -rand(0, 30) + 's');
    d.style.setProperty('--sdur', rand(40, 90) + 's');
    if (reduced) d.style.animation = 'none';
    wrap.style.left = opts.x + '%';
    wrap.style.top = opts.y + '%';
    wrap.dataset.speed = opts.speed;
    wrap.appendChild(d);
    parallaxed.push(wrap);
    frag.appendChild(wrap);
    return d;
  }

  // background dots/flowers
  const nBack = innerWidth < 700 ? 3 : 6;
  for (let i = 0; i < nBack; i++) {
    const isDot = Math.random() < .5;
    const size = isDot ? rand(4, 7) : rand(12, 22);
    const pc = pick(PETALS);
    makeFloater({
      html: isDot
        ? `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${pc}"/></svg>`
        : flowerSVG(size, pc, pick(PETALS), pick(CENTERS), false),
      opacity: isDot ? .45 : .55,
      x: rand(6, 90), y: rand(0, 96), speed: rand(.02, .08), front: false, clickable: false,
    });
  }

  // edge flowers
  const nEdge = innerWidth < 700 ? 2 : 4;
  for (let i = 0; i < nEdge; i++) {
    const size = rand(24, 38);
    const rose = i < 3;
    const pc = pick(PETALS);
    const el = makeFloater({
      html: flowerSVG(size, pc, pick(PETALS), pick(CENTERS), rose),
      opacity: .9,
      x: Math.random() < .5 ? rand(4, 10) : rand(80, 88),
      y: rand(6, 90), speed: rand(.06, .14), front: true, clickable: true,
    });
    if (rose) el.classList.add('rose');
    el.addEventListener('click', ev => {
      if (el.classList.contains('rose') && !el.classList.contains('painted')) {
        el.classList.add('painted');
        burstPetals(ev.clientX, ev.clientY);
        if (!reduced) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease' });
      } else {
        burstPetals(ev.clientX, ev.clientY);
        el.style.transition = 'opacity .4s';
        el.style.opacity = 0;
        setTimeout(() => {
          const w = el.parentElement;
          w.style.left = (Math.random() < .5 ? rand(0, 9) : rand(88, 96)) + '%';
          w.style.top = rand(6, 90) + '%';
          el.style.opacity = .95;
        }, 500);
      }
    });
  }

  // fireflies
  const nFly = innerWidth < 700 ? 9 : 15;
  for (let i = 0; i < nFly; i++) {
    const f = document.createElement('div');
    f.className = 'fly';
    f.style.left = rand(2, 96) + '%';
    f.style.top = rand(4, 96) + '%';
    f.style.setProperty('--w1x', rand(-60, 60) + 'px');
    f.style.setProperty('--w1y', rand(-90, 20) + 'px');
    f.style.setProperty('--w2x', rand(-80, 80) + 'px');
    f.style.setProperty('--w2y', rand(-160, -40) + 'px');
    f.style.setProperty('--w3x', rand(-40, 40) + 'px');
    f.style.setProperty('--w3y', rand(-60, 10) + 'px');
    f.style.setProperty('--wdur', rand(16, 30) + 's');
    f.style.setProperty('--wdelay', -rand(0, 20) + 's');
    f.style.setProperty('--fldur', rand(2.6, 5) + 's');
    if (reduced) f.style.animation = 'none';
    frag.appendChild(f);
  }

  document.body.prepend(frag);

  // reveal animations
  document.querySelectorAll('section, footer').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // parallax
  if (!reduced) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = scrollY;
        parallaxed.forEach(w => { w.style.transform = `translateY(${-sy * w.dataset.speed}px)`; });
        ticking = false;
      });
    }, { passive: true });
  }
}
