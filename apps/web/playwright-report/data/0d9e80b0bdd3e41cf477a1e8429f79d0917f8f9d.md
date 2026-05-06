# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> login page loads and has basic form elements
- Location: tests\login.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('login page loads and has basic form elements', async ({ page }) => {
  4  |   // Navigate to the local app
> 5  |   await page.goto('http://localhost:3000/login');
     |              ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  6  | 
  7  |   // Verify the page title (update this based on actual title if different)
  8  |   await expect(page).toHaveTitle(/Bus Alert/i);
  9  | 
  10 |   // Check for login input fields
  11 |   const emailInput = page.locator('input[type="email"]');
  12 |   const passwordInput = page.locator('input[type="password"]');
  13 |   const loginButton = page.locator('button[type="submit"]');
  14 | 
  15 |   // Ensure elements exist
  16 |   await expect(emailInput).toBeVisible();
  17 |   await expect(passwordInput).toBeVisible();
  18 |   await expect(loginButton).toBeVisible();
  19 |   
  20 |   // Basic interaction
  21 |   await emailInput.fill('admin@busalert.com');
  22 |   await passwordInput.fill('password123');
  23 |   
  24 |   // Note: we aren't clicking submit to prevent actual login in this basic test
  25 |   // await loginButton.click();
  26 | });
  27 | 
```