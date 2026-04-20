---
name: role-auth
description: Architecture and rules for the 6-role permission and authentication system in the Bus Alert System.
---

# Role-Based Authentication

This skill outlines the strict hierarchy and authorization logic for the project.

## Permission Hierarchy

The platform defines 6 distinct roles. Listed from highest to lowest permission level:
1.  Admin
2.  Owner (Agency Owner)
3.  Operator
4.  Driver
5.  Conductor
6.  Passenger

## Implementation Rules

*   **Auth Standard:** Use a robust JWT paired with a Refresh token strategy.
*   **Middleware Enforcement:** Every single route must be protected by role-based middleware from day one. Do not leave any endpoint unsecured or implicitly open.
*   **Role Capabilities:**
    *   **Operator:** Creates and assigns trips.
    *   **Conductor:** Runs the active trips.
    *   **Owner:** Has visibility over all their operators but MUST NOT see revenue details. Ensure queries filter out revenue data for this role natively.
    *   **Driver:** Functions as a backup only. Their access capabilities activate only in the event of a conductor failure.
