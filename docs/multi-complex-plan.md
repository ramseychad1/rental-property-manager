# Multi-complex plan

Status: PLAN, nothing built. Written 2026-10-11. Companion to `docs/access-model.html`.

## Goal

One deployment serves many complexes. Each complex has its own public site (content, Things To Do, properties, branding) on its own custom domain, and a **SiteAdmin** who self-serves content and Owner accounts so the platform team doesn't take requests like "change my home page image".

## Decisions (Chad, 2026-10-11)

1. A SiteAdmin may also own properties.
2. A user belongs to **one** complex for now, but the data model is built on **memberships** so an owner at two complexes later needs no migration (see "Why memberships" below).
3. Guest access is **per complex** for now. With memberships a renter is one account with one Guest membership per complex, which also removes most of the scaling concern.
4. Email stays on the SuperAdmin system Gmail sender for now. A real email relay is a future item.
5. **Each complex gets its own custom domain**, configured by SuperAdmin at onboarding. Must not be forgotten (Phase 4 + onboarding runbook below).

Decision made while planning (Chad approved memberships 2026-10-11): **every email is unique platform-wide.** `User` is identity only (email, password, name). The role in a complex lives on a `SiteMembership` row. This replaces the earlier "staff unique platform-wide, guests per complex" idea and its partial unique index.

## Why memberships

Putting `role` and `siteId` directly on `User` allows exactly one complex per person. Supporting an owner at two complexes later would then mean moving role/site into a new table, migrating live production data and re-touching every scope check. With `SiteMembership` from day one, that future change is: allow more than one membership per user, add a complex switcher to the admin panel, and remember the active complex in the session. The app enforces "one membership per user" for now.

## Roles after the change

| Role | Where it lives | Scope |
|---|---|---|
| SuperAdmin | Platform level on `User` (no membership) | Everything, all complexes. Creates complexes, domains, SiteAdmins. |
| SiteAdmin | `SiteMembership.role` | Their complex: site content, Things To Do, create/reset/deactivate Owners, view all properties and bookings. Booking actions (accept, reject, payment) stay with the property's Owner, unless the SiteAdmin also owns that property. |
| Owner | `SiteMembership.role` | Own properties (`ownerId`), unchanged, plus a `siteId` check. |
| Guest | `SiteMembership.role` | Own bookings; private properties via grants, unchanged. |

A SiteAdmin who also owns properties simply has `ownerId` matches on those, since scope is derived per-resource (`SiteAdmin membership in that site` OR `ownerId === me`), not from a second role.

Cross-complex ids return 404, like cross-owner ids do today.

## Phase 1 - Schema and backfill (invisible to users)

- `Site`: add `name`, keep `slug`, add `isActive`.
- New `SiteDomain`: `hostname` (unique, lowercase), `siteId`, `isPrimary`, `createdAt`. A complex can have several hostnames (e.g. bare + `www`); one is primary and used for canonical URLs and email links.
- New `SiteMembership`: `userId`, `siteId`, `role` (`Guest | Owner | SiteAdmin`), `createdAt`; unique `(userId, siteId)`. `UserRole`/membership enum gains `SiteAdmin`. The app rejects a second membership for a user for now (a single check in one helper, the switch to flip later).
- `User`: `email` stays globally `@unique`. SuperAdmin stays a platform-level flag on `User` (the existing `role = SuperAdmin`), with no membership. `User.role` is kept during rollout and dropped once all code reads memberships (expand, then contract, so each deploy is safe).
- Backfill: one membership per existing non-SuperAdmin user in the default site, copying their current role.
- `Property.siteId` and `ThingToDo.siteId` (required FK, indexed).
- `VerificationCode.siteId` (signup codes record which complex the signup is for; an existing email signing up at a second complex proves ownership by code, then gets a new Guest membership instead of a new account).
- Bookings, seasons, invites and grants inherit the site through property/owner. No column needed, but add a DB-level check or test that an invite's owner and a grant's guest share a site.
- Backfill: every existing row gets the current `default` site. Insert a `SiteDomain` for the current production frontend host. Production behaviour must be identical after this phase.

**Phase 1 status: BUILT locally 2026-10-11, not committed or deployed.** Deviations from the text above:
- `Property.siteId`, `ThingToDo.siteId` and `VerificationCode.siteId` are **nullable** for now (backfilled, no nulls locally). Making them required would break inserts until the code sets them, so tighten to NOT NULL in Phase 3. Property and Things To Do creation already write the default site's id.
- Users are kept in step with memberships from day one: signup and user creation create the membership in the same write, and a role change replaces it in a transaction (`backend/src/lib/membership.js`). Otherwise memberships would drift between Phase 1 and Phase 3.
- The backfill inserts the production frontend hostname (`frontend-production-c0d1.up.railway.app`) as the default site's primary `SiteDomain`.
- `getDefaultSite()` moved from the site-content controller into `lib/membership.js`.
- The one-membership-per-user rule is currently satisfied by `syncMembership` replacing rows; an explicit guard arrives with the scope editor in Phase 5.

## Phase 2 - Site resolution

- New middleware `resolveSite` (before `attachUser`) sets `req.site` from the **public hostname the browser used**.
  - Frontend proxies `/api` through its own origin (for iOS cookies), so the backend sees the proxy. Read `X-Forwarded-Host` (set by the Next rewrite), falling back to `Origin`/`Host`. Verify what Next actually forwards before relying on it.
  - Server-side rendering in Next calls the backend directly, with no browser host. `frontend/src/services/api.js` must pass the incoming request host explicitly (e.g. an `X-Site-Host` header) on every server fetch. This is the easiest thing to miss: SSR would silently render the default site.
  - Lookup via an in-memory `hostname -> site` cache (short TTL, invalidated when SuperAdmin edits domains).
  - Unknown host: 404 in production; in dev, fall back to the default site.
- Admin panel requests have no complex host. Site context there comes from the user's membership (the only one for now; later the session's active complex), not the domain.
- Replace the hardcoded `"default"` lookup in `siteContent.controller.js`.

**Phase 2 status: BUILT locally 2026-10-11, not committed or deployed.** What exists:
- `backend/src/lib/siteResolver.js` + `middleware/site.js`: `req.site` from `X-Site-Host`, then `Origin`, via a 60s in-memory hostname cache (`invalidateSiteCache()` for when domain editing is built). **Soft mode:** an unknown host falls back to the default complex (`req.siteMatched = false`) instead of 404, so production, the admin panel and health checks keep working. Strict handling arrives with Phase 3.
- `frontend/src/proxy.js` (Next 16's replacement for middleware) sets `x-site-host` on `/api/*` calls, and the existing rewrite forwards it. `services/api.js` adds the same header on server-side fetches from the incoming request. Verified locally: the same backend returned different content for `Host: b.test` on both the browser path and SSR, and unknown hosts fell back to default.
- The site-content controller now reads/writes `req.site`. The admin panel's host matches no complex, so admin edits still hit the default complex until Phase 5 adds a complex selector.
- Not yet done: CORS still comes from `CLIENT_URLS` (Phase 4), and a hostname is trusted as a *public-data selector only*, never for authorization.
- Open point to verify on Railway: that the edge preserves the public `Host`/`X-Forwarded-Host` when proxying to the Next service. Check with a real custom domain in Phase 4.

## Phase 3 - Scoping (the leak-prevention phase)

Central helpers in `lib/access.js` carry the new rule so call sites don't re-derive it:

- `currentMembership(user, site)`: the user's membership for the site being acted on (public requests: the resolved site; admin requests: their membership). `isSuperAdmin`, `isStaff` and the new `isSiteAdmin` read this instead of `User.role`. This is the single place that later supports several memberships.
- `siteScope(user, req)`: SuperAdmin sees all (or the site they select), everyone else their membership's site.
- `propertyScope` / `bookingScope` gain: SuperAdmin `{}`; SiteAdmin `{ siteId }`; Owner `{ siteId, ownerId }`.
- Public-site queries (`visiblePropertyWhere`, Things To Do list, site content) filter by `req.site`.
- Add `requireSiteAdmin` (SiteAdmin or SuperAdmin) and `assertSameSite`.

Files that query the affected tables and must each be audited (13): `auth`, `booking`, `email`, `invite`, `property`, `season`, `siteContent`, `thingToDo`, `user` controllers; `lib/access.js`, `lib/bookingDocument.js`, `lib/notifications.js`, `lib/otp.js`, `middleware/auth.js`.

Route changes:
- Site content write routes, Things To Do write routes, user management routes: `requireSuperAdmin` becomes `requireSiteAdmin` + site scoping. SiteAdmin can only create Owners (and Guests), never SiteAdmin or SuperAdmin.
- Creating a SiteAdmin, a Site, or a domain stays SuperAdmin-only.
- On public-site requests `attachUser` must require a membership in the resolved site. A session from complex A has no membership on B, so it is treated as signed out there (the cookie is host-only anyway; this is the server-side backstop).

**Phase 3 status: BUILT locally 2026-10-11, not committed or deployed.** What exists:
- `attachUser` computes each request's access context and puts `membership` and `siteId` on `req.user` (SuperAdmin: all complexes, narrowed by the complex's domain or an `X-Site-Id` header; everyone else: their complex). On a complex's own domain only members of that complex (plus SuperAdmin) are signed in; a session from another complex is treated as signed out. For members on the admin host, `req.site` switches to their complex, so site content reads/writes follow the user.
- `lib/access.js`: `isSiteAdmin`, `reqSiteId`, view scopes (`propertyScope`, `bookingScope`) vs manage scopes (`propertyManageScope`, `bookingManageScope`), `canSeeManagedProperty`/`canManageProperty`. SiteAdmin sees every property and booking in the complex but can change only what they own (booking decisions stay with the owner).
- `requireSiteAdmin`; users, site-content and Things To Do routes use it. A SiteAdmin manages only Owners/Guests of their own complex, can create only Owners, cannot change roles; accounts elsewhere return 404. Owner lookups for properties and invites must belong to the complex; invites only work inside the owner's complex; login/signup are per complex.
- Migration `multi_complex_scoping`: `UserRole` gains `SiteAdmin`; `Property.siteId` and `ThingToDo.siteId` are now NOT NULL (with a safety-net backfill). `VerificationCode.siteId` stays nullable and is recorded but not enforced.
- Tests: `npm test` runs `backend/tests/crossComplex.test.js` (11 tests, two throwaway complexes, local database only). A deliberate break of the site filters makes them fail, so they do catch regressions.
- Deliberately not done here: unknown hosts still fall back to the default complex (strict 404 comes after custom domains), no multi-membership signup (an existing email still gets 409), the last-SuperAdmin guard and scope editor are Phase 5, and the admin panel UI does not yet know the SiteAdmin role.

## Phase 4 - Custom domains (do not skip)

- Cookies are host-only, so each domain is its own session. Good for isolation; staff use the single admin console.
- CORS: `CLIENT_URLS` env var becomes a union of the env list and all `SiteDomain` hostnames (`https://host`), read from the cached table, so onboarding a domain needs no env edit or backend redeploy.
- Replace `NEXT_PUBLIC_SITE_URL` (build-time, single value) with the per-request primary hostname in `layout.js` (`metadataBase`), `sitemap.js`, `robots.js`. Otherwise every complex's canonical URL, share image and sitemap point at the wrong site.
- Links in emails (booking, invites, credentials, password reset) must use the complex's primary domain, not the request `Origin` or a single env var. `user.controller.js` currently uses `req.get("origin") || ADMIN_URL`; keep admin-console links on the admin URL, but invite and booking links on the complex domain.
- Images are served through the backend proxy domain, so `images.remotePatterns` needs no per-domain change. CSP `connect-src`/`img-src` in admin is unaffected (single backend).
- Railway: each custom domain is attached to the **frontend** service (CNAME + automatic TLS). Confirm the plan's custom-domain limit per service before promising unlimited complexes.
- SuperAdmin UI: Complexes page with name, SiteAdmin, domains (add, set primary, remove), active flag. Show DNS instructions and a "check domain" button using Railway's domain status.

## Phase 5 - SiteAdmin experience

- Admin panel: nav adapts by role. SiteAdmin sees Site Content, Things To Do, Users (Owners of their complex), Properties, Bookings. SuperAdmin additionally sees Complexes and a complex switcher.
- Users page: SiteAdmin sees members of their complex; "Create user" offers Owner only; same one-time temporary password flow. Creating a user whose email already exists adds a membership rather than failing.
- **Scope editor (SuperAdmin only)** on a user's detail card replaces today's role control. SuperAdmin picks a role (SuperAdmin, SiteAdmin, Owner) and, for SiteAdmin/Owner, a complex (required). Saving does the right thing underneath:
  - to SiteAdmin/Owner: clears the platform SuperAdmin flag if set and creates the membership;
  - to SuperAdmin: sets the flag and removes the membership;
  - between complexes or roles: replaces the membership (while the one-membership limit is on, there is never a second row).
  Guests still can't be promoted here. A SiteAdmin sees no scope editor; they can only create Owners and deactivate members of their own complex.
- **Last-SuperAdmin guard:** the backend refuses any change (demote, scope change, deactivate, delete) that would leave zero active SuperAdmins, with a clear error. This is in addition to the existing rule that nobody can change their own role or deactivate themselves.
- **Migrating today's "SuperAdmin" team members:** after Phase 1 everyone currently SuperAdmin stays SuperAdmin (the backfill only creates memberships for non-SuperAdmins), so nothing changes silently. Once Phase 5 ships, Chad keeps his own account as SuperAdmin and uses the scope editor to move the others to SiteAdmin in the right complex (the self-change block means someone else must demote him if he ever wants that).
- Site Content and Things To Do pages work unchanged, scoped by the user's membership site.

## Phase 6 - Verification

- Automated cross-complex tests (none exist in the repo today, so this adds the harness): for each resource, a user in complex A requesting complex B's id gets 404 on read, update, delete, list and count; guest cookie from A is rejected on B; SSR renders the right complex for each host.
- Scope editor and guard: demoting the last SuperAdmin is refused by every path (scope change, deactivate, delete); a demoted user loses SuperAdmin powers immediately (role is re-read each request); a SiteAdmin cannot reach the scope editor endpoint.
- Manual: two seeded complexes with different content, two domains pointing at a staging frontend, log in as each role and walk the access matrix.
- Re-run the iOS login check on a custom domain.

## Onboarding runbook (per new complex, SuperAdmin or team)

1. Create the complex in the admin Complexes page (name, slug).
2. Create its SiteAdmin user (temp password flow); send credentials.
3. Add the custom domain in Railway on the frontend service; give the customer the CNAME record; wait for the certificate.
4. Add the hostname(s) to the complex, mark one primary; run the domain check.
5. Seed starter content (defaults render automatically); SiteAdmin takes over from here.
6. Smoke test: visit the domain, sign up as a guest, confirm brand, canonical URL and email links.

## Out of scope (known follow-ups)

- Real email relay and per-complex sender identity (today: SuperAdmin Gmail).
- The multi-complex UX: the data model supports several memberships per user, but the app enforces one and has no complex switcher or active-complex session yet. Enabling it is a small, planned follow-up.
- Per-complex theming beyond what Site Content already supports.
- `/rate` page and `lib/mockData.js` are still hardcoded leftovers.

## Suggested order and risk

Each phase deploys on its own and leaves production unchanged until Phase 3 flips scoping on. Highest risk: Phase 3 (a missed query leaks across complexes; membership lookups are the new moving part) and the SSR host handling in Phase 2. Do Phase 6's cross-complex test harness **alongside** Phase 3, not after.
