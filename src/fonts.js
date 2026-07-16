// Fonts used by non-default languages. Browsers only download a font once
// text on the page uses it — so without warming, the FIRST switch to
// Russian/English renders in a fallback font and then jumps when the real
// font arrives. Loading them up-front makes language switching seamless.
export const LANG_FONTS = [
  "1rem 'Cormorant Garamond'", // English display + body
  "1rem 'Caveat'",             // Russian titles
  "1rem 'PT Serif'",           // Russian body
];

export function warmFonts(fontsApi = globalThis.document?.fonts) {
  if (!fontsApi?.load) return;
  LANG_FONTS.forEach(font => fontsApi.load(font).catch(() => {}));
}
