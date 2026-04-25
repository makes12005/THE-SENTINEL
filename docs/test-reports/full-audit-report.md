# Full Audit Report
Date: 2026-04-25

## Issues Found
| # | Issue | File | Fixed |
|---|-------|------|-------|
| 1 | OTP login flow called `/api/auth/verify-otp` (signup verification endpoint) instead of login endpoint | `apps/web/src/app/login/page.tsx` | Yes |
| 2 | OTP verification page also called `/api/auth/verify-otp` while expecting auth tokens | `apps/web/src/app/verify-otp/page.tsx` | Yes |
| 3 | `/owner/*` role guard allowed `admin` access; requirement is owner-only | `apps/web/src/app/owner/layout.tsx` | Yes |
| 4 | `/operator/*` role guard allowed `admin` access; requirement is operator-only | `apps/web/src/app/operator/layout.tsx` | Yes |
| 5 | Backend did not expose `GET /api/operator/trips` (requested verification endpoint) | `apps/backend/src/modules/operator/operator.routes.ts` | Yes |
| 6 | Railway missing required provider/env keys (`MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID`, `BREVO_API_KEY`) | Railway environment | No (manual env setup needed) |
| 7 | Vercel missing required runtime keys (`NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NODE_ENV`) | Vercel environment | No (manual env setup needed) |

## Route Verification
| Endpoint | Expected | Result |
|----------|----------|--------|
| `GET /health` | `{ status: "ok" }` and 200 | Pass (status `ok`, DB+Redis connected) |
| `POST /api/auth/login` | Tokens on valid credentials | Endpoint reachable; invalid test credential returns expected auth error |
| `GET /api/admin/agencies` with admin token | Agency list | Current production returns 401 without token (expected for unauthenticated); tokened validation pending deploy + admin token |
| `GET /api/owner/operators` with owner token | Operator list | Current production returns 401 without token (expected for unauthenticated); tokened validation pending deploy + owner token |
| `GET /api/operator/trips` with operator token | Trip list | Not on current production build yet (404); implemented in codebase, requires deploy |

## Frontend vs Backend Endpoint Audit
| Frontend calls | Backend has | Match? |
|----------------|-------------|--------|
| `/api/auth/login` | Yes (`POST /api/auth/login`) | Yes |
| `/api/auth/register` | Yes | Yes |
| `/api/auth/send-otp` | Yes | Yes |
| `/api/auth/verify-otp` (signup verify flow) | Yes | Yes |
| `/api/auth/verify-otp` (OTP login flow) | No (should be `/api/auth/login-otp`) | Fixed |
| `/api/auth/login-otp` | Yes | Yes (after fix in login/verify pages) |
| `/api/trips`, `/api/trips/*` | Yes | Yes |
| `/api/routes`, `/api/routes/*` | Yes | Yes |
| `/api/admin/*` | Yes | Yes |
| `/api/owner/*` | Yes | Yes |
| `/api/operator/summary` | Yes | Yes |
| `/api/operator/trips` | Added in codebase | Yes (after backend fix) |
| `/api/agency/members` | Yes | Yes |
| `/api/logs/alert-logs` | Yes | Yes |

## Environment Variable Audit

### Railway
- Present: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ALERT_PROVIDER`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_SID`, `EXOTEL_CALLER_ID`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`
- Missing: `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID`, `BREVO_API_KEY`

### Vercel
- Present: `ENABLE_EXPERIMENTAL_COREPACK` (only)
- Missing: `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NODE_ENV`

## TypeScript Errors Fixed
- No TypeScript compiler errors were present in `apps/backend` or `apps/web` (`npx tsc --noEmit` clean in both).

## Remaining Issues
- Production is not yet updated with this commit, so `GET /api/operator/trips` still returns 404 on live API until deployment.
- Token-authenticated verification for admin/owner/operator protected endpoints requires valid role tokens and post-deploy retest.
- Missing Railway and Vercel environment variables must be added manually in dashboards/CLI.

## Summary
Total issues found: 7
Total fixed: 5
Remaining: 2
