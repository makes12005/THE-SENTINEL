# GPS + Alert Flow Test Report
Date: 2026-04-27

## Test Results
| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Start trip | active | PASS | `PUT /api/trips/<TRIP_ID>/start` returned `200`; trip moved to `active` |
| 2 | GPS far pings | no alert | FAIL | All 5 pings accepted (`202`), but passenger 1 became `sent` during far-ping phase (`pending,pending,pending,sent`) |
| 3 | GPS near Nadiad | alert triggered | PASS | Passenger `+919876540001` moved to `sent` near Nadiad |
| 4 | No duplicate | no repeat | PASS | No duplicate alert rows observed for Nadiad phase |
| 5 | Worker processed | logs created | FAIL | Alert worker logs show payload mapping bug (`Processing job for passenger undefined`) and crashes on `.slice` |
| 6 | GPS near Vadodara | new alert | PASS | Passenger `+919876540002` moved to `sent`; passenger 1 not retriggered |
| 7 | Heartbeat offline | event fired | PASS | Heartbeat worker log contains `conductor OFFLINE — trip <TRIP_ID>` |
| 8 | GPS resume | online event | FAIL | Resume ping accepted (`202`), but no `conductor RECOVERED`/`conductor_online` event found in heartbeat logs for this run |
| 9 | Complete trip | wallet deducted | PASS | `PUT /complete` returned `200`; DB trip status became `completed` |
| 10 | Alert logs | entries exist | FAIL | `/api/logs/alert-logs` returned empty; DB check shows `alert_logs` count `0` for latest GPS test trips |
| 11 | Queue empty | no stuck jobs | PASS | Redis check via production env: `LLEN alert_queue = 0` |
| 12 | Passenger status | correct | PASS | Final statuses: Nadiad=`sent`, Vadodara=`sent`, Bharuch=`pending`, Surat=`pending` |

## Critical Issues Found
- Exact error: Alert worker receives malformed payload (`passenger undefined`, `stop undefined`) and throws `Cannot read properties of undefined (reading 'slice')`.
- Impact on product: Worker cannot create `alert_logs` entries and cannot complete proper delivery bookkeeping; alert observability is broken.
- Suggested fix: Fix queue payload contract between geo enqueue and alert worker (`tripPassengerId`, `passengerPhone`, `stopName` mapping), add runtime schema validation in worker before processing.

- Exact error: Unexpected alert state progression during far-ping phase (passenger 1 marked `sent` earlier than expected).
- Impact on product: Premature passenger alerts reduce trust and can generate incorrect rider notifications.
- Suggested fix: Re-validate stop-proximity trigger timing and coordinate-distance calculations for early-route pings, then add regression test for far-phase no-trigger guarantee.

- Exact error: No `conductor_online` recovery event observed after resume ping.
- Impact on product: Driver takeover/offline UX may not recover correctly after conductor resumes.
- Suggested fix: Add explicit heartbeat recovery logging + event assertion in worker integration tests and verify poll timing behavior after resume.

## Worker Logs
- Alert worker:
  - `Alert worker started`
  - `Waiting for jobs...`
  - `[AlertWorker] Processing job for passenger undefined → stop "undefined"`
  - `[AlertWorker] Error (attempt 1) — backing off 2000ms: Cannot read properties of undefined (reading 'slice')`
- Heartbeat worker:
  - `Heartbeat worker started`
  - `[HeartbeatWorker] conductor OFFLINE — trip 4a5789d3-3ea0-44e8-9063-81e7be0179ba | lastSeen: 2026-04-27T18:32:52.075Z`

## Summary
Total: 12 tests
Passed: 8
Failed: 4

Core GPS flow working: NO
Alert delivery working: NO
Heartbeat working: PARTIAL
Wallet deduction working: YES

Ready for real device test: NO
