// Styled XLSX workbooks for the superadmin exports: brand-colored header row,
// zebra striping, thin borders, autofilter and content-sized columns — so a
// downloaded report is presentable without any manual formatting.

import 'server-only';
import XLSX from 'xlsx-js-style';

const BRAND = '4F46E5'; // header fill, close to the platform primary (oklch 0.55 0.18 265)
const BORDER = 'D9DEE8';
const ZEBRA = 'F5F7FB';

export function buildStyledWorkbook(sheetName: string, header: string[], rows: unknown[][]): Buffer {
  const data = [header, ...rows.map((r) => r.map((v) => v ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(ws['!ref']!);
  const thin = { style: 'thin', color: { rgb: BORDER } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] ?? (ws[addr] = { v: '', t: 's' });
      cell.s =
        r === 0
          ? {
              fill: { fgColor: { rgb: BRAND } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
              border,
              alignment: { vertical: 'center' },
            }
          : {
              border,
              alignment: { vertical: 'center' },
              ...(r % 2 === 0 ? { fill: { fgColor: { rgb: ZEBRA } } } : {}),
            };
    }
  }

  // Size each column to its content (sampled), within sane bounds.
  ws['!cols'] = header.map((h, c) => {
    let w = String(h).length;
    for (let r = 0; r < Math.min(rows.length, 500); r++) {
      w = Math.max(w, String(rows[r][c] ?? '').length);
    }
    return { wch: Math.min(Math.max(w + 2, 10), 60) };
  });
  ws['!rows'] = [{ hpt: 24 }];
  ws['!autofilter'] = { ref: ws['!ref']! };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
