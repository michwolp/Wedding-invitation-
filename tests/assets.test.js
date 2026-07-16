import { describe, it, expect } from 'vitest';
import { ASSETS, asset } from '../src/assets.js';

describe('ASSETS config', () => {
  it('has a base path ending in /', () => {
    expect(ASSETS.base).toBe('/assets/');
  });

  it('has a couple image path', () => {
    expect(ASSETS.couple).toBe('couple-lineart.png');
  });

  it('has hero corner images in the red/ directory', () => {
    expect(ASSETS.heroCorners.left).toContain('red/');
    expect(ASSETS.heroCorners.right).toContain('red/');
    expect(ASSETS.heroCorners.left).toMatch(/\.png$/);
    expect(ASSETS.heroCorners.right).toMatch(/\.png$/);
  });

  it('sideMotifs has images array with PNG files', () => {
    expect(ASSETS.sideMotifs.images.length).toBeGreaterThan(0);
    ASSETS.sideMotifs.images.forEach(img => {
      expect(img).toMatch(/\.png$/);
    });
  });

  it('sideMotifs has consistent sizing config', () => {
    const sm = ASSETS.sideMotifs;
    expect(sm.boxDesktop).toBeGreaterThan(sm.boxPhone);
    expect(sm.smallBoxDesktop).toBeGreaterThan(sm.smallBoxPhone);
    expect(sm.rowGapDesktop).toBeGreaterThan(sm.rowGapPhone);
  });
});

describe('asset()', () => {
  it('prepends the base path', () => {
    expect(asset('couple-lineart.png')).toBe('/assets/couple-lineart.png');
  });

  it('works with subdirectory paths', () => {
    expect(asset('red/red-disco.png')).toBe('/assets/red/red-disco.png');
  });
});
