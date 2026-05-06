const fs = require('fs');
const path = require('path');

const FRONTEND_BASE = 'https://bus-alert-iota.vercel.app';
const PHONE = '+919876543011';
const PASSWORD = 'Test@1234';

const targets = [
  { no: 16, name: 'Operator Dashboard Loads', route: '/operator/dashboard', file: '16-dashboard.png' },
  { no: 17, name: 'Routes Page', route: '/operator/routes', file: '17-routes.png' },
  { no: 18, name: 'Trips Page', route: '/operator/trips', file: '18-trips.png' },
  { no: 19, name: 'Resources Page', route: '/operator/resources', file: '19-resources.png' },
  { no: 20, name: 'Live Monitor', route: '/operator/monitor', file: '20-monitor.png' },
  { no: 21, name: 'Logs Page', route: '/operator/logs', file: '21-logs.png' },
];

async function tryLogin(page) {
  await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  const phoneSelectors = [
    'input[name="phone"]',
    'input[name="identifier"]',
    'input[placeholder*="phone" i]',
    'input[type="tel"]',
    'input[id*="phone" i]',
    'input[type="text"]',
    'input:not([type="password"])',
  ];
  const passwordSelectors = ['input[name="password"]', 'input[type="password"]', 'input[id*="password" i]'];
  const submitSelectors = ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign in")', 'button:has-text("Continue")'];

  let phoneFilled = false;
  for (const s of phoneSelectors) {
    const el = page.locator(s).first();
    if (await el.count()) {
      await el.fill(PHONE);
      phoneFilled = true;
      break;
    }
  }
  let passFilled = false;
  for (const s of passwordSelectors) {
    const el = page.locator(s).first();
    if (await el.count()) {
      await el.fill(PASSWORD);
      passFilled = true;
      break;
    }
  }
  if (!phoneFilled) {
    const fallback = page.locator('input:not([type="password"])').first();
    if (await fallback.count()) {
      await fallback.fill(PHONE);
      phoneFilled = true;
    }
  }
  if (!passFilled) {
    const fallbackPass = page.locator('input[type="password"]').first();
    if (await fallbackPass.count()) {
      await fallbackPass.fill(PASSWORD);
      passFilled = true;
    }
  }
  if (!phoneFilled || !passFilled) return false;

  let clicked = false;
  for (const s of submitSelectors) {
    const btn = page.locator(s).first();
    if (await btn.count()) {
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}),
        btn.click(),
      ]);
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    await page.keyboard.press('Enter').catch(() => {});
  }
  await page.waitForTimeout(2500);
  const authMarkers = [
    page.getByText('LOGOUT', { exact: false }).first().isVisible().catch(() => false),
    page.getByText('Dashboard', { exact: false }).first().isVisible().catch(() => false),
    page.getByText('Trips', { exact: false }).first().isVisible().catch(() => false),
  ];
  const markerVisible = (await Promise.all(authMarkers)).some(Boolean);
  return markerVisible || !page.url().includes('/login');
}

async function hasAnyText(page, values) {
  for (const value of values) {
    if (await page.getByText(value, { exact: false }).first().isVisible().catch(() => false)) return true;
  }
  return false;
}

async function hasVisibleLocator(page, selector) {
  const locator = page.locator(selector).first();
  return locator.isVisible().catch(() => false);
}

async function assertPage(page, route) {
  if (route === '/operator/dashboard') {
    const hasKpiTitle = await hasAnyText(page, ['Active Trips', 'Total Passengers', 'Alerts Sent', 'Failed Alerts']);
    return { pass: hasKpiTitle, note: hasKpiTitle ? 'KPI labels visible' : 'KPI labels not found' };
  }
  if (route === '/operator/routes') {
    const hasHeader = await hasAnyText(page, ['Routes', 'New Route']);
    const hasRows = (await page.locator('tbody tr').count().catch(() => 0)) > 0;
    return { pass: hasHeader && hasRows, note: hasHeader && hasRows ? 'Route table visible' : 'Route table/header missing' };
  }
  if (route === '/operator/trips') {
    const hasHeader = await hasAnyText(page, ['Trips', 'Create Trip']);
    const hasRows = (await page.locator('tbody tr').count().catch(() => 0)) > 0;
    return { pass: hasHeader && hasRows, note: hasHeader && hasRows ? 'Trip table visible' : 'Trip table/header missing' };
  }
  if (route === '/operator/resources') {
    const busesTab = await hasAnyText(page, ['Buses']);
    const conductorsTab = await hasAnyText(page, ['Conductors']);
    const driversTab = await hasAnyText(page, ['Drivers']);
    const hasRows = (await page.locator('tbody tr').count().catch(() => 0)) > 0;
    const pass = busesTab && conductorsTab && driversTab && hasRows;
    return { pass, note: pass ? 'Resource tabs and rows visible' : 'Tabs or resource rows missing' };
  }
  if (route === '/operator/monitor') {
    const pass = await hasAnyText(page, ['Live Monitor', 'Active Trips']);
    return { pass, note: pass ? 'Monitor content visible' : 'Monitor labels missing' };
  }
  if (route === '/operator/logs') {
    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasHeader = pageText.includes('Alert Logs') || pageText.includes('Logs');
    const hasFilter =
      pageText.includes('All Channels') ||
      pageText.includes('All Statuses') ||
      pageText.includes('dd-mm-yyyy') ||
      pageText.includes('Date');
    return { pass: hasHeader && hasFilter, note: hasHeader && hasFilter ? 'Logs page and filters visible' : 'Logs header/filters missing' };
  }
  const fallback = await hasVisibleLocator(page, 'body');
  return { pass: fallback, note: fallback ? 'Page loaded' : 'Page not visible' };
}

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const screenshotDir = path.join(process.cwd(), 'docs', 'test-reports');
  fs.mkdirSync(screenshotDir, { recursive: true });

  const results = [];
  let currentRoute = 'login';
  const consoleErrors = {};
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const key = currentRoute || 'unknown';
      consoleErrors[key] = consoleErrors[key] || [];
      consoleErrors[key].push(msg.text());
    }
  });
  let loginAttempted = false;
  let loginOk = false;
  try {
    loginAttempted = true;
    loginOk = await tryLogin(page);
  } catch {
    loginOk = false;
  }

  for (const t of targets) {
    const url = `${FRONTEND_BASE}${t.route}`;
    let status = 'FAIL';
    let note = loginOk ? 'Route loaded' : 'Login automation failed';
    try {
      currentRoute = t.route;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      const filePath = path.join(screenshotDir, `screenshots-${t.file}`);
      await page.screenshot({ path: filePath, fullPage: true });
      if (loginOk) {
        const assertion = await assertPage(page, t.route);
        const errors = consoleErrors[t.route] || [];
        const pass = assertion.pass && errors.length === 0;
        status = pass ? 'PASS' : 'FAIL';
        note = `${assertion.note}${errors.length ? `; console_errors=${errors.length}` : ''}`;
      }
    } catch (err) {
      note = `Navigation/screenshot error: ${err.message}`;
    }
    results.push({
      no: t.no,
      test: t.name,
      status,
      route: t.route,
      screenshot: `docs/test-reports/screenshots-${t.file}`,
      note,
      consoleErrors: consoleErrors[t.route] || [],
      loginAttempted,
      loginOk,
    });
  }

  await browser.close();
  const outPath = path.join(process.cwd(), 'docs', 'test-reports', 'operator-frontend-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), loginAttempted, loginOk, results }, null, 2));
  console.log(`Saved frontend results: ${outPath}`);
}

main().catch((err) => {
  const outPath = path.join(process.cwd(), 'docs', 'test-reports', 'operator-frontend-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), fatal: err.message, results: [] }, null, 2));
  console.error(err.message);
  process.exitCode = 1;
});
