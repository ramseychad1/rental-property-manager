# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state — read this first

This is a clean rebuild of a prior POC (previously named "StayNest" / "TheBayHome", repo `ramseychad1/staynest-booking-poc`), started fresh to get rid of leftover template naming and sidestep some Railway infrastructure friction (a storage bucket that couldn't be moved between workspaces). The old repo and its Railway project were left running, abandoned, not deleted — check there in git history if you need context on how a piece of this was originally built or debugged.

This rebuild is deliberately **single-tenant** for now. Multi-tenancy (one deployment serving multiple property owners, each scoped to their own properties) is a planned follow-up, not yet implemented — don't assume any `ownerId`-style scoping exists in the schema or API yet.

## What this project is

**Rental Property Manager** is a full-stack Airbnb-style vacation rental booking platform, split into three apps:

| App | Folder | Stack | Purpose |
|---|---|---|---|
| Public website | `frontend` | Next.js 16 / React 19 | Customer-facing booking site |
| Admin console | `admin` | Vite / React 19 | Internal ops dashboard + CMS |
| Backend API | `backend` | Express 5 / PostgreSQL (Prisma) | REST API, auth, bookings, seasonal pricing, admin ops |

The backend is expected at `http://localhost:8001/api` in local dev.

## Deployed environments (Railway)

Workspace `rental-property`, project `rental-property-manager`. Unlike the prior POC, this one runs a single Railway environment named `production` (no `staging`/`production` split) — all three apps live there, along with a `Postgres` service and a `rpm-uploads` Bucket:

| App | URL |
|---|---|
| Public website | https://frontend-production-c0d1.up.railway.app |
| Admin console | https://admin-production-bbad.up.railway.app |
| Backend API | https://backend-production-933a.up.railway.app (health: `/api/health`) |

Admin login (seeded by `prisma/seed.js`):
- Admin: `admin@rentalpropertymanager.com` / `Admin123!`

No demo guest account or placeholder properties are seeded — this is a genuinely clean start, add real properties through the admin panel.

Image uploads go through the `rpm-uploads` Railway Bucket, wired into the backend service via variable references (`BUCKET`/`ACCESS_KEY_ID`/`SECRET_ACCESS_KEY`/`ENDPOINT`/`REGION` = `${{rpm-uploads.VARNAME}}`) — see the storage/media notes under the backend architecture section below for why direct bucket URLs don't work and what's proxying them. `backend/scripts/migrate-bucket.js` exists for copying every object between two Railway Buckets by key (list → download → re-upload), in case this project ever needs to move workspaces again.

## Commands

### Frontend (`frontend`)
```bash
cd frontend
npm install
npm run dev      # next dev on 0.0.0.0:4000
npm run build    # next build
npm run serve    # next start on 0.0.0.0:4000 (serves the production build)
npm run lint      # eslint .
```
No test script is defined.

### Admin panel (`admin`)
```bash
cd admin
npm install       # package.json declares yarn as packageManager, but no yarn.lock is committed — npm works
npm run dev       # vite dev server on 0.0.0.0:5173
npm run build     # vite build
npm run preview   # vite preview on 0.0.0.0:4173
npm run lint       # eslint src --ext .js,.jsx
```
No test script is defined.

### Backend (`backend`)
```bash
cd backend
docker compose up -d         # local Postgres on localhost:5434 (see docker-compose.yml)
cp .env.example .env          # then set JWT_SECRET to a real random value
npm install
npx prisma migrate dev        # applies schema, generates client
node prisma/seed.js           # admin@rentalpropertymanager.com / Admin123! - no demo guest or properties
npm run dev                   # node --watch src/server.js, serves http://localhost:8001/api
```
No test script is defined. `npm run lint` runs eslint.

Frontend/admin panel need to point at it: `frontend/.env.local` sets `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001` (no `/api` suffix — the client appends that itself; leaving this unset falls back to a URL that double-prefixes `/api` and breaks server-side fetches), and `admin/.env.local` sets `VITE_API_URL=http://localhost:8001/api` (this one *does* want the suffix, since its axios calls omit it). Both are gitignored — recreate them from this note if missing. Property-related server fetches (`listProperties`/`getProperty`/`getSeasonsData`) use `cache: "no-store"` deliberately — admins actively edit these via the admin panel and expect the public site to reflect changes immediately, so don't reintroduce ISR caching on them without a cache-busting story (e.g. an on-demand `revalidatePath` webhook from the backend on save).

Prisma's CLI refuses to run `migrate reset` (or other destructor commands) when it detects it's being driven by an AI agent, without the user's explicit in-the-moment consent — don't try to work around that gate. To wipe dev data, delete rows directly with Prisma Client instead.

## Architecture

### Frontend — `frontend` (Next.js App Router)
- Routes live under `src/app/` (App Router — one folder per route: `properties/[id]`, `blogs/[id]`, `checkout`, `bookings`, `things-to-do/[id]`, `login`, `signup`, `forgot-password`, `reset-password`, `settings`, etc.).
- `src/services/api.js` is the single API client. It builds requests against `${NEXT_PUBLIC_API_BASE_URL}/api/...` and sends `credentials: "include"` (cookie-based sessions). Server-side GETs default to `force-cache` + `next.revalidate` (300s) unless a call explicitly passes `cache: "no-store"` — the property-related calls do this deliberately (see Commands section above). Client-side and non-GET requests always use `no-store`.
- `next.config.mjs` rewrites `/api/:path*` → `http://localhost:8001/api/:path*` for local dev, so the browser can call the backend same-origin without CORS during `next dev`. It also derives `images.remotePatterns` from `NEXT_PUBLIC_API_BASE_URL` at config-load time — see the CSP/remotePatterns note under Deploying below before hardcoding a domain here.
- `src/lib/mapEmbed.js` resolves a property's Google Maps location URL into an embeddable iframe `src`, **server-side only** (it calls `fetch` to follow redirects, which browsers can't do cross-origin). Handles three input shapes admins might paste: `/maps/embed?pb=...` (already embeddable, pass through), `/maps/place/<name>/...`, and `maps.app.goo.gl`/`goo.gl` short links (resolved via redirect, then coordinates extracted from the resolved URL). Falls back to searching the property's plain-text address if none of that works. Called from `properties/[id]/page.js` and passed down as a `mapEmbedUrl` prop — don't call it from a client component.
- `src/context/AuthContext.js` caches the current user in `localStorage` (`auth_user`) purely for optimistic UI; the real source of truth is always a `GET` to the backend's `/me`-style endpoint on refresh, with localStorage cleared on any failure. Don't treat the localStorage copy as authoritative.
- `src/context/BookingContext.js` persists the in-progress booking draft (property, dates, guest counts) to `localStorage` and rehydrates client-side only, starting from a fixed default on the server to keep SSR markup stable.
- UI primitives (`src/components/ui`) follow the shadcn/ui "new-york" style (see `components.json`); path aliases (`@/components`, `@/lib`, `@/hooks`, etc.) are configured there and in `jsconfig.json`.
- Env vars: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### Admin panel — `admin` (Vite + React Router)
- **This codebase is a generic multi-vertical rental-admin template, not a property-specific app.** `src/config/vertical.js` is the single source of truth for which rental vertical is active (property, car, bike, equipment, hotel room, etc.) — pages and components reference `vertical.item.*` rather than hardcoding "property", so route slugs, labels, and icons all come from this config. The active preset is `propertyVertical`. When reading page/route code, mentally substitute "Property" wherever you see `vertical.item`.
- `vertical.amenities` is a **fixed catalog list**, not a free-text field — the property edit form only renders a toggle button for each entry in that list. Any amenity string on a property record that isn't in this list (e.g. imported/legacy data) shows up in a separate "Other amenities on this record" section in `ItemForm.jsx` so it stays visible and removable instead of silently persisting forever with no UI to clear it. If you want a new amenity to be a normal selectable option, add it to `vertical.amenities`, don't just leave it on records.
- Routing is centralized in `src/App.jsx` using `react-router-dom` v7 with lazy-loaded route components. All authenticated routes are nested under `AdminRoute` (`src/router/ProtectedRoute.jsx`), which also exports a plain `ProtectedRoute` for authenticated-but-non-admin-strict screens.
- `src/lib/api.js` is an Axios instance (`withCredentials: true`, base URL from `VITE_API_URL`) with domain-grouped API objects (`authApi`, etc.) rather than one generic request function like the frontend uses.
- `src/contexts/AuthContext.jsx` and `src/contexts/ThemeContext.jsx` provide auth/theme state; `@tanstack/react-query` (`src/lib/queryClient.js`) handles server-state caching for everything else.
- Rich text editing (blog CMS) uses TipTap (`@tiptap/react`, `@tiptap/starter-kit`).
- `vite.config.js` sets a strict CSP dev-server header — `connect-src`/`img-src` are derived from `VITE_API_URL` at config-load time, not hardcoded, since a hardcoded domain here silently blocks real requests once deployed (see the Deploying section below).
- Deploys to Vercel as an SPA (`vercel.json` rewrites all paths to `index.html`).
- Env var: `VITE_API_URL`.

### Backend — `backend` (Express 5 + Prisma/PostgreSQL)
- Layout: `src/routes/` → `src/controllers/` → Prisma (`src/lib/prisma.js`). Everything is mounted under `/api` in `src/app.js`.
- **The frontend and admin panel expect Mongo-shaped JSON** (`_id` instead of `id`, nested `price`/`images`/`location` objects on a property, `userId`/`propertyId` populated as sub-documents on a booking, a `bookingStatus`/`totalAmount`/`bookingId` naming convention). `src/lib/serialize.js` is where every Prisma row gets translated into that shape before going out — when adding a field, add it there, not just in the Prisma schema, or the frontend won't see it. Money fields are plain whole-dollar integers (matching the frontend's `formatCurrency`, which does not divide by 100 — this is **not** a Stripe-style cents convention).
- List endpoints (users, bookings) must return `{items: [...], pagination: {page, limit, totalCount, totalPages, hasPrevPage, hasNextPage}}` — the admin panel's `Pagination.jsx` and page-level code destructure exactly this shape (`data?.users`/`data?.bookings` + `pagination`). Returning a flat array silently renders an empty list in the admin UI with no error.
- Auth is a JWT in an httpOnly cookie (`src/lib/jwt.js`, `src/middleware/auth.js`), read on every request by an always-on `attachUser` middleware so both public and admin routes can check `req.user`. `requireAuth`/`requireAdmin` gate individual routes; role check is `req.user.role === "Admin"` (capital A, matches the admin panel's own check).
- Signup is OTP-gated (`src/lib/otp.js`): `POST /otp/send-otp` issues a 6-digit code tied to an email+purpose, `POST /auth/register` consumes it. No email provider is wired up — codes are printed to the backend's own console (`[OTP] ... code for ...`). `POST /auth/register`'s response shape intentionally deviates from the rest of the API (`{message, user}`, not `{data}`) — that's not a bug, the frontend's `AuthContext.signup()` reads `data.user` directly.
- Booking pricing (season lookup, per-night segments, cleaning/service fee, tax) is computed server-side in `src/controllers/booking.controller.js` (`computePricing`) and mirrors the client-side estimate in `AvailabilityCard.jsx` almost line for line — if the season-pricing logic changes on one side, change it on the other too.
- `updateProperty` does a true partial update — it only writes fields actually present in the request body, never resets untouched fields to defaults. Keep it that way; a full-overwrite update is how "my edits keep reverting" bugs happen.
- Image uploads (`src/lib/storage.js`) go through a storage abstraction that speaks the S3 API (`@aws-sdk/client-s3`) when `BUCKET`/`ACCESS_KEY_ID`/`SECRET_ACCESS_KEY`/`ENDPOINT` are set, and falls back to local disk under `./uploads` otherwise. Those env var names deliberately match what Railway auto-injects when you attach a Bucket to a service.
  - **Local disk is dev-only — it does not survive a redeploy.** Railway containers have an ephemeral filesystem; every redeploy wipes anything written to `./uploads`, even though the database still references the old URL. Only safe for quick local testing, never for anything deployed and expected to persist.
  - **Both local-disk and S3 URLs must be absolute**, built from `publicBaseUrl()` (`https://${RAILWAY_PUBLIC_DOMAIN}` when set, else `http://localhost:$PORT`) — a bare `/uploads/x` resolves against whichever *frontend* origin renders the `<img>`, not this API, since they're on different domains once deployed.
  - **Railway Buckets (and S3-compatible buckets generally, here) are always private — there is no public-read option.** A direct bucket URL 403s for a browser. Uploaded files are served through `GET /api/media/:key` (`src/controllers/media.controller.js`), which streams the object from the bucket using the backend's own server-side credentials. `saveFile()` returns a URL pointing at this proxy route, not the bucket directly.
  - Because proxied images are served from the backend's own domain, no extra CSP/`remotePatterns` entries were needed beyond what the connect-src/img-src fixes already added (see below).
  - **Railway Buckets cannot be moved between projects or workspaces** — only their contents can be copied. `backend/scripts/migrate-bucket.js` does this (list objects in the old bucket → download to `backend/bucket-backup/` → re-upload to a new bucket with the same keys). Since property records only ever store the opaque `key` behind the `/api/media/:key` proxy, migrating a bucket this way needs zero database changes as long as keys are preserved.
- Not implemented: blog CMS, things-to-do CMS, error-log endpoints (the admin panel's `blogsApi`, `thingsToDoApi`, `errorLogsApi` will all 404 against this backend). Also not implemented: real email delivery, Google OAuth login, BullMQ/Redis job queue, multi-tenancy (see "Repository state" above).

#### Deploying (Railway)

**Backend** — deploy via a custom `Dockerfile` (the other two use Railway's auto-detect builder instead; see below).
- **`Dockerfile`'s `COPY` paths must be relative to `backend/` itself (`COPY . .`), not the repo root.** This contradicts Railway's documented "build context is always the repo root" behavior — empirically, for a service where both `rootDirectory` and `dockerfilePath` point at the same subdirectory, the effective Docker build context is scoped to that subdirectory instead. Confirmed the hard way on the prior repo: `COPY backend/ .` failed on Railway with `"/backend": not found` even though the identical Dockerfile built fine locally with the repo root as context. If you touch this Dockerfile, verify locally with `backend` itself as the build context (`cd backend && docker build -f Dockerfile .`), not the repo root.
- Migrations run as Railway's **pre-deploy command** (`npx prisma migrate deploy`), configured on the service, not baked into the Dockerfile's `CMD` — the container's `CMD` only starts the server. **`preDeployCommand` is a single string, not shell-chained** — `"npx prisma migrate deploy && node prisma/seed.js"` silently only runs the first command. If you need to chain commands there, wrap it yourself: `"sh -c \"cmd1 && cmd2\""`.
- Railway **dedupes deploy triggers against the same commit hash** — calling `redeploy` or `connect-service-source` again for a commit that already has a deployment (even a failed/removed one) can silently return `SKIPPED` rather than actually rebuilding with current service config. If a config-only change (env var, `preDeployCommand`, etc.) isn't taking effect, a trivial version-bump commit reliably forces a genuine fresh build when nothing else does.
- The Railway MCP's `redeploy` tool ("re-run the most recent deployment... reusing that deployment's existing build") reuses that deployment's **entire config snapshot, including `preDeployCommand`** — not the service's current config. Confirmed by updating `preDeployCommand` to chain in `node prisma/seed.js`, calling `redeploy`, and watching only the old plain `migrate deploy` command run. A genuinely fresh commit (even a trivial one) is what actually picks up a config change; `redeploy` alone does not.
- The prior POC's lesson that Railway's CLI silently drops `builder`/`rootDirectory` changes does **not** apply to the Railway MCP's `update-service`/`connect-service-source` tools — used directly on this rebuild, they set `rootDirectory`, `dockerfilePath` (which auto-switched `builder` to `DOCKERFILE`), `preDeployCommand`, `healthcheckPath`, and `watchPatterns` correctly on the first try, confirmed by reading them back with `get-service-config` afterward. Still worth the read-back check, but the MCP tools are more trustworthy here than the CLI was.
- `mcp__railway__create-tcp-proxy` (to expose a database's port publicly) gets blocked by the local safety classifier even for temporary/POC use — don't rely on it to reach a Railway-internal database from a local machine. Route one-off scripts through the service's own `preDeployCommand` instead (stays on Railway's private network) — or, for buckets specifically, just connect directly: Railway Buckets are only accessible via public networking anyway, so `migrate-bucket.js` needs no special routing.
- Project-level "Transfer Project" between workspaces is blocked while the project has a live Bucket, **and stays blocked for 52 hours after you delete one** (Railway's bucket-recovery hold window) — deleting the bucket doesn't unblock the transfer immediately. Plan around the wait if a workspace move is ever needed again.

**Frontend & admin panel** — deploy via Railway's **Railpack** auto-detect builder, deliberately, *not* a custom Dockerfile, to avoid repeating the backend's build-context debugging above. Railpack correctly scopes a Node/Next/Vite build to a service's `rootDirectory` without the COPY-path gymnastics a raw Dockerfile needs.
- Frontend service: `rootDirectory: frontend`, `startCommand: npx next start -H 0.0.0.0 -p $PORT` (overridden — the package.json `start` script runs `next dev`, a dev server, not `next start`; don't rely on Railpack's default start detection here). Build-time env vars `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_BASE_URL` must be set *before* the service's first build (Next.js inlines `NEXT_PUBLIC_*` vars at build time).
- Admin panel service: `rootDirectory: admin`, `startCommand: npx vite preview --host 0.0.0.0 --port $PORT`. Also needs `VITE_ALLOWED_HOSTS` set to the service's own Railway domain (comma-separated with `localhost,127.0.0.1`) — `vite preview` rejects requests whose `Host` header isn't in that list, per `vite.config.js`'s `preview.allowedHosts`. `VITE_API_URL` (build-time, Vite inlines `import.meta.env.*` too) must include the `/api` suffix, unlike the frontend's `NEXT_PUBLIC_API_BASE_URL`.
- Whichever service you create last, remember to add its generated domain to the backend's `CLIENT_URLS` env var (comma-separated) — otherwise its requests get CORS-rejected.
- **The admin panel's `vite.config.js` CSP and the frontend's `next.config.mjs` `images.remotePatterns` both need the backend's actual domain, or the browser silently blocks the request/image with zero server-side trace.** Both derive the allowlisted origin from `VITE_API_URL` / `NEXT_PUBLIC_API_BASE_URL` at config-load time — don't replace that with a hardcoded domain, or you'll reintroduce a bug that took real browser DevTools (not `curl`, which doesn't enforce CSP or do CORS preflights) to diagnose the first time around. CSP violations show in the DevTools Console; blocked requests show `(blocked:csp)` in the Network tab.
- Also set up a Railway Bucket for the backend (see the storage/media notes above) — attach it and wire `BUCKET`/`ACCESS_KEY_ID`/`SECRET_ACCESS_KEY`/`ENDPOINT`/`REGION` as Variable References before the first real image upload.

## Cross-app conventions
- All three apps talk over cookie-based sessions (`credentials: "include"` / `withCredentials: true`), not bearer tokens in headers — auth state depends on the backend's CORS/cookie config allowing the calling origin.
- Booking lifecycle (documented in README, enforced by the backend): `pending` → `accepted`/`rejected` → (`accepted` can be marked paid) → `booked` → optionally `cancelled` (with optional refund).
