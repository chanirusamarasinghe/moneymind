// ═══════════════════════════════════════════
//  MoneyMind v3.0 — app.js
//  Firebase Edition · Vintrex Solutions
// ═══════════════════════════════════════════

// ─── FIREBASE ───────────────────────────────
firebase.initializeApp({
  apiKey:            "AIzaSyCMyNWOtU_7CnEc9N7Euf8mS2aInWm-zas",
  authDomain:        "vintrex-solutions.firebaseapp.com",
  projectId:         "vintrex-solutions",
  storageBucket:     "vintrex-solutions.firebasestorage.app",
  messagingSenderId: "573555947134",
  appId:             "1:573555947134:web:b2a851dc2e6faadc204a2f"
});
const auth = firebase.auth();
const db   = firebase.firestore();
let me = null;

// ─── CURRENCIES ─────────────────────────────
const CURRENCIES = [
  { code:'USD', sym:'$',   name:'US Dollar' },
  { code:'EUR', sym:'€',   name:'Euro' },
  { code:'GBP', sym:'£',   name:'British Pound' },
  { code:'LKR', sym:'Rs',  name:'Sri Lankan Rupee' },
  { code:'INR', sym:'₹',   name:'Indian Rupee' },
  { code:'JPY', sym:'¥',   name:'Japanese Yen' },
  { code:'AUD', sym:'A$',  name:'Australian Dollar' },
  { code:'CAD', sym:'C$',  name:'Canadian Dollar' },
  { code:'SGD', sym:'S$',  name:'Singapore Dollar' },
  { code:'AED', sym:'د.إ', name:'UAE Dirham' },
];

// ─── CATEGORIES ─────────────────────────────
const CATS = {
  income: [
    { id:'salary',     label:'Salary',     icon:'💼', color:'#22d3a5' },
    { id:'freelance',  label:'Freelance',  icon:'💻', color:'#6c63ff' },
    { id:'business',   label:'Business',   icon:'🏢', color:'#a78bfa' },
    { id:'investment', label:'Investment', icon:'📈', color:'#fbbf24' },
    { id:'gift',       label:'Gift',       icon:'🎁', color:'#f472b6' },
    { id:'other_in',   label:'Other',      icon:'💰', color:'#2dd4bf' },
  ],
  expense: [
    { id:'food',      label:'Food',          icon:'🍔', color:'#fb923c' },
    { id:'transport', label:'Transport',     icon:'🚗', color:'#6c63ff' },
    { id:'housing',   label:'Housing',       icon:'🏠', color:'#a78bfa' },
    { id:'health',    label:'Health',        icon:'💊', color:'#ff6b6b' },
    { id:'shopping',  label:'Shopping',      icon:'🛍️', color:'#f472b6' },
    { id:'education', label:'Education',     icon:'📚', color:'#22d3a5' },
    { id:'entertain', label:'Entertainment', icon:'🎬', color:'#fbbf24' },
    { id:'travel',    label:'Travel',        icon:'✈️', color:'#2dd4bf' },
    { id:'utilities', label:'Utilities',     icon:'⚡', color:'#fb923c' },
    { id:'other_ex',  label:'Other',         icon:'📦', color:'#94a3b8' },
  ]
};
function getAllCategories() {
  return [...CATS.income, ...CATS.expense, ...(S.customCategories || [])];
}
function getCategories(type) {
  const custom = (S.customCategories || []).filter(c => c.type === type);
  return [...(CATS[type] || []), ...custom];
}
function getCat(id) {
  return getAllCategories().find(c=>c.id===id) || {id,label:id,icon:'📋',color:'#94a3b8'};
}

// ─── STATE ───────────────────────────────────
let S = {
  currency: null,
  accounts: [],
  transactions: [],
  budgets: [],
  customCategories: [],
  incomeSplits: [],
  page: 'dashboard',
};

// ─── CHART REFS ──────────────────────────────
let chartPie=null, chartBar=null, chartAnaPie=null, chartAnaBar=null, chartAnaLine=null;

// ════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════
auth.onAuthStateChanged(async user => {
  if (user) {
    me = user;
    showLoading('Loading your data…');
    await loadData();
    hideLoading();
    g('login-screen').classList.add('hidden');
    g('app').classList.remove('hidden');
    if (!S.currency) showOnboarding();
    else { hideOnboarding(); boot(); }
  } else {
    me = null;
    g('login-screen').classList.remove('hidden');
    g('app').classList.add('hidden');
    hideLoading();
  }
});

function signInGoogle() {
  const btn = g('google-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(e => {
      toast('Sign-in failed. Try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg> Continue with Google`;
    });
}

async function signOut() {
  if (!confirm('Sign out?')) return;
  await auth.signOut();
  S = { currency:null, transactions:[], budgets:[], incomeSplits:[], page:'dashboard' };
}

// ════════════════════════════════════════════
//  LOADING
// ════════════════════════════════════════════
function showLoading(msg) {
  g('loading-screen').style.display = 'flex';
  const fill = g('loading-screen').querySelector('.load-fill');
  if (fill) fill.style.animation = 'none'; // reset
  setTimeout(() => { if (fill) fill.style.animation = 'load-progress 1.5s ease forwards'; }, 10);
}
function hideLoading() {
  setTimeout(() => { g('loading-screen').style.display = 'none'; }, 800);
}

// ════════════════════════════════════════════
//  FIRESTORE — LOAD & SAVE
// ════════════════════════════════════════════
function uref() { return db.collection('users').doc(me.uid); }

function loadData() {
  return new Promise((resolve, reject) => {
    let pLoaded=false, tLoaded=false, bLoaded=false, cLoaded=false, aLoaded=false;
    
    async function check() { 
      if (pLoaded && tLoaded && bLoaded && cLoaded && aLoaded) {
        if (S.accounts.length === 0) {
          const defAcc = { id: 'a_'+uid(), name: 'Main Account', icon: '🏦', color: '#6c63ff' };
          S.accounts.push(defAcc);
          await uref().collection('accounts').doc(defAcc.id).set(defAcc);
        }
        let migrated = false;
        S.transactions.forEach(t => {
          if (!t.accountId && S.accounts.length > 0) { t.accountId = S.accounts[0].id; migrated = true; saveTx(t); }
        });
        if (migrated) toast('Transactions migrated to Main Account.', 'info');
        resolve(); 
      } 
    }

    const errHandler = (e) => { console.error(e); toast('Failed to load data.', 'error'); reject(e); };

    uref().collection('settings').doc('prefs').onSnapshot(snap => {
      if (snap.exists) {
        const d = snap.data();
        S.currency = d.currency || null;
        if (d.incomeSplits) S.incomeSplits = d.incomeSplits;
      }
      if (!pLoaded) { pLoaded=true; check(); } else if (S.page) { updateUserUI(); renderPage(S.page); }
    }, errHandler);

    uref().collection('transactions').onSnapshot(snap => {
      S.transactions = snap.docs.map(d => d.data());
      S.transactions.sort((a,b) => new Date(b.date)-new Date(a.date));
      if (!tLoaded) { tLoaded=true; check(); } else if (S.page) renderPage(S.page);
    }, errHandler);

    uref().collection('budgets').onSnapshot(snap => {
      S.budgets = snap.docs.map(d => d.data());
      if (!bLoaded) { bLoaded=true; check(); } else if (S.page) renderPage(S.page);
    }, errHandler);

    uref().collection('categories').onSnapshot(snap => {
      S.customCategories = snap.docs.map(d => d.data());
      if (!cLoaded) { cLoaded=true; check(); } else if (S.page) renderPage(S.page);
    }, errHandler);

    uref().collection('accounts').onSnapshot(snap => {
      S.accounts = snap.docs.map(d => d.data());
      if (!aLoaded) { aLoaded=true; check(); } else if (S.page) renderPage(S.page);
    }, errHandler);
  });
}

async function savePref() {
  try { await uref().collection('settings').doc('prefs').set({ currency: S.currency, incomeSplits: S.incomeSplits }, { merge:true }); }
  catch(e) { console.error(e); }
}

async function saveTx(tx) {
  try { await uref().collection('transactions').doc(tx.id).set(tx); }
  catch(e) { toast('Sync failed.', 'error'); }
}

async function delTx(id) {
  try { await uref().collection('transactions').doc(id).delete(); }
  catch(e) { toast('Delete failed.', 'error'); }
}

async function saveBudget(b) {
  try { await uref().collection('budgets').doc(b.id).set(b); }
  catch(e) { toast('Sync failed.', 'error'); }
}

async function delBudget(id) {
  try { await uref().collection('budgets').doc(id).delete(); }
  catch(e) { toast('Delete failed.', 'error'); }
}

async function saveCategory(cat) {
  try { await uref().collection('categories').doc(cat.id).set(cat); }
  catch(e) { toast('Sync failed.', 'error'); }
}

async function delCategory(id) {
  try { await uref().collection('categories').doc(id).delete(); }
  catch(e) { toast('Delete failed.', 'error'); }
}

async function saveAccount(acc) {
  try { await uref().collection('accounts').doc(acc.id).set(acc); }
  catch(e) { toast('Sync failed.', 'error'); }
}

async function delAccount(id) {
  try { await uref().collection('accounts').doc(id).delete(); }
  catch(e) { toast('Delete failed.', 'error'); }
}

// ════════════════════════════════════════════
//  BOOT — init UI after login + currency set
// ════════════════════════════════════════════
function boot() {
  updateUserUI();
  updateCurrencyUI();
  initNav();
  initTxModal();
  initBudgetModal();
  initCatModal();
  initAccModal();
  initFilters();
  initSettings();
  initAnalyticsNav();
  applyTheme();
  
  g('dash-breakdown-type')?.addEventListener('change', () => {
    if (S.page === 'dashboard') renderPieChart(txsOf(thisMonth()));
  });

  goTo('dashboard');
}

// ════════════════════════════════════════════
//  ONBOARDING
// ════════════════════════════════════════════
function showOnboarding() {
  const grid = g('currency-grid');
  grid.innerHTML = CURRENCIES.map(c => `
    <button class="cur-btn ${c.code===CURRENCIES[3].code?'selected':''}"
      onclick="selectCur('${c.code}',this)">
      <span class="cur-sym">${c.sym}</span>
      <span class="cur-code">${c.code}</span>
    </button>`).join('');
  g('currency-confirm').dataset.code = CURRENCIES[3].code;
  g('onboarding').classList.remove('hidden');

  g('currency-confirm').onclick = async () => {
    const code = g('currency-confirm').dataset.code;
    S.currency = CURRENCIES.find(c=>c.code===code);
    await savePref();
    hideOnboarding();
    boot();
    toast('Currency set to ' + S.currency.code + '!');
  };
}

function hideOnboarding() { g('onboarding').classList.add('hidden'); }

function selectCur(code, el) {
  document.querySelectorAll('.cur-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
  g('currency-confirm').dataset.code = code;
}

// ════════════════════════════════════════════
//  USER UI
// ════════════════════════════════════════════
function updateUserUI() {
  if (!me) return;
  g('user-name').textContent  = me.displayName || 'User';
  g('user-email').textContent = me.email || '';
  const av = g('user-avatar');
  if (me.photoURL) {
    av.style.backgroundImage = `url(${me.photoURL})`;
    av.style.backgroundSize  = 'cover';
    av.textContent = '';
  } else {
    av.textContent = (me.displayName||'U')[0].toUpperCase();
  }
  const sn = g('s-name'), se = g('s-email');
  if (sn) sn.textContent = me.displayName || '';
  if (se) se.textContent = me.email || '';
}

function updateCurrencyUI() {
  const txt = S.currency ? `${S.currency.sym} ${S.currency.code} — ${S.currency.name}` : '—';
  const el = g('s-currency');
  if (el) el.textContent = txt;
}

// ════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      goTo(btn.dataset.page);
      closeSidebar();
    });
  });
}

function goTo(page) {
  S.page = page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
  g('page-'+page).classList.add('active');
  const titles = { dashboard:'Dashboard', transactions:'Transactions', budgets:'Budgets', analytics:'Analytics', settings:'Settings', categories:'Categories', accounts:'Accounts' };
  g('page-title-bar').textContent = titles[page] || page;
  renderPage(page);
}

function renderPage(p) {
  if (p==='dashboard')    renderDashboard();
  if (p==='transactions') renderTransactions();
  if (p==='budgets')      renderBudgets();
  if (p==='categories')   renderCategories();
  if (p==='accounts')     renderAccounts();
  if (p==='analytics')    renderAnalytics();
}

function toggleSidebar()  { g('sidebar').classList.toggle('open'); g('sidebar-overlay').classList.toggle('open'); }
function closeSidebar()   { g('sidebar').classList.remove('open'); g('sidebar-overlay').classList.remove('open'); }

// ════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════
function applyTheme() {
  const t = localStorage.getItem('mm-theme') || 'dark';
  document.body.classList.toggle('light', t==='light');
  const btn = g('theme-btn');
  if (btn) btn.textContent = t==='light' ? '🌙' : '☀️';
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('mm-theme', isLight?'light':'dark');
  const btn = g('theme-btn');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';
  toast(isLight ? '☀️ Light mode' : '🌙 Dark mode', 'info');
}

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════
function fmt(n) {
  const sym = S.currency?.sym || '$';
  const sign = n < 0 ? '-' : '';
  return sign + sym + Math.abs(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function thisMonth() { return new Date().toISOString().slice(0,7); }
function txsOf(ym) { return S.transactions.filter(t=>t.date.startsWith(ym)); }
function stats(txs) {
  let inc=0, exp=0;
  txs.forEach(t => { 
    if(t.type==='income') inc+=t.amount; 
    else if(t.type==='expense') exp+=t.amount; 
  });
  return { inc, exp, bal: inc-exp, sav: Math.max(0, inc-exp) };
}
function monthName(ym) {
  const [y,m] = ym.split('-');
  return new Date(y,m-1).toLocaleString('default',{month:'long',year:'numeric'});
}
function g(id) { return document.getElementById(id); }
function h(s)  { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════
function toast(msg, type='success') {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const d = document.createElement('div');
  d.className = `toast ${type}`;
  d.innerHTML = `<span>${icons[type]}</span> ${msg}`;
  g('toasts').appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

// ════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════
function renderDashboard() {
  const ym   = thisMonth();
  const txs  = txsOf(ym);
  const all  = stats(S.transactions);
  const mon  = stats(txs);
  const totalInitial = S.accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0);

  g('dash-subtitle').textContent = monthName(ym);
  g('kpi-balance').textContent   = fmt(all.bal + totalInitial);
  g('kpi-income').textContent    = fmt(mon.inc);
  g('kpi-expense').textContent   = fmt(mon.exp);
  g('kpi-savings').textContent   = fmt(mon.bal);

  renderTxItems('recent-list', S.transactions.slice(0,5), true);
  renderPieChart(txs);
  renderBarChart();
  renderAlerts(txs);
}

function renderAlerts(txs) {
  const container = g('alert-container');
  if (!container) return;
  const alerts = [];
  S.budgets.forEach(b => {
    const spent = txs.filter(t=>t.type==='expense'&&t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct = (spent/b.limit)*100;
    const cat = getCat(b.category);
    if (pct >= 100) alerts.push({cat, spent, limit:b.limit, pct, over:true});
    else if (pct >= 80) alerts.push({cat, spent, limit:b.limit, pct, over:false});
  });
  if (!alerts.length) { container.innerHTML=''; return; }
  container.innerHTML = alerts.map(a=>`
    <div class="alert-banner ${a.over?'alert-danger':'alert-warning'}">
      <span>${a.over?'🚨':'⚠️'}</span>
      <span>${a.over
        ? `<b>${a.cat.icon} ${a.cat.label}</b> budget exceeded! Spent ${fmt(a.spent)} of ${fmt(a.limit)}.`
        : `<b>${a.cat.icon} ${a.cat.label}</b> at ${Math.round(a.pct)}% — ${fmt(a.limit-a.spent)} remaining.`
      }</span>
    </div>`).join('');
}

function renderPieChart(txs) {
  const type = g('dash-breakdown-type')?.value || 'income';
  const map = {};
  txs.filter(t=>t.type===type).forEach(t=>{ map[t.category]=(map[t.category]||0)+t.amount; });
  const keys = Object.keys(map);

  if (chartPie) chartPie.destroy();
  const pie = g('pie-chart'), empty = g('pie-empty');
  if (!keys.length) {
    pie.style.display='none'; 
    empty.textContent = `No ${type}s this month`;
    empty.classList.remove('hidden'); 
    return;
  }
  pie.style.display='block'; empty.classList.add('hidden');
  chartPie = new Chart(pie.getContext('2d'), {
    type:'doughnut',
    data:{
      labels: keys.map(k=>`${getCat(k).icon} ${getCat(k).label}`),
      datasets:[{data:keys.map(k=>map[k]), backgroundColor:keys.map(k=>getCat(k).color), borderWidth:0, hoverOffset:8}]
    },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{
        legend:{display:true, position:'bottom', labels:{color:'#94a3b8', padding:16, font:{family:'Inter'}}},
        tooltip:{callbacks:{label:c=>` ${fmt(c.parsed)} (${((c.parsed/keys.map(k=>map[k]).reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`}}
      }
    }
  });
}

function renderBarChart() {
  const months = [];
  for (let i=5;i>=0;i--) {
    const d=new Date(); d.setMonth(d.getMonth()-i);
    months.push(d.toISOString().slice(0,7));
  }
  const labels = months.map(m=>{const[y,mo]=m.split('-');return new Date(y,mo-1).toLocaleString('default',{month:'short'});});
  if (chartBar) chartBar.destroy();
  chartBar = new Chart(g('bar-chart').getContext('2d'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        {label:'Income',  data:months.map(m=>stats(txsOf(m)).inc), backgroundColor:'rgba(34,211,165,0.7)', borderRadius:6},
        {label:'Expense', data:months.map(m=>stats(txsOf(m)).exp), backgroundColor:'rgba(255,107,107,0.7)', borderRadius:6},
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}}},
      scales:{
        x:{ticks:{color:'#94a3b8'}, grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#94a3b8',callback:v=>S.currency?.sym+v}, grid:{color:'rgba(255,255,255,0.06)'}}
      }
    }
  });
}

// ════════════════════════════════════════════
//  TRANSACTION MODAL
// ════════════════════════════════════════════
let editingTx = null;

function initTxModal() {
  g('add-tx-btn')?.addEventListener('click', () => openTxModal());
  g('add-tx-btn-2')?.addEventListener('click', () => openTxModal());
  g('tx-modal-bg').addEventListener('click', e => { if(e.target===g('tx-modal-bg')) closeTxModal(); });
  g('tx-save-btn').addEventListener('click', saveTxHandler);

  document.querySelectorAll('.type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      setTab(btn.dataset.t);
      if (btn.dataset.t !== 'transfer') populateCatSelect(btn.dataset.t);
    });
  });
}

function populateAccSelect(sel=null, toSel=null) {
  g('tx-account').innerHTML = S.accounts.map(a=>
    `<option value="${a.id}" ${a.id===sel?'selected':''}>${a.icon} ${a.name}</option>`).join('');
  if (g('tx-to-account')) {
    g('tx-to-account').innerHTML = S.accounts.map(a=>
      `<option value="${a.id}" ${a.id===toSel?'selected':''}>${a.icon} ${a.name}</option>`).join('');
  }
}

function openTxModal(id=null) {
  editingTx = id;
  g('tx-desc').value=''; g('tx-amount').value=''; g('tx-notes').value='';
  g('tx-date').value = new Date().toISOString().slice(0,10);

  if (id) {
    const tx = S.transactions.find(t=>t.id===id);
    if (!tx) return;
    g('tx-modal-title').textContent = 'Edit Transaction';
    setTab(tx.type); 
    if (tx.type !== 'transfer') populateCatSelect(tx.type, tx.category); 
    populateAccSelect(tx.accountId, tx.toAccountId);
    g('tx-desc').value=tx.name; g('tx-amount').value=tx.amount;
    g('tx-date').value=tx.date; g('tx-notes').value=tx.notes||'';
  } else {
    g('tx-modal-title').textContent = 'Add Transaction';
    setTab('income'); populateCatSelect('income'); 
    populateAccSelect(S.accounts.length > 0 ? S.accounts[0].id : null, S.accounts.length > 1 ? S.accounts[1].id : null);
  }
  g('tx-modal-bg').classList.remove('hidden');
  g('tx-desc').focus();
}

function closeTxModal() { g('tx-modal-bg').classList.add('hidden'); editingTx=null; }

function setTab(type) {
  document.querySelectorAll('.type-tab').forEach(b=>b.classList.toggle('active', b.dataset.t===type));
  if (g('tx-split-btn')) {
    if (type === 'income') {
      g('tx-split-label').classList.remove('hidden');
      g('tx-to-account-row').classList.add('hidden');
      g('tx-cat-row').classList.remove('hidden');
      g('tx-account-label').textContent = 'Account';
      toggleTxSplit();
    } else if (type === 'transfer') {
      g('tx-split-label').classList.add('hidden');
      g('tx-split-btn').classList.add('hidden');
      g('tx-account').style.display = 'block';
      g('tx-to-account-row').classList.remove('hidden');
      g('tx-cat-row').classList.add('hidden');
      g('tx-account-label').textContent = 'From Account';
      if(g('tx-desc').value === '') g('tx-desc').value = 'Transfer';
    } else {
      g('tx-split-label').classList.add('hidden');
      g('tx-split-btn').classList.add('hidden');
      g('tx-account').style.display = 'block';
      g('tx-to-account-row').classList.add('hidden');
      g('tx-cat-row').classList.remove('hidden');
      g('tx-account-label').textContent = 'Account';
    }
  }
}

function toggleTxSplit() {
  const useSplit = g('tx-use-split').checked;
  if (useSplit) {
    g('tx-account').style.display = 'none';
    g('tx-split-btn').classList.remove('hidden');
  } else {
    g('tx-account').style.display = 'block';
    g('tx-split-btn').classList.add('hidden');
  }
}

function populateCatSelect(type, sel=null) {
  g('tx-cat').innerHTML = getCategories(type).map(c=>
    `<option value="${c.id}" ${c.id===sel?'selected':''}>${c.icon} ${c.label}</option>`).join('');
}

async function saveTxHandler() {
  const type  = document.querySelector('.type-tab.active')?.dataset.t || 'expense';
  const name  = g('tx-desc').value.trim();
  const amt   = parseFloat(g('tx-amount').value);
  const date  = g('tx-date').value;
  const cat   = g('tx-cat').value;
  const acc   = g('tx-account').value;
  const toAcc = g('tx-to-account').value;
  const notes = g('tx-notes').value.trim();
  const useSplit = type === 'income' && g('tx-use-split')?.checked;

  if (!name) { toast('Enter a description.','error'); return; }
  if (!amt||amt<=0) { toast('Enter a valid amount.','error'); return; }
  if (!date) { toast('Pick a date.','error'); return; }
  if (type === 'transfer') {
    if (!acc || !toAcc) { toast('Please create two accounts first.','error'); return; }
    if (acc === toAcc) { toast('Cannot transfer to the same account.','error'); return; }
  } else {
    if (!useSplit && !acc) { toast('Please create an account first.','error'); return; }
  }

  let txsToSave = [];

  if (editingTx) {
    const i = S.transactions.findIndex(t=>t.id===editingTx);
    if (i!==-1) {
      if (useSplit) { toast('Cannot auto-split when editing a transaction.', 'error'); return; }
      const tx = {...S.transactions[i],type,name,amount:amt,date,category:cat,accountId:acc,toAccountId:toAcc,notes};
      S.transactions[i] = tx;
      txsToSave.push(tx);
      toast('Transaction updated!');
    }
  } else {
    if (useSplit) {
      if (!S.incomeSplits || S.incomeSplits.length === 0) {
        toast('Please configure split rules first (⚙️).', 'error');
        return;
      }
      let totalP = 0;
      S.incomeSplits.forEach(s => totalP += s.percentage);
      if (totalP !== 100) { toast('Split percentages must equal exactly 100%.', 'error'); return; }

      S.incomeSplits.forEach(split => {
        const splitAmt = amt * (split.percentage / 100);
        const tx = {id:uid(),type,name:`${name} (Split)`,amount:splitAmt,date,category:cat,accountId:split.accountId,notes};
        S.transactions.unshift(tx);
        txsToSave.push(tx);
      });
      toast('Split transactions added!');
    } else if (type === 'transfer') {
      const tx = {id:uid(),type,name,amount:amt,date,accountId:acc,toAccountId:toAcc,notes};
      S.transactions.unshift(tx);
      txsToSave.push(tx);
      toast('Transfer added!');
    } else {
      const tx = {id:uid(),type,name,amount:amt,date,category:cat,accountId:acc,notes};
      S.transactions.unshift(tx);
      txsToSave.push(tx);
      toast('Transaction added!');
    }
  }
  
  closeTxModal();
  renderPage(S.page);
  
  for (const t of txsToSave) {
    await saveTx(t);
  }
}

async function removeTx(id) {
  if (!confirm('Delete this transaction?')) return;
  S.transactions = S.transactions.filter(t=>t.id!==id);
  renderPage(S.page);
  toast('Deleted.', 'info');
  await delTx(id);
}

// ════════════════════════════════════════════
//  TX LIST RENDERER
// ════════════════════════════════════════════
function renderTxItems(containerId, txs, compact=false) {
  const el = g(containerId);
  if (!el) return;
  if (!txs.length) {
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">🪙</div><p>No transactions yet</p></div>`;
    return;
  }
  el.innerHTML = txs.map(tx => {
    let catIcon, catBg, catLabel, amtClass, amtPrefix;
    if (tx.type === 'transfer') {
      const fromAcc = S.accounts.find(a => a.id === tx.accountId)?.name || 'Account';
      const toAcc = S.accounts.find(a => a.id === tx.toAccountId)?.name || 'Account';
      catIcon = '🔄'; catBg = '#888888'; catLabel = `${fromAcc} ➔ ${toAcc}`;
      amtClass = 'transfer'; amtPrefix = '';
    } else {
      const cat = getCat(tx.category);
      catIcon = cat.icon; catBg = cat.color; catLabel = cat.label;
      amtClass = tx.type; amtPrefix = tx.type === 'income' ? '+' : '-';
    }
    const d = new Date(tx.date+'T00:00:00').toLocaleDateString('default',{day:'numeric',month:'short',year:'numeric'});
    return `<div class="tx-item">
      <div class="tx-cat-icon" style="background:${catBg}22">${catIcon}</div>
      <div class="tx-info">
        <div class="tx-name">${h(tx.name)}</div>
        <div class="tx-meta">${catLabel} · ${d}${tx.notes?' · '+h(tx.notes):''}</div>
      </div>
      <div class="tx-amount ${amtClass}" ${tx.type==='transfer'?'style="color:#64748b"':''}>${amtPrefix}${fmt(tx.amount)}</div>
      ${compact?'':` <div class="tx-btns">
        <button class="tx-btn" onclick="openTxModal('${tx.id}')" title="Edit">✏️</button>
        <button class="tx-btn" onclick="removeTx('${tx.id}')" title="Delete">🗑️</button>
      </div>`}
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════
//  TRANSACTIONS PAGE
// ════════════════════════════════════════════
function initFilters() {
  ['f-search','f-type','f-cat','f-month'].forEach(id => {
    g(id)?.addEventListener('input', renderTransactions);
    g(id)?.addEventListener('change', renderTransactions);
  });
  const fc = g('f-cat');
  if (fc) fc.innerHTML = '<option value="">All Categories</option>'+getAllCategories().map(c=>`<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  const fm = g('f-month');
  if (fm) fm.value = thisMonth();
}

function getFilteredTx() {
  const search = (g('f-search')?.value||'').toLowerCase();
  const type   = g('f-type')?.value||'';
  const cat    = g('f-cat')?.value||'';
  const month  = g('f-month')?.value||'';
  return S.transactions.filter(tx => {
    if (type  && tx.type!==type) return false;
    if (cat   && tx.category!==cat) return false;
    if (month && !tx.date.startsWith(month)) return false;
    if (search && !tx.name.toLowerCase().includes(search) && !(tx.notes||'').toLowerCase().includes(search)) return false;
    return true;
  });
}

function renderTransactions() {
  const filtered = getFilteredTx();
  const st = stats(filtered);
  g('tx-income').textContent  = fmt(st.inc);
  g('tx-expense').textContent = fmt(st.exp);
  g('tx-count').textContent   = filtered.length;
  renderTxItems('tx-list', filtered);
}

// ════════════════════════════════════════════
//  BUDGETS
// ════════════════════════════════════════════
let editingBudget = null;

function initBudgetModal() {
  g('budget-modal-bg').addEventListener('click', e=>{ if(e.target===g('budget-modal-bg')) closeBudgetModal(); });
  g('b-save-btn').addEventListener('click', saveBudgetHandler);
}

function openBudgetModal(id=null) {
  editingBudget=id;
  g('budget-modal-title').textContent = id?'Edit Budget':'Set Budget';
  g('b-amount').value='';
  g('b-cat').innerHTML = getCategories('expense').map(c=>`<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  if (id) {
    const b=S.budgets.find(b=>b.id===id);
    if (b) { g('b-cat').value=b.category; g('b-amount').value=b.limit; }
  }
  g('budget-modal-bg').classList.remove('hidden');
}

function closeBudgetModal() { g('budget-modal-bg').classList.add('hidden'); editingBudget=null; }

async function saveBudgetHandler() {
  const cat   = g('b-cat').value;
  const limit = parseFloat(g('b-amount').value);
  if (!limit||limit<=0) { toast('Enter a valid limit.','error'); return; }
  let bud;
  if (editingBudget) {
    const i=S.budgets.findIndex(b=>b.id===editingBudget);
    if (i!==-1) { bud={...S.budgets[i],category:cat,limit}; S.budgets[i]=bud; toast('Budget updated!'); }
  } else {
    if (S.budgets.find(b=>b.category===cat)) { toast('Budget for this category exists. Edit it instead.','error'); return; }
    bud={id:uid(),category:cat,limit};
    S.budgets.push(bud);
    toast('Budget set!');
  }
  closeBudgetModal();
  renderBudgets();
  await saveBudget(bud);
}

async function removeBudget(id) {
  if (!confirm('Remove this budget?')) return;
  S.budgets=S.budgets.filter(b=>b.id!==id);
  renderBudgets();
  toast('Budget removed.','info');
  await delBudget(id);
}

function renderBudgets() {
  const ym  = thisMonth();
  const txs = txsOf(ym);
  const el  = g('budget-grid');
  if (!el) return;

  el.innerHTML = S.budgets.map(b => {
    const cat   = getCat(b.category);
    const spent = txs.filter(t=>t.type==='expense'&&t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct   = Math.min(100,(spent/b.limit)*100);
    const over  = spent>b.limit;
    const color = over?'#ff6b6b':pct>75?'#fbbf24':'#22d3a5';
    return `<div class="budget-card">
      <div class="budget-head">
        <div class="budget-cat-icon" style="background:${cat.color}22">${cat.icon}</div>
        <div>
          <div class="budget-cat-name">${cat.label}</div>
          <div class="budget-cat-month">${monthName(ym)}</div>
        </div>
        <div class="budget-actions">
          <button class="tx-btn" onclick="openBudgetModal('${b.id}')">✏️</button>
          <button class="tx-btn" onclick="removeBudget('${b.id}')">🗑️</button>
        </div>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="budget-amounts">
        <span>${fmt(spent)} spent</span>
        <span>${over?'⚠️ Over by '+fmt(spent-b.limit):fmt(b.limit-spent)+' left'} · Limit ${fmt(b.limit)}</span>
      </div>
    </div>`;
  }).join('') + `<div class="budget-add-card" onclick="openBudgetModal()">
    <div class="add-icon">＋</div><span>Add Budget Limit</span>
  </div>`;
}

// ════════════════════════════════════════════
//  ACCOUNTS
// ════════════════════════════════════════════
//  ACCOUNTS
// ════════════════════════════════════════════
let selAccColor = '#6c63ff';
let editingAcc = null;

function initAccModal() {
  g('acc-modal-bg').addEventListener('click', e => { if(e.target===g('acc-modal-bg')) closeAccModal(); });
  g('acc-save-btn').addEventListener('click', saveAccHandler);
}

function renderAccounts() {
  const el = g('accounts-grid');
  if (!el) return;

  el.innerHTML = S.accounts.map(a => {
    let bal = Number(a.initialBalance) || 0;
    S.transactions.forEach(t => { 
      if (t.accountId === a.id) {
        if(t.type === 'income') bal += t.amount;
        else if(t.type === 'expense' || t.type === 'transfer') bal -= t.amount;
      }
      if (t.type === 'transfer' && t.toAccountId === a.id) {
        bal += t.amount;
      }
    });
    const isMain = a.name === 'Main Account';
    return `<div class="acc-card">
      <div class="acc-card-icon" style="background:${a.color}22">${a.icon}</div>
      <div class="acc-card-info">
        <div class="acc-card-name">${h(a.name)}</div>
        <div class="acc-card-bal">${fmt(bal)}</div>
      </div>
      <div class="acc-card-actions">
        <button class="tx-btn" onclick="openAccModal('${a.id}')" title="Edit">✏️</button>
        ${!isMain ? `<button class="tx-btn" onclick="removeAccount('${a.id}')" title="Delete">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('') + `<div class="acc-add-card" onclick="openAccModal()">
    <div class="add-icon">＋</div><span>Add Account</span>
  </div>`;
}

function renderAccColors() {
  const colors = ['#ff6b6b','#fb923c','#fbbf24','#22d3a5','#2dd4bf','#6c63ff','#a78bfa','#f472b6','#94a3b8','#ef4444','#eab308','#84cc16','#0ea5e9','#8b5cf6'];
  g('acc-color-grid').innerHTML = colors.map(c=>`<div class="color-btn ${c===selAccColor?'selected':''}" style="background:${c}" onclick="selAccColor='${c}'; renderAccColors();"></div>`).join('');
}

function openAccModal(id = null) {
  editingAcc = id;
  if (id) {
    const a = S.accounts.find(x => x.id === id);
    if (!a) return;
    g('acc-modal-title').textContent = 'Edit Account';
    g('acc-name').value = a.name;
    g('acc-initial-bal').value = a.initialBalance || '';
    g('acc-icon').value = a.icon || '🏦';
    selAccColor = a.color || '#6c63ff';
  } else {
    g('acc-modal-title').textContent = 'Add Account';
    g('acc-name').value = '';
    g('acc-initial-bal').value = '';
    g('acc-icon').value = '🏦';
    selAccColor = '#6c63ff';
  }
  
  const emojis = ['🏦','💵','💳','🪙','🐷','💰','💎','💼','📉','📈','💸','🧾'];
  g('acc-emoji-grid').innerHTML = emojis.map(e=>`<div class="emoji-btn" onclick="g('acc-icon').value='${e}'">${e}</div>`).join('');

  renderAccColors();
  g('acc-modal-bg').classList.remove('hidden');
  g('acc-name').focus();
}

function closeAccModal() { g('acc-modal-bg').classList.add('hidden'); editingAcc = null; }

async function saveAccHandler() {
  const name = g('acc-name').value.trim();
  const initialBalance = parseFloat(g('acc-initial-bal').value) || 0;
  const icon = g('acc-icon').value.trim() || '🏦';

  if (!name) { toast('Enter an account name.', 'error'); return; }

  let acc;
  if (editingAcc) {
    const idx = S.accounts.findIndex(a => a.id === editingAcc);
    if (idx !== -1) {
      acc = { ...S.accounts[idx], name, initialBalance, icon, color: selAccColor };
      S.accounts[idx] = acc;
      toast('Account updated!');
    }
  } else {
    acc = { id: 'a_'+uid(), name, initialBalance, icon, color: selAccColor };
    S.accounts.push(acc);
    toast('Account added!');
  }
  
  closeAccModal();
  renderAccounts();
  await saveAccount(acc);
}

async function removeAccount(id) {
  if (!confirm('Delete this account? Transactions will be permanently unlinked!')) return;
  S.accounts = S.accounts.filter(a => a.id !== id);
  // Also remove from splits
  if (S.incomeSplits) {
    S.incomeSplits = S.incomeSplits.filter(s => s.accountId !== id);
    savePref();
  }
  renderAccounts();
  toast('Account deleted.', 'info');
  await delAccount(id);
}

// ════════════════════════════════════════════
//  INCOME SPLITS
// ════════════════════════════════════════════
function openSplitModal() {
  g('split-modal-bg').classList.remove('hidden');
  renderSplitAccounts();
}
function closeSplitModal() { g('split-modal-bg').classList.add('hidden'); }

function renderSplitAccounts() {
  const container = g('split-accounts-list');
  container.innerHTML = S.accounts.map(a => {
    const split = (S.incomeSplits||[]).find(s => s.accountId === a.id);
    const val = split ? split.percentage : 0;
    return `
      <div class="form-row" style="margin:0; display:flex; align-items:center; gap:12px;">
        <span style="flex:1;">${a.icon} ${a.name}</span>
        <div style="display:flex; align-items:center; gap:4px; width: 100px;">
          <input type="number" class="split-input filter-input" data-id="${a.id}" value="${val}" min="0" max="100" style="width:100%; text-align:center;" oninput="calcSplitTotal()" />
          <span>%</span>
        </div>
      </div>
    `;
  }).join('');
  calcSplitTotal();
}

function calcSplitTotal() {
  let total = 0;
  document.querySelectorAll('.split-input').forEach(inp => total += parseFloat(inp.value || 0));
  const el = g('split-total');
  el.textContent = total + '%';
  el.style.color = total === 100 ? 'var(--green)' : 'var(--red)';
}

async function saveSplitModal() {
  let total = 0;
  const newSplits = [];
  document.querySelectorAll('.split-input').forEach(inp => {
    const p = parseFloat(inp.value || 0);
    total += p;
    if (p > 0) newSplits.push({ accountId: inp.dataset.id, percentage: p });
  });
  if (total !== 100) { toast('Percentages must exactly equal 100%.', 'error'); return; }
  
  S.incomeSplits = newSplits;
  toast('Split rules saved!');
  closeSplitModal();
  await savePref();
}

// ════════════════════════════════════════════
//  CATEGORIES
// ════════════════════════════════════════════
let activeCatType = 'income';

function initCatModal() {
  document.querySelectorAll('#page-categories .cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-categories .cat-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeCatType = btn.dataset.ct;
      renderCategories();
    });
  });

  document.querySelectorAll('#cat-modal-bg .type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cat-modal-bg .type-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  g('cat-modal-bg').addEventListener('click', e => { if(e.target===g('cat-modal-bg')) closeCatModal(); });
  g('cat-save-btn').addEventListener('click', saveCategoryHandler);
}

function renderCategories() {
  const cats = getCategories(activeCatType);
  g('cat-section-title').textContent = activeCatType === 'expense' ? 'Expense Categories' : 'Income Categories';
  const el = g('cat-grid');
  if (!el) return;

  el.innerHTML = cats.map(c => {
    const isCustom = (S.customCategories || []).some(cc=>cc.id===c.id);
    return `<div class="cat-card">
      <div class="cat-card-icon" style="background:${c.color}22">${c.icon}</div>
      <div class="cat-card-name">${h(c.label)}</div>
      <div class="cat-card-badge ${isCustom?'badge-custom':'badge-default'}">${isCustom?'Custom':'Default'}</div>
      ${isCustom ? `
      <div class="cat-card-actions">
        <button class="tx-btn" onclick="removeCategory('${c.id}')" title="Delete">🗑️</button>
      </div>` : ''}
    </div>`;
  }).join('') + `<div class="cat-add-card" onclick="openCatModal()">
    <div class="add-icon">＋</div><span>Add Custom</span>
  </div>`;
}

let selCatColor = '#ff6b6b';
function renderCatColors() {
  const colors = ['#ff6b6b','#fb923c','#fbbf24','#22d3a5','#2dd4bf','#6c63ff','#a78bfa','#f472b6','#94a3b8','#ef4444','#eab308','#84cc16','#0ea5e9','#8b5cf6'];
  g('color-grid').innerHTML = colors.map(c=>`<div class="color-btn ${c===selCatColor?'selected':''}" style="background:${c}" onclick="selCatColor='${c}'; renderCatColors();"></div>`).join('');
}

function openCatModal() {
  g('cat-name').value = '';
  g('cat-icon').value = '🏷️';
  
  document.querySelectorAll('#cat-modal-bg .type-tab').forEach(b=>b.classList.toggle('active', b.dataset.ct===activeCatType));

  const emojis = ['🍔','🚗','🏠','💊','🛍️','📚','🎬','✈️','⚡','💼','💻','🏢','📈','🎁','💰','🐶','🎮','👶','🍺','👕','⚽','🏥','🔧','🎨'];
  g('emoji-grid').innerHTML = emojis.map(e=>`<div class="emoji-btn" onclick="g('cat-icon').value='${e}'">${e}</div>`).join('');

  selCatColor = '#6c63ff';
  renderCatColors();

  g('cat-modal-bg').classList.remove('hidden');
  g('cat-name').focus();
}

function closeCatModal() { g('cat-modal-bg').classList.add('hidden'); }

async function saveCategoryHandler() {
  const type = document.querySelector('#cat-modal-bg .type-tab.active')?.dataset.ct || 'expense';
  const name = g('cat-name').value.trim();
  const icon = g('cat-icon').value.trim() || '🏷️';

  if (!name) { toast('Enter a category name.', 'error'); return; }

  const cat = { id: 'c_'+uid(), type, label: name, icon, color: selCatColor };
  S.customCategories.push(cat);
  toast('Custom category added!');
  
  closeCatModal();
  if (S.page === 'categories') {
    activeCatType = type;
    document.querySelectorAll('#page-categories .cat-tab').forEach(b=>b.classList.toggle('active', b.dataset.ct===type));
    renderCategories();
  }
  await saveCategory(cat);
}

async function removeCategory(id) {
  if (!confirm('Delete this custom category? Transactions using it will lose its icon and color.')) return;
  S.customCategories = S.customCategories.filter(c => c.id !== id);
  renderCategories();
  toast('Category deleted.', 'info');
  await delCategory(id);
}

// ════════════════════════════════════════════
//  ANALYTICS
// ════════════════════════════════════════════
let anaYM = thisMonth();

function initAnalyticsNav() {
  g('ana-prev')?.addEventListener('click', () => {
    const d=new Date(anaYM+'-01'); d.setMonth(d.getMonth()-1);
    anaYM=d.toISOString().slice(0,7); renderAnalytics();
  });
  g('ana-next')?.addEventListener('click', () => {
    const d=new Date(anaYM+'-01'); d.setMonth(d.getMonth()+1);
    const nm=d.toISOString().slice(0,7);
    if (nm<=thisMonth()) { anaYM=nm; renderAnalytics(); }
  });
  g('pdf-btn')?.addEventListener('click', generatePDF);
  g('ana-breakdown-type')?.addEventListener('change', () => {
    renderAnaPie(txsOf(anaYM));
    renderAnaBar(txsOf(anaYM));
  });
}

function renderAnalytics() {
  const txs = txsOf(anaYM);
  const st  = stats(txs);
  g('ana-month').textContent   = monthName(anaYM);
  g('ana-income').textContent  = fmt(st.inc);
  g('ana-expense').textContent = fmt(st.exp);
  const net = g('ana-net');
  net.textContent = (st.bal>=0?'+':'')+fmt(st.bal);
  net.style.color = st.bal>=0?'#22d3a5':'#ff6b6b';

  renderAnaPie(txs);
  renderAnaBar(txs);
  renderAnaLine();
}

function renderAnaPie(txs) {
  const map={};
  const type = g('ana-breakdown-type')?.value || 'income';
  txs.filter(t=>t.type===type).forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
  const keys=Object.keys(map);
  if (chartAnaPie) chartAnaPie.destroy();
  if (!keys.length) return;
  chartAnaPie=new Chart(g('ana-pie').getContext('2d'),{
    type:'doughnut',
    data:{
      labels:keys.map(k=>`${getCat(k).icon} ${getCat(k).label}`),
      datasets:[{data:keys.map(k=>map[k]),backgroundColor:keys.map(k=>getCat(k).color),borderWidth:0,hoverOffset:8}]
    },
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'62%',
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt(c.parsed)}`}}}
    }
  });
  const total = keys.reduce((sum, k) => sum + map[k], 0);
  g('ana-legend').innerHTML=keys.map(k=>`
    <div class="legend-row">
      <div class="legend-dot" style="background:${getCat(k).color}"></div>
      <span style="flex:1">${getCat(k).icon} ${getCat(k).label}</span>
      <span style="font-weight:700; color:var(--text2); margin-right:8px">${((map[k]/total)*100).toFixed(1)}%</span>
      <span style="font-weight:700">${fmt(map[k])}</span>
    </div>`).join('');
}

function renderAnaBar(txs) {
  const map={};
  const type = g('ana-breakdown-type')?.value || 'income';
  txs.filter(t=>t.type===type).forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
  const sorted=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  if (chartAnaBar) chartAnaBar.destroy();
  if (!sorted.length) return;
  const total = sorted.reduce((sum, [,v]) => sum + v, 0);
  chartAnaBar=new Chart(g('ana-bar').getContext('2d'),{
    type:'bar',
    data:{
      labels:sorted.map(([k,v])=>`${getCat(k).icon} ${getCat(k).label} (${((v/total)*100).toFixed(1)}%)`),
      datasets:[{data:sorted.map(([,v])=>v),backgroundColor:sorted.map(([k])=>getCat(k).color+'cc'),borderRadius:8,borderSkipped:false}]
    },
    options:{
      indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#94a3b8',callback:v=>S.currency?.sym+v},grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#94a3b8'},grid:{display:false}}
      }
    }
  });
}

function renderAnaLine() {
  const months=[];
  for(let i=11;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);months.push(d.toISOString().slice(0,7));}
  const labels=months.map(m=>{const[y,mo]=m.split('-');return new Date(y,mo-1).toLocaleString('default',{month:'short'});});
  if(chartAnaLine)chartAnaLine.destroy();
  chartAnaLine=new Chart(g('ana-line').getContext('2d'),{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Income', data:months.map(m=>stats(txsOf(m)).inc),borderColor:'#22d3a5',backgroundColor:'rgba(34,211,165,0.08)',tension:0.4,fill:true,pointBackgroundColor:'#22d3a5',pointRadius:4},
        {label:'Expense',data:months.map(m=>stats(txsOf(m)).exp),borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.08)',tension:0.4,fill:true,pointBackgroundColor:'#ff6b6b',pointRadius:4},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}}},
      scales:{
        x:{ticks:{color:'#94a3b8'},grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#94a3b8',callback:v=>S.currency?.sym+v},grid:{color:'rgba(255,255,255,0.06)'}}
      }
    }
  });
}

// ════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════
function initSettings() {
  g('signout-btn')?.addEventListener('click', signOut);
  g('export-btn')?.addEventListener('click', exportCSV);
  g('change-currency-btn')?.addEventListener('click', showOnboarding);
  g('clear-btn')?.addEventListener('click', async () => {
    if (!confirm('Delete ALL transactions and budgets? This cannot be undone.')) return;
    try {
      const b=db.batch();
      const [ts,bs]=await Promise.all([uref().collection('transactions').get(),uref().collection('budgets').get()]);
      ts.docs.forEach(d=>b.delete(d.ref));
      bs.docs.forEach(d=>b.delete(d.ref));
      await b.commit();
      S.transactions=[]; S.budgets=[];
      renderPage(S.page);
      toast('All data cleared.','info');
    } catch(e) { toast('Failed to clear data.','error'); }
  });
}

function exportCSV() {
  if (!S.transactions.length) { toast('No data to export.','error'); return; }
  const rows=[['Date','Type','Category','Description','Amount','Notes']];
  S.transactions.forEach(t=>{
    rows.push([t.date,t.type,getCat(t.category).label,`"${t.name}"`,t.amount,`"${t.notes||''}"`]);
  });
  const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='moneymind_export.csv'; a.click();
  toast('CSV exported!');
}

// ════════════════════════════════════════════
//  PDF REPORT
// ════════════════════════════════════════════
function generatePDF() {
  const txs=txsOf(anaYM), st=stats(txs);
  if (!txs.length) { toast('No data for this month.','error'); return; }
  const sym=S.currency?.sym||'$';
  const rows=txs.map(t=>{
    const cat=getCat(t.category);
    return `<tr><td>${t.date}</td><td>${cat.icon} ${cat.label}</td><td>${h(t.name)}</td>
    <td style="color:${t.type==='income'?'#16a34a':'#dc2626'};font-weight:700">${t.type==='income'?'+':'-'}${sym}${parseFloat(t.amount).toFixed(2)}</td></tr>`;
  }).join('');
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>MoneyMind Report — ${monthName(anaYM)}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:32px;color:#111}
    h1{color:#6c63ff;margin-bottom:4px}
    .sub{color:#666;font-size:13px;margin-bottom:24px}
    .cards{display:flex;gap:20px;margin-bottom:28px}
    .card{padding:16px 22px;border-radius:12px;min-width:130px}
    .inc{background:#d1fae5}.exp{background:#fee2e2}.net{background:#ede9fe}
    .lbl{font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
    .val{font-size:22px;font-weight:800}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#f8fafc;padding:10px;text-align:left;font-size:11px;color:#666;text-transform:uppercase}
    td{padding:10px;border-bottom:1px solid #f1f5f9}
    .foot{margin-top:32px;font-size:11px;color:#999;text-align:center}
  </style></head><body>
  <h1>💰 MoneyMind — Financial Report</h1>
  <div class="sub">Vintrex Solutions &nbsp;|&nbsp; ${monthName(anaYM)} &nbsp;|&nbsp; ${me?.email||''}</div>
  <div class="cards">
    <div class="card inc"><div class="lbl">Income</div><div class="val">${sym}${st.inc.toFixed(2)}</div></div>
    <div class="card exp"><div class="lbl">Expenses</div><div class="val">${sym}${st.exp.toFixed(2)}</div></div>
    <div class="card net"><div class="lbl">Net</div><div class="val">${(st.bal>=0?'+':'')+sym+Math.abs(st.bal).toFixed(2)}</div></div>
  </div>
  <table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="foot">Generated by MoneyMind · vintrexsolutions.com · ${new Date().toLocaleDateString()}</div>
  </body></html>`);
  win.document.close();
  setTimeout(()=>win.print(),400);
  toast('PDF report ready! Press Ctrl+P to save.','info');
}

// ════════════════════════════════════════════
//  DOMContentLoaded
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Hide loading after animation
  setTimeout(hideLoading, 1600);
});
