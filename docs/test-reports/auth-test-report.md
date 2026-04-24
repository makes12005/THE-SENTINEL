# Auth System Test Report
Date: 2026-04-24
Backend: https://api-production-e13f.up.railway.app

## Backend Tests
| # | Test | Status | Fix Applied |
|---|------|--------|-------------|
| 1 | Send OTP email | Blocked live | `/api/auth/send-otp` now accepts `contact` and returns `data.channel` with the requested contract. |
| 2 | Verify OTP | Blocked live | `/api/auth/verify-otp` now accepts `contact`, returns `temp_token`, and includes `attempts_remaining` on OTP failures. |
| 3 | Complete Signup | Blocked live | `/api/auth/signup` now accepts optional `contact`, validates it against `temp_token`, and returns `user.agency_id` plus existing camelCase fields. |
| 4 | Login Password | Blocked live | `/api/auth/login` now accepts `contact` in addition to legacy identifier fields. |
| 5 | Login OTP | Blocked live | Added `/api/auth/login-otp` for OTP login of existing users. |
| 6 | Refresh Token | Blocked live | `/api/auth/refresh` now accepts both `refreshToken` and `refresh_token`. |
| 7 | Logout | Blocked live | `/api/auth/logout` now accepts both `refreshToken` and `refresh_token`. |
| 8 | Blacklist Check | Blocked live | No code change required in blacklist middleware; runtime verification is blocked in this shell. |
| 9 | Rate Limiting | Fixed locally | OTP rate limit reduced from 5/hour to 3/hour so the 4th request should return 429. |
| 10 | Invalid OTP | Fixed locally | OTP failures now distinguish expired vs invalid and return `attempts_remaining`. |
| 11 | Agency Invite | Blocked live | Signup now accepts `agency_invite_code` or `invite_code`, sets `agency_id`, and assigns `conductor` when an invite code is used. |
| 12 | Skip Agency | Fixed locally | Signup without an invite code keeps `agency_id = null` and role `passenger`. |

## Flutter Checks
| # | Check | Status | Fix Applied |
|---|-------|--------|-------------|
| 1 | Phone+email single field | Fixed | Welcome screen now accepts phone or email in one input and validates both. |
| 2 | Skip button on agency screen | Fixed | The current merged signup screen now has an explicit `SKIP FOR NOW` action for invite code entry. |
| 3 | OTP auto-advance | Pass | `Pinput` already auto-advances digit entry; no change required. |
| 4 | Role-based routing | Fixed | Router now centralizes role redirects and handles `driver`, `conductor`, and `passenger` sessions consistently. |

## Bugs Fixed
- File changed: `apps/backend/src/modules/auth/auth.routes.ts`
  What was wrong: The backend still used the older `identifier` contract, auto-logged users in during `verify-otp`, lacked `login-otp`, used the wrong OTP rate limit, and did not expose `agency_id` in the serialized user.
  What was fixed: Added `contact` compatibility, separated `verify-otp` from `login-otp`, corrected rate limiting to 3/hour, accepted both refresh token field names, returned OTP attempt metadata, and serialized both `agency_id` and `agencyId`.
- File changed: `apps/mobile/lib/features/auth/data/auth_repository.dart`
  What was wrong: Mobile auth still posted `identifier` and used the wrong invite-code field for signup.
  What was fixed: Switched OTP and signup payloads to the updated backend contract.
- File changed: `apps/mobile/lib/features/auth/provider/auth_provider.dart`
  What was wrong: Passenger sessions were rejected even though passenger is a supported mobile role in the requested auth design.
  What was fixed: Allowed `passenger` alongside `conductor` and `driver`.
- File changed: `apps/mobile/lib/features/auth/ui/welcome_screen.dart`
  What was wrong: The welcome screen only accepted Indian phone numbers in one rigid format.
  What was fixed: Reworked the single input to accept either phone or email.
- File changed: `apps/mobile/lib/features/auth/ui/otp_screen.dart`
  What was wrong: OTP copy assumed phone-only delivery.
  What was fixed: Screen text now reflects email vs phone dynamically; `Pinput` auto-advance was retained.
- File changed: `apps/mobile/lib/features/auth/ui/signup_screen.dart`
  What was wrong: The merged profile/signup screen still assumed a phone-only verified identity, hard-coded conductor role copy, had no explicit skip action for invite code, and contained a broken closing block.
  What was fixed: Switched to contact-agnostic display, added explicit invite skip behavior, updated role copy, and repaired the widget structure.
- File changed: `apps/mobile/lib/core/router/app_router.dart`
  What was wrong: Routing only special-cased drivers and did not centralize role-based redirects.
  What was fixed: Added a single role-to-route helper and guarded both conductor/passenger and driver routes consistently.

## Summary
- Backend tests passed: 0/12 live-verified from this sandbox
- Flutter checks passed: 4/4 by static review
- Total bugs fixed: 7
- Auth system ready: NO

## Next Steps
- Run the 12 live auth tests from a network-enabled shell or Postman session against `https://api-production-e13f.up.railway.app`.
- Deploy the backend changes before re-running the live tests, because the production Railway service is still serving the pre-fix code.
- Re-run mobile analysis with a local Flutter SDK; this environment does not have `flutter` installed.
- Execute the requested cleanup SQL after the live tests complete; outbound database access is blocked in this shell, so cleanup was not performed here.
