import { getMessage, getErrorMessage } from './i18n.js';

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
    adults: attending === 'yes' ? counts.adults : 0,
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
  const defaultAdults = guest.form === 'plural' ? 2 : 1;
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
    });
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
    renderThanks();
    if (onCollapse) onCollapse();
  }

  function prefill(data) {
    if (!data) return;
    const radio = document.querySelector(`input[name=attending][value="${data.attending}"]`);
    if (radio) radio.checked = true;
    if (data.adults != null) { counts.adults = data.adults; document.getElementById('adults').textContent = data.adults; }
    if (data.children != null) { counts.children = data.children; document.getElementById('children').textContent = data.children; }
    const pickup = document.getElementById('pickup');
    if (pickup && data.pickup != null) pickup.value = data.pickup;
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
      { name, phone, attending, pickup: document.getElementById('pickup').value, notes: document.getElementById('notes').value.trim() },
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
      collapse({ attending, adults: payload.adults, children: payload.children, pickup: payload.pickup });
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
