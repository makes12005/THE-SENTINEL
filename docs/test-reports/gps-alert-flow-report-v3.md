# GPS + Alert Flow Test Report (v3)
Date: 2026-04-28

## Scope
Force redeploy + live verification for latest committed code (`685028c`, `3dcc351`) on Railway services:
- `api`
- `alert-worker`
- `heartbeat-worker`

## Redeploy Confirmation
- Executed:
  - `railway redeploy --service api --yes`
  - `railway redeploy --service alert-worker --yes`
  - `railway redeploy --service heartbeat-worker --yes`
- Alert worker startup logs now show new banner lines:
  - `Alert worker started`
  - `Waiting for jobs...`

## Test Flow Executed
1. Created fresh trip and passenger targeting stop `Nadiad`.
2. Sent one GPS ping near Nadiad (`lat=22.6950`, `lng=72.8600`) as conductor.
3. Watched `alert-worker` logs and checked `/api/logs/alert-logs`.
4. Stopped pings for 3+ minutes, then sent one resume ping.
5. Watched `heartbeat-worker` logs and checked `/api/admin/audit-logs?action=CONDUCTOR_ONLINE`.

## Final Test Results
| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 5 | Worker processed | `Processing job for <name> -> stop Nadiad` and no `passenger undefined` | FAIL | Logs still show `Processing job for passenger undefined -> stop "Nadiad"` and repeated `Cannot read properties of undefined (reading 'slice')`. No new `alert_logs` row for the test passenger. |
| 8 | Online recovery | `conductor_offline` then `conductor_online` + `CONDUCTOR_ONLINE` audit row | FAIL | Heartbeat logs show `conductor OFFLINE` and `conductor RECOVERED` for test trip, but `/api/admin/audit-logs?action=CONDUCTOR_ONLINE` returned zero rows. |

## Final Score
- Test 5 (worker processed): **FAIL**
- Test 8 (online recovery): **FAIL**
- Overall: **not 12/12** (core blocker remains)

## Exact Railway Log Output (Current Run)
### Alert Worker
- `Alert worker started`
- `Waiting for jobs...`
- `[AlertWorker] Processing job for passenger undefined -> stop "Nadiad"`
- `[AlertWorker] Error (attempt 3) — backing off 8000ms: Cannot read properties of undefined (reading 'slice')`
- `[AlertWorker] Processing job for passenger undefined -> stop "undefined"`
- `[AlertWorker] Error (attempt 6) — backing off 60000ms: Cannot read properties of undefined (reading 'slice')`

### Heartbeat Worker
- `Heartbeat worker started`
- `[HeartbeatWorker] conductor OFFLINE — trip 7a39640a-37d2-4061-a995-5c66e5c2ed86 | lastSeen: 2026-04-28T03:35:26.199Z`
- `[HeartbeatWorker] conductor RECOVERED — trip 7a39640a-37d2-4061-a995-5c66e5c2ed86`

## Conclusion
- Startup banner confirms new worker container boot.
- Runtime behavior for alert payload mapping still matches old/broken path (`passenger undefined`), so alert cascade + `alert_logs` creation remains broken for this scenario.
- Heartbeat recovery emission appears in worker logs, but corresponding `CONDUCTOR_ONLINE` audit row is still missing from admin audit endpoint.
