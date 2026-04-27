# GPS + Alert Flow Test Report (v3)
Date: 2026-04-28

## Scope
Focused rerun requested for tests `3`, `5`, `6`, `8` after backend payload/recovery fixes.

## Root-Cause Verification
- Queue producer (`GeoService`) previously pushed:
  - `passenger_id`, `trip_id`, `passenger_name`, `passenger_phone`, `stop_name`
- Worker/orchestrator expects:
  - `tripId`, `passengerId`/`tripPassengerId`, `passengerPhone`, `passengerName`, `stopName`
- Mismatch confirmed as source of:
  - `Processing job for passenger undefined → stop "undefined"`

## Code Fixes Applied
- `apps/backend/src/modules/trips/geo.service.ts`
  - Queue payload now uses:
    - `tripId`
    - `tripPassengerId`
    - `passengerPhone`
    - `passengerName`
    - `stopName`
  - Distance now computed explicitly and compared with strict `< triggerRadiusKm`.
  - Added debug distance logging in proximity loop.
- `apps/backend/src/workers/alert.worker.ts`
  - Added backward-compatible parsing (camelCase + legacy snake_case).
  - Added required-field validation guard before cascade call.
  - Updated processing log to print passenger name/phone and stop.
- `apps/backend/src/workers/heartbeat.worker.ts`
  - Added `CONDUCTOR_ONLINE` audit log insert on offline→online recovery.

## Deployment Status
- Changes were pushed to `main` (commit `685028c`).
- Railway `redeploy` completed, but worker logs still show old behavior strings (`passenger undefined`) in this run.
- `railway up` source deployment attempts timed out from this environment, so runtime appears to still be on old worker image.

## Focused Test Results (3,5,6,8)
| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 3 | Alert triggered near Nadiad | Alert triggered | PASS | Passenger `+919876540001` moved to `sent/failed` state in trip passengers. |
| 5 | Worker processed + logs created | Worker consumes job and writes `alert_logs` | FAIL | Worker logs still show `passenger undefined`; alert log creation remains inconsistent/missing for this path. |
| 6 | Alert triggered near Vadodara | New alert for passenger 2 | PASS | Passenger `+919876540002` transitioned to `sent`. |
| 8 | Online recovery detected | `conductor_online` emitted after resume ping | FAIL | Resume ping accepted (`202`), but no `conductor RECOVERED`/`conductor_online` log observed in heartbeat logs during this run. |

## Current Totals
- Prior baseline (v2): `8/12`
- After this focused rerun: still effectively `8/12` overall (core failing areas unchanged in deployed worker runtime)

## Critical Issues Found
- Exact error: Alert worker runtime still logs `Processing job for passenger undefined`.
- Impact on product: Alert cascade cannot reliably map payload fields; `alert_logs` and delivery state updates are unreliable.
- Suggested fix: complete a fresh source deployment for `alert-worker` and `api` from commit `685028c`, then rerun tests.

- Exact error: No heartbeat recovery event observed after resume.
- Impact on product: Driver/offline UX may not recover visibly after conductor resumes.
- Suggested fix: verify new heartbeat worker build is deployed and re-check logs for `conductor RECOVERED` plus `CONDUCTOR_ONLINE` audit insert.

## Next Action
1. Trigger a successful source deploy for Railway `api`, `alert-worker`, `heartbeat-worker` from latest `main`.
2. Re-run focused tests `3/5/6/8`.
3. If all pass, execute full 12-test run and publish final readiness report.
