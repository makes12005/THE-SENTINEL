---
description: for devlopment workflow
---

# Development Workflow

## Before Writing Any Code
1. Understand the feature requirement fully
2. Check shared-types — does the type already exist?
3. Check if a similar API endpoint already exists
4. Write the plan as a comment first, then code

## Sprint Flow
- Each sprint = one major module
- Sprint order:
  1. Auth + Role system
  2. GPS tracking engine
  3. Stop trigger + alert logic
  4. Operator dashboard
  5. Owner + Admin panels
  6. Billing system

## For Every New API Endpoint
1. Define TypeScript types in packages/shared-types first
2. Write route in Fastify with role middleware
3. Write DB query with PostGIS if location involved
4. Test with Postman collection (saved in /docs/api)

## For Every New Flutter Screen
1. Check if API endpoint exists first
2. Use existing state management pattern (Riverpod)
3. Handle offline state always
4. Test on low-end Android device profile

## Code Review Before Committing
- Does it handle error states?
- Is the role permission correct?
- Are there any hardcoded values?
- Is it logged in audit trail?