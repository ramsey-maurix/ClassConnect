# Frontend Architecture

## Boundary

This monorepo contains a Next.js frontend and NestJS API. The browser renders portal pages, collects input, and sends cookie-authenticated requests. NestJS owns permissions, validation, attendance decisions, grades, risk calculations, and PostgreSQL writes through Prisma.

## Route strategy

A single optional catch-all route renders role pages:

```text
apps/web/app/(portal)/[role]/[[...slug]]/page.tsx
```

The route validates `student`, `lecturer` and `admin`, then passes the role and page key into the shared `PortalShell` and `PortalContent` components.

This keeps navigation, responsive behaviour, typography and theme handling consistent while allowing each role page to live in a focused file.

## Component layers

1. `packages/ui`: reusable visual primitives with no product-specific business logic.
2. `components/display.tsx`: ClassConnect display patterns such as page headers, charts and risk gauges.
3. `components/widgets.tsx`: interactive frontend workflows such as attendance, sessions, grade entry and reports.
4. `components/pages/*`: role-specific page composition.
5. `lib/api`: HTTP-only cookie-aware API boundary.
6. `apps/api`: NestJS modules and Prisma persistence.

## State

Authentication and role routing now use the API. Remaining visual prototype pages are progressively connected through the typed API boundary; live attendance uses polling where needed.

## Security model

- Do not put JWTs in localStorage.
- Do not rely on hidden buttons for authorisation.
- Protect every backend endpoint with NestJS guards and ownership checks.
- Validate GPS, attendance windows, grade ranges and edit reasons on the backend.
- Audit sensitive mutations in a transaction with the affected record.
