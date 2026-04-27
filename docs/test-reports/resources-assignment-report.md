# Resources & Assignment Report
Date: 2026-04-27

## Features Implemented
- Shared buses across agency
- Shared staff across agency
- Uniqueness validation
- Trip assignment system
- Orphan trip handler
- Reassignment flow

## Test Results
| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Add Bus | PASS | Created bus `GJ01AB1234` successfully |
| 2 | Duplicate Bus | PASS | Returned user-friendly duplicate plate error |
| 3 | Add Conductor | PASS | Conductor created successfully |
| 4 | Duplicate Conductor | PASS | Returned user-friendly duplicate phone error |
| 5 | Create Trip (assign to self) | PASS | `assigned_operator_id` defaulted to creator |
| 6 | Create Trip (assign to other) | PASS | Trip assigned to another active operator in same agency |
| 7 | Operator sees assigned trips | PASS | Operator saw owned trips and trips assigned to them |
| 8 | Deactivate operator | PASS | Active non-completed trips were unassigned and socket event emitted |
| 9 | Reassign trip | PASS | Trip reassigned and assigned operator notification emitted |
| 10 | Owner sees all trips | PASS | Owner saw all agency trips |

## Issues Found & Fixed
- Added missing `users.added_by` metadata support so agency-wide resources can show who created each item.
- Closed API parity gaps between resources UI and backend by implementing `/api/agency/buses`, `/api/agency/members`, and `/api/agency/operators`.
- Fixed trip visibility rules so operators now see trips they own or trips assigned to them, while owners see all agency trips.
- Added orphan-trip handling on operator deactivation by clearing `assigned_operator_id`, writing audit logs, and emitting `trip_unassigned`.
- Added owner-side unassigned trip alerting and trip reassignment flow on the frontend.
- Added duplicate validation with user-friendly errors for buses, staff, and routes.
- Worked around existing production-like database drift with idempotent SQL updates after the generated migration path hit a legacy phone-column width mismatch.

## Production Verification
- Local backend build: PASS
- Local frontend build: PASS
- Full monorepo build: PASS
- Local health check: PASS via `GET /health`
- Production verification: PENDING until latest push finishes deploying on Railway and Vercel

## Summary
Ready for operator testing: YES
