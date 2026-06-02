// Thin wrapper around the Telegram WebApp SDK injected on window.Telegram.
// All helpers are null-safe so the app also runs in a normal browser tab.

export function tg() {
  return window.Telegram && window.Telegram.WebApp
    ? window.Telegram.WebApp
    : null;
}

/** True when launched inside Telegram with a signed initData payload. */
export function isTelegram() {
  const w = tg();
  return !!(w && w.initData);
}

/** The signed initData string used for telegramLogin(). */
export function initData() {
  const w = tg();
  return w ? w.initData : "";
}

/** The decoded Telegram user object (unsigned, for display/telegram_id). */
export function tgUser() {
  const w = tg();
  return w && w.initDataUnsafe ? w.initDataUnsafe.user : null;
}

/** Signal readiness and expand to full height inside Telegram. */
export function ready() {
  const w = tg();
  if (w) {
    w.ready();
    w.expand();
  }
}
