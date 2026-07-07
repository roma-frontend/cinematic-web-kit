// Minimal, dependency-free PDF writer — just enough to render a clean one-page
// invoice with headings, key/value rows and a total. We hand-build the PDF
// object graph (Catalog → Pages → Page → Content + Font) and a byte-accurate
// xref table. Text uses the built-in Helvetica fonts (no embedding needed), so
// output is tiny and every PDF viewer can open it.
//
// Scope is deliberately small: Latin text, lines, and rectangles. That covers
// invoices; it is NOT a general-purpose PDF library.

import 'server-only';

const A4 = { w: 595.28, h: 841.89 };

interface Op {
  toStream(): string;
}

/** Escape a string for a PDF literal ( ) string. */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export interface PdfText {
  x: number;
  y: number; // from top
  text: string;
  size?: number;
  bold?: boolean;
  color?: [number, number, number]; // 0..1
}
export interface PdfRect {
  x: number;
  y: number; // from top
  w: number;
  h: number;
  fill?: [number, number, number];
}
export interface PdfLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: [number, number, number];
  width?: number;
}

export class PdfDoc {
  private texts: PdfText[] = [];
  private rects: PdfRect[] = [];
  private lines: PdfLine[] = [];

  text(t: PdfText): this {
    this.texts.push(t);
    return this;
  }
  rect(r: PdfRect): this {
    this.rects.push(r);
    return this;
  }
  line(l: PdfLine): this {
    this.lines.push(l);
    return this;
  }

  private content(): string {
    const flipY = (y: number) => A4.h - y;
    const ops: string[] = [];
    // Rectangles first (backgrounds).
    for (const r of this.rects) {
      const [cr, cg, cb] = r.fill ?? [0, 0, 0];
      ops.push(`${cr} ${cg} ${cb} rg`);
      ops.push(`${r.x} ${flipY(r.y + r.h)} ${r.w} ${r.h} re f`);
    }
    for (const l of this.lines) {
      const [cr, cg, cb] = l.color ?? [0, 0, 0];
      ops.push(`${l.width ?? 1} w ${cr} ${cg} ${cb} RG`);
      ops.push(`${l.x1} ${flipY(l.y1)} m ${l.x2} ${flipY(l.y2)} l S`);
    }
    for (const t of this.texts) {
      const [cr, cg, cb] = t.color ?? [0, 0, 0];
      const font = t.bold ? '/F2' : '/F1';
      ops.push('BT');
      ops.push(`${cr} ${cg} ${cb} rg`);
      ops.push(`${font} ${t.size ?? 11} Tf`);
      ops.push(`1 0 0 1 ${t.x} ${flipY(t.y)} Tm`);
      ops.push(`(${esc(t.text)}) Tj`);
      ops.push('ET');
    }
    return ops.join('\n');
  }

  build(): Buffer {
    const content = this.content();
    const objects: string[] = [];
    // 1 Catalog, 2 Pages, 3 Page, 4 Content, 5 Font F1, 6 Font F2
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objects[3] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] ` +
      `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`;
    objects[4] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;
    objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    objects[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = Buffer.byteLength(pdf, 'latin1');
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefStart = Buffer.byteLength(pdf, 'latin1');
    const count = objects.length; // includes the free object 0
    pdf += `xref\n0 ${count}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, 'latin1');
  }
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string; // formatted
  sellerName: string;
  sellerNote?: string;
  buyerName: string;
  buyerEmail: string;
  planLabel: string;
  intervalLabel: string;
  periodLabel?: string;
  amountLabel: string; // e.g. "$29.00"
  statusLabel: string;
  currency?: string;
  labels: {
    invoice: string;
    billTo: string;
    description: string;
    amount: string;
    total: string;
    status: string;
    date: string;
    number: string;
    period: string;
  };
}

/** Render a styled one-page invoice PDF. */
export function renderInvoicePdf(d: InvoiceData): Buffer {
  const doc = new PdfDoc();
  const brand: [number, number, number] = [0.31, 0.275, 0.898]; // indigo #4F46E5
  const ink: [number, number, number] = [0.1, 0.12, 0.16];
  const muted: [number, number, number] = [0.45, 0.48, 0.53];
  const M = 56;

  // Header band.
  doc.rect({ x: 0, y: 0, w: A4.w, h: 96, fill: brand });
  doc.text({ x: M, y: 52, text: d.sellerName, size: 22, bold: true, color: [1, 1, 1] });
  if (d.sellerNote) doc.text({ x: M, y: 74, text: d.sellerNote, size: 10, color: [0.9, 0.9, 1] });
  doc.text({ x: A4.w - M - 160, y: 44, text: d.labels.invoice.toUpperCase(), size: 12, bold: true, color: [1, 1, 1] });
  doc.text({ x: A4.w - M - 160, y: 64, text: `${d.labels.number}: ${d.invoiceNumber}`, size: 10, color: [0.9, 0.9, 1] });

  let y = 150;
  doc.text({ x: M, y, text: `${d.labels.date}: ${d.date}`, size: 11, color: muted });
  y += 18;
  doc.text({ x: M, y, text: `${d.labels.status}: ${d.statusLabel}`, size: 11, color: muted });

  // Bill to.
  y += 40;
  doc.text({ x: M, y, text: d.labels.billTo, size: 12, bold: true, color: ink });
  y += 20;
  doc.text({ x: M, y, text: d.buyerName || d.buyerEmail, size: 11, color: ink });
  y += 16;
  if (d.buyerName) doc.text({ x: M, y, text: d.buyerEmail, size: 10, color: muted });

  // Line-items table.
  y += 40;
  doc.rect({ x: M, y: y - 14, w: A4.w - 2 * M, h: 26, fill: [0.96, 0.97, 0.99] });
  doc.text({ x: M + 12, y: y + 4, text: d.labels.description, size: 10, bold: true, color: ink });
  doc.text({ x: A4.w - M - 90, y: y + 4, text: d.labels.amount, size: 10, bold: true, color: ink });
  y += 34;
  doc.text({ x: M + 12, y, text: `${d.planLabel} — ${d.intervalLabel}`, size: 11, color: ink });
  doc.text({ x: A4.w - M - 90, y, text: d.amountLabel, size: 11, color: ink });
  if (d.periodLabel) {
    y += 16;
    doc.text({ x: M + 12, y, text: `${d.labels.period}: ${d.periodLabel}`, size: 9, color: muted });
  }

  // Total.
  y += 28;
  doc.line({ x1: M, y1: y, x2: A4.w - M, y2: y, color: [0.85, 0.87, 0.91], width: 1 });
  y += 24;
  doc.text({ x: A4.w - M - 200, y, text: d.labels.total, size: 13, bold: true, color: ink });
  doc.text({ x: A4.w - M - 90, y, text: d.amountLabel, size: 13, bold: true, color: brand });

  // Footer.
  doc.text({
    x: M,
    y: A4.h - 48,
    text: `${d.sellerName} · ${d.invoiceNumber}`,
    size: 8,
    color: muted,
  });
  return doc.build();
}
