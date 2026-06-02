const KEY = "cart";
export function getCart() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function save(c) { localStorage.setItem(KEY, JSON.stringify(c)); }
export function addItem(product) {
  const c = getCart();
  const found = c.find((i) => i.id === product.id);
  if (found) found.qty += 1;
  else c.push({ id: product.id, price: product.price, name_uz: product.name_uz,
                name_ru: product.name_ru, qty: 1 });
  save(c);
}
export function setQty(id, qty) {
  const c = getCart(); const it = c.find((i) => i.id === id);
  if (it) { it.qty = Math.max(1, qty); save(c); }
}
export function removeItem(id) { save(getCart().filter((i) => i.id !== id)); }
export function clearCart() { localStorage.removeItem(KEY); }
export function cartTotal() { return getCart().reduce((s, i) => s + Number(i.price) * i.qty, 0); }
