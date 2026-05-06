---
name: exotel-calls
description: Alert delivery and communication system cascade for the Bus Alert System.
---

# Alert Delivery System

This skill dictates the required communication and fallback flow when notifying a passenger that their stop is approaching.

## Telephony & Tracing Standards

*   **Number Format:** All phone numbers must be formatted and stored strictly in the E.164 standard (e.g., `+91XXXXXXXXXX`).
*   **Audit Logging:** Every call attempt, SMS, and WhatsApp message must generate a log storing the precise timestamp (in IST - Asia/Kolkata) and delivery status.

## Delivery Cascade Flow

Adhere to this strict sequence when triggering a passenger alert:

1.  **Primary Strategy (Exotel):** Trigger an automated call to the passenger using the Exotel API.
2.  **Retry Strategy:** If the first call fails or goes unanswered, wait exactly 30 seconds and make a 2nd call attempt. Maximum of 2 attempts.
3.  **Fallback 1 (MSG91):** If both Exotel calls fail, dispatch a fallback SMS via MSG91.
4.  **Fallback 2 (Gupshup):** If the MSG91 SMS fails to deliver, send a message via Gupshup WhatsApp.
5.  **Fallback 3 (Manual):** If all automated methods fail, emit a realtime event (Socket.IO) to trigger a manual notification prompt for the Conductor.
