# AWS RDS PostgreSQL Setup Guide

Follow this guide to securely provision, configure, and prepare your AWS RDS PostgreSQL database for the Bus Alert system.

## Step 1: Create the RDS Database Instance

1. Log into your AWS Console and navigate to **RDS**.
2. Make sure you are in the correct region (e.g., **ap-south-1** for Mumbai).
3. Click "Create database".
4. Choose **Standard create**.
5. Select **PostgreSQL**.
6. Select **Templates**: Choose **Production** or **Free tier** depending on your immediate need.
7. Under **Settings**:
   - **DB instance identifier**: `busalert-prod-db` (or any preferred name).
   - **Master username**: `postgres`
   - **Master password**: Choose a strong password and save it securely.
8. Under **Instance configuration**: For initial testing, `db.t3.micro` is sufficient. You can scale it later.
9. Under **Storage**: 20 GiB is sufficient. Enable Storage Autoscaling if desired.
10. Under **Connectivity**:
    - **Public access**: Choose **Yes** ONLY if you need to connect from your local machine. If you are deploying the backend on AWS as well, choose No and use VPC pairing or security groups. (For manual local testing against this DB, you must choose Yes).
    - **VPC security group (firewall)**: Create new. Name it `busalert-db-sg`.
11. Scroll to the bottom and click **Create database**. This may take 5-10 minutes.

## Step 2: Configure Security Groups (To allow local connection)

1. Once the database is "Available", click on the DB identifier to open its configuration.
2. In the "Connectivity & security" tab, look under Security and click the active **VPC security group**.
3. In the EC2 Security Groups panel, select the security group and go to the **Inbound rules** tab.
4. Click **Edit inbound rules**.
5. Add a rule: 
   - Type: **PostgreSQL**
   - Port Range: **5432**
   - Source: **My IP** (This allows only your computer to access the database directly).
6. Click **Save rules**.

## Step 3: Connect and Setup PostGIS

PostGIS is required for handling location and coordinate data correctly in the database.

1. Once you have the database endpoint (found in the "Connectivity & security" tab), form your connection string:
   `postgresql://postgres:<YOUR_PASSWORD>@<YOUR_ENDPOINT>:5432/postgres`
2. Connect to the database using an SQL client like pgAdmin, DBeaver, or psql via terminal:
   ```bash
   psql -h <YOUR_ENDPOINT> -U postgres -d postgres
   ```
3. Run the following command in the SQL prompt to enable PostGIS:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Verify the extension is installed:
   ```sql
   SELECT PostGIS_Version();
   ```

## Step 4: Run Application Migrations

1. Now, populate your `.env` (or `.env.production`) file in `apps/backend/` with the connection string.
   ```
   DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@<YOUR_ENDPOINT>:5432/postgres
   ```
2. Navigate to your project folder locally and run the Drizzle migration push:
   ```bash
   pnpm --filter backend db:push
   ```
3. Open your SQL client and verify that all tables have been created successfully: `agencies`, `users`, `trips`, etc.

Your AWS RDS database is now fully configured and ready for the application to interact with it!
