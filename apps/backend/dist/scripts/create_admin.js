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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const postgres_1 = __importDefault(require("postgres"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env from the current directory
dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env.production') });
const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = (0, postgres_1.default)(dbUrl);
async function main() {
    const password = 'Maahek$1210';
    const hash = await bcryptjs_1.default.hash(password, 12);
    const user = {
        name: 'mahek',
        email: 'mahekzalavadiya123@gmail.com',
        phone: '+917778069828',
        password_hash: hash,
        role: 'admin',
        is_active: true
    };
    console.log('Attempting to create/update admin user:', user.email);
    try {
        // Check if user already exists
        const existing = await sql `SELECT id FROM users WHERE email = ${user.email} OR phone = ${user.phone}`;
        if (existing.length > 0) {
            console.log('User already exists with this email or phone. Updating role and password...');
            await sql `
        UPDATE users 
        SET role = ${user.role}, password_hash = ${user.password_hash}, name = ${user.name}
        WHERE email = ${user.email} OR phone = ${user.phone}
      `;
            console.log('User updated successfully.');
        }
        else {
            const [insertedUser] = await sql `
        INSERT INTO users (name, email, phone, password_hash, role, is_active)
        VALUES (${user.name}, ${user.email}, ${user.phone}, ${user.password_hash}, ${user.role}, ${user.is_active})
        RETURNING id
      `;
            console.log('Admin user created successfully with ID:', insertedUser.id);
        }
    }
    catch (error) {
        console.error('Error in main:', error);
    }
    finally {
        await sql.end();
    }
}
main();
