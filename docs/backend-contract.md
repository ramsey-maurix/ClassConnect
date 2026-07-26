# NestJS API Contract

The API is implemented under `/api/v1`. The sections below describe its public contract.

## Authentication

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
```

Successful login should set secure HTTP-only cookies. The response may return a safe user profile, but not the raw token.

## Attendance

```text
GET  /api/attendance/sessions/active
POST /api/attendance/mark
POST /api/attendance/sessions
POST /api/attendance/sessions/:id/close
GET  /api/attendance/sessions/:id/records
```

The server should validate the session window, enrolment, GPS radius, replay attempts, device policy and mock-location signals.

## Grades and standing

```text
GET  /api/grades/me
GET  /api/grades/offerings/:offeringId
PUT  /api/grades/offerings/:offeringId/draft
POST /api/grades/offerings/:offeringId/publish
PATCH /api/grades/:gradeId
GET  /api/standing/me
GET  /api/analytics/me
```

Published grade edits should require a reason and create an audit record containing old and new values.

## Academic administration

```text
/api/v1/users
/api/v1/courses
/api/v1/courses/:id/students
/api/v1/courses/:id/lecturers
/api/v1/audit
/api/v1/settings
```

“Adding a student to a course” means assigning an existing student account to a class. It is not university admission or applicant enrollment. DTO validation, role guards, row-level ownership checks, and Prisma transactions protect multi-record operations.
