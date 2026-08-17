import { describe, it, expect } from 'vitest';
import { summarizeDelivery } from '../api/delivery.js';

describe('summarizeDelivery', () => {
  it('collapses a message to its furthest-along status', () => {
    // Same recipient, three events — should report "read" (the best reached).
    const out = summarizeDelivery([
      { recipient_phone: '972500000001', status: 'read', at: '2026-08-13T09:00:03Z' },
      { recipient_phone: '972500000001', status: 'delivered', at: '2026-08-13T09:00:02Z' },
      { recipient_phone: '972500000001', status: 'sent', at: '2026-08-13T09:00:01Z' },
    ]);
    expect(out.total).toBe(1);
    expect(out.guests[0].status).toBe('read');
    expect(out.counts.read).toBe(1);
  });

  it('surfaces failures with their reason', () => {
    const out = summarizeDelivery([
      { recipient_phone: '972500000002', status: 'sent', at: '2026-08-13T09:00:01Z' },
      { recipient_phone: '972500000002', status: 'failed', error_code: 131049,
        error_title: 'healthy ecosystem engagement', at: '2026-08-13T09:00:05Z' },
    ]);
    expect(out.guests[0].status).toBe('failed');
    expect(out.guests[0].error).toContain('131049');
    expect(out.counts.failed).toBe(1);
  });

  it('a later successful resend overrides an earlier failed message', () => {
    // Same number: MARKETING invite failed, then a UTILITY resend delivered.
    const out = summarizeDelivery([
      { recipient_phone: '972500000003', wa_message_id: 'mktg', status: 'failed',
        error_code: 131049, error_title: 'healthy ecosystem engagement', at: '2026-08-17T10:00:00Z' },
      { recipient_phone: '972500000003', wa_message_id: 'util', status: 'sent', at: '2026-08-17T12:00:00Z' },
      { recipient_phone: '972500000003', wa_message_id: 'util', status: 'delivered', at: '2026-08-17T12:00:05Z' },
    ]);
    expect(out.total).toBe(1);
    expect(out.guests[0].status).toBe('delivered');
    expect(out.counts.delivered).toBe(1);
    expect(out.counts.failed).toBe(0);
  });

  it('keeps failed when the most recent message is the one that failed', () => {
    // Utility resend also failed after an earlier failure → still failed.
    const out = summarizeDelivery([
      { recipient_phone: '972500000004', wa_message_id: 'mktg', status: 'failed',
        error_code: 131049, error_title: 'throttle', at: '2026-08-17T10:00:00Z' },
      { recipient_phone: '972500000004', wa_message_id: 'util', status: 'failed',
        error_code: 131026, error_title: 'undeliverable', at: '2026-08-17T12:00:00Z' },
    ]);
    expect(out.guests[0].status).toBe('failed');
    expect(out.guests[0].error).toContain('131026');
    expect(out.counts.failed).toBe(1);
  });

  it('counts each recipient once across statuses', () => {
    const out = summarizeDelivery([
      { recipient_phone: '111', status: 'delivered', at: '2026-08-13T09:00:01Z' },
      { recipient_phone: '222', status: 'sent', at: '2026-08-13T09:00:02Z' },
      { recipient_phone: '222', status: 'delivered', at: '2026-08-13T09:00:03Z' },
    ]);
    expect(out.total).toBe(2);
    expect(out.counts.delivered).toBe(2);
    expect(out.counts.sent).toBe(0);
  });
});
