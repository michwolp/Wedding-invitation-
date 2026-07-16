import { describe, it, expect, vi } from 'vitest';
import { warmFonts, LANG_FONTS } from '../src/fonts.js';

describe('warmFonts', () => {
  it('loads every language font', () => {
    const load = vi.fn().mockResolvedValue([]);
    warmFonts({ load });
    expect(load).toHaveBeenCalledTimes(LANG_FONTS.length);
    LANG_FONTS.forEach(font => expect(load).toHaveBeenCalledWith(font));
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
    const all = LANG_FONTS.join(' ');
    expect(all).toContain('Cormorant Garamond');
    expect(all).toContain('Caveat');
    expect(all).toContain('PT Serif');
  });
});
