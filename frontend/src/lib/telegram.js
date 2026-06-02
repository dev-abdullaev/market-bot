export function tg() { return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null; }
export function isTelegram() { const w = tg(); return !!(w && w.initData); }
export function initData() { const w = tg(); return w ? w.initData : ""; }
export function tgUser() { const w = tg(); return w && w.initDataUnsafe ? w.initDataUnsafe.user : null; }
export function ready() { const w = tg(); if (w) { w.ready(); w.expand(); } }
