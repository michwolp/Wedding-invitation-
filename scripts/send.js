#!/usr/bin/env node
// WhatsApp broadcast sender for the wedding site.
//
// Built to send MANY message types over time (the invite is just the first).
// Each message type lives in MESSAGE_TYPES below: it decides which approved
// WhatsApp template each guest gets (by lang + gender form) and how to fill
// the template variables.
//
// Safety features:
//   • DRY-RUN by default — prints exactly what it would send. Add --live to send.
//   • Idempotent — never re-sends. Skips anyone already in the ledger or ticked
//     in the message type's SEND-LOG.md.
//   • Throttled — ~1 msg/sec so we don't trip WhatsApp rate limits.
//   • Stop-on-error — halts on the first API failure, records what already went
//     out, and tells you exactly where to resume.
//   • Auto E.164 — converts 05x… → 9725x… and strips + from international.
//
// Secrets come from the environment, never the repo:
//   WHATSAPP_TOKEN=...  WHATSAPP_PHONE_ID=...  (phone id defaults to the known one)
//
// Usage:
//   node scripts/send.js                      # dry-run to the 7-person TEST_GROUP
//   node scripts/send.js --live               # actually send to TEST_GROUP
//   node scripts/send.js --codes=RonWolpert,DanKedmi        # dry-run to specific people
//   node scripts/send.js --all --live         # send to everyone not yet sent
//   node scripts/send.js --type=invite ...    # choose message type (default: invite)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GUESTS } from '../src/guests.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- Close-people test batch for the first live run ---
// Covers every Hebrew template (m/f/plural) plus Russian in one go.
const TEST_GROUP = [
  'RonWolpert',      // he / m      → wedding_invite_m
  'DanKedmi',        // he / m      → wedding_invite_m
  'AlinaDronov',     // he / f      → wedding_invite_f
  'YuvalGoldstein',  // he / f      → wedding_invite_f
  'LiorMandelboim',  // he / plural → wedding_invite_plural
  'RonDeitch',       // he / plural → wedding_invite_plural
  'ViktoriaSharay',  // ru          → wedding_invite_ru
];

// ---------------------------------------------------------------------------
// Message types. Add a new entry here for each future broadcast.
// ---------------------------------------------------------------------------
const MESSAGE_TYPES = {
  invite: {
    label: 'invitation 1', // shown in the SEND-LOG tick, so message 2+ are distinguishable
    log: 'SEND-LOG.md',
    // Which approved template + its language code, per guest.
    // NOTE: the `lang` here must match the LANGUAGE set on the template in Meta.
    // If you created the English template as "en_US", change 'en' → 'en_US'.
    template(g) {
      if (g.lang === 'en') return { name: 'wedding_invite_en', lang: 'en' };
      if (g.lang === 'ru') return { name: 'wedding_invite_ru', lang: 'ru' };
      // Hebrew — gendered.
      const map = {
        m: 'wedding_invite_m',
        f: 'wedding_invite_f',
        plural: 'wedding_invite_plural',
        plural_f: 'wedding_invite_plural_f',
      };
      return { name: map[g.form] || 'wedding_invite_plural', lang: 'he' };
    },
    // Template variables: body {{1}} = display name, URL button {{1}} = guest code.
    components(g, code) {
      return [
        { type: 'body', parameters: [{ type: 'text', text: g.name }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
      ];
    },
  },
  // Russian UTILITY re-send: exempt from the MARKETING ecosystem throttle (130472/131049).
  // Used to retry Russian guests whose MARKETING invite failed. Own ledger prefix +
  // separate (non-existent) log so it isn't blocked by the `invite:` sent marks.
  invite_ru_util: {
    label: 'invitation 1 (ru utility)',
    log: 'SEND-LOG-ru-util.md',
    template() {
      return { name: 'wedding_invite_ru_utility', lang: 'ru' };
    },
    components(g, code) {
      return [
        { type: 'body', parameters: [{ type: 'text', text: g.name }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
      ];
    },
  },
};

// --- CLI flags ---
const flags = {};
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}
const LIVE = !!flags.live;
const TYPE = flags.type || 'invite';
const THROTTLE_MS = Number(flags.throttle) || 1200;

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || '1267910159735698';
const GRAPH = 'https://graph.facebook.com/v20.0';

// ---------------------------------------------------------------------------
function toE164(phone) {
  const p = String(phone).trim();
  if (p.startsWith('+')) return p.slice(1).replace(/\D/g, '');
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return digits; // assume already international (rare)
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const LEDGER_PATH = join(ROOT, 'send-ledger.json');
function loadLedger() {
  if (!existsSync(LEDGER_PATH)) return { sent: {} };
  try { return JSON.parse(readFileSync(LEDGER_PATH, 'utf8')); } catch { return { sent: {} }; }
}
function saveLedger(ledger) {
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
}

// Codes already ticked [x] in a message type's SEND-LOG.md (honours manual marks).
function sentCodesFromLog(logPath) {
  const set = new Set();
  if (!existsSync(logPath)) return set;
  for (const line of readFileSync(logPath, 'utf8').split('\n')) {
    const m = line.match(/^- \[x\]\s+(\w+)/);
    if (m) set.add(m[1]);
  }
  return set;
}

// Tick a guest's checkbox in SEND-LOG.md, preserving the existing line text.
// Stamps which message went out (e.g. "invitation 1") so future sends are distinct.
function tickLog(logPath, code, dateStr, label) {
  if (!existsSync(logPath)) return;
  const lines = readFileSync(logPath, 'utf8').split('\n');
  let changed = false;
  const out = lines.map((line) => {
    const m = line.match(/^- \[ \]\s+(\w+)\s+—\s+(.*)$/);
    if (m && m[1] === code) { changed = true; return `- [x] ${code} — ${m[2]} — ${label} sent ${dateStr}`; }
    return line;
  });
  if (changed) writeFileSync(logPath, out.join('\n'));
}

async function sendTemplate(to, tmpl, components) {
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: tmpl.name, language: { code: tmpl.lang }, components },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error;
    throw new Error(e ? `[${e.code}] ${e.message}${e.error_data?.details ? ' — ' + e.error_data.details : ''}` : `HTTP ${res.status}`);
  }
  return json.messages?.[0]?.id || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// --status : print what has been sent so far for this message type, from the ledger.
function printStatus(logPath) {
  const ledger = loadLedger();
  const prefix = `${TYPE}:`;
  const rows = Object.entries(ledger.sent).filter(([k]) => k.startsWith(prefix));
  const ledgerCodes = new Set(rows.map(([k]) => k.slice(prefix.length)));
  console.log(`\nSent ledger for "${TYPE}" — ${rows.length} message(s) with tracked IDs:\n`);
  for (const [k, v] of rows.sort((a, b) => (a[1].at || '').localeCompare(b[1].at || ''))) {
    const code = k.slice(prefix.length);
    console.log(`  ✓ ${code.padEnd(18)} +${v.phone}  ${v.template.padEnd(22)} ${v.at}  ${v.wamid || ''}`);
  }
  // Reconcile with manually-ticked SEND-LOG entries (e.g. sends before this script existed).
  const logCodes = sentCodesFromLog(logPath);
  const logOnly = [...logCodes].filter((c) => !ledgerCodes.has(c));
  if (logOnly.length) console.log(`\n  Also marked sent in SEND-LOG (no tracked ID): ${logOnly.join(', ')}`);
  const allSent = new Set([...ledgerCodes, ...logCodes]);
  const total = Object.keys(GUESTS).filter((c) => c !== 'testMichal').length;
  console.log(`\n${allSent.size} sent · ${total - allSent.size} remaining (of ${total} sendable guests)\n`);
}

async function main() {
  const type = MESSAGE_TYPES[TYPE];
  if (!type) {
    console.error(`Unknown message type "${TYPE}". Known: ${Object.keys(MESSAGE_TYPES).join(', ')}`);
    process.exit(1);
  }
  const logPath = join(ROOT, type.log);
  if (flags.status) { printStatus(logPath); return; }

  // Resolve targets.
  let codes;
  if (flags.codes) codes = String(flags.codes).split(',').map((s) => s.trim()).filter(Boolean);
  else if (flags.all) codes = Object.keys(GUESTS).filter((c) => c !== 'testMichal');
  else codes = [...TEST_GROUP];

  const ledger = loadLedger();
  const loggedSent = sentCodesFromLog(logPath);
  const isSent = (code) => !!ledger.sent[`${TYPE}:${code}`] || loggedSent.has(code);

  // Build the plan.
  const plan = [];
  const problems = [];
  for (const code of codes) {
    const g = GUESTS[code];
    if (!g) { problems.push(`${code}: not in guest list`); continue; }
    if (isSent(code)) { plan.push({ code, g, skip: 'already sent' }); continue; }
    const tmpl = type.template(g);
    const to = toE164(g.phone);
    if (to.length < 9) { problems.push(`${code}: phone too short after E.164 (${g.phone} → ${to})`); continue; }
    plan.push({ code, g, tmpl, to, components: type.components(g, code) });
  }

  // Print the plan.
  console.log(`\nMessage type: ${TYPE}   Mode: ${LIVE ? '🔴 LIVE SEND' : '🟢 dry-run (no messages sent)'}`);
  console.log(`Phone number ID: ${PHONE_ID}\n`);
  const toSend = plan.filter((p) => !p.skip);
  const skipped = plan.filter((p) => p.skip);
  for (const p of plan) {
    if (p.skip) console.log(`  · SKIP  ${p.code.padEnd(18)} (${p.skip})`);
    else console.log(`  → SEND  ${p.code.padEnd(18)} ${p.tmpl.name.padEnd(22)} +${p.to}   name="${p.g.name}"`);
  }
  if (problems.length) {
    console.log(`\n⚠️  Problems (excluded):`);
    for (const pr of problems) console.log(`     ${pr}`);
  }
  console.log(`\nWould send: ${toSend.length}   Skipped: ${skipped.length}   Problems: ${problems.length}\n`);

  if (!LIVE) {
    console.log('Dry-run only. Re-run with --live to actually send.');
    return;
  }
  if (!TOKEN) {
    console.error('WHATSAPP_TOKEN is not set. Export it before a live send:  export WHATSAPP_TOKEN=...');
    process.exit(1);
  }
  if (toSend.length === 0) {
    console.log('Nothing to send.');
    return;
  }

  // Live send — throttled, stop on first error.
  let ok = 0;
  for (let i = 0; i < toSend.length; i++) {
    const p = toSend[i];
    try {
      const wamid = await sendTemplate(p.to, p.tmpl, p.components);
      ledger.sent[`${TYPE}:${p.code}`] = { phone: p.to, template: p.tmpl.name, wamid, at: new Date().toISOString() };
      saveLedger(ledger);
      tickLog(logPath, p.code, todayStr(), type.label);
      ok++;
      console.log(`  ✓ ${p.code}  (${wamid || 'no id'})`);
    } catch (err) {
      console.error(`\n✗ FAILED on ${p.code} (+${p.to}): ${err.message}`);
      console.error(`Sent ${ok} of ${toSend.length} before this. Ledger + SEND-LOG updated for the ones that went out.`);
      const remaining = toSend.slice(i).map((x) => x.code).join(',');
      console.error(`To resume after fixing, re-run — already-sent are auto-skipped, or target the rest:\n  node scripts/send.js --type=${TYPE} --live --codes=${remaining}`);
      process.exit(1);
    }
    if (i < toSend.length - 1) await sleep(THROTTLE_MS);
  }
  console.log(`\n✅ Done. Sent ${ok}/${toSend.length} message(s) — all accepted by WhatsApp.`);
  console.log(`Next-step visibility:`);
  console.log(`  • Delivered / read rates → WhatsApp Manager → Message templates (per template)`);
  console.log(`  • Actual RSVPs → GET https://dvichal-wedding.com/api/rsvp-summary?key=<SUMMARY_KEY>`);
  console.log(`  • This run's message IDs → node scripts/send.js --type=${TYPE} --status`);
}

main().catch((e) => { console.error(e); process.exit(1); });
