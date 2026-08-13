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
