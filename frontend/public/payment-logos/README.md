# Payment logos

Drop the official payment-provider logo files here, named exactly:

- `payme.png` (or `payme.svg`)
- `click.png` (or `click.svg`)
- `uzum.png`  (or `uzum.svg`)
- `xazna.png` (or `xazna.svg`)

They are picked up automatically by the analytics "To'lov tizimlari" table
(see `PAYMENT_LOGO_CANDIDATES` in `src/pages/panel/Dashboard.jsx`).
`.png` is tried first, then `.svg`; if neither exists, an inline brand mark is shown.

Tip: square images with lots of whitespace render small in the table —
horizontally-cropped wordmark versions look best.
