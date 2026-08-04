import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildPayload, validateForm, initRsvpForm, readPickup, writePickup } from '../src/rsvp.js';

describe('validateForm', () => {
  it('returns null for valid input', () => {
    expect(validateForm('John Doe', '0501234567')).toBeNull();
  });

  it('rejects empty name', () => {
    expect(validateForm('', '0501234567')).toBe('need');
  });

  it('rejects name with only one character', () => {
    expect(validateForm('A', '0501234567')).toBe('need');
  });

  it('rejects empty phone', () => {
    expect(validateForm('John', '')).toBe('need');
  });

  it('rejects phone shorter than 7 chars', () => {
    expect(validateForm('John', '123456')).toBe('need');
  });

  it('accepts phone with exactly 7 chars', () => {
    expect(validateForm('John', '1234567')).toBeNull();
  });

  it('rejects null name', () => {
    expect(validateForm(null, '0501234567')).toBe('need');
  });

  it('rejects undefined phone', () => {
    expect(validateForm('John', undefined)).toBe('need');
  });
});

describe('buildPayload', () => {
  const guest = { code: 'OfirLevin', name: 'אופיר', fullName: 'אופיר לוין' };
  const counts = { adults: 2, children: 1 };

  it('uses guest fullName when guest has a code', () => {
    const payload = buildPayload(
      { name: 'typed name', phone: '0501234567', attending: 'yes', pickup: 'tlv_after', notes: '' },
      guest,
      counts,
    );
    expect(payload.name).toBe('אופיר לוין');
    expect(payload.display_name).toBe('אופיר');
  });

  it('uses typed name when no guest code', () => {
    const payload = buildPayload(
      { name: 'Random Person', phone: '0501234567', attending: 'yes', pickup: '', notes: 'hi' },
      { code: null, name: null, fullName: null },
      counts,
    );
    expect(payload.name).toBe('Random Person');
    expect(payload.display_name).toBe('Random Person');
  });

  it('zeroes headcount when not attending', () => {
    const payload = buildPayload(
      { name: 'X', phone: '0501234567', attending: 'no', pickup: 'tlv_after', notes: '' },
      guest,
      { adults: 3, children: 2 },
    );
    expect(payload.adults).toBe(0);
    expect(payload.children).toBe(0);
    expect(payload.pickup).toBe('');
  });

  it('includes headcount when attending', () => {
    const payload = buildPayload(
      { name: 'X', phone: '0501234567', attending: 'yes', pickup: 'tlv_noafter', notes: 'note' },
      guest,
      { adults: 4, children: 3 },
    );
    expect(payload.adults).toBe(4);
    expect(payload.children).toBe(3);
    expect(payload.pickup).toBe('tlv_noafter');
    expect(payload.notes).toBe('note');
  });

  it('sets guest_id from guest code', () => {
    const payload = buildPayload(
      { name: 'X', phone: '05', attending: 'yes', pickup: '', notes: '' },
      guest,
      counts,
    );
    expect(payload.guest_id).toBe('OfirLevin');
  });

  it('sends adults=2 for plural guest using default counts', () => {
    const pluralGuest = { code: 'RonnyAndGuy', name: 'רוני וגיא האהובים', fullName: 'רוני וגיא', form: 'plural' };
    const pluralCounts = { adults: 2, children: 0 };
    const payload = buildPayload(
      { name: 'רוני וגיא', phone: '0546826789', attending: 'yes', pickup: '', notes: '' },
      pluralGuest,
      pluralCounts,
    );
    expect(payload.adults).toBe(2);
    expect(payload.children).toBe(0);
    expect(payload.guest_id).toBe('RonnyAndGuy');
  });

  it('sends adults=1 for singular guest using default counts', () => {
    const singularGuest = { code: 'DanKedmi', name: 'דן', fullName: 'דן קדמי', form: 'm' };
    const singularCounts = { adults: 1, children: 0 };
    const payload = buildPayload(
      { name: 'דן קדמי', phone: '0509878804', attending: 'yes', pickup: '', notes: '' },
      singularGuest,
      singularCounts,
    );
    expect(payload.adults).toBe(1);
  });
});

describe('readPickup / writePickup (DOM)', () => {
  function mountPickup() {
    document.body.innerHTML = `
      <input type="radio" name="pickupCity" value="" checked>
      <input type="radio" name="pickupCity" value="tlv">
      <input type="radio" name="pickupCity" value="rhv">
      <div id="pickupLegs" class="hidden">
        <input type="checkbox" id="pickupTo">
        <input type="radio" name="pickupRet" value="" checked>
        <input type="radio" name="pickupRet" value="noafter">
        <input type="radio" name="pickupRet" value="after">
      </div>`;
  }

  it('reads empty when no city selected', () => {
    mountPickup();
    expect(readPickup(document)).toBe('');
  });

  it('round-trips a legacy value and reveals the legs', () => {
    mountPickup();
    writePickup(document, 'tlv_after');
    expect(document.querySelector('input[name=pickupCity]:checked').value).toBe('tlv');
    expect(document.getElementById('pickupLegs').classList.contains('hidden')).toBe(false);
    expect(readPickup(document)).toBe('tlv_after');
  });

  it('round-trips a combined to+return value', () => {
    mountPickup();
    writePickup(document, 'rhv_to,rhv_after');
    expect(document.getElementById('pickupTo').checked).toBe(true);
    expect(readPickup(document)).toBe('rhv_to,rhv_after');
  });

  it('writing empty hides the legs again', () => {
    mountPickup();
    writePickup(document, 'tlv_after');
    writePickup(document, '');
    expect(document.getElementById('pickupLegs').classList.contains('hidden')).toBe(true);
    expect(readPickup(document)).toBe('');
  });
});

describe('initRsvpForm — edit flow', () => {
  function mountForm() {
    document.body.innerHTML = `
      <form id="rsvpForm">
        <input id="name" value="דן קדמי">
        <input id="phone" value="0509878804">
        <input type="radio" name="attending" value="yes" checked>
        <input type="radio" name="attending" value="no">
        <div id="whenComing"></div>
        <b id="adults">1</b><b id="children">0</b>
        <input type="radio" name="pickupCity" value="" checked>
        <input type="radio" name="pickupCity" value="tlv">
        <input type="radio" name="pickupCity" value="rhv">
        <div id="pickupLegs" class="hidden">
          <input type="checkbox" id="pickupTo">
          <input type="radio" name="pickupRet" value="" checked>
          <input type="radio" name="pickupRet" value="noafter">
          <input type="radio" name="pickupRet" value="after">
        </div>
        <textarea id="notes"></textarea>
        <button type="submit"></button>
        <p id="formMsg"></p>
      </form>
      <div id="rsvpDone" class="hidden">
        <p class="rsvp-thanks"></p>
        <button class="rsvp-edit"></button>
      </div>`;
  }

  beforeEach(() => {
    mountForm();
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
  });

  it('clears the "sending…" status when reopening via Edit after a submit', async () => {
    const guest = { code: 'DanKedmi', name: 'דן', fullName: 'דן קדמי', form: 'm' };
    initRsvpForm(document, { guest, getLang: () => 'he', onCollapse: () => {} });

    const form = document.getElementById('rsvpForm');
    const msgEl = document.getElementById('formMsg');

    // submit → shows "sending…", then collapses on success
    form.dispatchEvent(new Event('submit'));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

    // form is collapsed and the status text is cleared
    expect(form.style.display).toBe('none');
    expect(msgEl.textContent).toBe('');

    // reopen via Edit — status must still be empty (the bug: "sending…" lingered)
    document.querySelector('.rsvp-edit').click();
    expect(form.style.display).not.toBe('none');
    expect(msgEl.textContent).toBe('');
  });
});
