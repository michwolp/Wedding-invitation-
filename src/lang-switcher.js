import { LABELS, HE_SINGULAR, getGreeting } from './i18n.js';

let currentLang = 'he';
const hebrewOriginals = new Map();
const listeners = [];

export function getLang() { return currentLang; }

export function onLangChange(fn) { listeners.push(fn); }

export function applyHebrewGender(guestForm) {
  if (currentLang !== 'he' || !guestForm || guestForm === 'plural') return;
  const overrides = HE_SINGULAR[guestForm];
  if (!overrides) return;
  Object.keys(overrides).forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.innerHTML = overrides[sel];
  });
}

export function applyLang(next, guestForm) {
  const sections = [...document.querySelectorAll('section, header.hero, footer')];
  let anchorEl = null, anchorOffset = 0;
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= window.innerHeight * 0.5 && r.bottom > 0) {
      anchorEl = s;
      anchorOffset = (window.innerHeight * 0.4 - r.top) / (r.height || 1);
    }
  }

  currentLang = next;
  const dict = LABELS[next];
  const selectors = Object.keys(LABELS.en).filter(k => !k.startsWith('_'));

  selectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (!hebrewOriginals.has(sel)) hebrewOriginals.set(sel, el.innerHTML);
    el.innerHTML = dict ? dict[sel] : hebrewOriginals.get(sel);
  });

  const h1 = document.querySelector('.names');
  if (h1) {
    if (!hebrewOriginals.has('name1')) {
      hebrewOriginals.set('name1', h1.firstChild.textContent);
      hebrewOriginals.set('name2', h1.lastChild.textContent);
    }
    h1.firstChild.textContent = dict ? dict._name1 : hebrewOriginals.get('name1');
    h1.lastChild.textContent = dict ? dict._name2 : hebrewOriginals.get('name2');
  }

  document.documentElement.lang = next;
  document.documentElement.dir = dict ? dict._dir : 'rtl';
  document.title = dict ? dict._title : 'מיכל ♥ דביר — 16.10.26';

  document.querySelectorAll('.lang-seg button').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === next);
  });

  applyHebrewGender(guestForm);
  listeners.forEach(fn => fn(next));

  if (anchorEl) {
    const reAnchor = () => {
      const r = anchorEl.getBoundingClientRect();
      const targetY = window.scrollY + r.top + anchorOffset * r.height - window.innerHeight * 0.4;
      window.scrollTo(0, Math.max(0, targetY));
    };
    requestAnimationFrame(reAnchor);
    // fonts arriving late (or the Russian font-size bump) can reflow the page
    // after the first anchor — re-anchor once everything has settled
    if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(reAnchor));
  }
}

export function initLangSwitcher(document, guest) {
  document.querySelectorAll('.lang-seg button').forEach(b => {
    b.addEventListener('click', () => applyLang(b.dataset.lang, guest.form));
  });

  applyHebrewGender(guest.form);

  if (['en', 'ru'].includes(guest.lang)) {
    applyLang(guest.lang, guest.form);
  }

  if (guest.name) {
    const g = document.createElement('p');
    g.className = 'greeting';
    g.dataset.name = guest.name.trim();
    const render = () => { g.textContent = getGreeting(currentLang, g.dataset.name); };
    render();
    const opening = document.querySelector('.hero .opening');
    if (opening) opening.parentNode.insertBefore(g, opening);
    onLangChange(render);
  }
}
