Public Sale Live Buy Bot

Ready-to-use package for public sale notifications:

Website → Webhook → Discord/Telegram
(Optional) On-chain Watcher (EVM)

How to Use (super short)

cd buy-bot-public-sale
npm install
cp .env.example .env
# 1) Open .env → paste your DISCORD_WEBHOOK_URL (required for Discord testing)
# 2) Run the server:
npm start


Send a sample test transaction (it will appear in your Discord):

npm run test:webhook


If you later want to monitor directly from the contract (on-chain):

# Fill in RPC_WSS, SALE_CONTRACT, EVENT_SIGNATURE in .env
npm run watch
watcher_token
