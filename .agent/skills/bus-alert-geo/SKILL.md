---
name: bus-alert-geo
description: Guidelines and logic for implementing distance triggers and geo-calculations in the Bus Alert System.
---

# Bus Alert Geo Logic

This skill defines the context and rules for how distance triggers and location tracking operate in the Bus Alert System.

## Core Rules

*   **Stop Coordinates:** All bus stop coordinates must be stored in PostgreSQL using the PostGIS extension.
*   **Coordinate Format:** All coordinates must strictly use the WGS84 format.
*   **Live Tracking:** The Conductor's mobile app must send GPS location payloads to the backend every 10 seconds.
*   **Distance Calculation:** The server MUST calculate distances securely using PostGIS `ST_Distance` functions. Never use manual Haversine math calculations.
*   **Trigger Radius:** The trigger radius that initiates a passenger alert is configurable per trip (default is 10km).
*   **Alert Firing Rules:**
    *   The alert fires exactly ONCE per passenger per stop.
    *   Ensure robust state tracking using Redis so alerts never repeat for the same passenger/stop combination.
