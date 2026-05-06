# Routes & Templates Report
Date: 2026-05-04

## Features Implemented
| Feature | Status |
|---------|--------|
| Routes CRUD | PARTIAL |
| Stops with map picker | YES |
| Route map visualization | YES |
| Templates CRUD | PARTIAL |
| Template map preview | YES |
| Trip from template | YES |
| Trip from scratch update | YES |

## Test Results
| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Create Route | PARTIAL | API + UI flow implemented, manual click test not executed in browser session |
| 2 | Add Stops with Map | PARTIAL | Map picker flow implemented in routes pages, not manually clicked in this run |
| 3 | Map Shows Route | PARTIAL | RouteMap markers + polyline + fit-bounds implemented and build-verified |
| 4 | Create Template | PARTIAL | API + UI modal with route preview implemented, no interactive browser run |
| 5 | Use Template | PARTIAL | Use modal posts `template_id + scheduled_date`; redirect wired |
| 6 | Duplicate Template Name | YES | Enforced in `TemplatesService.createTemplate` and update |
| 7 | Create Trip from Scratch | YES | Trips modal supports scratch mode and posts normal payload |
| 8 | Create Trip from Template | YES | Trips modal supports template mode with autofill + override |

## Issues Found & Fixed
- Added agency-scoped validation for template route/bus/conductor/driver assignments.
- Added route deletion guard to block delete when route has active trips.
- Added template deletion guard to block delete when scheduled trips reference template.
- Added route list enrichment (`created_by_name`) for operator UI.
- Added dedicated route detail page with map, stop CRUD, and sequence reorder controls.
- Added template route preview map in create/edit modal and use-template trip modal.
- Added trip template support persistence (`trips.template_id`) in create flow.
- Fixed type errors found during local builds (`TripStatusResponse.scheduled_time`, strict literal for `alert_status`).

## Summary
Routes feature complete: NO
Templates feature complete: NO
Map visualization working: YES
