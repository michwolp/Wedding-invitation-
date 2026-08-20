// src/dashboard-view.js — pure view helpers for the dashboard.
//
// No DOM, no imports: every function here takes plain data and returns a
// string / value, so the whole rendering layer is unit-testable. dashboard.html
// imports this module and only wires the results into the page. Served as a
// static asset at /dashboard-view.js (copied by vite.config.js).

export const CITY = { tlv: 'תל אביב', rhv: 'רחובות' };
export const RET = { after: 'חזרה אחרי האפטר', noafter: 'חזרה לפני האפטר' };
export const GROUP_ORDER = ['משפחה', 'חברים', 'עבודה', 'אחר'];

// Escape a value for safe insertion into HTML.
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Format an ISO timestamp as a short Hebrew date + time (local browser tz).
export function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  try {
    return d.toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d.toISOString().slice(0, 16).replace('T', ' '); }
}

// Human-readable summary of a guest's shuttle choice (city · to · return).
export function shuttleText(sh) {
  if (!sh) return '';
  const parts = [];
  if (sh.city) parts.push(CITY[sh.city] || sh.city);
  if (sh.to) parts.push('הסעה להגעה');
  if (sh.ret) parts.push(RET[sh.ret] || sh.ret);
  return parts.join(' · ');
}

// The five summary cards (heads / yes / no / wait / total).
export function summaryCardsHtml(counts) {
  const c = counts || {}, p = c.pct || {};
  const cards = [
    ['heads', c.heads, `${c.adults} מבוגרים · ${c.children} ילדים`, 'סה״כ נפשות מגיעות'],
    ['yes', c.yes, `${p.yes}% מכלל האורחים`, 'אישרו הגעה'],
    ['no', c.no, `${p.no}% מכלל האורחים`, 'לא מגיעים'],
    ['wait', c.noResponse, `${p.noResponse}% מכלל האורחים`, 'טרם השיבו'],
    ['', c.totalGuests, `${c.responded} השיבו (${p.responded}%)`, 'סה״כ אורחים ברשימה'],
  ];
  return cards.map(([cls, n, pct, lbl]) =>
    `<div class="card ${cls}"><div class="n">${n}</div><div class="lbl">${lbl}</div><div class="pct">${pct}</div></div>`
  ).join('');
}

// The "last 5 RSVPs" list. Returns '' when there is nothing to show.
export function recentHtml(recent) {
  const rec = recent || [];
  if (!rec.length) return '';
  return rec.map((g) => {
    const full = (g.fullName && g.fullName !== g.name) ? `<span class="full">${esc(g.fullName)}</span>` : '';
    const st = g.attending === 'yes'
      ? `<span class="st yes">✓ ${g.heads} ${g.heads === 1 ? 'אורח' : 'אורחים'}</span>`
      : `<span class="st no">✗ לא מגיע/ה</span>`;
    return `<div class="recent-item">
      <span class="who">${esc(g.name)} ${full}</span>
      <span>${st} <span class="when">${fmtWhen(g.updatedAt)}</span></span>
    </div>`;
  }).join('');
}

// The shuttle panel as a per-city table: one row per pickup city with the head
// count on each leg, plus a totals footer. `heads` is distinct people in that
// city; the footer's נפשות column is the overall total (not the leg sum).
export function shuttleRowsHtml(shuttle) {
  const s = shuttle || {};
  const cities = Object.keys(s.byCity || {});
  if (!cities.length) return '<div class="mut">אין נרשמים להסעות עדיין</div>';

  const cell = (v) => (v ? `<b>${v}</b>` : '—');
  const totals = { to: 0, retAfter: 0, retNoAfter: 0 };
  const body = cities.map((c) => {
    const v = s.byCity[c];
    totals.to += v.to || 0;
    totals.retAfter += v.retAfter || 0;
    totals.retNoAfter += v.retNoAfter || 0;
    return `<tr>
      <td class="city">${esc(CITY[c] || c)}</td>
      <td>${cell(v.to)}</td>
      <td>${cell(v.retAfter)}</td>
      <td>${cell(v.retNoAfter)}</td>
      <td>${cell(v.heads)}</td>
    </tr>`;
  }).join('');

  return `<table class="shuttle-table">
    <thead><tr>
      <th>עיר</th><th>להגעה</th><th>חזרה אחרי</th><th>חזרה לפני</th><th>נפשות</th>
    </tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr>
      <td class="city">סה״כ</td>
      <td>${cell(totals.to)}</td>
      <td>${cell(totals.retAfter)}</td>
      <td>${cell(totals.retNoAfter)}</td>
      <td>${cell(s.totalHeads || 0)}</td>
    </tr></tfoot>
  </table>`;
}

// One guest card. `kind` is 'yes' | 'no' | 'wait'. data-ride / data-note drive
// the ride/note filters; data-s is the searchable text.
export function guestCard(g, kind) {
  const tags = [];
  if (kind === 'yes') {
    tags.push(`<span class="tag h">${g.heads} ${g.heads === 1 ? 'אורח' : 'אורחים'}</span>`);
    if (g.shuttle) tags.push(`<span class="tag sh">🚌 ${esc(shuttleText(g.shuttle))}</span>`);
  }
  if (g.reply) tags.push(`<span class="tag wa">💬 הגיב/ה</span>`);

  const meta = [];
  if (kind === 'yes' && (g.adults || g.children)) {
    meta.push(`<span>מבוגרים: ${g.adults || 0}${g.children ? ` · ילדים: ${g.children}` : ''}</span>`);
  }
  if (g.notes) meta.push(`<span class="notes">📝 ${esc(g.notes)}</span>`);
  if (g.reply && g.reply.text) meta.push(`<span class="wa-txt">💬 «${esc(g.reply.text)}»</span>`);

  const full = (g.fullName && g.fullName !== g.name) ? ` <span class="full">${esc(g.fullName)}</span>` : '';
  return `<div class="g" data-s="${esc((g.name + ' ' + (g.fullName || '') + ' ' + g.phone).toLowerCase())}"
      data-ride="${g.shuttle ? '1' : '0'}" data-note="${g.notes ? '1' : '0'}">
    <div class="top"><span><span class="nm">${esc(g.name)}</span>${full}</span>
      <span>${tags.join('')}</span></div>
    <div class="top"><span class="ph">${esc(g.phone)}</span></div>
    ${meta.length ? `<div class="meta">${meta.join(' &nbsp;·&nbsp; ')}</div>` : ''}
  </div>`;
}

// The three status buckets (coming / not coming / no answer) for one category.
// Rendered closed by default; the page decides when to expand.
function bucketsHtml(b) {
  const grp = (kind, title, cls) => b[kind].length
    ? `<details class="grp ${cls}"><summary>${title} (${b[kind].length})</summary>${b[kind].map((g) => guestCard(g, kind)).join('')}</details>`
    : '';
  return `${grp('yes', 'אישרו הגעה', 'g-yes')}${grp('no', 'לא מגיעים', 'g-no')}${grp('wait', 'טרם השיבו', 'g-wait')}`;
}

// One category block (a collapsible section holding the status buckets).
function catBlock(cat, b) {
  const total = b.yes.length + b.no.length + b.wait.length;
  return `<details class="cat">
    <summary><span class="cat-name">${esc(cat)}</span>
      <span class="mini">${b.yes.length} ✓ · ${b.no.length} ✗ · ${b.wait.length} ⏳ · מתוך ${total}</span></summary>
    <div class="cat-body">${bucketsHtml(b)}</div>
  </details>`;
}

// Group the roster into { group → category → {yes,no,wait} } plus a display
// order (known groups first, then any extras alphabetically).
export function groupRoster(data) {
  const groups = {};
  const put = (arr, kind) => (arr || []).forEach((g) => {
    const gr = g.group || 'אחר';
    const cat = g.category || 'אחר';
    const G = groups[gr] || (groups[gr] = {});
    (G[cat] || (G[cat] = { yes: [], no: [], wait: [] }))[kind].push(g);
  });
  put(data.accepted, 'yes');
  put(data.declined, 'no');
  put(data.noResponse, 'wait');
  const ordered = [
    ...GROUP_ORDER.filter((g) => groups[g]),
    ...Object.keys(groups).filter((g) => !GROUP_ORDER.includes(g)).sort(),
  ];
  return { groups, ordered };
}

// Orphan rows (RSVPs that matched no guest in the list).
function orphansHtml(orphans) {
  if (!orphans || !orphans.length) return '';
  const cards = orphans.map((o) => `<div class="g"
      data-s="${esc((o.display_name + ' ' + o.phone).toLowerCase())}"
      data-ride="0" data-note="${o.notes ? '1' : '0'}">
      <div class="top"><span class="nm">${esc(o.display_name || '—')}</span>
        <span><span class="tag ${o.attending === 'yes' ? 'h' : ''}">${o.attending === 'yes' ? 'אישר' : 'לא מגיע'}</span></span></div>
      <div class="top"><span class="ph">${esc(o.phone)}</span></div>
      ${o.notes ? `<div class="meta notes">📝 ${esc(o.notes)}</div>` : ''}
    </div>`).join('');
  return `<div class="cat"><h2>אישורים ללא התאמה לרשימה <span class="mini">${orphans.length}</span></h2>${cards}</div>`;
}

// The full roster HTML: every group (with its categories and buckets) + orphans.
// A group with a single category skips the redundant category layer (e.g. חברים).
export function rosterHtml(data) {
  const { groups, ordered } = groupRoster(data);
  const groupHtml = ordered.map((gr) => {
    const cats = groups[gr];
    const catKeys = Object.keys(cats).sort();
    const single = catKeys.length === 1;
    let gy = 0, gn = 0, gw = 0, gh = 0;
    const inner = catKeys.map((cat) => {
      const b = cats[cat];
      gy += b.yes.length; gn += b.no.length; gw += b.wait.length;
      gh += b.yes.reduce((n, g) => n + (g.heads || 0), 0);
      return single ? `<div class="cat-body">${bucketsHtml(b)}</div>` : catBlock(cat, b);
    }).join('');
    return `<details class="group">
      <summary class="group-head"><span class="grp-name">${esc(gr)}</span>
        <span class="group-sum">${gy} ✓ · ${gn} ✗ · ${gw} ⏳ &nbsp;·&nbsp; ${gh} נפשות</span></summary>
      <div class="group-body">${inner}</div>
    </details>`;
  }).join('');
  return groupHtml + orphansHtml(data.orphans);
}

// All RSVP notes. Returns '' when there are none.
export function notesHtml(notes) {
  const list = notes || [];
  if (!list.length) return '';
  return list.map((n) => {
    const st = n.attending === 'yes' ? '✓' : '✗';
    return `<div class="note-item">
      <div class="note-who">${st} ${esc(n.name)} <span class="ph">${esc(n.phone)}</span>
        <span class="when">${fmtWhen(n.at)}</span></div>
      <div class="note-txt">📝 ${esc(n.note)}</div>
    </div>`;
  }).join('');
}

// All inbound WhatsApp messages. Returns '' when there are none.
export function messagesHtml(inbox) {
  const list = inbox || [];
  if (!list.length) return '';
  return list.map((m) => `<div class="msg-item">
      <div class="msg-who">${esc(m.name || m.phone)} <span class="when">${fmtWhen(m.at)}</span></div>
      <div class="msg-txt">💬 «${esc(m.text)}»</div>
    </div>`).join('');
}

// Pure filter predicate for a single guest card.
//   card: { status: 'yes'|'no'|'wait'|'', ride: bool, note: bool, s: string }
//   filters: { status: 'all'|'yes'|'no'|'wait', ride: bool, note: bool, q: string }
// A card with no status (orphans) always passes the status filter.
export function passesCard(card, filters) {
  const f = filters || {};
  const statusOk = !f.status || f.status === 'all' || !card.status || card.status === f.status;
  const searchOk = !f.q || (card.s || '').includes(f.q);
  const rideOk = !f.ride || !!card.ride;
  const noteOk = !f.note || !!card.note;
  return statusOk && searchOk && rideOk && noteOk;
}
