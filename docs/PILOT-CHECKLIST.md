# Gujarat Pilot Deployment & Test Checklist

Use this checklist to ensure all environments, databases, and dependencies are correctly deployed before initiating the End-to-End Pilot.

## Phase 1: Database & Credentials

- [ ] AWS RDS instance is provisioned and running.
- [ ] Inbound security group allows access for migrations (and your local machine for manual testing).
- [ ] PostGIS extension is installed (`CREATE EXTENSION IF NOT EXISTS postgis;`).
- [ ] Run `pnpm --filter backend db:push` to apply the latest schemas.
- [ ] Verify that all tables are correctly generated (especially `billing_config` and `billing_transactions` for phase 2).

## Phase 2: Environment Variables

- [ ] `apps/backend/.env.production` is created and correctly references the AWS RDS `DATABASE_URL`.
- [ ] `apps/backend/.env.production` sets `ALERT_PROVIDER=mock`.
- [ ] `apps/backend/.env.production` sets strong, secure JWT secrets.
- [ ] `apps/web/.env.production` is populated with the correct API and Auth domains.

## Phase 3: Application Booting

- [ ] Backend Server successfully starts (`pnpm --filter backend start` or `dev`).
- [ ] Redis server is up and accessible locally or on cloud for background tasks (`redis-server`).
- [ ] Alert Worker boots correctly (`pnpm --filter backend worker:alert`).
- [ ] Heartbeat Worker boots correctly (`pnpm --filter backend worker:heartbeat`).
- [ ] NextJS Frontend builds and runs without errors (`pnpm --filter web build` & `start`).

## Phase 4: Local End to End Manual Testing

- [ ] **Data Setup**: Run E2E test or manually create an Agency, Admin, Owner, Operator, Conductor, and Driver.
- [ ] **Trip Creation**: Can an Operator successfully create a trip and upload passengers?
- [ ] **Activation**: Can a Conductor log in, see the trip, and tap 'Start Trip'?
- [ ] **GPS Tracking**: Does the backend properly log locations? 
- [ ] **Alerts Firing**: Do background workers trigger mock alerts when the bus is near a stop?
- [ ] **Heartbeat System**: If a conductor stops transmitting, does the Driver receive a web-socket alert after 2.5 minutes?
- [ ] **Takeover**: Can the Driver successfully take over the active trip?
- [ ] **Completion & Billing**: When the trip ends, does the agency balance accurately reflect the alerts sent?

## Phase 5: Final Production Readiness

- [ ] Remove `ALERT_PROVIDER=mock` and insert real provider API keys before doing live deployments in Gujarat.
- [ ] Lock down the Database VPC Security Group to only allow traffic from your backend hosting provider (e.g. AWS EC2, Render, Vercel).
