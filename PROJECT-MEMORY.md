# Bus Alert System - Project Memory

## Current State of Architecture

### 1. Web App (Next.js)
Serves operators, owners, and system admins.
- **Tech Stack:** Next.js (React), TypeScript.
- **Features:** Trip dispatching, fleet monitoring, real-time map views via socket connection.
- **Roles:** Operator, Owner, Admin

### 2. Backend (Fastify + Node.js)
The core API engine.
- **Database:** PostgreSQL with PostGIS for geo-spatial distance and zone calculations.
- **Pub/Sub:** Redis + Socket.IO for scalable real-time event broadcasting to web clients.
- **Deployment:** Currently hosted on Railway.

### 3. Mobile App (Flutter)
- **Status:** REBUILT (May 16, 2026)
- **Package:** com.busalert.mobile
- **Min SDK:** 26 (Android 8.0)
- **Theme:** Dark theme (system default)
- **Roles:** Conductor, Driver
- **Tech Stack:** Flutter, Riverpod, GoRouter, Dio
- **Features:**
  - Complete auth flow (password + OTP)
  - Conductor dashboard with trip management
  - Driver dashboard with takeover capability
  - Active trip monitoring with GPS tracking
  - Boarding checklist
  - Real-time Socket.IO updates
  - Manual alert handling
  - Profile management

## Recent Milestones Completed
- **Driver Role:** Added Driver Dashboard, active Trip Overview (with real-time speed monitoring), and Takeover Alert screens.
- **Stability Fixes:** Corrected Flutter `use_build_context_synchronously` warnings across async gaps using `mounted` checks. Migrated deprecated visual properties to modern implementations (e.g., `.withValues()`).

## Small UI/UX Fixes (May 16, 2026)
- Owner operator features: Operations slide-out panel with Routes, Templates, Trips, Monitor, Resources, Alert Logs
- Owner logs: All log types shown with filtering
- Expired trip handling: 4-hour expiry threshold, EXPIRED badge display
- Icons: Material Symbols (font-based) for operator/owner, Lucide React for admin
- Search: 22 search inputs verified working across all pages
- Notification click: Socket.IO toasts navigate to relevant pages (alert_manual_required→/operator/monitor, wallet_low→/owner/wallet, conductor_offline→/operator/monitor)
- Trip deletion: Delete button for scheduled/expired trips (admin/owner/operator)
- 12-hour warning: Shows warning when selecting conductor/driver with upcoming trip
- Auto assign: Trips auto-assign to creator; operators cannot reassign

## Route Creation Improvements (May 16, 2026)
- Bulk route creation endpoint: `POST /api/routes/bulk` - create route + stops in single call
- Route duplication endpoint: `POST /api/routes/:id/duplicate`
- Owner routes page: Full implementation at `/owner/routes`
- Performance: Reduced API calls from N+1 to 1 for route creation

## Next Actions / Technical Debt
- **Testing:** Field test Flutter app on physical Android device
- **Google Maps:** Add API key to `apps/mobile/android/app/src/main/res/values/strings.xml`
- **Build:** Run `flutter build apk --debug` for device testing
- **Bug:** Pre-existing TypeScript error in `trips.service.ts:612` - `auditLogs` reference needs fixing

## Mobile App Details (Flutter)

### Screens Built (16 total)
| Screen | Path |
|--------|------|
| Welcome | `/welcome` |
| Login | `/login` |
| Signup | `/signup` |
| OTP Verification | `/otp` |
| Invite Code | `/invite-code` |
| Forgot Password | `/forgot-password` |
| Conductor Dashboard | `/conductor` |
| Trip Detail | `/conductor/trip/:id` |
| Boarding Checklist | `/conductor/boarding/:id` |
| Active Trip Shell | `/conductor/active/:id` |
| Trip Tab | (child of Active Trip) |
| Passengers Tab | (child of Active Trip) |
| Alerts Tab | (child of Active Trip) |
| Driver Dashboard | `/driver` |
| Driver Trip Overview | `/driver/trip/:id` |
| Profile | `/profile` |

### Services
- **GPS Service:** Background location tracking with offline queue
- **Socket Service:** Real-time event handling
- **Token Interceptor:** Auto refresh on 401

### Key Files
- `lib/main.dart` - App entry point
- `lib/core/router/app_router.dart` - GoRouter with auth guards
- `lib/features/auth/provider/auth_provider.dart` - Auth state management
- `lib/features/gps/gps_service.dart` - Foreground GPS tracking
- `lib/features/alerts/socket_service.dart` - Socket.IO integration
