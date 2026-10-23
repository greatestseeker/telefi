(() => {
  'use strict';
  const tg = window.Telegram?.WebApp;
  const inTelegram = Boolean(tg && tg.initData);
  const $ = (sel) => document.querySelector(sel);

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // textContent: safe for remote data
    return n;
  }
  const haptic = (style = 'light') => tg?.HapticFeedback?.impactOccurred?.(style);
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- Telegram setup ---------- */
  function syncTheme() {
    const bg = tg.themeParams?.bg_color || '#0f172a';
    try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } catch (_) { /* older clients */ }
  }
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.disableVerticalSwipes?.(); } catch (_) {}
    syncTheme();
    tg.onEvent('themeChanged', syncTheme);
  }
  if (inTelegram) {
    document.body.classList.add('in-tg');
    tg.MainButton.setParams({ text: 'Start Trading', is_visible: true });
    tg.MainButton.onClick(() => openView('swap'));
  }

  /* ---------- navigation placeholders ---------- */
  const VIEWS = { swap: 'Swap', earn: 'Earn', liquidity: 'Liquidity', bridge: 'Bridge' };
  function openView(name) {
    haptic();
    // TODO: replace with real routing, e.g. location.hash = '#/' + name
    toast((VIEWS[name] || 'This page') + ' is coming soon');
  }
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action]');
    if (trigger) openView(trigger.dataset.action);
  });

  /* ---------- wallet (TON Connect) ---------- */
  const walletBtn = $('#walletBtn');
  let tonUI = null;
  function short(addr) { return addr.slice(0, 4) + '…' + addr.slice(-4); }
  function renderWallet(wallet) {
    if (!wallet) { walletBtn.textContent = 'Connect'; return; }
    let addr = wallet.account.address;
    try { addr = window.TON_CONNECT_UI.toUserFriendlyAddress(addr); } catch (_) {}
    walletBtn.textContent = short(addr);
  }
  function initWallet() {
    if (!window.TON_CONNECT_UI) return;
    tonUI = new window.TON_CONNECT_UI.TonConnectUI({
      manifestUrl: CONFIG.tonConnectManifestUrl,
      actionsConfiguration: { twaReturnUrl: CONFIG.botUrl }
    });
    tonUI.onStatusChange(renderWallet);
  }
  walletBtn.addEventListener('click', () => {
    haptic();
    if (!tonUI) return toast('Wallet connection is unavailable right now');
    tonUI.connected ? tonUI.disconnect() : tonUI.openModal();
  });
  window.addEventListener('load', initWallet);

  /* ---------- data + rendering ---------- */
  const COLORS = { USDT: '#26A17B', ETH: '#627EEA', BTC: '#F7931A', TON: '#0088CC' };
  const GLYPH = { USDT: '₮', ETH: 'Ξ', BTC: '₿', TON: 'T' };
  const SYMBOLS = { bitcoin: 'BTC', ethereum: 'ETH', 'the-open-network': 'TON' };
  const marketStatus = $('#marketStatus');
  const marketStatusText = $('#marketStatusText');
  const marketUpdated = $('#marketUpdated');
  const refreshMarkets = $('#refreshMarkets');
  let marketTimer;
  let lastMarketSync = null;
  let loadingMarkets = false;

  const icon = (sym) => {
    const n = el('span', 'ico', GLYPH[sym] || sym.charAt(0));
    n.style.background = COLORS[sym] || '#475569';
    return n;
  };

  const compactUsd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  });
  const priceUsd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function setMarketStatus(state, text) {
    marketStatus.dataset.state = state;
    marketStatusText.textContent = text;
  }

  function formatSyncTime(date) {
    return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function normalizeMarketData(coins) {
    return coins.map((coin) => ({
      base: SYMBOLS[coin.id] || String(coin.symbol || '').toUpperCase(),
      quote: 'USD',
      volume: compactUsd.format(Number(coin.total_volume) || 0),
      price: priceUsd.format(Number(coin.current_price) || 0),
      change: Number(coin.price_change_percentage_24h) || 0
    }));
  }

  function renderStats(stats) {
    const box = $('#stats');
    box.replaceChildren(...stats.map((s) => {
      const c = el('div', 'stat');
      c.append(el('b', '', s.value), el('small', '', s.label));
      return c;
    }));
  }

  function renderPairs(pairs) {
    const box = $('#pairs');
    if (!pairs.length) return box.replaceChildren(el('p', 'empty', 'No pairs to show yet.'));
    box.replaceChildren(...pairs.map((p) => {
      const row = el('button', 'pair');
      row.type = 'button';
      row.dataset.action = 'swap';
      const icons = el('span', 'icons');
      icons.append(icon(p.base), icon(p.quote));
      const name = el('div');
      name.append(el('b', '', `${p.base} / ${p.quote}`), el('small', '', `Vol ${p.volume}`));
      const left = el('div', 'pair-l');
      left.append(icons, name);
      const right = el('div', 'pair-r');
      const change = Number(p.change);
      const up = change >= 0;
      right.append(el('b', '', p.price),
        el('small', up ? 'up' : 'down', `${up ? '+' : ''}${change.toFixed(2)}%`));
      row.append(left, right);
      return row;
    }));
  }

  function scheduleMarketSync() {
    clearTimeout(marketTimer);
    marketTimer = setTimeout(loadData, Math.max(15000, Number(CONFIG.marketSyncIntervalMs) || 60000));
  }

  async function loadData({ manual = false } = {}) {
    if (loadingMarkets) return;
    loadingMarkets = true;
    refreshMarkets.disabled = true;
    refreshMarkets.classList.add('is-loading');
    setMarketStatus('syncing', manual ? 'Refreshing' : 'Syncing');
    if (!lastMarketSync) {
      $('#stats').replaceChildren(...[1, 2, 3].map(() => el('div', 'skeleton')));
      $('#pairs').replaceChildren(el('div', 'skeleton'), el('div', 'skeleton'));
    }
    try {
      let stats = SAMPLE.stats;
      let pairs;
      if (CONFIG.apiUrl) {
        const res = await fetch(CONFIG.apiUrl, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        stats = data.stats || [];
        pairs = data.pairs || [];
        $('#sampleTag').hidden = true;
      } else {
        const res = await fetch(CONFIG.marketDataUrl, {
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        pairs = normalizeMarketData(await res.json());
        $('#sampleTag').hidden = false;      // platform stats remain sample figures
      }
      renderStats(stats.length ? stats : [{ label: 'TVL', value: '—' }, { label: '24h Volume', value: '—' }, { label: 'Users', value: '—' }]);
      renderPairs(pairs);
      lastMarketSync = new Date();
      setMarketStatus('live', 'Live');
      marketUpdated.textContent = `Updated ${formatSyncTime(lastMarketSync)} · Auto-refreshes every minute`;
      if (manual) toast('Market prices updated');
    } catch (err) {
      console.error(err);
      setMarketStatus('stale', lastMarketSync ? 'Delayed' : 'Offline');
      if (lastMarketSync) {
        marketUpdated.textContent = `Last updated ${formatSyncTime(lastMarketSync)} · Reconnecting…`;
      } else if (CONFIG.useSampleData) {
        renderStats(SAMPLE.stats);
        renderPairs(SAMPLE.pairs);
        $('#sampleTag').hidden = false;
        marketUpdated.textContent = 'Showing sample prices · Live feed unavailable';
      } else {
        renderStats([{ label: 'TVL', value: '—' }, { label: '24h Volume', value: '—' }, { label: 'Users', value: '—' }]);
        $('#pairs').replaceChildren(el('p', 'empty', 'Could not load market data.'));
        marketUpdated.textContent = 'Live feed unavailable · Tap refresh to retry';
      }
    } finally {
      loadingMarkets = false;
      refreshMarkets.disabled = false;
      refreshMarkets.classList.remove('is-loading');
      scheduleMarketSync();
    }
  }

  refreshMarkets.addEventListener('click', () => {
    haptic();
    loadData({ manual: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (!lastMarketSync || Date.now() - lastMarketSync.getTime() > CONFIG.marketSyncIntervalMs)) {
      loadData();
    }
  });
  loadData();
})();
