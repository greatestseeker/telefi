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
  const icon = (sym) => {
    const n = el('span', 'ico', GLYPH[sym] || sym.charAt(0));
    n.style.background = COLORS[sym] || '#475569';
    return n;
  };

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
      const up = Number(p.change) >= 0;
      right.append(el('b', '', p.price),
        el('small', up ? 'up' : 'down', `${up ? '+' : ''}${Number(p.change).toFixed(1)}%`));
      row.append(left, right);
      return row;
    }));
  }

  async function loadData() {
    $('#stats').replaceChildren(...[1, 2, 3].map(() => el('div', 'skeleton')));
    $('#pairs').replaceChildren(el('div', 'skeleton'), el('div', 'skeleton'));
    try {
      let data;
      if (CONFIG.apiUrl) {
        const res = await fetch(CONFIG.apiUrl, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
      } else if (CONFIG.useSampleData) {
        data = SAMPLE;
        $('#sampleTag').hidden = false;      // sample figures are always labelled
      } else {
        data = { stats: [], pairs: [] };
      }
      renderStats(data.stats?.length ? data.stats : [{ label: 'TVL', value: '—' }, { label: '24h Volume', value: '—' }, { label: 'Users', value: '—' }]);
      renderPairs(data.pairs || []);
    } catch (err) {
      console.error(err);
      renderStats([{ label: 'TVL', value: '—' }, { label: '24h Volume', value: '—' }, { label: 'Users', value: '—' }]);
      $('#pairs').replaceChildren(el('p', 'empty', 'Could not load market data.'));
    }
  }
  loadData();
})();
