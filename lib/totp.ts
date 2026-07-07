// RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) with zero dependencies — used
// as an optional second factor that replaces the emailed login code when the
// user has enrolled an authenticator app. Secrets are stored base32-encoded.

import { createHmac, randomBytes } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New random base32 secret (default 20 bytes / 160 bits — the RFC default). */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, '0');
}

/** The 6-digit code for a secret at a given time. */
export function totpAt(secret: string, timeMs: number = Date.now(), stepSec = 30): string {
  return hotp(base32Decode(secret), Math.floor(timeMs / 1000 / stepSec));
}

/** Verify a submitted token against the secret, allowing ±`window` steps of clock drift. */
export function verifyTotp(secret: string, token: string, window = 1, timeMs: number = Date.now(), stepSec = 30): boolean {
  if (!/^\d{6}$/.test((token ?? '').trim())) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(timeMs / 1000 / stepSec);
  const t = token.trim();
  for (let e = -window; e <= window; e++) {
    if (hotp(key, counter + e) === t) return true;
  }
  return false;
}

/** otpauth:// URI for QR/manual entry in an authenticator app. */
export function otpauthUrl(secret: string, account: string, issuer = 'Builder Studio'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}
