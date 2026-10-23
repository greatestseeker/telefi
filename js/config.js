/* Edit this file to configure the app. */
window.CONFIG = {
  // JSON endpoint returning { stats: [{label,value}], pairs: [{base,quote,volume,price,change}] }.
  // Leave null to use the sample data below.
  apiUrl: null,
  useSampleData: true,
  // Public, keyless market feed used when apiUrl is not set.
  marketDataUrl: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,the-open-network&order=market_cap_desc&sparkline=false&price_change_percentage=24h',
  marketSyncIntervalMs: 60000,
  // Your bot's Mini App link, used to return users to the app after wallet approval.
  botUrl: 'https://t.me/YOUR_BOT/YOUR_APP',
  tonConnectManifestUrl: location.origin + '/tonconnect-manifest.json'
};

window.SAMPLE = {
  stats: [
    { label: 'TVL', value: '$48.2M' },
    { label: '24h Volume', value: '$9.4M' },
    { label: 'Users', value: '128K' }
  ],
  pairs: [
    { base: 'USDT', quote: 'ETH', volume: '$2.1M', price: '$3,412', change: 2.4 },
    { base: 'BTC', quote: 'USDT', volume: '$4.8M', price: '$97,820', change: 1.8 },
    { base: 'TON', quote: 'USDT', volume: '$1.3M', price: '$5.42', change: -0.9 }
  ]
};
