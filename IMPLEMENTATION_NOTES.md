# Implementation Notes — Security Fixes & Delivery Pricing Feature

**Date:** 2026-08-17
Companion to `SECURITY_REVIEW.md` (read that first for the *why*). This document lists exactly what changed, file by file, plus what was tested and what's left for the team to decide.

---

## Backend — new files

| File | Purpose |
|---|---|
| `backend/middleware/rateLimiters.js` | Centralizes all rate limiters: `loginLimiter` (10/15min), new `changePasswordLimiter` (10/15min), `uploadLimiter` (20/15min), `orderCreateLimiter` (30/15min). |
| `backend/middleware/auditLog.js` | `logAudit(req, { event, actor, success, detail })` — writes to the new `audit_logs` table. Never pass secrets into `detail`. |
| `backend/utils/deliveryPricing.js` | Loads `Wilaya_Of_Algeria.json` / `Commune_Of_Algeria.json` once at startup into memory; exposes `getWilayas()`, `getCommunes(code)`, `getAllPricing()`, and `resolveDeliveryFee(wilayaText, subtotal)` — the single source of truth for delivery fee, used by both the order route and the pricing API. |
| `backend/routes/delivery.js` | New `/api/delivery/*` routes: public `GET /wilayas`, `GET /communes?wilaya_code=`, `GET /pricing`; admin-only `PUT /pricing/:wilaya_code`. |

## Backend — modified files

- **`backend/middleware/auth.js`** — removed the hardcoded JWT fallback secret; now throws at startup if `JWT_SECRET` is missing or under 32 characters.
- **`backend/middleware/upload.js`** — rewritten:
  - buffers uploads in memory first, verifies real magic-byte signatures (JPEG/PNG/GIF/WEBP) against the declared extension before anything touches disk,
  - removed the old false-positive-prone "double extension" substring blocklist (see review §5),
  - writes files with explicit `0o644` (no execute bits), re-applied via `chmodSync`,
  - exports `deleteUploadedFile(filename)` for cleanup call sites,
  - validation errors now carry `err.status = 400` instead of falling through to a generic 500.
- **`backend/routes/products.js`** — added `uploadLimiter`; cleans up the just-uploaded file when post-upload validation fails (create) or the product doesn't exist (update); deletes the old image file when an update replaces it; deletes the image file when a product is deleted; audit logs on create/update/delete.
- **`backend/routes/orders.js`** — the core fix (review §6): item prices are now always looked up from the `products` table by id (client-supplied `item.price`/`item.name` are ignored); delivery fee is always computed server-side via `resolveDeliveryFee()`; `total_price` is always `subtotal + deliveryFee`. Client-supplied `delivery_fee`/`total_price` fields are no longer read at all. Quantity is clamped to `>= 1`. Added `orderCreateLimiter` and audit logging on create/status-update/delete.
- **`backend/routes/auth.js`** — added `changePasswordLimiter`; added audit logging for login success/failure (including *which* username was tried, never the password) and password changes.
- **`backend/db.js`** — added `audit_logs` and `delivery_pricing` table definitions; seeds `delivery_pricing` for all 58 wilayas on first run (tiered defaults derived from `algeria_delivery_companies_pricing_research.md`, editable by admin afterward); added a startup warning (not a hard block) if the admin account still has the default seed password.
- **`backend/server.js`** — mounted the new `deliveryRouter` at `/api/delivery`.
- **`backend/.env`** — replaced the hardcoded JWT secret with a freshly generated 96-character random one. **Action for you:** since this file previously held a secret that was effectively public (hardcoded in source), rotate it again for any non-local environment and make sure `.env` is never committed (see new `.gitignore`).
- **`backend/.env.example`** — documents the 32-char minimum and how to generate a secret.

## Frontend — new files

- **`frontend/src/components/AdminDeliveryPricing.jsx`** — new Admin Studio tab: editable table of all 58 wilayas' home/stop-desk fees, per-row Save.

## Frontend — modified files

- **`frontend/src/api.js`** — added `getWilayas`, `getCommunes`, `getDeliveryPricing`, `updateDeliveryPricing`.
- **`frontend/src/components/OrderForm.jsx`** — commune is now a `<select>` populated from `/api/delivery/communes?wilaya_code=` for the chosen wilaya (falls back to free-text entry for the ~10 wilayas the commune dataset doesn't cover); the displayed delivery fee is now the live admin-configured value from `/api/delivery/pricing` instead of the old hardcoded Alger/non-Alger split. This is a **preview only** — the server always recomputes the authoritative fee at submit time regardless of what the client displayed or sent.
- **`frontend/src/pages/AdminDashboard.jsx`** — added the "Delivery Pricing" tab wired to `AdminDeliveryPricing`.
- **`.gitignore`** (new, project root) — `node_modules/`, both `.env` files, `data.db*`, uploaded files (keeping `.gitkeep`), `dist/`.

---

## A bug found and fixed during my own testing

While verifying the new Admin Delivery Pricing tab in a browser, editing **only** the home-delivery-fee field and saving caused the stop-desk fee to be silently overwritten with `0`. Root cause: `setDraft()` seeded the "other" (untouched) field from a dummy placeholder row instead of the real current value when a row had no draft yet. Fixed in `AdminDeliveryPricing.jsx` by passing the full row (not just its code) into `setDraft`, so the fallback correctly reads the row's actual current fee. Re-tested in-browser after the fix: editing one field now correctly preserves the other. No production data was affected — this was caught and corrected during this same session, before you ever used the feature.

---

## Testing performed

All done against isolated instances on alternate ports (backend `:5920`, frontend `:5921`) with `CLIENT_ORIGIN`/`VITE_API_URL` pointed at each other — your normal dev servers on `:5000`/`:5173` were never touched.

- **Price tampering blocked:** submitted an order with `items[0].price=1`, `delivery_fee=0`, `total_price=1` for a 4,200 DZD product → server correctly stored `price=4200`, `delivery_fee=750` (real wilaya tier), `total=4950`.
- **Admin-only pricing update enforced:** `PUT /api/delivery/pricing/31` succeeds with a valid admin token, returns `401` with none.
- **Malicious upload rejected:** a PHP payload renamed to `fake.jpg` with a spoofed `Content-Type: image/jpeg` was rejected by the new signature check (`400`, no file written to disk — confirmed by listing `backend/uploads/` afterward).
- **Wilaya → commune → live pricing UI flow:** selected "31 - Oran" in the checkout form in an actual browser session; the commune dropdown populated with the 26 real Oran communes (Es Senia, Bir El Djir, Arzew, ...) and the shipping fee shown matched the admin-configured value live.
- **Admin Delivery Pricing tab:** logged in as `admin`/`admin123456`, edited a fee through the UI, saved, confirmed persistence and the fixed bug above.
- Backend startup verified clean (migrations, `audit_logs`/`delivery_pricing` table creation, default-password warning, JWT secret length check).
- `npm run build` (frontend) succeeds with no errors.
- All test data created during verification (one test order, two temporarily-modified pricing rows) was cleaned up / restored afterward.

---

## Batch 2 — Customer returns, product cost/margin, finance page, data file reorganization

### Data files moved

- `Wilaya_Of_Algeria.json` and `Commune_Of_Algeria.json` → `backend/data/` (only the backend reads these, at runtime).
- `algeria_delivery_companies_pricing_research.md` → `docs/` (reference documentation, not consumed by code).
- Updated the two runtime read sites: `backend/db.js` (delivery pricing seed) and `backend/utils/deliveryPricing.js`.

### Customer returns tracking

- No new backend endpoint needed — the admin already loads every order, so `frontend/src/utils/customerStats.js` aggregates return/cancel counts **client-side**, grouped by phone number (the stable identifier; customers spell names inconsistently across orders).
- New **Customers** admin tab (`AdminCustomers.jsx`): searchable/sortable table of every customer with total orders, returned count, canceled count, return rate, and delivered spend.
- **Order page flag** (as requested): both `AdminOrdersTable.jsx` and `AdminOrderDetailModal.jsx` now show a "⚠ N prior returns" badge next to the customer's name/phone whenever that phone number has ≥1 returned order.

### Product cost / margin

- New `buying_price` column on `products` (migration in `db.js`).
- **Security-relevant:** cost price is business-sensitive and must never reach the public storefront. Added `optionalAuth` middleware (`middleware/auth.js`) — verifies a Bearer token if present but never rejects the request — used on the public product GET endpoints so `buying_price` is stripped from the response unless the caller is an authenticated admin. Verified with curl: unauthenticated `GET /api/products/:id` omits the field entirely; authenticated admin requests include it.
- `AdminProductForm.jsx` — new "Buying (Cost) Price" input next to selling price; catalog table now shows a Cost/Margin column per product.
- `orders.js` snapshots each item's `buying_price` into the stored order JSON **at order-creation time** — so if the admin changes a product's cost later, historical profit figures for past orders don't retroactively change.

### Finance page

- New `ad_spend` table + `routes/finance.js` (admin-only CRUD: list/create/delete). This is the only piece that needed real persistence — revenue, COGS, and return-delivery-cost are all derivable from orders already in memory, so they're computed client-side in `AdminFinance.jsx`, not via a new summary endpoint.
- Formula (date-range selectable, defaults to trailing 30 days): `Net Profit = Revenue − COGS − Return Delivery Cost − Ad Spend`, where:
  - **Revenue / COGS** sum `item.price` / `item.buying_price` × quantity for orders with status Confirmed, Shipped, or Delivered (same status set the existing dashboard KPI card already used for "Active Order Revenue").
  - **Return Delivery Cost** sums `delivery_fee` only for orders with status **Returned** — for confirmed/delivered orders the client covers the delivery fee via COD, so it's not a merchant cost; for a returned package, the courier fee was already incurred and nobody paid it, so it's absorbed as a loss.
  - **Ad Spend** sums entries whose date range overlaps the selected finance range (full amount counted on any overlap — not prorated; the UI documents this).
  - A visible warning banner lists how many sold line items have no buying price set, so the admin knows when profit is understated rather than silently trusting an incomplete number.
- Verified by hand: for a test order (Delivered, 2×4,200 DZD item with 1,800 DZD cost) plus pre-existing orders, computed Revenue 24,600 / COGS 3,600 / Return cost 700 / Ad spend 5,000 / Net Profit 15,300 DZD — matched the UI exactly.

### Testing performed (batch 2)

Same isolated-instance methodology as batch 1 (alternate ports, never touching the running `:5000`/`:5173` dev servers):
- Confirmed `buying_price` is absent from public product responses and present in admin ones.
- Confirmed order items snapshot `buying_price` correctly at creation.
- Confirmed ad-spend CRUD works and is blocked without a valid admin token (401).
- Browser-verified all three new/changed admin surfaces (order return flag, Customers tab, Finance tab, product cost/margin column) end-to-end against real data, including the hand-checked profit arithmetic above.
- All test data created during verification (one test order, one ad-spend entry, one product's test cost value) was deleted/reset afterward.

---

## Batch 3 — Agency remittance ledger, order pipeline split, per-agency tracking

This batch answers: "I marked an order Confirmed but I don't actually know if the agency paid me for it" and "I want to track which delivery company handled which package and how much each one owes/paid me."

### Data model

- `delivery_agencies` — admin-managed list of couriers (id, name).
- `agency_remittances` — the real ledger. One row per "the agency paid me" event: agency, amount, note, timestamp.
- `agency_remittance_orders` — join table: which order ids a remittance batch covers. An order not appearing in any remittance is still owed by its agency.
- `orders.delivery_agency_id` and `orders.tracking_tag` — new columns so every order can be attributed to a courier with a follow-along reference code.

### Why a ledger table instead of a computed flag

The original ask was explicit: after marking an order Confirmed, there was no way to tell whether the agency had *actually* paid out yet. A boolean `is_paid` column on `orders` would let you flip it silently with no record of when/how much/by whom. Instead, `agency_remittances` is an append-only proof-of-payment log — each row is literally "Agency X paid Y DZD for these N orders on this date," visible in a new **Agency Payment Ledger** table in the Finance tab, with an "Undo" action if a mistake needs correcting (deletes the ledger row and its order links; the orders simply become unpaid again — no data is silently overwritten).

### Order pipeline split (Finance tab)

Per the request to separate "orders that are coming" from "orders already confirmed," the Finance tab now shows three pipeline stages:
1. **Coming (Pending)** — not yet confirmed, no cash involved yet.
2. **Awaiting Agency Payment** — Confirmed/Shipped/Delivered orders with no remittance covering them yet (the agency is holding the client's COD cash).
3. **Payment Received** — the same set, but already covered by a ledger entry.

The "Awaiting Agency Payment" table has a checkbox per order; selecting several and choosing an agency + amount (auto-suggested as the sum of their subtotals, editable) creates one remittance batch covering all of them — the bulk action requested ("agency paid me for this and this and this").

**Validation enforced server-side** (`routes/agencies.js`): an order must be Confirmed/Shipped/Delivered to be marked paid (Pending orders rejected), and an order already covered by an earlier remittance can't be double-counted — both verified by test.

### Agency attribution + tracking tag

- `AdminOrderDetailModal.jsx` — new "Delivery Agency & Tracking" section: a dropdown of admin-defined agencies plus a free-text tracking tag, saved via `PATCH /api/orders/:id/logistics`.
- `AdminOrdersTable.jsx` — new "Agency / Tracking" column for quick scanning without opening the modal.
- Agencies are managed (added/removed) from the new **Agencies** tab, not inline in the order modal, to keep the list authoritative in one place. Deleting an agency is blocked server-side while any order still references it (`400` with a clear message), so you can't silently orphan historical orders.

### New Agencies tab

Per-agency rollup, computed client-side from orders + the remittance ledger (no new heavy backend aggregation needed — same pattern as Customers/Finance): orders handled, returned count/rate, amount still awaiting payment, amount already received (sum of ledger entries), return-cost (delivery fees absorbed on that agency's returned packages), and a net-received figure (received − return cost) — this is the "how much each one gained/lost" view.

### Testing performed (batch 3)

Full flow tested against a live isolated backend instance (note: this instance shares the same `data.db` file as your running `:5000` dev server rather than a separate copy, since no `DB_PATH` override was used — your own concurrent testing showed up in the data, which is how I noticed you'd already started setting buying prices and creating real orders/returns; I was careful to only clean up rows I created myself, never touching yours):

- Created an agency, two Confirmed orders assigned to it with tracking tags.
- Confirmed a Pending order **cannot** be remitted (400 with a clear message).
- Bulk-marked both orders as paid via the actual browser UI (checkboxes → agency + amount + note → submit) — verified the ledger row appeared with the correct order ids, the "Awaiting Agency Payment" count dropped from 4 to 2, and the Agencies tab showed 12,000 DZD received / 0 owed for that agency.
- Confirmed double-marking an already-paid order is rejected (400).
- Confirmed agency deletion is blocked while orders reference it.
- All test orders, the test remittance, and the test agency were deleted afterward; your real data (products, orders, buying prices you'd already set) was left untouched.

## Not done / left for you

- **Cookie-based auth migration** — deliberately not implemented; see `SECURITY_REVIEW.md` §3 for the reasoning (would require HTTPS + same-site deployment to work, and no XSS sink exists today to justify the churn).
- **`stopdesk_fee`** is stored and admin-editable but not yet surfaced as a delivery-method choice in checkout (currently home-delivery-only, matching the original single-fee UX). Wiring a home/stop-desk toggle into `OrderForm` would reuse the same field.
- The seeded per-wilaya prices are approximate research-derived defaults (see `SECURITY_REVIEW.md` §7) — verify/adjust them against your actual courier contract before relying on them commercially.
- Your `:5000` backend process is a plain `node server.js` (no `--watch`), so it will **not** pick up the batch 3 changes (agencies/finance routes, new order columns) until you restart it — `Ctrl+C` then `npm run dev` (or `npm start`) in `backend/`. The DB migrations run automatically on that next startup; nothing else to do.
