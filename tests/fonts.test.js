import { describe, it, expect, vi } from 'vitest';
import { warmFonts, LANG_FONTS } from '../src/fonts.js';

describe('warmFonts', () => {
  it('loads every language font with its sample text', () => {
    const load = vi.fn().mockResolvedValue([]);
    warmFonts({ load });
    expect(load).toHaveBeenCalledTimes(LANG_FONTS.length);
    LANG_FONTS.forEach(({ font, text }) => expect(load).toHaveBeenCalledWith(font, text));
  });

  it('passes cyrillic text for Russian fonts', () => {
    const load = vi.fn().mockResolvedValue([]);
    warmFonts({ load });
    const calls = load.mock.calls;
    const caveatCall = calls.find(c => c[0].includes('Caveat'));
    const ptSerifCall = calls.find(c => c[0].includes('PT Serif'));
    expect(caveatCall[1]).toMatch(/[Ѐ-ӿ]/);
    expect(ptSerifCall[1]).toMatch(/[Ѐ-ӿ]/);
  });

  it('does nothing when the Font Loading API is unavailable', () => {
    expect(() => warmFonts(undefined)).not.toThrow();
    expect(() => warmFonts({})).not.toThrow();
  });

  it('swallows individual font load failures', () => {
    const load = vi.fn().mockRejectedValue(new Error('network'));
    expect(() => warmFonts({ load })).not.toThrow();
  });

  it('covers English and Russian font families', () => {
    const all = LANG_FONTS.map(f => f.font).join(' ');
    expect(all).toContain('Cormorant Garamond');
    expect(all).toContain('Caveat');
    expect(all).toContain('PT Serif');
  });
});
