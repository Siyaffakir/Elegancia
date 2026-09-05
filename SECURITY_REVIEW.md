# DZ Shop — Security & Correctness Review

**Date:** 2026-08-17
**Scope:** `backend/` (Express + SQLite) and `frontend/` (React/Vite), focused on: admin logging, path traversal, cookie/token handling, rate limiting (admin brute force + uploads), upload security (per `temp-first-upload-lifecycle.md`), and general best-practice/logic review.

Severity scale: **Critical / High / Medium / Low / Info**

---

## 1. Logging (admin actions & auth events)

**Finding (High): No security/audit logging exists at all.**

There is no record of who logged in, when, from where, or which admin performed which action (product create/edit/delete, order status changes/deletion, password changes). `console.log`/`console.error` calls only cover crashes and startup, never security-relevant events. If credentials leak or an admin account is misused, there is currently no way to reconstruct what happened.

- `routes/auth.js` — login success/failure is not recorded anywhere (no username, IP, or timestamp).
- `routes/products.js`, `routes/orders.js` — no record of which admin created/edited/deleted a product or changed/deleted an order.

**Fix implemented:** an `audit_logs` table + `logAudit()` helper recording event type, actor (username/id when known), IP, success flag, and a detail string, called from every admin-facing state-changing route and from login attempts (including failed ones, without ever logging the password itself).

---

## 2. Path traversal

**Finding (Info — already solid, no fix required):** `middleware/pathSecurity.js` (`createSafeStaticServer`) is implemented correctly:
- decodes the URL once and rejects `..`, `\`, and encoded/raw null bytes,
- resolves against the canonical uploads dir and verifies the result is still inside it (`resolvedPath.startsWith(canonicalBase + path.sep)`),
- blocks dotfiles and enforces an extension allow-list,
- sets `X-Content-Type-Options: nosniff` and a locked-down CSP for served files.

One **Low** note: the allow-list includes `.svg`. SVG can carry inline `<script>`/event-handler payloads and — depending on browser/context — execute as an active document if it's ever framed or navigated to directly rather than used as an `<img>` source. The upload pipeline itself never produces `.svg` files (upload's own allow-list is jpg/jpeg/png/webp/gif only), so this is only reachable if an admin manually drops an `.svg` into `uploads/`. Given the CSP (`default-src 'none'`) and `nosniff` already applied on delivery, risk is low; left as-is but flagged since it's an easy value to accidentally rely on later.

---

## 3. Cookies / token storage

**Finding (Info):** The app does not use cookies for auth at all — the JWT is kept in `sessionStorage` (and briefly `localStorage` is cleaned up defensively) and sent as a `Bearer` header (`frontend/src/api.js`, `frontend/src/context/AuthContext.jsx`). Because the frontend (`:5173`) and backend (`:5000`) are different origins in local dev and the README documents this Bearer-token architecture as intentional, this review does **not** migrate to cookie-based auth — doing so would require `SameSite=None; Secure`, which needs HTTPS and breaks local HTTP dev, and would add CSRF-token machinery for no clear benefit here.

Token-in-storage is safe **as long as there is no XSS sink**. Verified: no `dangerouslySetInnerHTML`, `eval`, or `new Function` anywhere in `frontend/src`; all user-supplied strings (order names, addresses, product fields) are rendered through JSX, which auto-escapes. So there is currently no code path that could execute attacker-controlled markup and steal the token.

**Recommendation (not implemented, architecture decision for the team):** if this is ever deployed same-site behind one HTTPS domain (e.g. reverse-proxied `/api` on the same origin as the SPA), moving the JWT into an `httpOnly; Secure; SameSite=Strict` cookie plus a double-submit CSRF token would remove the XSS-exfiltration risk entirely. Until then, sessionStorage (already used, and better than localStorage since it's cleared per-tab) is the right tradeoff.

---

## 4. Rate limiting

**Finding (Medium):** Only the login route had a dedicated limiter (10/15min/IP). Everything else — including the general API limiter (500/15min) — is far too loose for brute-force-adjacent or resource-abuse scenarios:

- `POST /api/auth/change-password` had **no** dedicated limiter — an attacker with a stolen/guessed low-privilege token (or a compromised session) could brute-force `currentPassword` with no throttling beyond the generic 500/15min.
- `POST/PUT /api/products` (image upload) had no dedicated limiter — a valid or stolen admin session could hammer disk with large uploads, or an attacker could use it to fill disk (DoS) far faster than the generic limiter would stop.
- `POST /api/orders` (public checkout, unauthenticated) had no dedicated limiter — trivially scriptable to flood the orders table / spam the admin dashboard.

**Fix implemented:** `middleware/rateLimiters.js` centralizes:
- `loginLimiter` (unchanged, 10/15min),
- `changePasswordLimiter` (10/15min/IP),
- `uploadLimiter` (20/15min/IP) on product create/update,
- `orderCreateLimiter` (30/15min/IP) on public checkout.

---

## 5. Upload security (per `temp-first-upload-lifecycle.md` guidance)

The reference doc's rules were applied where relevant to this simpler (single-file, no-encryption-needed) product-image use case:

**Finding (High): content bytes were never verified — only filename extension + declared `Content-Type`.** Both are attacker-controlled metadata. A file could be named `photo.jpg`, declare `Content-Type: image/jpeg`, and contain arbitrary bytes; it would pass the old filter untouched.
**Fix:** added `verifyImageSignature()` in `middleware/upload.js` that checks the actual magic bytes for JPEG/PNG/GIF/WEBP (via a `multer.memoryStorage` pre-check) before the file is ever written to disk, independent of both filename and MIME header.

**Finding (Medium): the "double extension" guard was a substring blocklist, not a generalized rule.** It scanned every dot-separated segment of the original filename for a hardcoded list (`php`, `sh`, `js`, ...) — exactly the anti-pattern the reference doc warns against ("must be a generalized rule, not a list of blocked filenames"). It also produced **false positives** on entirely safe filenames like `vacation.js.holiday.jpg` (rejected, even though the final extension is a harmless `.jpg`), and would miss any dangerous extension not on the hardcoded list.
**Fix:** removed the substring blocklist. The final-extension check (`path.extname(...)` against the allow-list) already is the generalized rule the doc asks for — anything whose *final* suffix isn't `.jpg/.jpeg/.png/.webp/.gif` is rejected, regardless of what precedes it (`contract.pdf.sh`, `x.php.jpg.exe`, etc. — the last case is still rejected because its final extension is `.exe`). Combined with the new signature check, this is stronger than the old heuristic and has no false positives.

**Finding (Low): stored files did not have their permission bits explicitly restricted.** Relied entirely on process umask.
**Fix:** after writing, the file's mode is explicitly set to `0o644` (no execute bits) rather than trusting the umask. (Unlike the sensitive PDFs in the reference doc, product images are meant to be publicly served static assets, so `0600` would be wrong here — the goal per the doc is "no execute bits," which `0644` guarantees.)

**Finding (Medium): orphaned files on failure — the exact problem `temp-first-upload-lifecycle.md` is about.** `multer` writes the file to `uploads/` *before* route handler validation runs. If validation then failed (missing `name`/`price`/`category` on create, or product not found on update), the response was an error but the uploaded file was never deleted — permanently orphaned on disk. Symmetrically, replacing a product's image on update never deleted the old file, and deleting a product never deleted its image — both silent storage leaks.
**Fix:** added `deleteUploadedFile()` cleanup calls: on validation failure after upload, on 404 during update, when an image is replaced (old file removed), and when a product is deleted (its image file removed). This is the same "clean up temp/permanent files on failure" principle from the reference doc, adapted to this simpler non-transactional single-file flow (no encryption/Vault applies here — these are public product photos, not the sensitive registration documents the doc's envelope-encryption section targets).

---

## 6. Business logic — critical price-tampering vulnerability

**Finding (Critical): the server trusted client-supplied prices and totals for cart checkout.**

In `routes/orders.js` (`POST /api/orders`):
```js
finalItems = items.map((item) => {
  const unitPrice = parseFloat(item.price) || 0;   // <-- client-supplied, never checked against DB
  ...
});
...
let deliveryFee = reqDeliveryFee !== undefined ? parseFloat(reqDeliveryFee) : ...;   // <-- client-supplied
let totalPrice = reqTotalPrice !== undefined ? parseFloat(reqTotalPrice) : ...;      // <-- client-supplied
```
Any customer could submit `POST /api/orders` with `items: [{ id: 3, name: "Luxe Rose EDP", price: 1, quantity: 1 }]` and `total_price: 1`, and the order would be created and stored with those attacker-chosen numbers — the admin dashboard would show a 1 DZD order for a 7,800 DZD product. The only path that *did* look up the real price was the legacy single-`product_id` fallback; the modern multi-item cart path (what the real `OrderForm`/cart checkout actually uses) did not.

**Fix implemented:** the server now **always**:
1. looks up every item's `id` in the `products` table and uses the DB price/name/category/stock — the client-supplied `price`/`name` in `items[]` are ignored entirely (used only as a fallback display label if the id is somehow missing, which no longer happens for real products);
2. computes the delivery fee itself from the new admin-configurable `delivery_pricing` table (see §7) keyed by wilaya, never from `req.body.delivery_fee`;
3. computes `total_price` as `subtotal + delivery_fee` server-side, never from `req.body.total_price`.

Client-sent `delivery_fee`/`total_price`/`items[].price` are now ignored for computation (kept only for backward-compat logging if wildly mismatched, to help spot bugs/abuse, but never trusted for the stored total).

---

## 7. Delivery pricing (wilaya/commune)

Previously delivery fee was a hardcoded binary rule (`400 DA if Alger, else 700 DA`, free ≥ 10,000 DA) duplicated in both `OrderForm.jsx` and `orders.js`, with no relationship to the 58 real wilayas or the commune-level detail in `Commune_Of_Algeria.json`, and no way for the store admin to adjust it without a code change.

**Implemented**, seeded from `algeria_delivery_companies_pricing_research.md`'s cross-company comparison (Yalidine/ZR/Noest/Maystro averages, rounded):
- `delivery_pricing` table: `wilaya_code, wilaya_name, home_fee, stopdesk_fee, updated_at` — one row per wilaya (1–58), admin-editable.
- `GET /api/delivery/wilayas` — public, serves the 58 wilayas from `Wilaya_Of_Algeria.json`.
- `GET /api/delivery/communes?wilaya_code=` — public, serves that wilaya's communes from `Commune_Of_Algeria.json` (falls back to free-text entry in the UI for the ~10 newer wilayas not covered by this commune dataset).
- `GET /api/delivery/pricing` — public (needed by checkout to quote a fee before order submission).
- `PUT /api/delivery/pricing/:wilaya_code` — **admin-only**, updates `home_fee`/`stopdesk_fee` for one wilaya.
- Free-delivery threshold (10,000 DZD) kept as a simple constant — it's a promo rule, not per-wilaya pricing, and wasn't part of the research doc's scope.
- Frontend: `OrderForm` now uses a real commune `<select>` sourced from the commune API (was free text with no relation to the actual wilaya chosen) and shows the live admin-configured delivery fee instead of the old hardcoded Alger/non-Alger split.
- Admin Studio gets a new "Delivery Pricing" tab to edit home/stop-desk fees per wilaya.

Per the research doc's own caution ("do not model pricing as `courier + wilaya = price`" and "verify against the courier's live API before billing"), this is intentionally a **simple, single-courier, home-delivery-only, per-wilaya base price** — the right level of complexity for a single-merchant COD shop, not a multi-courier rate-shopping engine. Weight tiers, stop-desk-vs-home selection in checkout, multi-courier comparison, and per-commune granularity are explicitly out of scope for this pass; `stopdesk_fee` is stored for future use but not yet exposed in checkout.

---

## 8. Secrets hygiene

**Finding (High): hardcoded JWT fallback secret.** `middleware/auth.js` had `const JWT_SECRET = process.env.JWT_SECRET || 'elegancia_dz_shop_jwt_secure_key_2026_x89'` — if `.env` were ever missing in a deployment, the server would silently start with a **publicly-known, hardcoded secret** (it's sitting in this very repo), letting anyone forge admin JWTs.
**Fix:** removed the fallback; the server now throws at startup if `JWT_SECRET` is unset or shorter than 32 characters.

**Finding (Medium): default admin credentials (`admin` / `admin123456`) are seeded automatically and documented in `README.md`.** This is a reasonable "batteries included" first-run default, but there was no warning if it's still in use later.
**Fix:** startup now logs a visible warning if the current admin username/password still match the seed defaults, prompting a change via the existing change-password endpoint/UI.

**Finding (Low): no `.gitignore` anywhere in the project** — `.env` (with real secrets), `data.db*`, and `node_modules/` all sit unprotected if this is ever put under version control.
**Fix:** added a `.gitignore` covering `node_modules/`, `.env` (keeping `.env.example`), `data.db*`, and uploaded files (keeping `.gitkeep`).

---

## 9. Other correctness / best-practice notes (lower priority, not all fixed)

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Order `quantity` from client isn't clamped — a negative or zero quantity would produce a negative line total that reduces the computed subtotal. | Medium | **Fixed** — quantity now clamped to `>= 1` server-side. |
| 2 | Phone validation regex only covers `05/06/07 + 8 digits`; fine for Algerian mobile numbers, no change needed. | Info | No action |
| 3 | SQL queries are all parameterized (`better-sqlite3` prepared statements) — no SQL injection found anywhere, including the dynamic `category IN (...)` builder. | Info | No action |
| 4 | `db.js` runs a hardcoded `DELETE FROM products WHERE category = 'makeup' OR name LIKE '%lipstick%'...` on **every server start** — this looks like a one-off cleanup migration that was left permanently in the startup path. Harmless today, but if an admin ever re-adds a makeup product it will be silently deleted again on the next restart. | Low | Flagged only — left in place since removing it is a product decision, not a security fix; recommend moving one-off cleanups out of the always-run startup path in general. |
| 5 | CORS: `origin: undefined` (no `Origin` header, e.g. curl/mobile) is always allowed — standard and expected for a public API with a separate mobile/server client story; not a misconfiguration given `credentials: true` is only meaningful for browser requests that do send an `Origin`. | Info | No action |
| 6 | Health check endpoint (`/api/health`) advertises which security features are enabled (`jwt: true`, etc.) — minor information disclosure about the stack's defenses to an unauthenticated caller. | Low | Left as-is (no secrets exposed, just booleans); flagged for awareness. |

---

## Summary of severities addressed

| Severity | Count | Fixed |
|---|---|---|
| Critical | 1 (price tampering) | Yes |
| High | 3 (no audit logging, unvalidated upload content, hardcoded JWT fallback) | Yes |
| Medium | 5 (rate limiting gaps, orphaned uploads, extension blocklist anti-pattern, default-creds warning, quantity clamping) | Yes |
| Low | 4 (file permissions, `.gitignore`, SVG allow-list note, health-check disclosure) | Mostly (perms + gitignore fixed; SVG/health-check flagged only) |
| Info | 5 | Reviewed, no action needed |

See `IMPLEMENTATION_NOTES.md` for exactly what changed, file by file.
