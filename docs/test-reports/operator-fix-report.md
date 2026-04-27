# Operator Fix Report
Date: 2026-04-27

Backend: `https://api-production-e13f.up.railway.app`

## Fixes Applied
| Fix | Problem | Solution | Status |
|-----|---------|----------|--------|
| Route payload normalization | Route creation failed when frontend sent camelCase keys | Updated route/trip/stop Zod schemas to accept both camelCase and snake_case, and normalize internally to snake_case | ✅ Done |
| Operator agency scoping | Agency-scoped routes could run with missing agency context (`agency_id` null path) | JWT now includes `agency_id`, middleware maps both `agencyId` + `agency_id`, and agency-scoped endpoints hard-fail with `AGENCY_REQUIRED` if missing | ✅ Done |
| Duplicate resource guard | Duplicate bus/staff creation was not reliably blocked in testing flow | Hardened duplicate checks and standardized duplicate conflict responses (`409`, duplicate codes/messages) | ✅ Done |

## Verification Results
| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Route with camelCase | PASS | HTTP 201 on production after redeploy |
| 2 | Route with snake_case | PASS | HTTP 201 |
| 3 | Add Bus with operator token | PASS | HTTP 201, agency-scoped bus creation works |
| 4 | Duplicate Bus | PASS | HTTP 409 |
| 5 | Add Staff | PASS | HTTP 201 |
| 6 | Duplicate Staff | PASS | HTTP 409 |
| 7 | Full trip flow | PASS | Route + stops + trip + passenger upload succeeded |

## Summary
All 3 fixes applied: YES  
Ready to re-run full 21 test suite: YES
