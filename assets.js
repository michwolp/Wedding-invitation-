// ============================================================================
//  ASSETS — single source of truth for every image on the site.
//  Change an image, its size, or the whole STYLE here — nothing else to edit.
//
//  • Files live in /assets. Motif sets live in style sub-folders:
//        /assets/watercolor/…   (colored watercolor clipart)
//        /assets/red/…          (red line-art clipart)
//  • To switch the whole look, change ACTIVE_STYLE below.
//  • To resize the scattered side motifs, edit sideMotifs box sizes.
// ============================================================================

// which motif set to use: 'watercolor' or 'red'
const ACTIVE_STYLE = 'red';

const STYLES = {
  // ---- colored watercolor set ----
  watercolor: {
    dir: 'watercolor/',
    prefix: 'nm-',
    heroCorners: { left: 'bouquet', right: 'lavender' },
    images: [
      'bunting-flowers', 'couple', 'champagne', 'candle1', 'candle2', 'lavender',
      'bouquet', 'rose', 'bow', 'doves', 'mushroom', 'coupe', 'cheers',
      'heart-plain', 'wine-bottle', 'wine-glass', 'grapes', 'lights',
      'flower-single', 'leaf-divider', 'disco',
    ],
    small: ['flower-single'],
  },
  // ---- red line-art set ----
  red: {
    dir: 'red/',
    prefix: 'red-',
    heroCorners: { left: 'bouquet', right: 'rose' },
    images: [
      'disco', 'mushroom', 'swirl', 'monogram', 'rose', 'bouquet',
      'coupe', 'cheers', 'bow', 'heart', 'fairy', 'candle', 'ribbon',
      'dove', 'cake', 'wine-bottle', 'grapes', 'sprig', 'envelope',
      'place-setting', 'flower', 'cherries', 'wreath',
    ],
    small: ['sparkle'],
  },
};

const S = STYLES[ACTIVE_STYLE];
const stylePath = f => ACTIVE_STYLE ? (S.dir + S.prefix + f + '.png') : f;

window.ASSETS = {
  base: '/assets/',

  // opening: the couple illustration that flies up and lands above the names
  couple: 'couple-lineart.png',

  // the two clusters tucked into the hero's top corners
  heroCorners: {
    left:  stylePath(S.heroCorners.left),
    right: stylePath(S.heroCorners.right),
  },

  // motifs scattered down BOTH side edges, evenly balanced
  sideMotifs: {
    images: S.images.map(stylePath),
    small:  S.small.map(stylePath),

    // ---- sizing knobs (motifs fit INSIDE a box, keeping aspect ratio) ----
    boxDesktop: 96,      // max width/height of a normal motif on wide screens
    boxPhone:   66,
    smallBoxDesktop: 40,
    smallBoxPhone:   30,
    edgeOffsetDesktop: 14,   // px from the screen edge
    edgeOffsetPhone:   8,
    rowGapDesktop: 250,      // vertical spacing between motif rows
    rowGapPhone:   200,
    startY: 90,              // px down the page where motifs begin (flank the hero)
    minOpacity: 0.82,
    swayMin: 5, swayMax: 9,  // seconds for the gentle sway
  },
};

// full URL for an asset filename
window.asset = function asset(file){ return window.ASSETS.base + file; };
