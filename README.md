# TeleFi – Telegram Mini App

```
telefi/
├── index.html
├── tonconnect-manifest.json   edit url / iconUrl before deploying
├── css/style.css
└── js/
    ├── config.js              apiUrl, bot link, sample data
    └── app.js                 Telegram setup, TON Connect, rendering
```

## Run / deploy
1. Host the folder over HTTPS (Netlify, Vercel, GitHub Pages, Cloudflare Pages).
2. Edit `tonconnect-manifest.json` and `js/config.js` with your real domain and bot link.
3. In @BotFather: /newapp (or /setmenubutton) and point it at your HTTPS URL.
4. Outside Telegram the page still loads, so you can preview it in a normal browser.

## Before going live
- Set `apiUrl` to a real endpoint and `useSampleData: false`. Only show figures your backend can verify.
- If you trust the user's identity anywhere, validate `Telegram.WebApp.initData` on your server. Never trust `initDataUnsafe` on the client.
- Replace the "coming soon" `openView()` with real routes.
