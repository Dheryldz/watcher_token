# Public Sale Live Buy Bot — Plug & Play

Paket siap pakai untuk notifikasi **public sale**:
- **Website → Webhook → Discord/Telegram**
- (Opsional) **On‑chain Watcher** (EVM)

## Cara Pakai (super singkat)
```bash
cd buy-bot-public-sale
npm install
cp .env.example .env
# 1) Buka .env → tempelkan DISCORD_WEBHOOK_URL (wajib untuk uji Discord)
# 2) Jalankan server:
npm start

# Kirim contoh transaksi uji (akan masuk ke Discord-mu)
npm run test:webhook
```

Kalau nanti mau pantau langsung dari kontrak (on‑chain):
```bash
# Isi RPC_WSS, SALE_CONTRACT, EVENT_SIGNATURE di .env
npm run watch
```
# watcher_token
