# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TLUX — a Vietnamese POS / retail management system (like iPos, KiotViet): batch-based inventory with expiry dates (FEFO), multi-invoice POS for cashiers, barcode scanning (USB keyboard-wedge + phone camera via QR pairing over socket.io), 4-role RBAC, loyalty points, discount codes, Elasticsearch fuzzy product search, PayOS bank-transfer payments. UI text is Vietnamese.

## Repository layout

- `frontend/` — Next.js 16 App Router app (TypeScript, Tailwind v4, TanStack Query). Pages live in `src/app/(app)/*` behind `AppShell` (client-side auth + role-filtered sidebar); `/login` and `/scan/[token]` (phone scanner page) sit outside the shell. Management pages follow the pattern: `page.tsx` is a server component that fetches initial data via `lib/server-api.ts` (forwards the auth cookie) and passes it as `initialData` to a colocated `*Client.tsx` — keep new pages SSR-first like this. POS UI is split into `src/components/pos/*` (InvoiceTabs, InvoicePanel, ProductGrid, modals). Shared: `src/lib/{api,types,format,socket,hooks,server-api}.ts`, `src/components/{ui,AppShell}.tsx`. `/products/barcodes` renders printable CODE128 labels (jsbarcode) for testing scanners.
- `backend/` — Express 5 + Mongoose (MongoDB Atlas), plain JS ESM. `src/models/`, `src/routes/`, `src/middleware/`, `src/lib/` (es.js, cloudinary.js, payos.js, socket.js). JWT in httpOnly cookie; roles: ADMIN, MANAGER, WAREHOUSE, CASHIER.
- `docker-compose.yml` — Elasticsearch 8 (single node, no security) on :9200.

## Commands

Frontend uses **pnpm**, backend uses **npm** (separate lockfiles — do not mix).

```bash
docker compose up -d          # Elasticsearch (required for fuzzy search; API falls back to Mongo regex)

cd backend
npm install
npm run dev                   # API + socket.io at http://localhost:4343
npm run seed                  # demo users/products/batches/customers/discounts + ES index
npm run reindex               # resync all products into Elasticsearch

cd frontend
pnpm install
pnpm dev                      # http://localhost:3000
pnpm build && pnpm lint
```

Seeded logins (password `123456`): `admin`, `quanly` (MANAGER), `thukho` (WAREHOUSE), `thungan` (CASHIER).

Env: `backend/.env` (see `.env.example`) — Cloudinary keys enable product-image upload, PayOS keys enable transfer payments; both endpoints return a clear 5xx message when unconfigured. `frontend/.env.local` needs `NEXT_PUBLIC_API_URL`.

There is no test setup — verification is manual (seed + drive the app).

## Domain rules worth knowing

- Stock is never stored on Product; it's the sum of `InventoryBatch.remaining`. Checkout allocates FEFO (earliest `expiryDate` first, batches without expiry last) inside a Mongo transaction and records `batchAllocations` per order item.
- Orders flow DRAFT → PAID (cash) or DRAFT → PENDING_PAYMENT → PAID (PayOS webhook `/api/payments/payos/webhook`). Cancelling/failed PayOS reverts stock, discount usage, and redeemed points (`revertOrder` in `routes/orders.js`).
- A cashier's open tabs = their DRAFT/PENDING_PAYMENT orders (`GET /api/orders/drafts`), so parked invoices survive reloads.
- Points: earn 1 per 10.000đ of paid total; redeem 1 = 100đ (constants in `routes/orders.js`).
- Product writes must sync Elasticsearch (`indexProduct`/`removeProduct` in `lib/es.js`); search uses `multi_match` fuzziness AUTO over an asciifolding analyzer so unaccented/misspelled Vietnamese matches.
- Phone-scanner pairing must work over LAN in dev: `POST /api/scan-sessions` returns the server's `lanIps`, the QR encodes the LAN URL, `getApiUrl()` in `lib/api.ts` swaps a localhost API host for the page's hostname on non-localhost clients, and backend CORS allows private-IP origins when `NODE_ENV !== "production"`. Don't hardcode localhost in anything the phone touches.

## Stack notes

- **React 19 + React Compiler enabled** (`reactCompiler: true`): skip manual `useMemo`/`useCallback` micro-optimizations.
- **Tailwind CSS v4**, CSS-first config: design tokens (colors `paper/ink/leaf/pine/amber/danger`, fonts) live in `@theme` in `frontend/src/app/globals.css`. Font is Be Vietnam Pro; money values use the `.money` class (tabular numerals).
- **TanStack Query v5** for all server state; mutations update the `["drafts"]` cache directly on the POS screen.
- **TypeScript strict**; `@/*` → `frontend/src/*`. ESLint flat config.
- Express 5 auto-forwards rejected promises to the error middleware — route handlers don't wrap in try/catch; shared error shape is `{ message }` (Vietnamese).
