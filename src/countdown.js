import { WEDDING_DATE_MS } from './constants.js';

export function computeCountdown(nowMs, targetMs = WEDDING_DATE_MS) {
  let diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000);
  diff -= minutes * 60000;
  const seconds = Math.floor(diff / 1000);
  return { days, hours, minutes, seconds };
}

export function initCountdown(document) {
  const els = {
    d: document.getElementById('d'),
    h: document.getElementById('h'),
    m: document.getElementById('m'),
    s: document.getElementById('s'),
  };

  function setNum(el, value) {
    const str = String(value);
    if (el.textContent !== str) {
      el.textContent = str;
      el.classList.remove('flip');
      void el.offsetWidth;
      el.classList.add('flip');
    }
  }

  function tick() {
    const { days, hours, minutes, seconds } = computeCountdown(Date.now());
    setNum(els.d, days);
    setNum(els.h, hours);
    setNum(els.m, minutes);
    setNum(els.s, seconds);
  }

  tick();
  return setInterval(tick, 1000);
}
