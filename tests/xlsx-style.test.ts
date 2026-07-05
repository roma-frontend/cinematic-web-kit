import { describe, it, expect } from 'vitest';
import XLSX from 'xlsx-js-style';
import { buildStyledWorkbook } from '@/lib/xlsx-style';

describe('buildStyledWorkbook', () => {
  it('produces a readable xlsx buffer with the given header and rows', () => {
    const buf = buildStyledWorkbook('Report', ['Name', 'Email'], [
      ['Alice', 'a@example.com'],
      ['Bob', 'b@example.com'],
    ]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);

    // Round-trip: read it back and confirm the cells landed.
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws.A1.v).toBe('Name');
    expect(ws.B1.v).toBe('Email');
    expect(ws.A2.v).toBe('Alice');
    expect(ws.B3.v).toBe('b@example.com');
  });

  it('builds successfully with several body rows (exercises header + zebra styling)', () => {
    const buf = buildStyledWorkbook('S', ['H'], [['r1'], ['r2'], ['r3']]);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws.A1.v).toBe('H');
    expect(ws.A4.v).toBe('r3');
  });

  it('coerces null/undefined cells to empty strings', () => {
    const buf = buildStyledWorkbook('S', ['A', 'B'], [[null, undefined]]);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws.A2.v).toBe('');
    expect(ws.B2.v).toBe('');
  });

  it('truncates an over-long sheet name to 31 chars', () => {
    const long = 'x'.repeat(50);
    const buf = buildStyledWorkbook(long, ['A'], [['1']]);
    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames[0].length).toBe(31);
  });

  it('handles an empty row set', () => {
    const buf = buildStyledWorkbook('Empty', ['Only'], []);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws.A1.v).toBe('Only');
  });
});
