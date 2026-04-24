# Authentication Unification & Stabilization Report

## Overview
The authentication and registration flow for the Bus Alert System has been completely overhauled and unified. The user's goal was to resolve signup/login errors, combine Phone and Email input fields into a single box, manage the OTP flow smoothly, and handle the redirect logic after successful OTP verification. 

All these requirements have been successfully addressed. 

## Key Changes Made

### 1. Database Schema Updates
- The `phone` field in the `users` table is now nullable (`phone varchar(20)` instead of `not null`).
- A partial unique index was added on the `email` column, ensuring emails are unique without conflicting when users register using a phone number.
- Applied Migration `0003_nullable_phone_email_unique.sql` to apply these schema changes to the Neon Postgres database.

### 2. Backend Auth API Refactoring (`apps/backend/src/modules/auth/auth.routes.ts`)
- **Unified Identifier:** The API endpoints (`/register`, `/login`, `/send-otp`, `/verify-otp`) now accept a single `identifier` field in the JSON payload instead of separate `phone` and `email` fields.
- **Auto-Detection:** The backend uses regex to auto-detect whether the provided `identifier` is an email address or a phone number.
- **Normalization:** Phone numbers are formatted to the E.164 standard (e.g., adding `+91` if missing) so they match what is stored in the database.
- **OTP Handling:** OTPs are mapped to the normalized identifier in Redis. The endpoint safely sends the OTP to the respective channel. *In Dev mode, the OTP is returned in the API response message to assist with testing.*
- **Registration Handling:** When checking if a user exists, the logic looks for a match on either the `phone` or `email` field depending on the detected input type.
- **Audit Logs:** Integrated `auditLogs` to track significant authentication lifecycle events like "USER_LOGGED_IN", "USER_REGISTERED", "OTP_SENT", etc.

### 3. Frontend UI Updates
- **Login Page (`apps/web/src/app/login/page.tsx`):**
  - Revamped the UI to provide a clean, tabbed interface: "Sign In" vs "Create Account".
  - Created a single input box labeled **"Phone / Email"**.
  - Implemented logic that detects whether the user is typing an email or phone number in real-time.
  - Submitting "Create Account" successfully hits the `/api/auth/send-otp` backend, extracts the development OTP from the response, displays it in a toast, and redirects to the `/verify-otp` page.
- **Verify OTP Page (`apps/web/src/app/verify-otp/page.tsx`):**
  - Updated to grab the `identifier` query parameter (instead of strictly phone).
  - Implemented the 6-digit OTP input boxes.
  - Automatically redirects users to the correct dashboard (based on `ROLE_REDIRECTS`) upon successful verification.
- **Auth Store (`apps/web/src/lib/auth-store.ts`):**
  - Updated the Typescript `AuthUser` interface to make `phone` and `email` properties optional, reflecting the changes made to the database schema.

## End-to-End Test Results
Comprehensive tests were run directly against the running backend on port 3005:

1. **Email OTP Request (Success):** 
   - Requesting an OTP for `testuser@busalert.dev` successfully generated an OTP.
2. **Email OTP Verification (Success):** 
   - Submitting the OTP successfully verified the user, issued a JWT session cookie, and resolved the correct role-redirect path.
3. **Password Login via Email (Success):** 
   - Successfully authenticated `testuser@busalert.dev` with a password.
4. **Password Login via Phone (Success):** 
   - Successfully authenticated phone user `9876500099` with a password.

## How to Test Manually
1. Go to `http://localhost:3001/login` (or whatever port your frontend is currently running on).
2. Click **"Create Account"**.
3. Fill in your Name, a new Email or Phone number, and a Password.
4. Click **"Create Account & Get OTP"**.
5. A toast notification will appear showing the development OTP (e.g., `Dev OTP: 123456`).
6. You will be redirected to the `/verify-otp` page.
7. Enter the 6 digits you saw in the toast notification.
8. Click **"Verify & Continue"**. You will be successfully logged in and redirected to the appropriate dashboard!

## Conclusion
The authentication workflow is now highly robust, supporting both email and phone identities interchangeably without throwing constraints or validation errors. The system is stable and fully meets all the requirements requested.
