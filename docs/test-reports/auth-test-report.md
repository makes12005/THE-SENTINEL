# Auth System Test Report

**Date:** 24 April 2026 at 01:41 pm (IST)  
**Backend:** https://api-production-e13f.up.railway.app  
**Test Mode:** Email + Redis OTP

## Results

| Test  | Description             | Status | Notes |
|-------|-------------------------|--------|-------|
| 1     | Email OTP Signup       | ❌   | send-otp failed: HTTP 404 — {"message":"Route POST:/api/auth/send-otp  |
| 2     | Login Password         | ❌   | HTTP 400 — {"success":false,"error":{"code":"VALIDATION_ERROR","messag |
| 3     | Login OTP              | ❌   | send-otp failed: {"message":"Route POST:/api/auth/send-otp not found", |
| 4     | Token Refresh          | ⚠️   | No refresh_token available — TEST 2 must pass first |
| 5     | Logout Blacklist       | ⚠️   | No access_token — previous tests must pass |
| 6     | Agency Invite          | ⚠️   | No agencies in DB — seed one first. Skipping. |
| 7     | Rate Limiting          | ❌   | Never got 429 after 6 OTP requests |
| 8     | Invalid OTP            | ❌   | Expected 401/400 but got HTTP 404: {"message":"Route POST:/api/auth/ve |
| 9     | Real Phone OTP         | ⚠️   | Skipped — use --phone flag to enable |
| 10    | Cleanup                | ✅   | 0 test users removed |

## Failed Tests

### Test 1 — Email OTP Signup
- **Error**: send-otp failed: HTTP 404 — {"message":"Route POST:/api/auth/send-otp not found","error":"Not Found","statusCode":404}

### Test 2 — Login Password
- **Error**: HTTP 400 — {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Invalid login payload","details":{"_errors":[],"phone":{"_errors":["Required"]}}}}

### Test 3 — Login OTP
- **Error**: send-otp failed: {"message":"Route POST:/api/auth/send-otp not found","error":"Not Found","statusCode":404}

### Test 7 — Rate Limiting
- **Error**: Never got 429 after 6 OTP requests

### Test 8 — Invalid OTP
- **Error**: Expected 401/400 but got HTTP 404: {"message":"Route POST:/api/auth/verify-otp not found","error":"Not Found","statusCode":404}

## Summary

| Metric   | Count |
|----------|-------|
| Total    | 10  |
| Passed   | 1  |
| Warnings | 4  |
| Failed   | 5  |

**Ready for production:** NO ❌

## Notes

- OTP read directly from Upstash Redis REST API — bypasses actual SMS/email delivery for speed
- To test real SMS delivery: `npx tsx apps/backend/src/scripts/auth-test.ts --phone`
- Rate limit: 5 OTP requests per identifier per hour (enforced in Redis)
- Refresh tokens are rotated on each use (one-time use)
- Access tokens are blacklisted in Redis on logout
