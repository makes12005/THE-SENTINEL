# Operator Dashboard Test Report (Fresh Re-run)
Date: 2026-04-27

Backend: `https://api-production-e13f.up.railway.app`  
Frontend: `https://bus-alert-iota.vercel.app`

## Backend API Results
| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Create Route | PASS | HTTP 201, route created |
| 2 | Add Stops to Route | PASS | 5/5 stops created |
| 3 | Add Bus | PASS | HTTP 201, bus created |
| 4 | Duplicate Bus Check | PASS | HTTP 409 duplicate rejection |
| 5 | Add Conductor | PASS | HTTP 201, conductor created |
| 6 | Add Driver | PASS | HTTP 201, driver created |
| 7 | Duplicate Staff Check | PASS | HTTP 409 duplicate rejection |
| 8 | Create Trip | PASS | HTTP 201, trip created |
| 9 | Upload Passenger CSV | FAIL | HTTP 201 but response payload did not match expected uploaded-count contract check |
| 10 | Invalid CSV Row | FAIL | Upload rejected (HTTP 422), expected HTTP 400 with row-level error contract |
| 11 | Get Trip Status | FAIL | HTTP 200 but response shape did not match expected `passenger_summary` contract |
| 12 | Operator Summary | PASS | HTTP 200 |
| 13 | List Buses | PASS | HTTP 200 and new bus visible in list |
| 14 | List Staff | PASS | HTTP 200 and newly created conductor/driver visible |
| 15 | Alert Logs | PASS | HTTP 200 |

## Frontend Results
| # | Test | Status | Screenshot |
|---|------|--------|------------|
| 16 | Operator Dashboard Loads | PASS | `docs/test-reports/screenshots-16-dashboard.png` |
| 17 | Routes Page | PASS | `docs/test-reports/screenshots-17-routes.png` |
| 18 | Trips Page | PASS | `docs/test-reports/screenshots-18-trips.png` |
| 19 | Resources Page | PASS | `docs/test-reports/screenshots-19-resources.png` |
| 20 | Live Monitor | PASS | `docs/test-reports/screenshots-20-monitor.png` |
| 21 | Logs Page | PASS | `docs/test-reports/screenshots-21-logs.png` |

Frontend note: tests were re-run with authenticated Playwright automation (operator login + route assertions + console-error capture). All six frontend pages passed with no captured console errors.

## Failed Tests
- **Test 9 (Passenger CSV upload):** endpoint returned success status, but output contract differed from expected uploaded-row summary fields used by the test criteria.
- **Test 10 (Invalid CSV):** rejection occurred, but status/error contract differed from expected `400 + row-by-row` format.
- **Test 11 (Trip status):** endpoint returned success, but object key contract differed from expected `passenger_summary` shape.

## Summary
Total: 21 tests  
Passed: 18  
Failed: 3  
Operator dashboard ready: NO (remaining blockers are backend response-contract mismatches in tests 9-11)

Artifacts:
- Backend raw result log: `docs/test-reports/operator-backend-results.json`
- Frontend raw result log: `docs/test-reports/operator-frontend-results.json`
- Frontend screenshots: `docs/test-reports/screenshots-16-dashboard.png`, `docs/test-reports/screenshots-17-routes.png`, `docs/test-reports/screenshots-18-trips.png`, `docs/test-reports/screenshots-19-resources.png`, `docs/test-reports/screenshots-20-monitor.png`, `docs/test-reports/screenshots-21-logs.png`
