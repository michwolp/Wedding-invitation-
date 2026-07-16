import { ASSETS, asset } from './assets.js';
import { resolveGuest } from './guests.js';
import { BIT_LINKS } from './constants.js';
import { initCountdown } from './countdown.js';
import { initCalendarLinks } from './calendar.js';
import { initRsvpForm } from './rsvp.js';
import { initLangSwitcher, getLang, onLangChange } from './lang-switcher.js';
import { initScrollArrows } from './navigation.js';
import { initMarquee } from './marquee.js';
import { initCustomCursor } from './cursor.js';
import { initSplash } from './splash.js';
import { initSideMotifs } from './side-motifs.js';
import { initEffects } from './effects.js';
import { initScenery } from './scenery.js';
import { warmFonts } from './fonts.js';

// download all language fonts up-front so switching languages never
// causes a late font swap + layout jump
warmFonts();


// resolve guest from URL
const guest = resolveGuest(location.search);

// pre-fill name/phone from guest link
if (guest.name) document.getElementById('name').value = guest.name;
if (guest.phone) document.getElementById('phone').value = guest.phone;
if (guest.name && guest.phone) {
  document.getElementById('nameField').style.display = 'none';
  document.getElementById('phoneField').style.display = 'none';
}

// Bit gift link
const bitEl = document.getElementById('bitLink');
if (bitEl) bitEl.href = BIT_LINKS[Math.floor(Math.random() * BIT_LINKS.length)];

// init modules
initSplash(document);
initLangSwitcher(document, guest);
initCountdown(document);
initCalendarLinks(document);
initScrollArrows(document);
initMarquee(document);
initCustomCursor(document);
initSideMotifs(document, ASSETS);

const { renderThanks } = initRsvpForm(document, {
  guest,
  getLang,
  onCollapse: () => {},
});
onLangChange(renderThanks);

initEffects();
initScenery();
