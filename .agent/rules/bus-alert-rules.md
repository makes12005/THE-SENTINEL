---
trigger: always_on
---

# Bus Alert System — Project Rules

## Project
- Production-grade app, not MVP
- Target: Gujarat state, India
- Primary users: Bus operators, conductors, drivers, passengers

## Stack
- Mobile: Flutter (Conductor + Driver)
- Web: Next.js (Operator/Owner/Admin dashboard)
- Backend: Fastify + Node.js
- Database: PostgreSQL + PostGIS
- Realtime: Socket.IO + Redis
- Maps: MapMyIndia (Mappls)
- Calls: Exotel | SMS: MSG91 | WhatsApp: Gupshup
- Cloud: AWS Mumbai region

## Code Rules
- TypeScript everywhere on web and backend — no plain JS
- All API responses follow: { success, data, error, meta }
- All routes are role-protected from day one
- Never hardcode API keys — use environment variables always
- Every DB query uses parameterized statements — no raw SQL strings
- All geo calculations use PostGIS — never manual distance math

## Roles (in order of permission level)
1. Admin (highest)
2. Owner (Agency Owner)
3. Operator
4. Driver
5. Conductor
6. Passenger

## Folder Structure
- apps/mobile → Flutter
- apps/web → Next.js
- apps/backend → Fastify
- packages/shared-types → All TypeScript interfaces

## Non-negotiables
- Offline support in conductor app (GPS continues without internet)
- Audit log on every state change
- All timestamps in IST (Asia/Kolkata)
- Phone numbers stored in E.164 format (+91XXXXXXXXXX)

UI RESPONSIVENESS RULE:
- Mobile screens → Flutter, optimize for Android only now
- Web screens → Next.js, desktop layout only now
- Responsiveness sprint happens AFTER all screens converted
- Do not add responsive breakpoints during conversion phase

UI CONVERSION RULES:

Source priority:
1. If docs/ui/screen/{role}/{n}.html exists 
   → use HTML as primary source
   → PNG in docs/ui/ is secondary reference only

2. If only PNG exists
   → use PNG as reference
   → match layout, spacing, colors as closely as possible

Screen name is in HTML <meta title> tag.
Use it to understand screen purpose before converting.

Shared screens: some screens serve multiple roles.
They live in the lowest role folder only.
Apply correct role permissions in code,
not by duplicating the screen.