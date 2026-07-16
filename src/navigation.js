export function initScrollArrows(document) {
  document.querySelectorAll('.scrolldn[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.next);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const y = window.scrollY + rect.top - window.innerHeight * 0.18;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  });
}
