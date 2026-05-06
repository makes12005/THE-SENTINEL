import { test, expect } from '@playwright/test';

test('login page loads and has basic form elements', async ({ page }) => {
  // Navigate to the local app
  await page.goto('http://localhost:3000/login');

  // Verify the page title (update this based on actual title if different)
  await expect(page).toHaveTitle(/Bus Alert/i);

  // Check for login input fields
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const loginButton = page.locator('button[type="submit"]');

  // Ensure elements exist
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(loginButton).toBeVisible();
  
  // Basic interaction
  await emailInput.fill('admin@busalert.com');
  await passwordInput.fill('password123');
  
  // Note: we aren't clicking submit to prevent actual login in this basic test
  // await loginButton.click();
});
