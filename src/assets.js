const ACTIVE_STYLE = 'red';

const STYLES = {
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
  red: {
    dir: 'red/',
    prefix: '',
    heroCorners: { left: 'red-bouquet', right: 'red-rose' },
    images: [
      'red-disco', 'red-mushroom', 'red-swirl', 'red-monogram', 'red-rose', 'red-bouquet',
      'red-coupe', 'red-cheers', 'red-bow', 'red-heart', 'red-fairy', 'red-candle', 'red-ribbon',
      'red-dove', 'red-cake', 'red-wine-bottle', 'red-grapes', 'red-sprig', 'red-envelope',
      'red-cherries', 'red-wreath',
      'red2-00', 'red2-01', 'red2-02', 'red2-03', 'red2-05', 'red2-06', 'red2-07',
      'red2-08', 'red2-09', 'red2-10', 'red2-12', 'red2-14', 'red2-15',
      'red2-16', 'red2-17', 'red2-18', 'red2-19', 'red2-20', 'red2-21', 'red2-22', 'red2-23', 'red2-24',
    ],
    small: ['red-sparkle'],
  },
};

const S = STYLES[ACTIVE_STYLE];
const stylePath = f => S.dir + S.prefix + f + '.png';

export const ASSETS = {
  base: '/assets/',
  couple: 'couple-lineart.png',
  heroCorners: {
    left: stylePath(S.heroCorners.left),
    right: stylePath(S.heroCorners.right),
  },
  sideMotifs: {
    images: S.images.map(stylePath),
    small: S.small.map(stylePath),
    boxDesktop: 96,
    boxPhone: 66,
    smallBoxDesktop: 40,
    smallBoxPhone: 30,
    edgeOffsetDesktop: 14,
    edgeOffsetPhone: 8,
    rowGapDesktop: 250,
    rowGapPhone: 200,
    startY: 40,
    minOpacity: 0.82,
    swayMin: 5,
    swayMax: 9,
  },
};

export function asset(file) {
  return ASSETS.base + file;
}
