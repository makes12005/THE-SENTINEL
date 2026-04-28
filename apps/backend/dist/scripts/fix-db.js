"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("postgres"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
async function main() {
    const envPath = path_1.default.resolve('apps/backend/.env.production');
    dotenv.config({ path: envPath });
    const sql = (0, postgres_1.default)(process.env.DATABASE_URL);
    try {
        console.log('Adding invite_code column to agencies table...');
        await sql `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS invite_code varchar(20) UNIQUE`;
        console.log('Column added successfully.');
        console.log('Seeding test agency...');
        const [agency] = await sql `
      INSERT INTO agencies (name, phone, email, state, invite_code)
      VALUES ('Test Agency', '+919999999999', 'agency@test.com', 'Gujarat', 'TEST123')
      ON CONFLICT (invite_code) DO UPDATE SET name = 'Test Agency'
      RETURNING *
    `;
        console.log('Agency seeded:', agency);
    }
    catch (err) {
        console.error('Failed to add column:', err);
    }
    finally {
        await sql.end();
    }
}
main();
