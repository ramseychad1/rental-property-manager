<div align="center">
<img src="https://img.shields.io/badge/🏠%20Rental%20Property%20Manager-Vacation%20Rental%20Platform-1a1a2e?style=for-the-badge" width="420"/>
  <h1>Rental Property Manager — Vacation Rental Booking Platform</h1>

  <p>
    A full-stack boutique vacation rental platform, built with a public booking website,
    a secure admin operations dashboard, and an Express/PostgreSQL API.
  </p>

<img src="https://skillicons.dev/icons?i=react,nextjs,js,express,nodejs,tailwind,postgres&theme=dark" />
</div>

---

## POC Status

The backend is built on **Express + Prisma + PostgreSQL**. It implements the full booking workflow and admin panel surface — auth (with OTP signup), properties, seasonal pricing, bookings, users, and admin dashboard analytics — but **does not** implement the blog CMS, things-to-do CMS, error-log viewer, Google login, or a Redis/BullMQ email queue; those remain design intent, not current behavior. Image uploads go through an S3-compatible storage abstraction (Railway Buckets in production, local disk in dev).

This is a single-tenant build. Multi-tenancy (one deployment serving multiple property owners, each scoped to their own listings) is a planned follow-up, not yet implemented.

**Live staging deployment**: not yet set up in the current Railway workspace — see `CLAUDE.md` for the deploy playbook. Update this table once it's live.

| App | URL |
|---|---|
| Public website | _pending_ |
| Admin console | _pending_ |
| Backend API | _pending_ |

Admin login (seeded, same locally and on staging):
- Admin — `admin@rentalpropertymanager.com` / `Admin123!`

No demo guest account or placeholder properties — real properties get added through the admin panel.

---

## What This Project Is

**Rental Property Manager** is an Airbnb-style rental booking system for boutique vacation homes. Guests can browse properties, inspect galleries, view seasonal rates, choose dates, create an account, and submit booking requests. Admins can manage listings, seasonal pricing, bookings, and users from a dedicated operations dashboard.

This repository is split into three applications:

| App            | Folder     | Purpose                                                       |
| -------------- | ---------- | --------------------------------------------------------------- |
| Public Website | `frontend` | Customer-facing Next.js booking experience                    |
| Backend API    | `backend`  | Express/PostgreSQL REST API, auth, bookings, uploads           |
| Admin Console  | `admin`    | Admin-only React dashboard for operations and CMS              |

---

## Core Features

- Property discovery with rich galleries, amenities, pricing, Google Maps embeds, and availability selection.
- Checkout flow with inline sign-in/sign-up, OTP email verification, guest details, and booking submission.
- Seasonal pricing engine with date windows, min/max night rules, and weighted nightly pricing.
- Booking lifecycle management: `pending`, `accepted`, `rejected`, `booked`, `cancelled`.
- Manual payment operations for accepted bookings: mark paid and process refunds.
- User account system with email/password, profile updates, password reset, and signed-cookie sessions.
- Admin dashboard with KPIs, revenue charts, booking status distribution, and recent booking activity.
- Property CMS with thumbnail/gallery uploads, amenities, fees, capacity, location, and status controls.
- S3-compatible media storage (Railway Buckets), rate limiting, input sanitization, and role-based access control.

---

## Tech Stack

### Frontend — Customer Web App

| Area               | Tools                                                          |
| ------------------ | -------------------------------------------------------------- |
| Framework          | Next.js 16, React 19                                           |
| Styling            | Tailwind CSS 4, custom design tokens                           |
| UI                 | Radix UI, custom component library, Lucide icons               |
| Forms & Validation | React Hook Form, Zod                                           |
| Data Fetching      | Native `fetch`, server caching/revalidation, client-side state |
| Booking UX         | React Day Picker, date-fns, local booking draft persistence    |

### Backend API

| Area           | Tools                                                               |
| -------------- | ------------------------------------------------------------------- |
| Runtime        | Node.js, Express 5                                                  |
| Database       | PostgreSQL, Prisma                                                  |
| Authentication | JWT, httpOnly cookies, bcrypt, email OTP for signup                 |
| Validation     | Zod                                                                 |
| File Uploads   | Multer, S3-compatible storage (falls back to local disk if unset)   |
| Email          | Not wired up — OTP codes print to the backend's own console         |
| Security       | CORS allowlist, request validation                                  |

See "POC Status" above for what's implemented vs. original design intent.

### Admin Panel

| Area           | Tools                                                |
| -------------- | ---------------------------------------------------- |
| Framework      | Vite, React 19                                       |
| Routing        | React Router                                         |
| Data Layer     | TanStack Query, Axios                                |
| UI             | Radix UI, Tailwind CSS 4, Lucide icons               |
| Charts         | Recharts                                             |
| Forms          | React Hook Form, Zod                                 |
| Rich Text      | TipTap editor                                        |
| Access Control | Admin-only route guard using backend role validation |

---

## Application Architecture

```txt
rental-property-manager/
├── frontend/                  # Public Next.js web app
│   ├── src/app/               # App Router pages
│   ├── src/components/        # Layout, home, property, UI components
│   ├── src/context/           # Auth and booking draft state
│   └── src/services/api.js    # Public web API client
│
├── backend/                   # Express REST API (Prisma/PostgreSQL)
│   ├── prisma/                # schema.prisma, migrations, seed.js
│   ├── scripts/                # One-off ops scripts (e.g. bucket migration)
│   ├── src/routes/            # API route modules
│   ├── src/controllers/       # Request handlers
│   ├── src/middleware/        # Auth, upload, error handling
│   └── src/lib/               # Prisma client, JWT, serialization, storage
│
└── admin/                     # Admin dashboard
    ├── src/pages/             # Dashboard, properties, bookings, users
    ├── src/components/        # Shell, common UI, forms
    ├── src/contexts/          # Auth and theme state
    └── src/lib/api.js         # Admin API client
```

---

## Booking Lifecycle

```txt
Guest selects property and dates
          ↓
Checkout validates account + guest details
          ↓
Backend checks property, dates, capacity, seasons, pricing
          ↓
Booking is created as pending
          ↓
Admin accepts or rejects booking
          ↓
Accepted booking can be marked paid
          ↓
Paid booking becomes booked
          ↓
Admin can cancel and optionally refund
```

---

## API Modules

| Module       | Capabilities                                                      | Implemented? |
| ------------ | ------------------------------------------------------------------- | :---: |
| Auth         | Register (OTP-gated), login, forgot password, reset password        | ✅ |
| OTP          | Send OTP for registration verification (console-logged, no email)   | ✅ |
| User         | Current user, logout, profile update, password update, all users    | ✅ |
| Property     | Public listings, detail, admin create/update/delete, uploads        | ✅ |
| Season       | Per-property seasonal pricing windows                               | ✅ |
| Booking      | Create booking, user bookings, admin booking actions, analytics     | ✅ |
| Contact      | Contact form (console-logged, no email delivery)                    | ✅ |
| Google login | OAuth login                                                          | ❌ |
| Blog         | Public blog listing/detail, admin CMS actions                       | ❌ |
| Things To Do | Local guide listing/detail, admin CMS actions                       | ❌ |
| Error Logs   | Admin-only error log listing/detail/delete                          | ❌ |

---

## Local Development

### 1. Backend

```bash
cd backend
docker compose up -d          # local Postgres on localhost:5434
cp .env.example .env          # set JWT_SECRET to a real random value
npm install
npx prisma migrate dev        # applies schema, generates client
node prisma/seed.js           # admin@rentalpropertymanager.com / Admin123! - no demo guest or properties
npm run dev
```

Default backend expectation:

```txt
http://localhost:8001/api
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Public app:

```txt
http://localhost:4000
```

Requires `frontend/.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001` (no `/api` suffix) for local dev against the backend above.

### 3. Admin Panel

```bash
cd admin
npm install
npm run dev
```

Admin console:

```txt
http://localhost:5173
```

Requires `admin/.env.local` with `VITE_API_URL=http://localhost:8001/api` (this one *does* need the `/api` suffix).

---

## Environment Variables

### Backend `.env`

```env
NODE_ENV=development
PORT=8001
DATABASE_URL=postgresql://rpm:rpm@localhost:5434/rpm?schema=public
CLIENT_URLS=http://localhost:4000,http://localhost:5173

JWT_SECRET=
JWT_EXPIRES_IN=30d
COOKIE_NAME=rpm_token
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# S3-compatible object storage. Leave blank to store uploads on local disk.
BUCKET=
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
ENDPOINT=
REGION=auto
```

See `backend/.env.example` for the authoritative, commented version.

### Frontend `.env`

```env
NEXT_PUBLIC_SITE_URL=http://localhost:4000
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

### Admin Panel `.env`

```env
VITE_API_URL=http://localhost:8001/api
```

---

## Resume Highlights

- Built a complete full-stack rental platform with customer website, admin dashboard, and REST API.
- Implemented secure authentication with JWT httpOnly cookies, role guards, OTP verification, and password reset.
- Designed booking domain logic including date conflict checks, capacity validation, seasonal pricing, min/max stay rules, and booking state transitions.
- Created an admin operations console with analytics, charts, booking workflows, and user management.
- Built an S3-compatible storage abstraction for media uploads with a local-disk fallback for zero-config dev, including a proxy pattern for private buckets and a bucket-to-bucket migration script.
- Deployed all three apps to Railway (Postgres, Dockerfile builder for the API, Railpack for the two frontends) in a single project.
- Developed responsive, production-style UI using Next.js, Vite React, Tailwind CSS, Radix UI, Lucide icons, and Recharts.

---

## Security & Reliability

- Admin-only protected routes for operational tools.
- Role-based backend middleware for write operations.
- httpOnly JWT cookie sessions.
- Input validation with Zod.
- Storage cleanup (S3 or local disk, per config) when images are replaced or deleted.
- Booking date-conflict checks against existing bookings before creation.

---

## Project Status

The project already includes the main production modules for a real booking platform:

- Public booking website
- Backend API
- Admin dashboard
- Property CMS
