const { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } = require('drizzle-orm/pg-core');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq, and } = require('drizzle-orm');
const dotenv = require('dotenv');
const path = require('path');

// Load env from apps/backend/.env or root
dotenv.config({ path: path.join(__dirname, 'apps/backend/.env.production') });
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.join(__dirname, 'apps/backend/.env') });
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

const userRoleEnum = pgEnum('role', ['admin', 'owner', 'operator', 'driver', 'conductor', 'passenger']);

const users = pgTable('users', {
    id: uuid('id').primaryKey(),
    agency_id: uuid('agency_id'),
    name: varchar('name'),
    phone: varchar('phone'),
    role: userRoleEnum('role'),
    is_active: boolean('is_active'),
});

async function run() {
    try {
        console.log('Searching for owner with phone 9825247228...');
        const ownerRows = await db.select().from(users).where(eq(users.phone, '9825247228')).limit(1);
        if (ownerRows.length === 0) {
            console.log('Owner not found!');
            process.exit(0);
        }
        const owner = ownerRows[0];
        console.log('Owner found:', owner.id, 'Agency:', owner.agency_id);

        console.log('\nOperators for this agency:');
        const operatorRows = await db.select().from(users).where(
            and(
                eq(users.agency_id, owner.agency_id),
                eq(users.role, 'operator')
            )
        );
        console.table(operatorRows);

        console.log('\nAll users (sample 10):');
        const allUsers = await db.select().from(users).limit(10);
        console.table(allUsers);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
