"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function seedAdmin() {
    const passwordHash = await bcryptjs_1.default.hash('BusAlert@2024', 12);
    await db_1.db.insert(schema_1.users).values({
        name: 'Super Admin',
        phone: '+919999999999',
        email: 'admin@busalert.in',
        password_hash: passwordHash,
        role: 'admin',
        agency_id: null,
        is_active: true,
    });
    console.log('✅ Admin created');
    console.log('Phone: +919999999999');
    console.log('Password: BusAlert@2024');
    process.exit(0);
}
seedAdmin().catch(console.error);
