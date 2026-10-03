// src/shuttle-plan.js
// Per-RIDER shuttle plan — kept separate from the rsvps table because the RSVP
// row only has ONE ride flag + ONE return value for the whole party, which can't
// express per-leg headcounts (e.g. "1 rides there, 2 ride back") or two people
// in one party returning at different times (one before, one after the after-party).
//
// Keyed by guest code (see src/guests.js). Each entry:
//   city:       'tlv' | 'rhv'
//   to:         # of heads needing a ride TO the wedding
//   backAfter:  # returning AFTER the after-party
//   backBefore: # returning BEFORE the after-party (leave early)
//   backTBD:    # returning, timing not yet confirmed
// Omit a leg when it's 0. This file is the source of truth for the bus counts;
// the plain pickup tokens on rsvps rows are left as-is.

export const SHUTTLE_PLAN = {
  RotemAgmon:     { city: 'tlv', to: 1, backAfter: 2 },                 // רתמי וגיא
  OfirLevin:      { city: 'tlv', to: 1, backAfter: 2 },                 // אופיר ויונתן
  LiorMizrahi:    { city: 'tlv', to: 1, backAfter: 1, backBefore: 1 },  // ליאור ושירה — Lior after, Shira before
  LiorMandelboim: { city: 'tlv', to: 1, backAfter: 2 },                 // ליאורי ויונתן
  AmirTuboul:     { city: 'tlv', to: 1, backAfter: 2 },                 // אמיר ובראל
  RomiHeller:     { city: 'rhv', backAfter: 1 },                        // רומי — back to Rehovot, after
  MaorPeretz:     { city: 'rhv', backAfter: 1 },                        // מאור — back to Rehovot, after
  AlinaDronov:    { city: 'tlv', backAfter: 1 },                        // אלינה — back only, after
  YuvalGoldstein: { city: 'tlv', backAfter: 1 },                        // יובל גולדשטיין — back only, after
  ThaiHayut:      { city: 'rhv', backAfter: 1 },                        // תאי חיות — back to Rehovot, after
};

// Aggregate the plan into per-city, per-leg head totals. `people` counts
// distinct riders per entry (max of the to-leg and the summed back-legs, since
// the same person may ride both ways).
export function aggregateShuttle(plan = SHUTTLE_PLAN) {
  const LEGS = ['to', 'backAfter', 'backBefore', 'backTBD'];
  const z = () => ({ to: 0, backAfter: 0, backBefore: 0, backTBD: 0, back: 0, people: 0 });
  const total = z();
  const byCity = {};
  for (const p of Object.values(plan)) {
    const c = byCity[p.city] || (byCity[p.city] = z());
    for (const leg of LEGS) {
      const n = p[leg] || 0;
      c[leg] += n; total[leg] += n;
      if (leg !== 'to') { c.back += n; total.back += n; }
    }
    const ppl = Math.max(p.to || 0, (p.backAfter || 0) + (p.backBefore || 0) + (p.backTBD || 0));
    c.people += ppl; total.people += ppl;
  }
  return { total, byCity };
}
