import { getMessage, getErrorMessage } from './i18n.js';
import { parsePickup, encodePickup } from './pickup.js';

// read the ride controls out of the form into a stored pickup string.
// Flow: want? → from where? → direction (to/from/both) → return time (if "from").
export function readPickup(document) {
  const wantEl = document.querySelector('input[name=rideWant]:checked');
  if (!wantEl || wantEl.value !== 'yes') return '';
  const cityEl = document.querySelector('input[name=pickupCity]:checked');
  const city = cityEl ? cityEl.value : '';
  if (!city) return '';
  const dirEl = document.querySelector('input[name=rideDir]:checked');
  const dir = dirEl ? dirEl.value : 'both'; // to | from | both
  const to = dir === 'to' || dir === 'both';
  const hasReturn = dir === 'from' || dir === 'both';
  const retEl = document.querySelector('input[name=pickupRet]:checked');
  const ret = hasReturn ? (retEl ? retEl.value : 'after') : '';
  return encodePickup({ city, to, ret });
}

// reflect a stored pickup string back into the ride controls + visibility.
export function writePickup(document, value) {
  const { city, to, ret } = parsePickup(value);
  const want = city ? 'yes' : 'no';
  const wantRadio = document.querySelector(`input[name=rideWant][value="${want}"]`);
  if (wantRadio) wantRadio.checked = true;

  if (city) {
    const cityRadio = document.querySelector(`input[name=pickupCity][value="${city}"]`);
    if (cityRadio) cityRadio.checked = true;
    const hasReturn = !!ret;
    const dir = to && hasReturn ? 'both' : to ? 'to' : 'from';
    const dirRadio = document.querySelector(`input[name=rideDir][value="${dir}"]`);
    if (dirRadio) dirRadio.checked = true;
    if (hasReturn) {
      const retRadio = document.querySelector(`input[name=pickupRet][value="${ret}"]`);
      if (retRadio) retRadio.checked = true;
    }
  }
  syncPickupVisibility(document);
}

// show/hide the ride detail sections based on current selections
export function syncPickupVisibility(document) {
  const wantEl = document.querySelector('input[name=rideWant]:checked');
  const wantsRide = wantEl && wantEl.value === 'yes';
  const details = document.getElementById('rideDetails');
  if (details) details.classList.toggle('hidden', !wantsRide);

  const dirEl = document.querySelector('input[name=rideDir]:checked');
  const dir = dirEl ? dirEl.value : 'both';
  const timing = document.getElementById('rideTiming');
  // return-time only matters when the ride includes the trip back
  if (timing) timing.classList.toggle('hidden', !(wantsRide && (dir === 'from' || dir === 'both')));
}

export function buildPayload(formData, guest, counts) {
  const { name, phone, attending, pickup, notes } = formData;
  const fullName = (guest.code && guest.fullName) ? guest.fullName : name;
  const displayName = (guest.code && guest.name) ? guest.name : name;

  return {
    guest_id: guest.code || null,
    name: fullName,
    display_name: displayName,
    phone,
    attending,
    // a "yes" always means at least one person — never save 0 adults for an attendee
    adults: attending === 'yes' ? Math.max(1, counts.adults) : 0,
    children: attending === 'yes' ? counts.children : 0,
    pickup: attending === 'yes' ? pickup : '',
    notes,
  };
}

export function validateForm(name, phone) {
  if (!name || name.trim().length < 2) return 'need';
  if (!phone || phone.trim().length < 7) return 'need';
  return null;
}

export function initRsvpForm(document, { guest, getLang, onCollapse }) {
  const form = document.getElementById('rsvpForm');
  const doneEl = document.getElementById('rsvpDone');
  const msgEl = document.getElementById('formMsg');
  const defaultAdults = guest.form?.startsWith('plural') ? 2 : 1;
  const counts = { adults: defaultAdults, children: 0 };
  document.getElementById('adults').textContent = defaultAdults;
  let rsvpData = null;

  document.querySelectorAll('.stepctl button').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.t;
      const d = +btn.dataset.d;
      counts[t] = Math.min(15, Math.max(0, counts[t] + d));
      if (t === 'adults') counts.adults = Math.max(1, counts.adults);
      document.getElementById(t).textContent = counts[t];
    });
  });

  document.querySelectorAll('input[name=attending]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('whenComing').classList.toggle('hidden', r.value === 'no' && r.checked);
      // switching to "yes" must mean at least one adult — a prior "no" leaves the
      // count at 0, so restore the default when they change their mind
      if (r.value === 'yes' && r.checked && counts.adults < 1) {
        counts.adults = defaultAdults;
        document.getElementById('adults').textContent = defaultAdults;
      }
    });
  });

  // reveal ride details when "yes", and the return-time only when the ride
  // includes the trip back
  document.querySelectorAll('input[name=rideWant], input[name=rideDir]').forEach(r => {
    r.addEventListener('change', () => syncPickupVisibility(document));
  });

  function renderThanks() {
    const el = document.querySelector('.rsvp-thanks');
    if (!el || !rsvpData) return;
    el.textContent = rsvpData.attending === 'yes'
      ? getMessage(getLang(), 'okYes', guest.form)
      : getMessage(getLang(), 'okNo', guest.form);
  }

  function collapse(data) {
    rsvpData = data;
    form.style.display = 'none';
    doneEl.classList.remove('hidden');
    // clear any lingering status text (e.g. "sending…") so it isn't
    // still showing if the form is reopened via Edit
    msgEl.textContent = '';
    msgEl.className = 'formmsg';
    renderThanks();
    if (onCollapse) onCollapse();
  }

  function prefill(data) {
    if (!data) return;
    const radio = document.querySelector(`input[name=attending][value="${data.attending}"]`);
    if (radio) radio.checked = true;
    // a "yes" record must show at least one adult, even if a stale row stored 0
    if (data.adults != null) {
      counts.adults = data.attending === 'yes' ? Math.max(1, data.adults) : data.adults;
      document.getElementById('adults').textContent = counts.adults;
    }
    if (data.children != null) { counts.children = data.children; document.getElementById('children').textContent = data.children; }
    if (data.pickup != null) writePickup(document, data.pickup);
    const notes = document.getElementById('notes');
    if (notes && data.notes != null) notes.value = data.notes;
    const wc = document.getElementById('whenComing');
    if (wc) wc.classList.toggle('hidden', data.attending === 'no');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const lang = getLang();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();

    const validationErr = validateForm(name, phone);
    if (validationErr) {
      msgEl.textContent = getMessage(lang, validationErr, guest.form);
      msgEl.className = 'formmsg err';
      return;
    }

    const attending = document.querySelector('input[name=attending]:checked').value;
    const payload = buildPayload(
      { name, phone, attending, pickup: readPickup(document), notes: document.getElementById('notes').value.trim() },
      guest,
      counts,
    );

    const btn = form.querySelector('button[type=submit]');
    msgEl.textContent = getMessage(lang, 'sending', guest.form);
    msgEl.className = 'formmsg';
    btn.classList.add('sending');
    btn.disabled = true;

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let code = '';
        try { code = (await res.json()).error || ''; } catch (_) {}
        throw new Error(code);
      }
      collapse({ attending, adults: payload.adults, children: payload.children, pickup: payload.pickup, notes: payload.notes });
    } catch (err) {
      msgEl.textContent = getErrorMessage(lang, err?.message || '');
      msgEl.className = 'formmsg err';
    } finally {
      btn.classList.remove('sending');
      btn.disabled = false;
    }
  });

  const editBtn = document.querySelector('.rsvp-edit');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (rsvpData) prefill(rsvpData);
      msgEl.textContent = '';
      msgEl.className = 'formmsg';
      form.style.display = '';
      doneEl.classList.add('hidden');
    });
  }

  if (guest.code) {
    fetch('/api/rsvp-status?guest_id=' + encodeURIComponent(guest.code))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.exists) collapse(data); })
      .catch(() => {});
  }

  return { renderThanks, counts };
}
