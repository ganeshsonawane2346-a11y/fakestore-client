// app.js — state, rendering, and event wiring.
import { getProducts, getCategories } from './api.js';

const $ = (id) => document.getElementById(id);
const els = {
  grid: $('grid'), tabs: $('tabs'), search: $('search'), sort: $('sort'),
  banner: $('error-banner'), info: $('result-info'),
  cart: $('cart'), cartItems: $('cart-items'), cartCount: $('cart-count'), cartTotal: $('cart-total'),
};

// ---------- localStorage helpers ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/blocked */ }
  },
};

// ---------- state ----------
const prefs = store.get('fs:prefs', { category: 'all', sort: 'default' });
const state = {
  products: [], categories: [], query: '',
  category: prefs.category, sort: prefs.sort,
  cart: store.get('fs:cart', {}), // { [id]: { id, title, price, qty } }
};

const money = (n) => `$${n.toFixed(2)}`;
const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ---------- derived data ----------
const sorters = {
  default: null,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating.rate - a.rating.rate,
  title: (a, b) => a.title.localeCompare(b.title),
};

function visibleProducts() {
  const q = state.query.trim().toLowerCase();
  let list = state.products.filter((p) =>
    (state.category === 'all' || p.category === state.category) &&
    (!q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
  const cmp = sorters[state.sort];
  return cmp ? [...list].sort(cmp) : list;
}

// ---------- rendering ----------
function renderSkeletons(n = 8) {
  els.grid.innerHTML = Array.from({ length: n }, () => `
    <div class="card skeleton" aria-hidden="true">
      <div class="sk img"></div><div class="sk line"></div><div class="sk line short"></div>
    </div>`).join('');
}

function renderTabs() {
  const all = ['all', ...state.categories];
  els.tabs.innerHTML = all.map((c) =>
    `<button class="tab" role="tab" data-cat="${escapeHTML(c)}" aria-selected="${c === state.category}">${escapeHTML(c)}</button>`).join('');
}

function renderGrid() {
  const list = visibleProducts();
  els.info.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  if (!list.length) { els.grid.innerHTML = '<p class="info">No products match your filters.</p>'; return; }
  els.grid.innerHTML = list.map((p) => `
    <article class="card">
      <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy">
      <h3>${escapeHTML(p.title)}</h3>
      <div class="meta"><span class="price">${money(p.price)}</span><span>★ ${p.rating.rate} (${p.rating.count})</span></div>
      <button class="btn" data-add="${p.id}">Add to cart</button>
    </article>`).join('');
}

function renderCart() {
  const items = Object.values(state.cart);
  els.cartCount.textContent = items.reduce((n, i) => n + i.qty, 0);
  els.cartTotal.textContent = money(items.reduce((s, i) => s + i.price * i.qty, 0));
  els.cartItems.innerHTML = items.length ? items.map((i) => `
    <li><span class="t">${escapeHTML(i.title)}</span>
      <span class="qty"><button class="btn ghost" data-dec="${i.id}">−</button> ${i.qty}
      <button class="btn ghost" data-inc="${i.id}">+</button></span>
      <span>${money(i.price * i.qty)}</span></li>`).join('') : '<li>Your cart is empty.</li>';
}

function showError(message) {
  els.banner.hidden = false;
  els.banner.innerHTML = `<span>⚠️ ${escapeHTML(message)}</span><button class="btn" id="retry">Retry</button>`;
  $('retry').addEventListener('click', init);
}
const hideError = () => { els.banner.hidden = true; };

// ---------- actions ----------
function changeQty(id, delta, product) {
  const item = state.cart[id] ?? (product && { id, title: product.title, price: product.price, qty: 0 });
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) delete state.cart[id]; else state.cart[id] = item;
  store.set('fs:cart', state.cart);
  renderCart();
}

const savePrefs = () => store.set('fs:prefs', { category: state.category, sort: state.sort });

// ---------- events ----------
els.search.addEventListener('input', debounce((e) => { state.query = e.target.value; renderGrid(); }));
els.sort.addEventListener('change', (e) => { state.sort = e.target.value; savePrefs(); renderGrid(); });
els.tabs.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-cat]');
  if (!tab) return;
  state.category = tab.dataset.cat; savePrefs(); renderTabs(); renderGrid();
});
els.grid.addEventListener('click', (e) => {
  const id = e.target.dataset.add;
  if (id) changeQty(id, 1, state.products.find((p) => String(p.id) === id));
});
els.cartItems.addEventListener('click', (e) => {
  if (e.target.dataset.inc) changeQty(e.target.dataset.inc, 1);
  if (e.target.dataset.dec) changeQty(e.target.dataset.dec, -1);
});
$('cart-toggle').addEventListener('click', () => { els.cart.hidden = !els.cart.hidden; });
$('cart-close').addEventListener('click', () => { els.cart.hidden = true; });
$('cart-clear').addEventListener('click', () => { state.cart = {}; store.set('fs:cart', state.cart); renderCart(); });

// ---------- init ----------
async function init() {
  hideError();
  renderSkeletons();
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    state.products = products;
    state.categories = categories;
    if (state.category !== 'all' && !categories.includes(state.category)) state.category = 'all';
    renderTabs();
    renderGrid();
  } catch (err) {
    els.grid.innerHTML = '';
    els.info.textContent = '';
    showError(err.message || 'Something went wrong while loading products.');
  }
}

els.sort.value = state.sort;
renderCart();
init();
