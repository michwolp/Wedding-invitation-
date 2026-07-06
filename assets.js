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
    left:  'nm-bouquet.png',
    right: 'nm-lavender.png',
  },

  // motifs scattered down BOTH side edges of the page. All are used, evenly
  // balanced. Add/remove filenames here to change what appears on the sides.
  sideMotifs: {
    // every image cycles equally through the sides
    images: [
      'nm-bunting-flowers.png', 'nm-couple.png', 'nm-champagne.png', 'nm-candle1.png',
      'nm-candle2.png', 'nm-lavender.png', 'nm-bouquet.png', 'nm-rose.png',
      'nm-bow.png', 'nm-doves.png', 'nm-mushroom.png', 'nm-coupe.png',
      'nm-cheers.png', 'nm-heart-plain.png', 'nm-wine-bottle.png', 'nm-wine-glass.png',
      'nm-grapes.png', 'nm-lights.png', 'nm-flower-single.png', 'nm-leaf-divider.png',
      'nm-disco.png', 'nm-cheese-board.png',
    ],
    // images that should render smaller than the rest (e.g. tiny single flower)
    small: ['nm-flower-single.png'],

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
