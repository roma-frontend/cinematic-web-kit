import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from '@/lib/billing/provider';
import { renderInvoicePdf } from '@/lib/pdf';

function sign(payload: string, secret: string, t: number): string {
  const v1 = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

describe('verifyStripeSignature', () => {
  const secret = 'whsec_test';
  const payload = '{"id":"evt_1","type":"invoice.paid"}';

  it('accepts a fresh valid signature', () => {
    const now = Date.now();
    const t = Math.floor(now / 1000);
    expect(verifyStripeSignature(payload, sign(payload, secret, t), secret, 300, now)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const now = Date.now();
    const t = Math.floor(now / 1000);
    const header = sign(payload, secret, t);
    expect(verifyStripeSignature(payload + 'x', header, secret, 300, now)).toBe(false);
  });

  it('rejects the wrong secret', () => {
    const now = Date.now();
    const t = Math.floor(now / 1000);
    expect(verifyStripeSignature(payload, sign(payload, 'other', t), secret, 300, now)).toBe(false);
  });

  it('rejects a stale timestamp (replay window)', () => {
    const now = Date.now();
    const t = Math.floor(now / 1000) - 10_000;
    expect(verifyStripeSignature(payload, sign(payload, secret, t), secret, 300, now)).toBe(false);
  });

  it('rejects malformed headers', () => {
    expect(verifyStripeSignature(payload, '', secret)).toBe(false);
    expect(verifyStripeSignature(payload, 'garbage', secret)).toBe(false);
  });
});

describe('renderInvoicePdf', () => {
  it('produces a valid PDF buffer', () => {
    const pdf = renderInvoicePdf({
      invoiceNumber: 'CWK-2026-0001',
      date: '2026-07-07',
      sellerName: 'Cinematic Kit',
      buyerName: 'Jane Doe',
      buyerEmail: 'jane@x.com',
      planLabel: 'Studio',
      intervalLabel: 'Year',
      amountLabel: '$790',
      statusLabel: 'paid',
      labels: {
        invoice: 'Invoice', billTo: 'Bill to', description: 'Description', amount: 'Amount',
        total: 'Total', status: 'Status', date: 'Date', number: 'No', period: 'Period',
      },
    });
    expect(pdf.length).toBeGreaterThan(400);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.subarray(-6).toString('latin1')).toContain('%%EOF');
  });
});
