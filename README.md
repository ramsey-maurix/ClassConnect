# ClassConnect

A full-stack Turborepo for the ClassConnect attendance and student-performance system.

Administrators create student and lecturer accounts, add existing students to classes, and assign lecturers to the courses they teach. This is not an admissions or university-application system.

The proof-of-concept academic scope is intentionally fixed to FAST, the Computer Science Department, and four programmes: BTech Computer Science, HND Computer Science, BTech ICT, and HND ICT.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS v4
- Syne typography through `next/font/google`
- Turborepo + pnpm workspaces
- NestJS API
- PostgreSQL + Prisma ORM
- Secure HTTP-only JWT cookies
- Shared UI package
- Lucide icons
- JWT-ready API client using secure HTTP-only cookies

## Portals and pages

### Student

- Dashboard
- GPS/PIN attendance check-in
- Attendance history
- Aggregated grades
- GPA and predictive analytics
- Academic standing
- Timetable
- Notifications
- Profile and security status

### Lecturer

- Dashboard
- Assigned courses
- Attendance overview
- Create QR/PIN geofenced session
- Live session monitor
- Grade entry, draft and publish flow
- Class analytics and risk distribution
- Student intervention list
- Notifications

### Administrator

- Department dashboard
- Users and role management
- Faculty, department and programme hierarchy
- Course catalogue and semester offerings
- Lecturer-to-course assignment
- Programme and semester enrolment
- Academic periods and registration windows
- Cohort analytics
- Report builder and CSV exports
- Audit log
- System thresholds and security settings

## Folder structure

```text
classconnect-gh-frontend/
├── apps/
│   └── web/
│       ├── app/                     # Next.js routes and global styles
│       ├── components/              # Shell, workflows and role pages
│       └── lib/                     # Navigation, types and API boundary
│   └── api/
│       ├── src/                     # NestJS modules
│       └── prisma/                  # Schema, migrations and development seed
├── packages/
│   ├── ui/                          # Shared UI primitives
│   └── typescript-config/           # Shared strict TypeScript configs
├── docs/
│   ├── architecture.md
│   └── backend-contract.md
├── .env.example
├── pnpm-workspace.yaml
└── turbo.json
```

## Run locally

Requirements: Node.js 20+ and pnpm 9+.

```bash
pnpm install
copy .env.example apps/web/.env.local
copy apps/api/.env.example apps/api/.env
pnpm --filter api exec prisma migrate deploy
pnpm --filter api prisma:seed
pnpm dev
```

Open `http://localhost:3000`. The API runs at `http://localhost:4000/api/v1`.

The seed prints development login details. Never use its shared development password in production.

Users sign in with either their institutional email or their student/staff ID. The API determines their role from PostgreSQL.

## Authentication integration

The API client is in `apps/web/lib/api/client.ts`.

- Requests use `credentials: "include"`.
- The frontend does not read or persist JWT values.
- NestJS should issue the JWT through `Secure`, `HttpOnly`, `SameSite` cookies.
- Backend guards remain the authority for role permissions.
- Add CSRF protection for state-changing cookie-authenticated requests according to your deployment model.

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_NAME=ClassConnect
NEXT_PUBLIC_USE_MOCKS=true
```

The real database URL and JWT secrets belong only in `apps/api/.env`, which is ignored by Git.

## Branding

The UI uses an HTU-inspired palette:

- Navy: `#003772`
- Blue: `#0047AD`
- Red: `#DD1725`
- Light blue: `#EDF5FF`
- Font: Syne

These values are centralised in `apps/web/src/app/globals.css`.
