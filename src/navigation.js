// Where to scroll so a section is CENTERED in the viewport.
// Sections taller than the viewport can't be centered meaningfully —
// they start near the top (24px) so the title and top content show first.
export function computeScrollTop({ scrollY, rectTop, rectHeight, viewportHeight }) {
  const offset = rectHeight < viewportHeight
    ? (viewportHeight - rectHeight) / 2
    : 24;
  return Math.max(0, scrollY + rectTop - offset);
}

export function initScrollArrows(document) {
  document.querySelectorAll('.scrolldn[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.next);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const top = computeScrollTop({
        scrollY: window.scrollY,
        rectTop: rect.top,
        rectHeight: rect.height,
        viewportHeight: window.innerHeight,
      });
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}
