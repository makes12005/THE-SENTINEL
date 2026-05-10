# Flutter Session/Network Hotfix Report
Date: 2026-05-07

## Issue Reported
- App showed "No internet" intermittently even with working internet.
- App later showed "Session expired, please login again" before successful login.
- Error persisted across app restarts.

## Root Cause
1. Stale/incomplete auth tokens were being treated as valid session on startup.
2. Token interceptor attached bearer tokens to `/api/auth/*` requests, causing noisy auth behavior before login.
3. Any 401 path outside narrow exceptions could trigger forced logout flow (`SESSION_EXPIRED`) and user-facing session error loops.
4. `google_fonts` runtime network fetching failed on device DNS/network conditions, producing repeated exceptions and unstable UX.

## Fixes Applied
- `apps/mobile/lib/core/network/token_interceptor.dart`
  - Do not attach bearer token to `/api/auth/*`.
  - Skip refresh/force-logout logic for auth endpoints.
- `apps/mobile/lib/core/storage/secure_storage.dart`
  - `hasValidSession()` now requires access token + refresh token + role.
  - Auto-clears incomplete/corrupt session data to prevent phantom login states.
- `apps/mobile/lib/main.dart`
  - Disabled runtime font fetching: `GoogleFonts.config.allowRuntimeFetching = false;`
- `apps/mobile/lib/core/network/api_client.dart`
  - Increased connect timeout from 15s to 25s to reduce false timeout failures.

## Verification
- Rebuilt app successfully:
  - `flutter clean` ✅
  - `flutter pub get` ✅
  - `flutter analyze` ✅
  - `flutter build apk --debug` ✅
- New APK generated:
  - `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`

## User Action
1. Uninstall old app from phone.
2. Install this newly generated APK.
3. Re-test login using:
   - Conductor: `+919876543002 / Test@1234`
   - Driver: `+919876543003 / Test@1234`
