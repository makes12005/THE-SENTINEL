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
exports.loadEnv = loadEnv;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv = __importStar(require("dotenv"));
let loaded = false;
function uniqueExistingFiles(files) {
    const seen = new Set();
    const resolved = [];
    for (const file of files) {
        const absolute = path_1.default.resolve(file);
        if (seen.has(absolute) || !fs_1.default.existsSync(absolute))
            continue;
        seen.add(absolute);
        resolved.push(absolute);
    }
    return resolved;
}
function loadEnv() {
    if (loaded)
        return;
    const baseDirs = [
        process.cwd(),
        path_1.default.resolve(process.cwd(), '..'),
        path_1.default.resolve(__dirname, '..', '..'),
        path_1.default.resolve(__dirname, '..', '..', '..'),
    ];
    const candidates = [];
    for (const dir of baseDirs) {
        candidates.push(path_1.default.join(dir, '.env.production'), path_1.default.join(dir, '.env'), path_1.default.join(dir, '.env.local'), path_1.default.join(dir, 'apps', 'backend', '.env.production'), path_1.default.join(dir, 'apps', 'backend', '.env'), path_1.default.join(dir, 'apps', 'backend', '.env.local'));
    }
    for (const file of uniqueExistingFiles(candidates)) {
        dotenv.config({ path: file, override: true });
    }
    loaded = true;
}
