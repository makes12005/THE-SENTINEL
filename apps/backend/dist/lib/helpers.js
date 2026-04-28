"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getISTTimestamp = getISTTimestamp;
exports.formatSuccessResponse = formatSuccessResponse;
exports.formatErrorResponse = formatErrorResponse;
function getISTTimestamp() {
    // Enforces all timestamps requested in JSON conform to IST (Asia/Kolkata)
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
function formatSuccessResponse(data, metaOverrides) {
    return {
        success: true,
        data,
        meta: {
            timestamp: getISTTimestamp(),
            ...metaOverrides
        }
    };
}
function formatErrorResponse(code, message, details) {
    return {
        success: false,
        error: {
            code,
            message,
            details
        },
        meta: {
            timestamp: getISTTimestamp()
        }
    };
}
