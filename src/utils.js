// src/utils.js
const crypto = require('crypto');

function timingSafeEqualHex(a, b) {
  const A = Buffer.from(a, 'utf8');
  const B = Buffer.from(b, 'utf8');
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function hmacHexSha256(secret, raw) {
  return crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
}

function formatUnits(amountStr, decimals = 18) {
  try {
    const n = BigInt(amountStr);
    const d = BigInt(10) ** BigInt(decimals);
    const whole = n / d;
    const frac = n % d;
    if (frac === 0n) return whole.toString();
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${whole.toString()}.${fracStr}`;
  } catch (e) {
    return amountStr;
  }
}

function maskAddress(addr) {
  if (!addr || typeof addr !== 'string') return addr;
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtCurrency(num, currency = 'USD') {
  if (num == null || isNaN(Number(num))) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(Number(num));
}

function fmtIDR(num) {
  if (num == null || isNaN(Number(num))) return null;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Math.round(Number(num)));
}

module.exports = { timingSafeEqualHex, hmacHexSha256, formatUnits, maskAddress, fmtCurrency, fmtIDR };
