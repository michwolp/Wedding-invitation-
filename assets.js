// ============================================================================
//  ASSETS — single source of truth for every image on the site.
//  Change an image or its size here and it updates everywhere. Nothing else
//  needs editing.
//
//  • All files live in the /assets folder.
//  • To swap an image: drop the new file in /assets and change the path below.
//  • To resize the scattered side motifs: edit SIDE_MOTIFS.size.
// ============================================================================

window.ASSETS = {
  // folder every image is served from
  base: '/assets/',

  // opening splash — the M&D couple illustration (transparent PNG)
  splash: 'splash-couple.png',

  // the two flower clusters tucked into the hero's top corners
  heroCorners: {
    left:  'cg-bouquet.png',
    right: 'cg-tulip.png',
  },

  // motifs scattered down BOTH side edges of the page. All are used, evenly
  // balanced. Add/remove filenames here to change what appears on the sides.
  sideMotifs: {
    // every image cycles equally through the sides
    images: [
      'cg-bouquet.png', 'cg-tulip.png', 'cg-sprig.png', 'cg-vine.png',
      'cg-wreath.png', 'cg-border.png', 'cg-monogram.png', 'cg-disco.png',
      'cg-cake.png', 'cg-candle.png', 'cg-coupes.png', 'cg-champagne.png',
      'cg-fairy.png', 'cg-couple.png', 'cg-star.png',
      'cg-spiral1.png', 'cg-spiral2.png', 'cg-spiral3.png',
      'cg-mushroom1.png', 'cg-mushroom2.png',
      'cg-sprig1.png', 'cg-sprig2.png', 'cg-sprig3.png',
    ],
    // images that should render smaller than the rest (e.g. tiny sparkles)
    small: ['cg-star.png'],

    // ---- styling knobs (tweak these to restyle the side decorations) ----
    widthDesktop: 104,   // px width of a normal motif on wide screens
    widthPhone:   72,    // px width on narrow screens
    smallWidthDesktop: 36,
    smallWidthPhone:   28,
    edgeOffsetDesktop: 14,  // px from the screen edge
    edgeOffsetPhone:   8,
    rowGapDesktop: 250,  // vertical spacing between motif rows
    rowGapPhone:   200,
    startY: 330,         // px down the page where motifs begin (below the hero)
    minOpacity: 0.82,    // motifs fade between this and 1
    swayMin: 5, swayMax: 9,   // seconds for the gentle sway animation
  },
};

// convenience: full URL for an asset filename
window.asset = function asset(file){ return window.ASSETS.base + file; };
