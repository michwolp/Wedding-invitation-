const INTERACTIVE_SELECTOR = 'a,button,select,input,textarea,label,.floater.clickable,.heart,.butterfly';

export function initCustomCursor(document) {
  if (matchMedia('(pointer:coarse)').matches) return;

  const cursor = document.getElementById('cur');
  if (!cursor) return;

  addEventListener('pointermove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursor.classList.toggle('hot', !!e.target.closest(INTERACTIVE_SELECTOR));
  }, { passive: true });
}
