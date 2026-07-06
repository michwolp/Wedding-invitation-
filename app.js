// ---------- side flowers: scatter motifs down both edges of the page ----------
(function(){
  const layer = document.getElementById('sideflowers');
  if(!layer) return;
  // side decorations use ALL the wedding clipart, evenly balanced (no category
  // dominates). We cycle through a shuffled pool so every motif appears equally.
  const pool = [
    'assets/cg-bouquet.png','assets/cg-tulip.png','assets/cg-sprig.png','assets/cg-vine.png',
    'assets/cg-wreath.png','assets/cg-border.png','assets/cg-monogram.png','assets/cg-disco.png',
    'assets/cg-cake.png','assets/cg-candle.png','assets/cg-coupes.png','assets/cg-champagne.png',
    'assets/cg-fairy.png','assets/cg-couple.png','assets/cg-star.png'
  ];
  const R = (a,b)=> a + Math.random()*(b-a);

  function build(){
    layer.innerHTML = '';
    const pageH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const narrow = innerWidth < 640;
    const step = narrow ? 200 : 250;           // vertical spacing between motifs on a side
    // shuffle the pool so the sequence differs each load but stays balanced
    const seq = pool.slice();
    for(let i = seq.length - 1; i > 0; i--){ const j = Math.floor(R(0, i+1)); [seq[i],seq[j]] = [seq[j],seq[i]]; }
    let placed = 0;
    // start a little below the hero so we don't fight the corner motifs / countdown
    for(let y = 330; y < pageH - 120; y += R(step*0.8, step*1.2)){
      ['left','right'].forEach(side=>{
        const img = document.createElement('img');
        img.src = '/' + seq[placed % seq.length];
        placed++;
        // the sparkle star is tiny; everything else similar size
        const isStar = img.src.indexOf('cg-star') !== -1;
        const fw = isStar ? (narrow ? R(22,34) : R(28,42)) : (narrow ? R(58,86) : R(84,124));
        img.style.width = fw + 'px';
        img.style.top = (y + R(-40,40)) + 'px';
        // these motifs are whole objects (glasses, disco, etc.) — keep them fully
        // on-screen near the edge, and don't mirror-flip them.
        const off = narrow ? R(2,12) : R(6,22);
        if(side==='left'){ img.style.left = off + 'px'; }
        else { img.style.right = off + 'px'; }
        img.style.opacity = R(.82,1).toFixed(2);
        img.style.setProperty('--sway', R(5,9).toFixed(1)+'s');
        img.style.setProperty('--swayDelay', (-R(0,5)).toFixed(1)+'s');
        layer.appendChild(img);
      });
    }
  }
  // build after layout settles, and rebuild on resize / orientation change
  if('requestIdleCallback' in window) requestIdleCallback(build); else setTimeout(build, 300);
  setTimeout(build, 1200);   // rebuild once fonts/images have shifted layout
  let rt;
  addEventListener('resize', ()=>{ clearTimeout(rt); rt = setTimeout(build, 300); }, {passive:true});
})();

// ---------- intro splash: remove once the book has opened ----------
(function(){
  const s = document.getElementById('splash');
  if(!s) return;
  s.addEventListener('animationend', e=>{
    if(e.animationName === 'splashOut') s.classList.add('done');
  });
  // safety net in case the animationend event is missed
  setTimeout(()=> s.classList.add('done'), 2800);
})();

// ---------- scroll-down arrows jump to the next section ----------
(function(){
  document.querySelectorAll('.scrolldn[data-next]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = document.querySelector(btn.dataset.next);
      if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
})();

// ---------- marquee content (language-neutral, graphic) ----------
// The track holds two identical .mq halves and animates by -50%, so the loop is
// seamless ONLY if each half is at least as wide as the screen. We repeat the
// chunk enough times to guarantee that on any viewport, and re-fill on resize.
(function(){
  const chunk = 'Michal <i>&#x2665;&#xFE0E;</i> Dvir <i>&#x2726;</i> 16.10.26 <i>&#x2726;</i> ';
  const halves = document.querySelectorAll('.mq');
  if(!halves.length) return;

  function fill(){
    // The track = two identical halves and animates by -50% (one half width).
    // For a SEAMLESS loop with no gap on wide screens, EACH half must be at least
    // as wide as the viewport. We measure one chunk, over-fill, then verify the
    // real rendered width and top up if needed.
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--display);font-weight:400;font-size:1.15rem;letter-spacing:.12em';
    probe.innerHTML = chunk;
    document.body.appendChild(probe);
    const chunkW = probe.getBoundingClientRect().width || 200;
    probe.remove();

    // need each half ≥ viewport; add a full extra screen of margin
    let reps = Math.max(4, Math.ceil((innerWidth * 2) / chunkW) + 2);
    halves.forEach(el=>{ el.innerHTML = chunk.repeat(reps); });

    // safety: if the first half still came out narrower than the viewport
    // (e.g. font metrics differed), keep adding chunks until it's wide enough.
    const first = halves[0];
    let guard = 0;
    while(first && first.getBoundingClientRect().width < innerWidth * 1.05 && guard < 20){
      reps += 3; guard++;
      halves.forEach(el=>{ el.innerHTML = chunk.repeat(reps); });
    }
  }
  fill();
  setTimeout(fill, 1200);   // re-fill after the display font loads (chunk width changes)
  let rt;
  addEventListener('resize', ()=>{ clearTimeout(rt); rt = setTimeout(fill, 250); }, {passive:true});
})();

// ---------- custom cursor ----------
(function(){
  if(matchMedia('(pointer:coarse)').matches) return;
  const c = document.getElementById('cur');
  addEventListener('pointermove', e=>{
    c.style.left = e.clientX+'px'; c.style.top = e.clientY+'px';
    c.classList.toggle('hot', !!e.target.closest('a,button,select,input,textarea,label,.floater.clickable,.heart,.butterfly'));
  }, {passive:true});
})();

// ---------- countdown to 16 Oct 2026, 16:30 Israel time ----------
const target = new Date('2026-10-16T16:30:00+03:00').getTime();
function setNum(id, v){
  const el = document.getElementById(id);
  if(el.textContent !== String(v)){
    el.textContent = v;
    el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
  }
}
function tick(){
  let diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff/86400000); diff -= d*86400000;
  const h = Math.floor(diff/3600000);  diff -= h*3600000;
  const m = Math.floor(diff/60000);    diff -= m*60000;
  const s = Math.floor(diff/1000);
  setNum('d', d); setNum('h', h); setNum('m', m); setNum('s', s);
}
tick(); setInterval(tick, 1000);

// ---------- steppers ----------
const counts = {adults:1, children:0};
document.querySelectorAll('.stepctl button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const t = btn.dataset.t, d = +btn.dataset.d;
    counts[t] = Math.min(15, Math.max(0, counts[t]+d));
    if(t==='adults') counts.adults = Math.max(1, counts.adults);
    document.getElementById(t).textContent = counts[t];
  });
});

// hide headcount + pickup when not attending
document.querySelectorAll('input[name=attending]').forEach(r=>{
  r.addEventListener('change', ()=>{
    document.getElementById('whenComing').classList.toggle('hidden', r.value==='no' && r.checked);
  });
});

// ---------- add to calendar ----------
(function(){
  // 16 Oct 2026, 16:30–23:59 Israel time (UTC+3). In UTC that's 13:30–20:59.
  const start = '20261016T133000Z';
  const end   = '20261016T205900Z';
  const title = 'החתונה של מיכל ודביר 💍';
  const loc   = 'אקליפטוסים בחולדה, כרמי יוסף';
  const details = 'מתרגשים לחגוג איתכם! קבלת פנים 16:30, חופה 17:30.';
  const g = document.getElementById('calGoogle');
  if(g){
    g.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(title)
      + '&dates=' + start + '/' + end
      + '&location=' + encodeURIComponent(loc)
      + '&details=' + encodeURIComponent(details);
  }
  const ics = document.getElementById('calIcs');
  if(ics){
    const body = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//michal-dvir//wedding//HE','CALSCALE:GREGORIAN',
      'BEGIN:VEVENT','UID:michal-dvir-2026@wedding',
      'DTSTAMP:' + start,'DTSTART:' + start,'DTEND:' + end,
      'SUMMARY:' + title,'LOCATION:' + loc,'DESCRIPTION:' + details,
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');
    ics.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }
})();

// per-guest link support: /?g=CODE  (see guests.js). Also handles legacy /?to=&lang=&id=
const guest = (typeof getGuest === 'function') ? getGuest() : {};
if(guest.name)  document.getElementById('name').value  = guest.name;
if(guest.phone) document.getElementById('phone').value = guest.phone;
// recognised guests already have name+phone from their link — hide those fields
// (the values are still submitted). Anyone without a personal link still sees them.
if(guest.name && guest.phone){
  document.getElementById('nameField').style.display  = 'none';
  document.getElementById('phoneField').style.display = 'none';
}

// ---------- i18n ----------
let lang = 'he';
const MSG = {
  he: {
    need:'רק צריך שם וטלפון ואפשר לשלוח', sending:'שולחים…',
    okYes:'התקבל! מחכים לראות אתכם 🤍', okNo:'התקבל, תודה שעדכנתם 🤍',
    err:'משהו השתבש בשליחה — נסו שוב עוד רגע'
  },
  en: {
    need:'Just a name and phone number and you can send', sending:'Sending…',
    okYes:"Got it! Can't wait to see you 🤍", okNo:'Got it, thanks for letting us know 🤍',
    err:'Something went wrong — please try again in a moment'
  },
  ru: {
    need:'Нужны только имя и телефон', sending:'Отправляем…',
    okYes:'Принято! Ждём вас 🤍', okNo:'Принято, спасибо, что сообщили 🤍',
    err:'Что-то пошло не так — попробуйте ещё раз'
  }
};

const L = {
en: {
  '.opening': "We're excited to invite you to our wedding",
  '.when': 'Karmei Yosef · 16.10.26',
  '.weekday': 'Friday',
  '.unit:nth-child(1) span': 'days',
  '.unit:nth-child(2) span': 'hours',
  '.unit:nth-child(3) span': 'minutes',
  '.unit:nth-child(4) span': 'seconds',
  '#details .sec-title': 'When &amp; Where',
  '.schedule .slot:nth-child(1) span': 'Reception',
  '.schedule .slot:nth-child(2) span': 'Chuppah',
  '.note': '<span class="hand">An open-field celebration —</span><br>comfortable shoes recommended.<br>Dancing till the small hours? Bring a change of clothes :)',
  '#details .btnrow a:nth-child(1)': 'Navigate with Waze',
  '#details .btnrow a:nth-child(2)': 'Google Maps',
  '#rsvp .sec-title': 'RSVP',
  'label[for=name]': 'Full name',
  'label[for=phone]': 'Phone',
  '#rsvpForm .field:nth-of-type(3) > label': 'Will you attend?',
  '.choices .choice:nth-child(1) span': 'Yes, of course!',
  '.choices .choice:nth-child(2) span': 'Sadly, no',
  '.stepper:nth-child(1) label': 'Adults',
  '.stepper:nth-child(2) label': 'Children',
  'label[for=pickup]': 'Coming by shuttle? It departs from Tel Aviv',
  '#pickup option[value=""]': 'Arriving on our own',
  '#pickup option[value=tlv_after]': 'Shuttle — staying for the after-party',
  '#pickup option[value=tlv_noafter]': 'Shuttle — leaving before the after-party',
  'label[for=notes]': 'Anything we should know? (optional)',
  '#rsvpForm button[type=submit]': 'Send RSVP',
  '#gifts .sec-title': 'Gifts',
  '.gift-sub': 'To leave a gift:',
  '#gifts .btnrow a:nth-child(1)': 'Gift via PayBox',
  '#gifts .btnrow a:nth-child(2)': 'Gift via Bit',
  '.parents .p:nth-child(1) b': 'Parents of the bride',
  '.parents .p:nth-child(1) span': 'Victoria Sharay<br>&amp; Alexander Wolpert',
  '.parents .p:nth-child(2) b': 'Parents of the groom',
  '.parents .p:nth-child(2) span': 'Eyal &amp; Sigal Sasson',
  '.seeyou': "Can't wait to see you!",
  _name1: 'Michal ', _name2: ' Dvir',
  _title: 'Michal ♥ Dvir — 16.10.26', _dir: 'ltr'
},
ru: {
  '.opening': 'Мы рады пригласить вас на нашу свадьбу',
  '.when': 'Кармей Йосеф · 16.10.26',
  '.weekday': 'Пятница',
  '.unit:nth-child(1) span': 'дней',
  '.unit:nth-child(2) span': 'часов',
  '.unit:nth-child(3) span': 'минут',
  '.unit:nth-child(4) span': 'секунд',
  '#details .sec-title': 'Когда и где',
  '.schedule .slot:nth-child(1) span': 'Приём гостей',
  '.schedule .slot:nth-child(2) span': 'Хупа',
  '.note': '<span class="hand">Праздник под открытым небом —</span><br>рекомендуем удобную обувь.<br>Танцуете до утра? Возьмите сменную одежду :)',
  '#details .btnrow a:nth-child(1)': 'Навигация в Waze',
  '#details .btnrow a:nth-child(2)': 'Google Maps',
  '#rsvp .sec-title': 'Подтверждение',
  'label[for=name]': 'Полное имя',
  'label[for=phone]': 'Телефон',
  '#rsvpForm .field:nth-of-type(3) > label': 'Придёте?',
  '.choices .choice:nth-child(1) span': 'Да, конечно!',
  '.choices .choice:nth-child(2) span': 'К сожалению, нет',
  '.stepper:nth-child(1) label': 'Взрослые',
  '.stepper:nth-child(2) label': 'Дети',
  'label[for=pickup]': 'Едете на трансфере? Он отправляется из Тель-Авива',
  '#pickup option[value=""]': 'Добираемся сами',
  '#pickup option[value=tlv_after]': 'Трансфер — остаёмся на афтепати',
  '#pickup option[value=tlv_noafter]': 'Трансфер — уезжаем до афтепати',
  'label[for=notes]': 'Что-то, что нам стоит знать? (необязательно)',
  '#rsvpForm button[type=submit]': 'Отправить',
  '#gifts .sec-title': 'Подарки',
  '.gift-sub': 'Оставить подарок:',
  '#gifts .btnrow a:nth-child(1)': 'Подарок через PayBox',
  '#gifts .btnrow a:nth-child(2)': 'Подарок через Bit',
  '.parents .p:nth-child(1) b': 'Родители невесты',
  '.parents .p:nth-child(1) span': 'Виктория Шарай<br>и Александр Вольперт',
  '.parents .p:nth-child(2) b': 'Родители жениха',
  '.parents .p:nth-child(2) span': 'Эяль и Сигаль Сасон',
  '.seeyou': 'Будем рады вас видеть!',
  _name1: 'Михаль ', _name2: ' Двир',
  _title: 'Михаль ♥ Двир — 16.10.26', _dir: 'ltr'
}
};
const HE = new Map();

// ---------- Hebrew singular (gendered) per guest ----------
// The page is written in plural (מגיעים / אתכם). For a single guest we overlay
// gendered singular wording. form 'm'=male, 'f'=female; 'plural'/undefined = no change.
const HE_SINGULAR = {
  m: {
    '.opening': 'מתרגשים להזמין אותך לחתונה שלנו',
    '#rsvpForm .field:nth-of-type(3) > label': 'מגיע?',
    'label[for=pickup]': 'מגיע בהסעה? ההסעה יוצאת מתל אביב',
    '#pickup option[value=""]': 'מגיע עצמאית',
    '.seeyou': 'נשמח לראותך!'
  },
  f: {
    '.opening': 'מתרגשים להזמין אותך לחתונה שלנו',
    '#rsvpForm .field:nth-of-type(3) > label': 'מגיעה?',
    'label[for=pickup]': 'מגיעה בהסעה? ההסעה יוצאת מתל אביב',
    '#pickup option[value=""]': 'מגיעה עצמאית',
    '.seeyou': 'נשמח לראותך!'
  }
};
const MSG_HE_SINGULAR = {
  m: { okYes:'התקבל! מחכים לראות אותך 🤍', okNo:'התקבל, תודה שעדכנת 🤍', err:'משהו השתבש בשליחה — נסה שוב עוד רגע' },
  f: { okYes:'התקבל! מחכים לראות אותך 🤍', okNo:'התקבל, תודה שעדכנת 🤍', err:'משהו השתבש בשליחה — נסי שוב עוד רגע' }
};
function applyHeForm(){
  if(lang !== 'he' || !guest.form || guest.form === 'plural') return;
  const ov = HE_SINGULAR[guest.form];
  if(!ov) return;
  Object.keys(ov).forEach(sel=>{ const el = document.querySelector(sel); if(el) el.innerHTML = ov[sel]; });
}
// gendered message lookup for the submit handler
function themsg(key){
  if(lang === 'he' && guest.form && MSG_HE_SINGULAR[guest.form] && MSG_HE_SINGULAR[guest.form][key] != null){
    return MSG_HE_SINGULAR[guest.form][key];
  }
  return MSG[lang][key];
}

function applyLang(next){
  lang = next;
  const dict = L[next];
  const selectors = Object.keys(L.en).filter(k => !k.startsWith('_'));
  selectors.forEach(sel=>{
    const el = document.querySelector(sel);
    if(!el) return;
    if(!HE.has(sel)) HE.set(sel, el.innerHTML);
    el.innerHTML = dict ? dict[sel] : HE.get(sel);
  });
  const h1 = document.querySelector('.names');
  if(!HE.has('name1')){ HE.set('name1', h1.firstChild.textContent); HE.set('name2', h1.lastChild.textContent); }
  h1.firstChild.textContent = dict ? dict._name1 : HE.get('name1');
  h1.lastChild.textContent  = dict ? dict._name2 : HE.get('name2');

  document.documentElement.lang = next;
  document.documentElement.dir  = dict ? dict._dir : 'rtl';
  document.title = dict ? dict._title : 'מיכל ♥ דביר — 16.10.26';
  document.querySelectorAll('.lang-seg button').forEach(b=>{
    b.classList.toggle('active', b.dataset.lang === next);
  });
  applyHeForm();
}
document.querySelectorAll('.lang-seg button').forEach(b=>{
  b.addEventListener('click', ()=> applyLang(b.dataset.lang));
});
// apply gendered Hebrew on first load (Hebrew is the default, so applyLang
// hasn't run yet for it)
applyHeForm();
// open in the guest's default language (falls back to Hebrew)
if(['en','ru'].includes(guest.lang)) applyLang(guest.lang);

// ---------- personal greeting ----------
// If we recognised the guest, greet them by name above the invitation.
if(guest.name){
  const firstName = guest.name.trim().split(/\s+/)[0];
  const HELLO = {
    he: n => `שלום ${n} 🤍`,
    en: n => `Hi ${n} 🤍`,
    ru: n => `Привет, ${n} 🤍`
  };
  const g = document.createElement('p');
  g.className = 'greeting';
  g.dataset.name = firstName;
  const renderGreeting = () => { g.textContent = (HELLO[lang] || HELLO.he)(g.dataset.name); };
  renderGreeting();
  const opening = document.querySelector('.hero .opening');
  opening.parentNode.insertBefore(g, opening);
  // keep the greeting in sync when the language changes
  document.querySelectorAll('.lang-seg button').forEach(b=>{
    b.addEventListener('click', renderGreeting);
  });
}

// ---------- RSVP submit ----------
document.getElementById('rsvpForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const msg = document.getElementById('formMsg');
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  if(!name || !phone){
    msg.textContent = themsg('need');
    msg.className = 'formmsg err';
    return;
  }
  const attending = document.querySelector('input[name=attending]:checked').value;
  // full name → DB `name`; display nickname → DB `display_name`.
  // For recognised guests both come from guests.js; manual visitors send what they typed.
  const fullName = (guest.code && guest.fullName) ? guest.fullName : name;
  const displayName = (guest.code && guest.name) ? guest.name : name;
  const payload = {
    guest_id: guest.code || null,
    name: fullName, display_name: displayName, phone, attending,
    adults: attending==='yes' ? counts.adults : 0,
    children: attending==='yes' ? counts.children : 0,
    pickup: attending==='yes' ? document.getElementById('pickup').value : '',
    notes: document.getElementById('notes').value.trim()
  };
  msg.textContent = themsg('sending'); msg.className = 'formmsg';
  try{
    const res = await fetch('/api/rsvp', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!res.ok){
      // surface the specific validation error the server reported
      let code = '';
      try{ code = (await res.json()).error || ''; }catch(_){}
      throw new Error(code);
    }
    msg.textContent = attending==='yes' ? themsg('okYes') : themsg('okNo');
    msg.className = 'formmsg ok';
    e.target.querySelector('button[type=submit]').disabled = true;
  }catch(err){
    msg.textContent = errText(err && err.message);
    msg.className = 'formmsg err';
  }
});

// map a server error code to a friendly, translated message
function errText(code){
  const M = {
    he: {
      'missing name':'שם חסר או קצר מדי — בדקו את שם המלא',
      'missing phone':'מספר טלפון חסר או לא תקין',
      'bad attending value':'בחרו אם אתם מגיעים',
      'server not configured':'תקלה זמנית בשרת — נסו שוב מאוחר יותר',
      'db unreachable':'לא הצלחנו להתחבר לשרת — בדקו את החיבור ונסו שוב',
      'db insert failed':'השמירה נכשלה — נסו שוב עוד רגע',
      '':'משהו השתבש בשליחה — נסו שוב עוד רגע'
    },
    en: {
      'missing name':'Name is missing or too short',
      'missing phone':'Phone number is missing or invalid',
      'bad attending value':'Please choose whether you are attending',
      'server not configured':'Temporary server issue — please try again later',
      'db unreachable':"Couldn't reach the server — check your connection and retry",
      'db insert failed':'Saving failed — please try again in a moment',
      '':'Something went wrong — please try again in a moment'
    },
    ru: {
      'missing name':'Имя отсутствует или слишком короткое',
      'missing phone':'Номер телефона отсутствует или неверный',
      'bad attending value':'Пожалуйста, выберите, придёте ли вы',
      'server not configured':'Временная ошибка сервера — попробуйте позже',
      'db unreachable':'Не удалось связаться с сервером — проверьте соединение',
      'db insert failed':'Не удалось сохранить — попробуйте ещё раз',
      '':'Что-то пошло не так — попробуйте ещё раз'
    }
  };
  const table = M[lang] || M.he;
  return table[code] != null ? table[code] : table[''];
}

// ---------- playground: trail, garden, butterflies ----------
(function(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced) return;
  const R = (a,b)=> a + Math.random()*(b-a);
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  const petals = ['#C99AA8','#CDB56A','#A9B98C','#A8586B','#E3C9D0'];
  const centers = ['#CDB56A','#A8586B','#7E9268'];

  let lastX=-99, lastY=-99, lastT=0, live=0;
  function trail(x,y){
    const now = performance.now();
    if(now-lastT < 70 || Math.hypot(x-lastX,y-lastY) < 46 || live > 22) return;
    lastX=x; lastY=y; lastT=now; live++;
    const p = document.createElement('div');
    p.className = 'burst';
    const s = R(7,12);
    p.innerHTML = `<svg width="${s}" height="${s*1.5}" viewBox="0 0 8 12"><ellipse cx="4" cy="6" rx="3.2" ry="5.2" fill="${pick(petals)}" opacity=".9"/></svg>`;
    p.style.left = x+'px'; p.style.top = y+'px';
    document.body.appendChild(p);
    p.animate([
      {transform:'translate(0,0) rotate(0)', opacity:.95},
      {transform:`translate(${R(-30,30)}px,${R(20,70)}px) rotate(${R(-160,160)}deg)`, opacity:0}
    ],{duration:R(800,1400), easing:'ease-out'}).onfinish = ()=>{ p.remove(); live--; };
  }
  addEventListener('pointermove', e=> trail(e.clientX, e.clientY), {passive:true});

  // tap the open page → hearts bloom and melt away
  let liveHearts = 0;
  addEventListener('click', e=>{
    if(liveHearts > 24) return;
    const t = e.target;
    if(t.closest('a,button,input,select,textarea,label,.unit,.floater,.lang-seg,.heart,form,.butterfly')) return;
    if(!t.closest('body')) return;
    const n = 1 + Math.floor(Math.random()*2);
    for(let i=0;i<n;i++){
      liveHearts++;
      const p = document.createElement('div');
      p.className = 'burst';
      p.textContent = '\u2665\uFE0E';
      p.style.color = pick(['#C99AA8','#A8586B','#A9B98C','#CDB56A']);
      p.style.fontSize = R(16,30)+'px';
      p.style.left = (e.clientX + (i? R(-26,26):0))+'px';
      p.style.top  = (e.clientY + (i? R(-18,18):0))+'px';
      document.body.appendChild(p);
      p.animate([
        {transform:'translate(0,0) scale(.2) rotate(0deg)', opacity:0},
        {transform:'translate(0,-14px) scale(1.15) rotate(-6deg)', opacity:1, offset:.12},
        {transform:`translate(${R(-14,14)}px,-46px) scale(1) rotate(${R(-10,10)}deg)`, opacity:.95, offset:.55},
        {transform:`translate(${R(-24,24)}px,-90px) scale(.9) rotate(${R(-16,16)}deg)`, opacity:0}
      ],{duration:R(3800,5600), easing:'ease-out'}).onfinish = ()=>{ p.remove(); liveHearts--; };
    }
  });

  function butterflySVG(c1,c2){
    return `<svg width="26" height="22" viewBox="0 0 20 20">
      <g class="wing l"><path d="M9,10 C2,2 -1,6 2,11 C-1,13 3,17 9,11 Z" fill="${c1}"/></g>
      <g class="wing r"><path d="M11,10 C18,2 21,6 18,11 C21,13 17,17 11,11 Z" fill="${c2}"/></g>
      <ellipse cx="10" cy="10.5" rx="1.3" ry="4.2" fill="#4F4A38"/>
    </svg>`;
  }
  function flight(b, fromLeft){
    const W = innerWidth, H = innerHeight;
    const x0 = fromLeft ? -40 : W+40, x1 = fromLeft ? W+40 : -40;
    const y0 = R(H*.1,H*.7);
    const kf = [];
    for(let i=0;i<=6;i++){
      kf.push({transform:`translate(${x0 + (x1-x0)*i/6}px, ${y0 + Math.sin(i*1.9)*R(30,90)}px) rotate(${R(-14,14)}deg)`});
    }
    return b.animate(kf,{duration:R(14000,20000),easing:'linear'});
  }
  function spawnButterfly(){
    if(document.querySelectorAll('.butterfly').length >= 2) return;
    const b = document.createElement('div');
    b.className = 'butterfly';
    b.innerHTML = butterflySVG(pick(petals), pick(petals));
    document.body.appendChild(b);
    let anim = flight(b, Math.random()<.5);
    anim.onfinish = ()=> b.remove();
    b.addEventListener('click', ()=>{
      anim.cancel();
      const r = b.getBoundingClientRect();
      b.animate([
        {transform:`translate(${r.left}px,${r.top}px) scale(1)`, opacity:1},
        {transform:`translate(${r.left + R(-200,200)}px,${-80}px) scale(.6)`, opacity:0}
      ],{duration:900,easing:'ease-in'}).onfinish = ()=> b.remove();
    }, {once:true});
  }
  setTimeout(spawnButterfly, 4000);
  setInterval(spawnButterfly, 16000);
})();

// ---------- enchanted forest ----------
(function(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frag = document.createDocumentFragment();
  const R = (a,b)=> a + Math.random()*(b-a);
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  const petals = ['#C99AA8','#CDB56A','#A9B98C','#A8586B','#E3C9D0'];
  const centers = ['#CDB56A','#A8586B','#7E9268'];
  const parallaxed = [];

  [
    {c:'201,154,168',  x:'-8%',  y:'5%',  s:340, dx:60,  dy:40,  dur:38},
    {c:'205,181,106',  x:'75%',  y:'-6%', s:300, dx:-50, dy:60,  dur:46},
    {c:'169,185,140',  x:'70%',  y:'70%', s:380, dx:-70, dy:-40, dur:52},
    {c:'201,154,168', x:'-10%', y:'75%', s:280, dx:80,  dy:-50, dur:44},
    {c:'168,88,107',   x:'35%',  y:'35%', s:240, dx:40,  dy:70,  dur:60},
  ].forEach(b=>{
    const d = document.createElement('div');
    d.className = 'blob';
    d.style.cssText = `left:${b.x};top:${b.y};width:${b.s}px;height:${b.s}px;` +
      `background:radial-gradient(circle, rgba(${b.c},.20), transparent 70%);` +
      `--dx:${b.dx}px;--dy:${b.dy}px;--dur:${b.dur}s`;
    frag.appendChild(d);
  });

  function flowerSVG(size, pc, pc2, cc, white){
    let outer='', inner='';
    for(let i=0;i<5;i++){
      outer += `<ellipse cx="0" cy="-5.4" rx="2.7" ry="4" fill="${white?'#FFFFFF':pc}" stroke="${white?'#4F4A38':'none'}" stroke-width="${white?0.5:0}" transform="rotate(${i*72})"/>`;
      inner += `<ellipse cx="0" cy="-3" rx="1.5" ry="2.3" fill="${white?'#FFFFFF':pc2}" opacity=".9" transform="rotate(${i*72+36})"/>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="-9 -9 18 18"><g>${outer}${inner}<circle r="1.5" fill="${cc}"/></g></svg>`;
  }

  function makeFloater(opts){
    const wrap = document.createElement('div');
    wrap.className = 'fwrap' + (opts.front ? ' front' : '');
    const d = document.createElement('div');
    d.className = 'floater' + (opts.clickable ? ' clickable' : '');
    d.innerHTML = opts.html;
    d.style.opacity = opts.opacity;
    d.style.setProperty('--fx', R(-40,40)+'px');
    d.style.setProperty('--fy', R(-120,-30)+'px');
    d.style.setProperty('--fdur', R(18,40)+'s');
    d.style.setProperty('--fdelay', -R(0,30)+'s');
    d.style.setProperty('--sdur', R(40,90)+'s');
    if(reduced) d.style.animation = 'none';
    wrap.style.left = opts.x+'%';
    wrap.style.top = opts.y+'%';
    wrap.dataset.speed = opts.speed;
    wrap.appendChild(d);
    parallaxed.push(wrap);
    frag.appendChild(wrap);
    return d;
  }

  // background dots/flowers kept sparse — the page already has a floral border,
  // so these are just a few gentle accents. x kept within 4–92% so nothing
  // sticks past the screen edge and causes horizontal scroll.
  const nBack = innerWidth < 700 ? 3 : 6;
  for(let i=0;i<nBack;i++){
    const isDot = Math.random() < .5;
    const size = isDot ? R(4,7) : R(12,22);
    const pc = pick(petals);
    makeFloater({
      html: isDot
        ? `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${pc}"/></svg>`
        : flowerSVG(size, pc, pick(petals), pick(centers), false),
      opacity: isDot ? .45 : .55,
      x: R(6,90), y: R(0,96), speed: R(.02,.08), front:false, clickable:false
    });
  }

  const nEdge = innerWidth < 700 ? 2 : 4;
  for(let i=0;i<nEdge;i++){
    const size = R(24,38);
    const rose = i < 3;
    const pc = pick(petals);
    const el = makeFloater({
      html: flowerSVG(size, pc, pick(petals), pick(centers), rose),
      opacity: .9,
      x: Math.random() < .5 ? R(4,10) : R(80,88),
      y: R(6,90), speed: R(.06,.14), front:true, clickable:true
    });
    if(rose) el.classList.add('rose');
    el.addEventListener('click', ev=>{
      if(el.classList.contains('rose') && !el.classList.contains('painted')){
        el.classList.add('painted');
        pop(ev.clientX, ev.clientY, ['\u2665\uFE0E'], '#A8586B', 5);
        if(!reduced) el.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:500,easing:'ease'});
      } else {
        burstPetals(ev.clientX, ev.clientY);
        el.style.transition = 'opacity .4s'; el.style.opacity = 0;
        setTimeout(()=>{
          const w = el.parentElement;
          w.style.left = (Math.random()<.5 ? R(0,9) : R(88,96))+'%';
          w.style.top = R(6,90)+'%';
          el.style.opacity = .95;
        }, 500);
      }
    });
  }

  const nFly = innerWidth < 700 ? 9 : 15;
  for(let i=0;i<nFly;i++){
    const f = document.createElement('div');
    f.className = 'fly';
    f.style.left = R(2,96)+'%';
    f.style.top = R(4,96)+'%';
    f.style.setProperty('--w1x', R(-60,60)+'px'); f.style.setProperty('--w1y', R(-90,20)+'px');
    f.style.setProperty('--w2x', R(-80,80)+'px'); f.style.setProperty('--w2y', R(-160,-40)+'px');
    f.style.setProperty('--w3x', R(-40,40)+'px'); f.style.setProperty('--w3y', R(-60,10)+'px');
    f.style.setProperty('--wdur', R(16,30)+'s');
    f.style.setProperty('--wdelay', -R(0,20)+'s');
    f.style.setProperty('--fldur', R(2.6,5)+'s');
    if(reduced) f.style.animation = 'none';
    frag.appendChild(f);
  }

  document.body.prepend(frag);

  function burstPetals(x,y){
    for(let i=0;i<8;i++){
      const p = document.createElement('div');
      p.className = 'burst';
      const s = R(8,14), pc = pick(petals);
      p.innerHTML = `<svg width="${s}" height="${s*1.5}" viewBox="0 0 8 12"><ellipse cx="4" cy="6" rx="3.4" ry="5.4" fill="${pc}"/></svg>`;
      p.style.left = x+'px'; p.style.top = y+'px';
      document.body.appendChild(p);
      const ang = R(0,Math.PI*2), dist = R(40,110);
      p.animate([
        {transform:'translate(0,0) rotate(0)', opacity:1},
        {transform:`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist - 30}px) rotate(${R(-200,200)}deg)`, opacity:0}
      ],{duration:R(600,1000), easing:'cubic-bezier(.2,.6,.3,1)'}).onfinish = ()=> p.remove();
    }
  }
  function pop(x,y,chars,color,n){
    for(let i=0;i<n;i++){
      const p = document.createElement('div');
      p.className = 'burst'; p.textContent = pick(chars); p.style.color = color;
      p.style.left = x+'px'; p.style.top = y+'px';
      document.body.appendChild(p);
      const ang = R(-Math.PI*.9,-Math.PI*.1), dist = R(30,80);
      p.animate([
        {transform:'translate(0,0) scale(.6)', opacity:1},
        {transform:`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px) scale(1.4)`, opacity:0}
      ],{duration:R(700,1100), easing:'ease-out'}).onfinish = ()=> p.remove();
    }
  }

  const heart = document.querySelector('.heart');
  heart.style.pointerEvents = 'auto';
  heart.addEventListener('click', ev=>{
    pop(ev.clientX, ev.clientY, ['\u2665\uFE0E'], '#A8586B', 8);
    if(!reduced) heart.animate([{transform:'scale(1)'},{transform:'scale(1.6)'},{transform:'scale(1)'}],{duration:450,easing:'ease'});
  });

  document.querySelectorAll('section, footer').forEach(el=> el.classList.add('reveal'));
  const io = new IntersectionObserver(es=> es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  }),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=> io.observe(el));

  if(!reduced){
    let ticking = false;
    addEventListener('scroll', ()=>{
      if(ticking) return; ticking = true;
      requestAnimationFrame(()=>{
        const sy = scrollY;
        parallaxed.forEach(w=>{ w.style.transform = `translateY(${-sy * w.dataset.speed}px)`; });
        ticking = false;
      });
    },{passive:true});
  }
})();
