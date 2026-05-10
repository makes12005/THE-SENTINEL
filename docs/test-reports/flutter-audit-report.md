# Flutter App Audit Report
Date: 2026-05-07

## Screens Found
| Screen | File | Status |
|--------|------|--------|
| Welcome / Login | `apps/mobile/lib/features/auth/ui/welcome_screen.dart` | Fixed |
| OTP Verify | `apps/mobile/lib/features/auth/ui/otp_screen.dart` | Fixed |
| Signup | `apps/mobile/lib/features/auth/ui/signup_screen.dart` | Pass |
| Conductor Dashboard | `apps/mobile/lib/features/trips/ui/dashboard_screen.dart` | Pass |
| Trip Detail | `apps/mobile/lib/features/trips/ui/trip_detail_screen.dart` | Partial |
| Passengers | `apps/mobile/lib/features/passengers/ui/passengers_screen.dart` | Partial |
| Driver Dashboard | `apps/mobile/lib/features/driver/ui/driver_dashboard_screen.dart` | Pass |
| Driver Trip Overview | `apps/mobile/lib/features/driver/ui/driver_trip_overview_screen.dart` | Partial |
| Conductor Offline Alert | `apps/mobile/lib/features/driver/ui/conductor_offline_alert.dart` | Partial |
| Manual Alert Popup | `apps/mobile/lib/features/alerts/ui/alert_dialog.dart` | Fixed |

## Auth Flow Results
| Check | Expected | Status |
|-------|----------|--------|
| A - Password login endpoint | `/api/auth/login` and no OTP for password flow | ✅ Pass |
| B - Phone format | Auto-add `+91` for local 10-digit input | ✅ Fixed |
| C - Token storage | Access/refresh/role stored in secure storage | ✅ Pass |
| D - Role routing | Conductor -> conductor dashboard, Driver -> driver dashboard | ✅ Fixed |
| E - Token refresh | 401 -> `/api/auth/refresh` -> retry request | ✅ Pass (code path) |
| F - Logout | POST logout, clear tokens, route to login, no back | ✅ Pass (code path) |

## Conductor Screen Results
| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Dashboard list | Assigned trips list with status and navigation | ✅ Pass | Uses `GET /api/trips` with auth header. |
| Trip detail content | Route, stops, passenger count, start CTA | ⚠️ Partial | Route/start present; explicit stop sequence and passenger count are not rendered from model. |
| Start trip | PUT start, GPS start, notification, button swap | ✅ Pass | Starts GPS + socket and navigates to passenger screen. |
| GPS service | Sends location every 10s incl. background | ⚠️ Partial | Service code and permissions are correct; real locked-screen validation requires Android device run. |
| Active passengers | Passenger list + realtime updates | ⚠️ Partial | List and socket update handler exist; runtime socket validation pending device test. |
| Alert popup | Blocking popup with call + mark notified | ✅ Fixed | Converted to fullscreen blocking dialog; button labels now `CALL NOW` and `MARK NOTIFIED`. |
| End trip | Confirm, complete API, stop GPS/socket, back to dashboard | ✅ Pass | Implemented in `TripDetailScreen`. |

## Driver Screen Results
| Check | Expected | Status | Notes |
|-------|----------|--------|-------|
| Driver dashboard | Assigned trips + conductor status indicators | ✅ Pass | Includes takeover-required pulsing state. |
| Driver trip overview | Route + conductor card + takeover gating | ⚠️ Partial | Core data shown; offline duration gating (`>2 min`) is backend-driven. |
| Conductor offline alert | Blocking alert with vibration + actions | ⚠️ Partial | Back-dismiss blocked, vibration present; has explicit dismiss button by design. |
| Takeover flow | PUT takeover + GPS start + driver mode badge | ✅ Pass | API call + GPS start + badge implemented. |
| Driver conductor-mode parity | Full conductor controls in takeover mode | ❌ Fail | End-trip and full conductor control parity not fully exposed in driver takeover UI. |

## Common Checks
| Check | Status | Notes |
|-------|--------|-------|
| Offline handling | ⚠️ Partial | GPS queue + flush exists in `location_queue.dart`; full airplane-mode runtime test pending. |
| API error handling | ⚠️ Partial | Most screens handle loading/error states; some screens still surface raw error text. |
| Loading states | ✅ Pass | Async providers use loading indicators. |
| Back navigation | ✅ Pass | Back handling present in key flows with `context.pop()`. |
| Performance | ⚠️ Partial | No obvious anti-pattern in static audit; needs runtime profiling. |
| Battery usage | ⚠️ Partial | Foreground service + no vibration in notif; real drain metrics need device session. |

## Issues Found & Fixed
| # | Issue | Priority | Fix | Status |
|---|-------|----------|-----|--------|
| 1 | Post-login route forced to conductor dashboard for all roles | P1 | `WelcomeScreen` and `OtpScreen` now route via `routeForRole(role)` | ✅ Fixed |
| 2 | Phone number normalization not explicit at submit point | P1 | Added `_formatContact()` and normalized before password/OTP submit | ✅ Fixed |
| 3 | Socket log did not emit required audit wording | P3 | Added `Socket connected` / `Socket connection error` log lines | ✅ Fixed |
| 4 | GPS service logs/notification text not aligned with required checks | P2 | Added startup/location log lines and adjusted foreground notification copy | ✅ Fixed |
| 5 | Manual alert popup action labels/UX mismatch | P3 | Converted to fullscreen and renamed actions to `CALL NOW`/`MARK NOTIFIED` | ✅ Fixed |

## Terminal Logs Evidence
Key evidence from local verification:

- Static analysis:
  - `flutter analyze` -> `No issues found!`
- Code-level endpoint wiring:
  - Password login uses `/api/auth/login` in `auth_repository.dart`
  - OTP send uses `/api/auth/send-otp` only from OTP action, not password login
  - Refresh flow posts to `/api/auth/refresh` in `token_interceptor.dart`
- Added runtime log lines for device verification:
  - `Socket connected`
  - `Socket connection error`
  - `GPS service started`
  - `Sending location every 10 seconds`
  - `POST /api/trips/:id/location`

## Summary
Total checks: 24
Passed: 14
Failed: 1
Partial/Pending device runtime: 9

Auth flow: ✅
GPS working: ✅ (code path)
Background GPS: ⚠️ (device verification pending)
Socket.IO: ⚠️ (device verification pending)
Conductor flow: ⚠️ (partial)
Driver flow: ⚠️ (partial)

Flutter app ready: NO

Blocking remaining gap before YES:
- Complete driver takeover parity so driver can fully perform conductor end-to-end controls (including end-trip parity), then run full Android device runtime validation with the provided test credentials.
