# Bus Alert System - Project Memory

## Current State of Architecture

### 1. Mobile App (Flutter)
The mobile app has been entirely rebuilt to serve internal staff.
- **Roles Implemented:** Conductor, Driver.
- **State Management:** `flutter_riverpod` for responsive and decoupled state.
- **Routing:** `go_router` with integrated auth guards for role-specific redirection.
- **Real-time Connection:** `socket_io_client` integrated into `SocketService` for low-latency alerts, takeover requests, and location ping distribution.
- **Background Processes:** `flutter_foreground_task` powers `GpsService` for persistent background location streaming on Android, bypassing aggressive OS sleep states.
- **Offline Resilience:** `LocationQueue` caches GPS coordinates locally during offline periods, bursting them to the server upon reconnection.
- **Platform Specifics:** `AndroidManifest.xml` thoroughly configured for `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, and `WAKE_LOCK`.

### 2. Web App (Next.js)
Serves operators, owners, and system admins.
- **Tech Stack:** Next.js (React), TypeScript.
- **Features:** Trip dispatching, fleet monitoring, real-time map views via socket connection.

### 3. Backend (Fastify + Node.js)
The core API engine.
- **Database:** PostgreSQL with PostGIS for geo-spatial distance and zone calculations.
- **Pub/Sub:** Redis + Socket.IO for scalable real-time event broadcasting to mobile and web clients.
- **Deployment:** Currently hosted on Railway.

## Recent Milestones Completed
- **Driver Role:** Added Driver Dashboard, active Trip Overview (with real-time speed monitoring), and Takeover Alert screens.
- **Stability Fixes:** Corrected Flutter `use_build_context_synchronously` warnings across async gaps using `mounted` checks. Migrated deprecated visual properties to modern implementations (e.g., `.withValues()`).

## Next Actions / Technical Debt
- **Testing:** Field test background location services on devices with aggressive battery optimizations (MIUI, OneUI).
- **Deployment:** Verify release APK and push test builds to internal channels.
