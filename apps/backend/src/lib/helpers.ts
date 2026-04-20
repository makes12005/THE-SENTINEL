import { z } from 'zod';

export function getISTTimestamp(): string {
  // Enforces all timestamps requested in JSON conform to IST (Asia/Kolkata)
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export function formatSuccessResponse<T>(data: T, metaOverrides?: any) {
  return {
    success: true,
    data,
    meta: {
      timestamp: getISTTimestamp(),
      ...metaOverrides
    }
  };
}

export function formatErrorResponse(code: string, message: string, details?: any) {
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
