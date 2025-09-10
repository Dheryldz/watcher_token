// scripts/sendTest.js
// Kirim payload contoh ke /webhook/public-sale dengan signature HMAC otomatis.
// Hasilnya: bot akan post ke Discord/Telegram jika .env sudah diisi.
require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

const { WEBHOOK_SECRET } = process.env;
if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'changeme') {
  console.warn('⚠️  WEBHOOK_SECRET di .env masih "changeme". Disarankan ganti ke nilai acak untuk produksi.');
}

const payload = {
  event: 'purchase.confirmed',
  orderId: `ORD-${Date.now()}`,
  buyer: '0xBEEF...CAFE',
  tokenSymbol: 'MNDL',
  tokenDecimals: 18,
  amountToken: '1234500000000000000',
  pricePerTokenUSD: '0.2',
  timestamp: new Date().toISOString(),
  explorerTxUrl: 'https://example-explorer/tx/0xabc'
};

(async () => {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET || 'changeme')
    .update(body, 'utf8').digest('hex');

  const url = `http://localhost:${process.env.PORT || 3000}/webhook/public-sale`;
  console.log('→ POST', url);
  try {
    const resp = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig }
    });
    console.log('✓ Response:', resp.status, resp.data);
    console.log('Jika DISCORD_WEBHOOK_URL di .env terisi, cek channel Discord untuk pesan baru.');
  } catch (e) {
    console.error('✗ Error:', e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
})();
