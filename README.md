# Telegram Watch & Earn Mini App

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and set `BOT_TOKEN` and a strong `ADMIN_KEY`.
3. Run `npm install`
4. Run `npm start`
5. Open `/admin` to add video URLs.
6. Open `/` to test the Mini App.

## Telegram setup
Create a bot with @BotFather. Host this app on HTTPS, then configure the bot's Mini App/menu button to point to the hosted `/` URL.

## Important production notes
- The sample `/api/complete` uses a 5-second client timer only as a DEMO. Do not use this mechanism for real monetary payouts.
- For real watch-to-earn rewards, integrate a rewarded-video/ad provider and verify its server-side completion callback before crediting coins.
- Add authentication/authorization for admin, HTTPS, rate limits, anti-abuse controls, and a proper withdrawal ledger before launch.
- Never commit your BotFather token or admin key to a public repository.
