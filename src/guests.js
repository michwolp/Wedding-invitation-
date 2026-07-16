const GUESTS = {
  // --- Michal's family ---
  NikolAndJulian: { name: 'Nikol & Julian', fullName: 'Nikol Wolpert', phone: '+19296225141', lang: 'en', form: 'plural' },
  ViktoriaSharay: { name: 'Мамик', fullName: 'Viktoria Sharay', phone: '0504247004', lang: 'ru', form: 'f' },
  LarisaSharay: { name: 'Лялик', fullName: 'Larisa Sharay', phone: '0544575308', lang: 'ru', form: 'f' },
  OlegSharay: { name: 'Олешака', fullName: 'Oleg Sharay', phone: '0503421703', lang: 'ru', form: 'm' },

  // --- Friends ---
  OfirLevin: { name: 'אופיר', fullName: 'אופיר לוין', phone: '0546644905', lang: 'he', form: 'f' },
  DvirSasson: { name: 'דביר', fullName: 'דביר ששון', phone: '0502566643', lang: 'he', form: 'm' },
  DanKedmi: { name: 'דן', fullName: 'דן קדמי', phone: '0509878804', lang: 'he', form: 'm' },
  LiorMandelboim: { name: 'ליאורי', fullName: 'ליאור מנדלבוים', phone: '0546213030', lang: 'he', form: 'f' },
  RotemAgmon: { name: 'רתמי', fullName: 'רתם אגמון', phone: '0544317502', lang: 'he', form: 'f' },
  RonDeitch: { name: 'רון הבובון', fullName: 'רון דיטש', phone: '0547911403', lang: 'he', form: 'm' },
  RonWolpert: { name: 'רון המתוק', fullName: 'רון וולפרט', phone: '0526998033', lang: 'he', form: 'm' },
  AlinaDronov: { name: 'אלינקי', fullName: 'אלינה דרונוב', phone: '0545488475', lang: 'he', form: 'f' },
  YuvalGoldstein: { name: 'יוב', fullName: 'יובל גולדשטיין', phone: '0547090583', lang: 'he', form: 'f' },
  RomiHeller: { name: 'רומ', fullName: 'רומי הלר', phone: '0547981025', lang: 'he', form: 'f' },
  YotamSuliman: { name: 'יות וגיל האהובים', fullName: 'יותם סולימן', phone: '0504600888', lang: 'he', form: 'plural' },
  RonnyAndGuy: { name: 'רוני וגיא האהובים', fullName: 'רוני וגיא', phone: '0546826789', lang: 'he', form: 'plural' },
  MichaelYafe: { name: 'מיכאל', fullName: 'מיכאל יפה', phone: '0526462911', lang: 'he', form: 'm' },

  // --- Michal's work friends ---
  MorFilo: { name: 'מורוש', fullName: 'מור פילו', phone: '0506863116', lang: 'he', form: 'f' },
  OrrBinyamini: { name: 'אור', fullName: 'אור בנימיני', phone: '0509349101', lang: 'he', form: 'm' },
  MorBenAmi: { name: 'מורוש', fullName: 'מור בן עמי', phone: '0549439445', lang: 'he', form: 'f' },
  ThaiHayut: { name: 'תאי', fullName: 'תאי חיות', phone: '0542604840', lang: 'he', form: 'f' },
};

const VALID_LANGS = ['he', 'en', 'ru'];

export function resolveGuest(search) {
  const params = new URLSearchParams(search != null ? search : '');

  const code = params.get('g');
  if (code && GUESTS[code]) {
    const g = GUESTS[code];
    return { code, ...g, fullName: g.fullName || g.name };
  }

  const legacyLang = params.get('lang');
  const to = params.get('to') || undefined;
  return {
    code: params.get('id') || null,
    name: to,
    fullName: to,
    phone: undefined,
    lang: VALID_LANGS.includes(legacyLang) ? legacyLang : undefined,
    form: undefined,
  };
}

export { GUESTS };
