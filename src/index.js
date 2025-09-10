// src/index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { timingSafeEqualHex, hmacHexSha256, formatUnits, maskAddress, fmtCurrency, fmtIDR } = require('./utils');
const dedup = require('./dedupStore');

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'changeme';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const SOURCE_NAME = process.env.SOURCE_NAME || 'Public Sale';
const USD_TO_IDR = Number(process.env.USD_TO_IDR || 15500);
const MASK_BUYER = /^true$/i.test(process.env.MASK_BUYER || 'true');
const WHALE_USD_THRESHOLD = Number(process.env.WHALE_USD_THRESHOLD || 10000);

const app = express();

app.post('/webhook/public-sale', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : '');
    const sentSig = req.get('x-webhook-signature') || req.get('x-signature') || '';

    const calcSig = hmacHexSha256(WEBHOOK_SECRET, rawBody);
    if (!timingSafeEqualHex(sentSig, calcSig)) {
      return res.status(401).json({ ok: false, error: 'invalid_signature' });
    }

    let data;
    try { data = JSON.parse(rawBody); }
    catch { return res.status(400).json({ ok: false, error: 'invalid_json' }); }

    if (data.event !== 'purchase.confirmed') return res.json({ ok: true, skipped: true });

    const orderId = String(data.orderId || '');
    if (!orderId) return res.status(400).json({ ok: false, error: 'missing_orderId' });
    if (dedup.has(orderId)) return res.json({ ok: true, dedup: true });

    const decimals = Number(data.tokenDecimals ?? 18);
    const amountTokenStr = formatUnits(String(data.amountToken ?? '0'), decimals);
    const amountToken = Number(amountTokenStr);
    const pricePerTokenUSD = data.pricePerTokenUSD != null ? Number(data.pricePerTokenUSD) : null;
    const usdTotal = pricePerTokenUSD != null ? (amountToken * pricePerTokenUSD) :
      (data.paidCurrency === 'USD' ? Number(data.paidAmount) : null);
    const idrTotal = usdTotal != null ? Math.round(usdTotal * USD_TO_IDR) : null;

    const buyerShown = MASK_BUYER ? maskAddress(data.buyer) : data.buyer;
    const whale = usdTotal != null && usdTotal >= WHALE_USD_THRESHOLD;

    if (DISCORD_WEBHOOK_URL) {
      await axios.post(DISCORD_WEBHOOK_URL, {
        username: 'Live Buy Bot',
        embeds: [{
          title: `${whale ? '🐋' : '🟢'} New Buy (${SOURCE_NAME})`,
          url: data.explorerTxUrl || undefined,
          description: 'Pembelian terkonfirmasi.',
          fields: [
            { name: 'Buyer', value: buyerShown ? '`' + buyerShown + '`' : 'N/A', inline: false },
            { name: 'Amount', value: `${amountTokenStr} ${data.tokenSymbol || ''}`.trim(), inline: true },
            { name: 'Est. USD', value: usdTotal != null ? (fmtCurrency(usdTotal, 'USD') || String(usdTotal)) : 'N/A', inline: true },
            { name: 'Est. IDR', value: idrTotal != null ? (fmtIDR(idrTotal) || String(idrTotal)) : 'N/A', inline: true },
            { name: 'Order ID', value: '`' + orderId + '`', inline: true }
          ],
          timestamp: data.timestamp || new Date().toISOString(),
          footer: { text: SOURCE_NAME }
        }]
      }, { timeout: 10000 });
    }

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const textLines = [
        `${whale ? '🐋' : '🟢'} New Buy (${SOURCE_NAME})`,
        buyerShown ? `Buyer: ${buyerShown}` : null,
        `Amount: ${amountTokenStr} ${data.tokenSymbol || ''}`.trim(),
        usdTotal != null ? `Est. USD: ${fmtCurrency(usdTotal, 'USD')}` : null,
        idrTotal != null ? `Est. IDR: ${fmtIDR(idrTotal)}` : null,
        data.explorerTxUrl ? `Tx: ${data.explorerTxUrl}` : null
      ].filter(Boolean).join('\n');

      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      await axios.post(tgUrl, {
        chat_id: TELEGRAM_CHAT_ID,
        text: textLines,
        disable_web_page_preview: true
      }, { timeout: 10000 });
    }

    dedup.add(orderId);
    return res.json({ ok: true });

  } catch (err) {
    console.error('Webhook error:', err?.response?.data || err.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Live Buy Bot on http://localhost:${PORT}`));
