# Sijilmassa API — backend setup (MySQL + Express)

No Firebase. Data lives in MySQL (`sijilmassa_db`), accessed via mysql2 pool.

## 1. Prerequisites
- MySQL 8 running (this machine: `MySQL80` service ✓)
- Node 18+
- MySQL **root** password (asked once, stored in `server/.env` — gitignored)

## 2. First-time setup (already done on this machine)
```bat
cd server
npm install
copy .env.example .env
REM edit .env: DB_PASSWORD + DB_ROOT_PASSWORD + JWT_SECRET
node src/db/create.js    REM creates DB + limited app user (root only)
npm run migrate          REM applies src/db/migrations/*.sql (tracked table)
npm run seed             REM 8 tables, 10 categories, 12 items, 2 offers,
                         REM demo user demo@sijilmassa.ma / Demo1234 + 2 reservations
npm run test:db          REM connectivity check
npm start                REM API on http://localhost:4000
```

## 3. Re-running later
- `npm start` (API) + root `start-website.bat` (frontend on :5173)
- Migrations are idempotent — safe to re-run `npm run migrate`.
- Seeds skip non-empty tables.

## 4. Layout
```
server/src/
  config/env.js        env loading + validation (fails fast)
  db/pool.js           mysql2 promise pool (single DB layer)
  db/migrations/       versioned SQL (001_schema.sql …)
  db/migrate.js        ordered runner + schema_migrations tracking
  db/create.js         one-time DB+user bootstrap (root)
  db/seed.js           demo data (prices = DEMO)
  db/test-connection.js health check
  utils/               password.js (bcryptjs), tokens.js (JWT cookie)
  validation/          zod schemas (register/login/profile)
  middleware/          auth.js (requireAuth/requireRole), errors.js
  services/            userService, catalogService, reservationService
  controllers/         authController
  routes/              auth.js, api.js
  app.js / index.js
```

## 5. Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | – | liveness |
| POST | /api/auth/register | – | full_name, email, phone, password, confirm_password |
| POST | /api/auth/login | – | identifier (email or phone) + password |
| POST | /api/auth/logout | – | clears session cookie |
| GET/PATCH | /api/auth/me | ✓ | profile |
| GET | /api/menu | – | { categories, items, offers } |
| GET | /api/tables | – | read-only (availability = next stage) |
| GET | /api/reservations/mine | ✓ | customer reservations + table info |

Auth = httpOnly cookie (`sijilmassa_token`, 7d) with Bearer fallback.
Passwords = bcryptjs(12). Validation = zod(422 + field errors).

## 6. Staff dashboard API (RBAC — all under /api/staff, non-customer roles only)| Method | Path | Roles | Description |
|---|---|---|---|
| GET | /api/staff/overview | staff+ | counts: today/upcoming/pending/… + tables + bookingsToday |
| GET | /api/staff/reservations?date=&status=&q= | staff+ | search name/phone/table, filters |
| GET / PATCH | /api/staff/reservations/:id[/status] | staff+ | detail + status transitions (persisted) |
| POST / PATCH | /api/staff/tables[/:id] | admin/manager | add/edit/capacity/area/disable |
| GET / PATCH | /api/staff/menu + /menu-items/:id, /offers/:id | admin/manager | availability + DEMO prices |
| GET/POST/PATCH | /api/staff/users[/:id/role] | admin | team list, create staff/manager, roles |

Team demo logins: staff@sijilmassa.ma / Staff1234 · manager / Manager1234 · admin / Admin1234.
RBAC tested: 401 unauth, 403 customers + out-of-role writes, persistence verified.
Migration `002_roles.sql` adds the `manager` role. Test: `server/test-staff.ps1` (ALL PASS).

## 7. Online ordering (MySQL-persisted, server-priced)
Migration `004_orders.sql`: `product_options` (DB-configurable customization groups
scoped by item/category/all), `orders`, `order_items` (price snapshots).
Settings `delivery_fee_mad=20`, `free_delivery_over_mad=200`.
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/menu/options | – | customization groups |
| POST | /api/orders | ✓ customer | items+options; totals RECOMPUTED server-side (client totals ignored), transaction |
| GET | /api/orders/mine, /api/orders/:id | ✓ owner | history + details |
| GET/PATCH | /api/staff/orders[/:id/status] | staff+ | manage + statuses pending→…→completed/cancelled |
Payment: `cash` real; `card_demo`/`online_demo` clearly-labeled placeholders (no gateways).
Test: `server/test-order.ps1` (ALL PASS — exact totals 200.00/0.00/200.00).

## 8. Reservations + availability (MySQL-persisted, staff-reviewed)
Migration `005_availability.sql`: `menu_items.availability_mode`
(`all_day`/`lunch`/`dinner`/`preorder`, editable from dashboard Catalog).
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/reservations | ✓ customer | date≥today, time, guests 1–30, optional table/occasion( family/birthday/business/celebration/other)/notes(500) → `pending`, no conflict engine (staff confirms) |
Staff dashboard already lists occasion + special_requests per booking.
Test: `server/test-reserve.ps1` (ALL PASS).

## 9. Real reservation engine (availability + overlap + no double booking)
- `availabilityService.js`: centralized `ACTIVE_RES_STATUSES = pending/confirmed/seated`
  (completed/cancelled/no_show free the table); slot duration + service windows from
  `settings` (`reservation_duration_min`, `service_windows`); overlap rule
  `existing.start < newEnd AND existing.end > newStart` (adjacent bookings allowed);
  legacy NULL `end_time` treated as start + duration.
- `GET /api/tables/available?date=&time=&guests=` → tables with capacity ✓,
  not disabled ✓, no overlap ✓, inside service windows (else `outside_hours`/`none_available`).
- `POST /api/reservations` runs in a transaction with `SELECT ... FOR UPDATE` on the
  table row + re-checks overlap immediately before INSERT → concurrent same-table
  bookings serialize; loser gets Arabic 409. `PATCH /api/reservations/mine/:id/cancel`
  lets customers cancel their own `pending` requests.
- Staff confirm/seated re-checks overlap (excluding self) → 409 on conflict.
- Migration `006` added then `008` removed `uq_res_slot` (it wrongly blocked rebooking
  after cancellation — overlap engine is the real guard).
- Tests: `test-engine.ps1` (matrix), `test-edge.ps1` (adjacent/capacity/disable),
  parallel-race test (201 vs 409). ALL PASS.

## 10. GPS delivery system (Leaflet + OSM, no frontend keys)
- Migration `007_delivery.sql`: `customer_addresses` (owner-enforced CRUD) + order
  snapshot columns (`delivery_latitude/longitude/notes/distance_km/zone/status`) +
  zone settings (`restaurant_lat/lng`, `delivery_max_km`, `delivery_fee_per_km`).
- `utils/geo.js`: Haversine, `validCoords`, `zoneFor` (inside ≤ maxKm, review ≤ 1.5×,
  else outside), `quoteDelivery` (fixed + per-km, free over threshold).
- `services/geoService.js`: server-side Nominatim proxy (reverse + Morocco-biased
  search, cached, 8s timeout, Arabic errors) — UA/keys never leave the server.
- Routes: `GET /api/geo/reverse|search`, `POST /api/delivery/quote` (server truth),
  `GET/POST/PATCH/DELETE /api/addresses` (owner-only), orders accept `address_id`
  or raw coords (ranges validated, zone + fee recomputed, outside → Arabic 422),
  `PATCH /api/staff/orders/:id/delivery` (delivery statuses).
- Frontend: reusable `MapPicker` (GPS only on button click, draggable marker,
  click-select, search, all permission/timeout/accuracy states in Arabic),
  checkout address step (saved + map + server quote + save-address),
  account AddressBook (CRUD + default), staff order detail (mini map + Google-Maps
  link + delivery actions), dashboard Settings (zone + reservation config live).
- Privacy: no auto-request, nothing stored unless used/saved, coords visible only
  to owner + staff, HTTPS required in production for geolocation.
- Tests: `test-addr.ps1` (CRUD/default/isolation/validation), `test-geo.ps1`
  (inside/outside/free/coords/reverse/search). ALL PASS.
Migration `006_reservation_dedupe.sql`: unique (customer, date, time) → friendly 409.
Auth + write endpoints are rate-limited (in-memory, per-IP).
`server/test-api.ps1` — register → dup 409 → bad login 401 → login →
me → menu → tables → mine → logout → 401s → demo reservations.
Last run: ALL PASS (12 items, 10 cats, 8 tables, demo: 2 reservations).

## 7. Roles, payments, delivery ops
- Roles: customer, receptionist, kitchen_staff, delivery_driver, manager, admin
  (migration `009`; legacy `staff` → `receptionist`; `is_active` enforced at login
  and on every authenticated request; admin can activate/deactivate + reset passwords).
- Demo accounts (dev only): reception/kitchen/driver/manager/admin/customer @sijilmassa.ma.
  Seeded only when `SEED_DEMO!=0`; remove with `CONFIRM_PURGE=yes npm run purge-demo`.
  No demo credentials are shown anywhere in the UI.
- Payments (`010`, `011`): `payments` table, provider abstraction
  (`PAYMENT_PROVIDER=mock_dev` dev simulator with real intent→HMAC-webhook→idempotent
  architecture; `stripe`/`cmi` integration points documented in providers.js —
  Stripe doesn't onboard MA businesses, CMI needs a merchant contract).
  Order workflow: pending_payment → received → accepted → preparing → ready →
  assigned_to_driver → out_for_delivery → delivered (cancelled/rejected branches),
  enforced by a server transition map per role + `order_status_history` audit.
  Cash (if `cash_on_delivery=1`) moves to received; card stays pending_payment until
  a verified webhook marks it paid. Success screen only after server-verified paid.
- Delivery ops: `delivery_assignments` (UNIQUE order → claim race safe),
  driver claim/start/complete/fail, reception assign, `delivery_status` tracking,
  `notifications` table + 25s polling fallback with badge + opt-in sound.
- Manager extras: full menu categories/items/offers/option-groups CRUD,
  payment method toggles, zone + reservation settings, team roles.
- Tests: `test-v2.mjs` (37 checks: auth×6, payments, webhook, transitions, driver
  flow, claim race, privacy), `test-v3.mjs` (22: menu CRUD, refund, deactivation,
  notifications). ALL PASS.

## 8. Production notes
- New JWT_SECRET (`crypto.randomBytes(48)`), strong DB_PASSWORD, `CONFIRM_PURGE=yes npm run purge-demo`.
- `secure` cookies activate automatically with NODE_ENV=production (HTTPS — required for GPS).
- Set `PAYMENT_PROVIDER` to a real gateway + secrets; never commit `.env`.
- Redis-backed rate limiting + Socket.IO for multi-instance scale.
- Frontend reads only `VITE_API_URL` (public). No secrets in `src/`.
