# CivicFix — Smart Civic Problem Reporting & Authority Discovery Platform

> **CivicFix is an independent, trustworthy civic-tech platform designed for Indian citizens to report civic infrastructure issues, identify the likely responsible municipal authority, filter duplicate grievances, track remediation progress in real time, and audit resolution claims through citizen verification.**

---

## 🏛️ Visual Design Direction

CivicFix is styled with a formal, trustworthy government-service aesthetic inspired by modern Indian public portals (such as the Rajasthan recruitment portal), without copying official seals, logos, or government identity.

### Palette & Typography
- **Primary Navy:** `#163A63` — Header, primary buttons, formal badges
- **Civic Blue:** `#2463A6` — Secondary actions, active tabs, interactive pins
- **Light Page Background:** `#F4F7FB` — Clean, legible contrast
- **White Content Surfaces:** `#FFFFFF` — Subtle cards and borders (`#DCE4ED`)
- **Semantic Colors:** Success `#197447`, Warning `#986000`, Error `#B42318`, Info `#1769AA`
- **Typography:** Inter / system-ui, high contrast, WCAG 2.2 AA compliant with accessible tabular views for screen readers.

---

## ⚙️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router 6, React Hook Form, Zod |
| **Backend** | Node.js 24, Express 5, TypeScript, REST APIs, Zod request validation, express-session, bcryptjs |
| **Database** | Prisma ORM with SQLite for zero-config local run; PostgreSQL + PostGIS schema ready for production |
| **Maps & Location** | Leaflet, React Leaflet, OpenStreetMap tiles, Browser Geolocation API, Nominatim reverse geocoder |
| **AI Vision & Assist** | Configurable Gemini Vision API adapter with automated keyword/simulation fallback for offline/demo mode |
| **Storage** | Local multi-part file storage with S3-compatible adapter interface |
| **Testing** | Node.js native test runner + Supertest covering RBAC, auth, reports, authority discovery |

---

## 👥 Three Application Roles & Access Control

1. **Citizen**
   - Register and sign in with email verification.
   - Browse public issues with search, category, severity, and status filters.
   - Multi-step reporting wizard with image upload, AI category assistance, location picker, and duplicate suggestions.
   - Interactive Live Map with colored status pins and an accessible tabular alternative.
   - Support issues, follow issues, comment on grievances.
   - **Resolution Verification:** When an authority claims a defect is fixed, citizens inspect evidence and **Confirm Fixed** or **Dispute**.
   - Original reporter can request reopening if defects reoccur.

2. **Authority Officer**
   - Separate Authority Sign In and Institutional Authorization Application (`/authority/apply`).
   - Applications must be independently verified and approved by a Platform Administrator before granting access.
   - Department-specific Caseload Docket (restricted to assigned department and jurisdiction).
   - Update report statuses with mandatory inspection log notes.
   - Upload resolution evidence (before & after photos, repair notes) to trigger `RESOLUTION_CLAIMED`.

3. **Platform Administrator**
   - Restricted administrative console (`/admin/dashboard`).
   - Review pending authority access applications: inspect designation, official email, department, and record approval/rejection with mandatory audit notes.
   - User account management: activate or suspend accounts with audit logging.
   - Complete immutable audit trail log of all privileged system actions.
   - System health, adapter status, and service configuration.

---

## 🔄 Controlled Grievance Lifecycle

```
[REPORTED] ──> [UNDER_REVIEW] ──> [ASSIGNED] ──> [IN_PROGRESS]
      │                                                │
      ▼                                                ▼
 [DUPLICATE]                                [RESOLUTION_CLAIMED]
                                              │              │
                    (Citizen Disputes) ◄──────┘              ▼ (3 Citizen Confirms)
                            │                       [VERIFIED_RESOLVED]
                            ▼
                        [REOPENED] ──> [UNDER_REVIEW]
```

---

## 🚀 Quick Start (Local Setup)

The application includes a zero-configuration SQLite database pre-seeded with sample departments, fictional coordinates, demo accounts, and 12 realistic reports.

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+

### 2. Install Dependencies
```powershell
# From the root directory:
npm run install:all
```

### 3. Build Project
```powershell
# Compiles both frontend and backend TypeScript:
npm run build
```

### 4. Database Setup & Seeding (Pre-configured)
```powershell
cd packages/backend
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
```

### 5. Run the Servers
In terminal 1 (Backend API on `http://localhost:3001`):
```powershell
cd packages/backend
npm run dev
```

In terminal 2 (Frontend on `http://localhost:5173`):
```powershell
cd packages/frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔑 Demo Accounts (Synthetic Data)

> **All demo accounts and statistics are synthetic and explicitly labelled as demonstration data.**

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Citizen** | `demo-citizen@civicfix.demo` | `DemoCitizen123!` | Standard citizen reporting, dashboard, voting |
| **Authority** | `demo-authority@civicfix.demo` | `DemoAuthority123!` | Approved Executive Engineer, Demo Road Dept |
| **Admin** | `demo-admin@civicfix.demo` | `DemoAdmin123!` | Root platform administrator, audit logs, approvals |
| **Pending Authority** | `demo-pending@civicfix.demo` | `DemoPending123!` | Applicant awaiting admin review in queue |

---

## 🧪 Running Automated Tests

Run the backend REST API and RBAC test suite:
```powershell
cd packages/backend
npm test
```

### Test Coverage Highlights
- `GET /api/health` & `GET /api/v1/stats`: Service discovery and aggregated counts
- `GET /api/v1/reports`: Filter by category, status, severity, pagination
- `GET /api/v1/authority/find` & `/directory`: Rule-based department mapping & public directory
- Security: Unauthorized report submission rejected (`401 Unauthorized`)
- Security: Citizen cannot access administrative `/admin/stats` (`403 Forbidden`)
- Security: Unapproved applicant cannot access `/authority/reports` (`403 Forbidden`)
- Security: Password hashing, rate limiting, and parameter validation via Zod

---

## 🐘 Production PostgreSQL + PostGIS Migration Guide

To deploy CivicFix with PostgreSQL in production:
1. Set `DATABASE_URL` in `packages/backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/civicfix?schema=public"
   ```
2. Copy the production PostgreSQL schema:
   ```powershell
   cd packages/backend
   Copy-Item prisma/schema.postgresql.prisma prisma/schema.prisma
   ```
3. Generate client and push schema:
   ```powershell
   npx prisma generate
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

---

## 🛡️ Security, Privacy & Compliance Disclosures

- **Data Minimization:** Citizen telephone numbers and precise residence data are never exposed in public report cards or API responses.
- **Authority Authorization:** Official email domains or uploaded IDs do not grant authority access automatically; manual administrator review and verifiable department confirmation are required.
- **Server-Side Enforcement:** All role-based route access controls (RBAC) are verified on Express middleware; UI guards are purely convenience wrappers.
- **Transparency:** CivicFix clearly discloses that it is an independent civic-tech platform and does not claim official government affiliation or legal authority over municipal departments.

---

## 📄 License
MIT © CivicFix Open Source Contributors
