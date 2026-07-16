// Fonts used by non-default languages. Browsers only download a font once
// text on the page uses it — so without warming, the FIRST switch to
// Russian/English renders in a fallback font and then jumps when the real
// font arrives.
//
// The sample text matters: Google Fonts splits each family into per-script
// @font-face entries (latin, cyrillic, …) with unicode-range. Loading
// without cyrillic sample text would fetch only the latin subset and
// Russian would still swap late.
export const LANG_FONTS = [
  { font: "1rem 'Cormorant Garamond'", text: 'Michal Dvir' },   // English
  { font: "1rem 'Caveat'", text: 'Привет Михаль Двир' },        // Russian titles (cyrillic subset)
  { font: "1rem 'PT Serif'", text: 'Привет Михаль Двир' },      // Russian body (cyrillic subset)
];

export function warmFonts(fontsApi = globalThis.document?.fonts) {
  if (!fontsApi?.load) return;
  LANG_FONTS.forEach(({ font, text }) => fontsApi.load(font, text).catch(() => {}));
}
