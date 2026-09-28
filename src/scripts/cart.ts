// Cart state lives in localStorage: { [productId]: quantity }.
const KEY = 'bb-cart';

export type CartState = Record<string, number>;

export function readCart(): CartState {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as CartState;
  } catch {
    return {};
  }
}

function write(state: CartState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); the cart then lives only for this page view.
  }
  window.dispatchEvent(new CustomEvent('cart:change', { detail: state }));
}

export function setQty(id: string, qty: number, max = Infinity) {
  const state = readCart();
  const q = Math.min(Math.max(0, Math.floor(qty)), max);
  if (q === 0) delete state[id];
  else state[id] = q;
  write(state);
}

export function addToCart(id: string, qty = 1, max = Infinity) {
  setQty(id, (readCart()[id] || 0) + qty, max);
}

export function clearCart() {
  write({});
}

export function cartCount(state = readCart()) {
  return Object.values(state).reduce((s, n) => s + n, 0);
}
