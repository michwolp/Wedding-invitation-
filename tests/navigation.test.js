import { describe, it, expect, vi } from 'vitest';
import { computeScrollTop, initScrollArrows } from '../src/navigation.js';

describe('computeScrollTop', () => {
  const vh = 800;

  it('centers a short section in the viewport', () => {
    // 300px section in an 800px viewport → 250px of space above and below
    const top = computeScrollTop({ scrollY: 500, rectTop: 1000, rectHeight: 300, viewportHeight: vh });
    expect(top).toBe(500 + 1000 - 250);
  });

  it('centers a medium section in the viewport', () => {
    // 600px section → (800-600)/2 = 100px above
    const top = computeScrollTop({ scrollY: 0, rectTop: 2000, rectHeight: 600, viewportHeight: vh });
    expect(top).toBe(2000 - 100);
  });

  it('starts a section taller than the viewport near the top', () => {
    const top = computeScrollTop({ scrollY: 500, rectTop: 1000, rectHeight: 900, viewportHeight: vh });
    expect(top).toBe(500 + 1000 - 24);
  });

  it('starts a section exactly the viewport height near the top', () => {
    const top = computeScrollTop({ scrollY: 0, rectTop: 1500, rectHeight: 800, viewportHeight: vh });
    expect(top).toBe(1500 - 24);
  });

  it('never returns a negative scroll position', () => {
    const top = computeScrollTop({ scrollY: 0, rectTop: 50, rectHeight: 300, viewportHeight: vh });
    expect(top).toBe(0);
  });
});

describe('initScrollArrows — back to top', () => {
  it('scrolls to the very top when a [data-top] arrow is clicked', () => {
    document.body.innerHTML = '<button class="scrolldn scrollup" data-top></button>';
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    initScrollArrows(document);
    document.querySelector('[data-top]').click();

    expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    spy.mockRestore();
  });
});
