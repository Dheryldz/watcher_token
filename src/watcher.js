// src/watcher.js
require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');
const { formatUnits, maskAddress } = require('./utils');

const {
  RPC_WSS, CHAIN_ID, SALE_CONTRACT,
  EVENT_SIGNATURE = 'event Purchase(address indexed buyer,uint256 amountToken,uint256 paidAmount)',
  TOKEN_SYMBOL = 'TOKEN', TOKEN_DECIMALS = '18', CONFIRMATIONS = '5',
  DISCORD_WEBHOOK_URL = '', TELEGRAM_BOT_TOKEN = '', TELEGRAM_CHAT_ID = '',
  EXPLORER_BASE = '', MASK_BUYER = 'true'
} = process.env;

if (!RPC_WSS) throw new Error('RPC_WSS belum diisi');
if (!SALE_CONTRACT) throw new Error('SALE_CONTRACT belum diisi');

const DEC = Number(TOKEN_DECIMALS);
const CONF = Number(CONFIRMATIONS);
const MASK = /^true$/i.test(MASK_BUYER || 'true');

function explorerTx(tx) {
  if (!EXPLORER_BASE) return undefined;
  let base = EXPLORER_BASE;
  if (!base.endsWith('/')) base += '/';
  return `${base}tx/${tx}`;
}

async function announce({ buyer, amountTokenStr, txHash }) {
  const buyerShown = MASK ? maskAddress(buyer) : String(buyer);
  const txUrl = explorerTx(txHash);

  if (DISCORD_WEBHOOK_URL) {
    await axios.post(DISCORD_WEBHOOK_URL, {
      username: 'Live Buy Bot',
      embeds: [{
        title: '🟢 New On-Chain Buy',
        url: txUrl,
        fields: [
          { name: 'Buyer', value: '`' + buyerShown + '`' },
          { name: 'Amount', value: `${amountTokenStr} ${TOKEN_SYMBOL}` }
        ],
        footer: { text: `Confirmations: ${CONF}` },
        timestamp: new Date().toISOString()
      }]
    }, { timeout: 10000 });
  }

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const textLines = [
      '🟢 On-Chain Buy',
      `Buyer: ${buyerShown}`,
      `Amount: ${amountTokenStr} ${TOKEN_SYMBOL}`,
      txUrl ? `Tx: ${txUrl}` : null
    ].filter(Boolean).join('\n');
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: textLines,
      disable_web_page_preview: true
    }, { timeout: 10000 });
  }
}

async function run() {
  const provider = new ethers.WebSocketProvider(RPC_WSS, CHAIN_ID ? Number(CHAIN_ID) : undefined);
  const iface = new ethers.Interface([EVENT_SIGNATURE]);
  const eventName = [...iface.events.keys()][0];
  const topic0 = iface.getEventTopic(eventName);

  console.log(`Watching "${eventName}" on ${SALE_CONTRACT}`);
  console.log(`Confirmations: ${CONF}`);

  const pending = new Map();

  provider.on({ address: SALE_CONTRACT, topics: [topic0] }, (log) => {
    try {
      const parsed = iface.parseLog(log);
      pending.set(log.transactionHash, { blockNumber: log.blockNumber, parsed });
      console.log(`• Seen ${eventName} tx=${log.transactionHash} @${log.blockNumber}`);
    } catch (e) {
      console.error('parseLog error:', e.message);
    }
  });

  provider.on('block', async (bn) => {
    for (const [txHash, item] of [...pending]) {
      if (bn - item.blockNumber >= CONF) {
        try {
          const args = item.parsed.args;
          const buyer = args.buyer ?? args[0];
          const amountToken = args.amountToken ?? args[1];
          const amountTokenStr = formatUnits(String(amountToken), DEC);
          await announce({ buyer, amountTokenStr, txHash });
          pending.delete(txHash);
          console.log(`✓ Announced tx=${txHash}`);
        } catch (e) {
          console.error('announce error:', e?.response?.data || e.message);
        }
      }
    }
  });

  provider.on('error', (e) => console.error('WS error:', e.message));
  provider.on('close', () => { console.error('WS closed'); process.exit(1); });
}

run().catch((e) => { console.error('fatal:', e); process.exit(1); });
