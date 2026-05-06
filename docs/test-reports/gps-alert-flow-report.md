# GPS + Alert Flow Test Report
Date: 2026-04-27

## Environment
- Backend: https://api-production-e13f.up.railway.app
- Frontend: https://bus-alert-iota.vercel.app
- Evidence JSON: `docs/test-reports/gps-alert-flow-evidence.json`

## Test Results
| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Start trip | active | PASS | status=200 |
| 2 | GPS far pings | no alert | FAIL | pingStatuses=202,202,202,202,202; passengerStatuses=pending,pending,pending,sent |
| 3 | GPS near Nadiad | alert triggered | PASS | passenger1_status=sent |
| 4 | No duplicate | no repeat | PASS | nadiadLogs before=0 after=0 |
| 5 | Worker processed | logs created | FAIL | p1_status=missing |
| 6 | GPS near Vadodara | new alert | PASS | passenger2_status=sent |
| 7 | Heartbeat offline | event fired | UNKNOWN | Cannot verify Socket event from public API only |
| 8 | GPS resume | online event | PASS | status=202; socket event not externally visible |
| 9 | Complete trip | wallet deducted | PASS | complete_status=200; wallet endpoint=/api/owner/summary |
| 10 | Alert logs | entries exist | FAIL | nadiad=true; vadodara=false |
| 11 | Queue empty | no stuck jobs | UNKNOWN | Redis queue length not exposed via production API |
| 12 | Passenger status | correct | PASS | {"+919876540003":"pending","+919876540004":"pending","+919876540002":"sent","+919876540001":"failed"} |

## Critical Issues Found
- Exact error: pingStatuses=202,202,202,202,202; passengerStatuses=pending,pending,pending,sent
- Impact on product: Regression in test 2 (GPS far pings) for production GPS/alert flow.
- Suggested fix: Inspect related service logs and endpoint contracts; rerun this scenario after fix.

- Exact error: p1_status=missing
- Impact on product: Regression in test 5 (Worker processed) for production GPS/alert flow.
- Suggested fix: Inspect related service logs and endpoint contracts; rerun this scenario after fix.

- Exact error: nadiad=true; vadodara=false
- Impact on product: Regression in test 10 (Alert logs) for production GPS/alert flow.
- Suggested fix: Inspect related service logs and endpoint contracts; rerun this scenario after fix.

- Exact error: Redis queue depth and heartbeat socket events are not externally verifiable from public API.
- Impact on product: Cannot conclusively validate Tests 7/11 without worker/Redis observability.
- Suggested fix: Add secure operator/admin diagnostics endpoint or provide Railway worker log access for QA.

## Worker Logs
- Alert worker: Not directly accessible from public API in this run.
- Heartbeat worker: Not directly accessible from public API in this run.
- See `gps-alert-flow-evidence.json` for API-side evidence and statuses.

## Cleanup
- Bus delete status: 200
- Trip/route/passenger delete endpoints are not publicly available in the current backend API.

## Summary
Total: 12 tests
Passed: 7
Failed: 3
Unknown/Not directly verifiable: 2

Core GPS flow working: NO
Alert delivery working: NO
Heartbeat working: NO (insufficient observability)
Wallet deduction working: YES
Ready for real device test: NO
