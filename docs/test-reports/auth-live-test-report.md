# Auth Live Test Report

- Date: 2026-04-24
- Environment: Development-mode live auth test run
- Backend: `https://api-production-e13f.up.railway.app`
- Script: `apps/backend/src/scripts/auth-live-test.ts`

## Test Results

| Step | Test | Status | Details |
|---|---|---|---|
| 1 | Send OTP | PASS | HTTP 200 |
| 2 | Get OTP from Redis + Verify OTP | PASS | `temp_token` issued |
| 3 | Signup | PASS | user created with `role=passenger` |
| 4 | Login (Password) | PASS | access + refresh tokens issued |
| 5 | Login (OTP) | PASS | access + refresh tokens issued |
| 6 | Refresh Token | PASS | rotated access + refresh tokens issued |
| 7 | Get Current User (`/api/auth/me`) | PASS | authenticated user profile returned |
| 8 | Change Password | PASS | password changed and refresh tokens revoked |
| 9 | Login with Updated Password | PASS | login succeeded using new password |
| 10 | Logout + Blacklist Check | PASS | blacklisted token rejected by `/api/trips` (401) |
| 11 | OTP Rate Limit | PASS | statuses `200, 200, 200, 429` |

## Issue Found and Fixed

- Root cause: The script used a stale refresh token after OTP login, causing refresh step failure with `INVALID_REFRESH_TOKEN`.
- Fix applied: Updated `apps/backend/src/scripts/auth-live-test.ts` to capture and use the latest `refresh_token` from `/api/auth/login-otp`.
- Additional hardening:
  - Added `/api/auth/me` validation.
  - Added `change-password` coverage.
  - Added re-login validation with updated password.

## Final Status

- Auth flow coverage: `11/11` passing
- Cleanup: Test user and related Redis keys cleaned at end of run
- Result: Auth system validated and ready for production deployment verification
