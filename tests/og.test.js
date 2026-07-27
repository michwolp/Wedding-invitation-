import { describe, it, expect } from 'vitest';
import { OG_META, isPreviewBot, buildOgHtml } from '../src/og.js';

describe('isPreviewBot', () => {
  it('detects WhatsApp crawler', () => {
    expect(isPreviewBot('WhatsApp/2.23.20.0')).toBe(true);
  });

  it('detects Facebook crawler', () => {
    expect(isPreviewBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
  });

  it('detects Telegram crawler', () => {
    expect(isPreviewBot('TelegramBot (like TwitterBot)')).toBe(true);
  });

  it('does not flag a regular browser', () => {
    expect(isPreviewBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1')).toBe(false);
  });

  it('handles missing user-agent', () => {
    expect(isPreviewBot(undefined)).toBe(false);
    expect(isPreviewBot('')).toBe(false);
  });
});

describe('buildOgHtml', () => {
  const url = 'https://example.com/?g=Test';
  const img = 'https://example.com/assets/og-preview.jpg';

  it('serves Hebrew meta for he', () => {
    const html = buildOgHtml('he', url, img);
    expect(html).toContain('מיכל ♥ דביר');
    expect(html).toContain('כל מה שצריך לדעת נמצא כאן');
    expect(html).toContain('lang="he"');
  });

  it('serves English meta for en', () => {
    const html = buildOgHtml('en', url, img);
    expect(html).toContain('Michal ♥ Dvir');
    expect(html).toContain('Everything you need to know is here');
  });

  it('serves Russian meta for ru', () => {
    const html = buildOgHtml('ru', url, img);
    expect(html).toContain('Михаль ♥ Двир');
    expect(html).toContain('Всё, что нужно знать');
  });

  it('falls back to Hebrew for unknown language', () => {
    const html = buildOgHtml('jp', url, img);
    expect(html).toContain('מיכל ♥ דביר');
  });

  it('includes the image and url tags', () => {
    const html = buildOgHtml('en', url, img);
    expect(html).toContain(`og:image" content="${img}"`);
    expect(html).toContain('og:image:width" content="1200"');
    expect(html).toContain('twitter:card" content="summary_large_image"');
  });

  it('has meta for all three languages', () => {
    expect(Object.keys(OG_META).sort()).toEqual(['en', 'he', 'ru']);
  });
});
