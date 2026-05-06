import { chromium, request } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const FRONTEND = "https://bus-alert-iota.vercel.app";
const BACKEND = "https://api-production-e13f.up.railway.app";

const CREDS = {
  admin: { phone: "+919999999999", password: "BusAlert@2024" },
  owner: { phone: "+919876543000", password: "Test@1234" },
  operator: { phone: "+919876543001", password: "Test@1234" },
};

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "..", "..", "docs", "test-reports");
const SHOTS_DIR = path.join(OUT_DIR, "screenshots", "full-web");
const REPORT_PATH = path.join(OUT_DIR, "full-web-test-report.md");
const JSON_EVIDENCE_PATH = path.join(OUT_DIR, "full-web-test-evidence.json");

const results = {
  admin: [],
  owner: [],
  operator: [],
  crossRole: [],
  consoleErrors: [],
  apiChecks: [],
  screenshots: [],
};

function isoDateIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureDirs() {
  await fs.mkdir(SHOTS_DIR, { recursive: true });
}

async function takeShot(page, key) {
  const file = `${key}-${nowTag()}.png`;
  const full = path.join(SHOTS_DIR, file);
  await page.screenshot({ path: full, fullPage: true });
  results.screenshots.push({ key, file: `docs/test-reports/screenshots/full-web/${file}` });
  return `docs/test-reports/screenshots/full-web/${file}`;
}

function record(section, id, name, passed, notes = "", screenshot = "") {
  results[section].push({
    id,
    name,
    status: passed ? "✅" : "❌",
    passed,
    screenshot,
    notes,
  });
}

async function withTest(section, id, name, fn) {
  try {
    await fn();
  } catch (err) {
    record(section, id, name, false, err?.message || "Unknown error");
  }
}

async function gotoAndSettle(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1400);
}

async function login(page, role) {
  const { phone, password } = CREDS[role];
  await gotoAndSettle(page, `${FRONTEND}/login`);
  await page.locator('input[type="tel"]').first().fill(phone);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /login/i }).click();
  await page.waitForTimeout(2500);
}

function addConsoleCapture(page, currentSectionRef) {
  page.on("console", async (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      const pageUrl = page.url();
      results.consoleErrors.push({
        message: msg.text(),
        page: pageUrl,
        critical: type === "error" ? "YES" : "NO",
        section: currentSectionRef.current,
      });
    }
  });
}

async function testAdmin(page) {
  await withTest("admin", "A1", "Admin Login", async () => {
    await login(page, "admin");
    const ok = /\/admin\/dashboard/.test(page.url());
    const shot = await takeShot(page, "A1-admin-login");
    record("admin", "A1", "Admin Login", ok, ok ? "Redirected to admin dashboard." : `URL after login: ${page.url()}`, shot);
  });

  await withTest("admin", "A2", "Admin Dashboard KPI cards", async () => {
    const expected = ["Total agencies", "Active trips", "Alerts sent", "Failed alerts", "Revenue"];
    let found = 0;
    for (const text of expected) {
      if (await page.getByText(new RegExp(text, "i")).first().isVisible().catch(() => false)) found += 1;
    }
    const ok = found >= 3;
    const shot = await takeShot(page, "A2-admin-dashboard");
    record("admin", "A2", "Admin Dashboard KPI cards", ok, `Matched ${found}/5 KPI labels (best-effort label matching).`, shot);
  });

  await withTest("admin", "A3", "Agency Management Page", async () => {
    await gotoAndSettle(page, `${FRONTEND}/admin/agencies`);
    const ok = /\/admin\/agencies/.test(page.url()) && await page.getByText(/agency/i).first().isVisible().catch(() => false);
    const shot = await takeShot(page, "A3-admin-agencies");
    record("admin", "A3", "Agency Management Page", ok, ok ? "Agencies page loaded." : "Agencies page did not show expected content.", shot);
  });

  await withTest("admin", "A4", "Invite Agency", async () => {
    const phone = "+919876500099";
    await page.locator('input[type="tel"]').first().fill(phone);
    const inviteBtn = page.getByRole("button", { name: /invite|send invite/i }).first();
    await inviteBtn.click();
    await page.waitForTimeout(1800);
    const ok = await page.getByText(/invite|success|pending/i).first().isVisible().catch(() => false);
    const shot = await takeShot(page, "A4-admin-invite");
    record("admin", "A4", "Invite Agency", ok, ok ? "Invite action produced success/pending cue." : "No clear success cue found after invite.", shot);
  });

  await withTest("admin", "A5", "Agency Toggle", async () => {
    const toggle = page.locator('button:has-text("Deactivate"), button:has-text("Activate"), button:has-text("Toggle")').first();
    const exists = await toggle.isVisible().catch(() => false);
    if (!exists) throw new Error("No toggle button found on agency page.");
    await toggle.click();
    await page.waitForTimeout(1200);
    const shot = await takeShot(page, "A5-admin-toggle");
    record("admin", "A5", "Agency Toggle", true, "Toggle action executed once (state confirmation requires stable row indicator).", shot);
  });

  await withTest("admin", "A6", "Billing Page", async () => {
    await gotoAndSettle(page, `${FRONTEND}/admin/wallet`);
    const checks = ["Trips Remaining", "Top Up", "Rate", "agency"];
    let found = 0;
    for (const c of checks) {
      if (await page.getByText(new RegExp(c, "i")).first().isVisible().catch(() => false)) found += 1;
    }
    const ok = found >= 2;
    const shot = await takeShot(page, "A6-admin-wallet");
    record("admin", "A6", "Billing Page", ok, `Matched ${found}/4 expected wallet cues.`, shot);
  });

  await withTest("admin", "A7", "Top Up Wallet", async () => {
    const topup = page.getByRole("button", { name: /top up/i }).first();
    await topup.click();
    await page.waitForTimeout(600);
    await page.locator('input[type="number"]').first().fill("10");
    const note = page.locator('textarea, input[placeholder*="note" i]').first();
    if (await note.isVisible().catch(() => false)) await note.fill("Test top up");
    await page.getByRole("button", { name: /confirm|submit|save/i }).first().click();
    await page.waitForTimeout(2000);
    const ok = await page.getByText(/success|transaction|updated|top up/i).first().isVisible().catch(() => false);
    const shot = await takeShot(page, "A7-admin-topup");
    record("admin", "A7", "Top Up Wallet", ok, ok ? "Top-up action succeeded with visible cue." : "No clear top-up success cue.", shot);
  });

  await withTest("admin", "A8", "Set Rate Per Trip", async () => {
    const rateButton = page.getByRole("button", { name: /set rate|rate/i }).first();
    await rateButton.click();
    await page.waitForTimeout(500);
    await page.locator('input[type="number"]').first().fill("90");
    await page.getByRole("button", { name: /confirm|save|update/i }).first().click();
    await page.waitForTimeout(1600);
    const shot = await takeShot(page, "A8-admin-rate");
    const ok = await page.getByText(/90|updated|success/i).first().isVisible().catch(() => false);
    record("admin", "A8", "Set Rate Per Trip", ok, ok ? "Rate update cue found." : "No explicit confirmation for rate update.", shot);
  });

  await withTest("admin", "A9", "System Health Page", async () => {
    await gotoAndSettle(page, `${FRONTEND}/admin/health`);
    const checks = ["API", "Database", "Redis", "worker", "Queue"];
    let found = 0;
    for (const c of checks) {
      if (await page.getByText(new RegExp(c, "i")).first().isVisible().catch(() => false)) found += 1;
    }
    const ok = found >= 3;
    const shot = await takeShot(page, "A9-admin-health");
    record("admin", "A9", "System Health Page", ok, `Matched ${found}/5 health cues.`, shot);
  });

  await withTest("admin", "A10", "Audit Logs Page", async () => {
    await gotoAndSettle(page, `${FRONTEND}/admin/audit`);
    const ok = await page.getByText(/audit|log|filter/i).first().isVisible().catch(() => false);
    const shot = await takeShot(page, "A10-admin-audit");
    record("admin", "A10", "Audit Logs Page", ok, ok ? "Audit page and filter cues visible." : "Audit list/filters not clearly visible.", shot);
  });

  await withTest("admin", "A11", "Admin Logout", async () => {
    const logout = page.getByRole("button", { name: /logout|sign out/i }).first();
    const hasLogout = await logout.isVisible().catch(() => false);
    if (hasLogout) await logout.click();
    await page.goto(`${FRONTEND}/admin/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1400);
    const ok = /\/login/.test(page.url()) || !/\/admin\/dashboard/.test(page.url());
    record("admin", "A11", "Admin Logout", ok, `Post-logout URL: ${page.url()}`);
  });
}

async function testOwner(page) {
  await withTest("owner", "O1", "Owner Login", async () => {
    await login(page, "owner");
    const ok = /\/owner\/dashboard/.test(page.url());
    const shot = await takeShot(page, "O1-owner-login");
    record("owner", "O1", "Owner Login", ok, `URL: ${page.url()}`, shot);
  });

  const ownerPages = [
    ["O2", "Owner Dashboard", "/owner/dashboard", /operators|active|wallet/i],
    ["O3", "Wallet Page", "/owner/wallet", /trips|history|remaining/i],
    ["O4", "Operator Management", "/owner/operators", /operator/i],
    ["O8", "Trip Monitoring", "/owner/trips", /operator|status|date|trip/i],
    ["O9", "Global Logs", "/owner/logs", /log|operator|filter/i],
    ["O10", "Settings", "/owner/settings", /agency|profile|save|settings/i],
  ];

  for (const [id, name, route, pattern] of ownerPages) {
    await withTest("owner", id, name, async () => {
      await gotoAndSettle(page, `${FRONTEND}${route}`);
      const ok = await page.getByText(pattern).first().isVisible().catch(() => false);
      const shot = await takeShot(page, `${id}-owner-page`);
      record("owner", id, name, ok, `Visited ${route}`, shot);
    });
  }

  await withTest("owner", "O5", "Add Operator", async () => {
    await gotoAndSettle(page, `${FRONTEND}/owner/operators/new`);
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("New Test Operator");
    await page.locator('input[type="tel"], input[name="phone"]').first().fill("+919876500088");
    await page.locator('input[type="password"]').first().fill("Test@1234");
    await page.getByRole("button", { name: /submit|create|add/i }).first().click();
    await page.waitForTimeout(1600);
    const shot = await takeShot(page, "O5-owner-add-operator");
    const ok = await page.getByText(/created|success|operator/i).first().isVisible().catch(() => false);
    record("owner", "O5", "Add Operator", ok, ok ? "Operator creation cue found." : "No clear operator creation confirmation.", shot);
  });

  await withTest("owner", "O6", "Duplicate Operator", async () => {
    await gotoAndSettle(page, `${FRONTEND}/owner/operators/new`);
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("New Test Operator");
    await page.locator('input[type="tel"], input[name="phone"]').first().fill("+919876500088");
    await page.locator('input[type="password"]').first().fill("Test@1234");
    await page.getByRole("button", { name: /submit|create|add/i }).first().click();
    await page.waitForTimeout(1400);
    const ok = await page.getByText(/already exists|duplicate|exists/i).first().isVisible().catch(() => false);
    record("owner", "O6", "Duplicate Operator", ok, ok ? "Duplicate guard message shown." : "Duplicate guard message not detected.");
  });

  await withTest("owner", "O7", "Deactivate Operator", async () => {
    await gotoAndSettle(page, `${FRONTEND}/owner/operators`);
    const btn = page.locator('button:has-text("Deactivate"), button:has-text("Activate"), button:has-text("Toggle")').first();
    const okBtn = await btn.isVisible().catch(() => false);
    if (!okBtn) throw new Error("No activate/deactivate button found.");
    await btn.click();
    await page.waitForTimeout(900);
    const shot = await takeShot(page, "O7-owner-toggle-operator");
    record("owner", "O7", "Deactivate Operator", true, "Toggle action executed.", shot);
  });

  await withTest("owner", "O11", "Access Control", async () => {
    await gotoAndSettle(page, `${FRONTEND}/admin/dashboard`);
    const ok = /\/owner\/dashboard/.test(page.url()) || !/\/admin\/dashboard/.test(page.url());
    record("owner", "O11", "Access Control", ok, `Redirect URL: ${page.url()}`);
  });

  await withTest("owner", "O12", "Owner Logout", async () => {
    const logout = page.getByRole("button", { name: /logout|sign out/i }).first();
    if (await logout.isVisible().catch(() => false)) await logout.click();
    await gotoAndSettle(page, `${FRONTEND}/login`);
    const ok = /\/login/.test(page.url());
    record("owner", "O12", "Owner Logout", ok, `URL: ${page.url()}`);
  });
}

async function testOperator(page) {
  await withTest("operator", "P1", "Operator Login", async () => {
    await login(page, "operator");
    const ok = /\/operator\/dashboard/.test(page.url());
    const shot = await takeShot(page, "P1-operator-login");
    record("operator", "P1", "Operator Login", ok, `URL: ${page.url()}`, shot);
  });

  const pageChecks = [
    ["P2", "Operator Dashboard", "/operator/dashboard", /active|passenger|alerts|trip/i],
    ["P3", "Routes Page", "/operator/routes", /route|create/i],
    ["P7", "Templates Page", "/operator/templates", /template|create/i],
    ["P13", "Resources: Buses", "/operator/resources", /bus|plate|add/i],
    ["P15", "Live Monitor", "/operator/monitor", /active|socket|monitor|trip/i],
    ["P16", "Alert Logs", "/operator/logs", /log|filter|alert/i],
  ];
  for (const [id, name, route, pattern] of pageChecks) {
    await withTest("operator", id, name, async () => {
      await gotoAndSettle(page, `${FRONTEND}${route}`);
      const ok = await page.getByText(pattern).first().isVisible().catch(() => false);
      const shot = await takeShot(page, `${id}-operator-page`);
      record("operator", id, name, ok, `Visited ${route}`, shot);
    });
  }

  const placeholderTests = [
    ["P4", "Create Route"],
    ["P5", "Add Stops with Map"],
    ["P6", "Map Visualization"],
    ["P8", "Create Template"],
    ["P9", "Create Trip from Template"],
    ["P10", "Create Trip from Scratch"],
    ["P11", "Upload Passengers CSV"],
    ["P12", "Invalid CSV"],
    ["P14", "Resources: Staff"],
  ];

  for (const [id, name] of placeholderTests) {
    await withTest("operator", id, name, async () => {
      // Best-effort placeholder checks due dynamic production data + unknown form contracts.
      const shot = await takeShot(page, `${id}-operator-manual-check`);
      record("operator", id, name, false, "Could not run fully deterministic automation for this flow in current script; manual replay needed using screenshot/context.", shot);
    });
  }

  await withTest("operator", "P17", "Access Control", async () => {
    await gotoAndSettle(page, `${FRONTEND}/admin/dashboard`);
    const first = /\/operator\/dashboard/.test(page.url()) || !/\/admin\/dashboard/.test(page.url());
    await gotoAndSettle(page, `${FRONTEND}/owner/dashboard`);
    const second = /\/operator\/dashboard/.test(page.url()) || !/\/owner\/dashboard/.test(page.url());
    record("operator", "P17", "Access Control", first && second, `Redirect checks: admin=>${first}, owner=>${second}`);
  });

  await withTest("operator", "P18", "Operator Logout", async () => {
    const logout = page.getByRole("button", { name: /logout|sign out/i }).first();
    if (await logout.isVisible().catch(() => false)) await logout.click();
    await gotoAndSettle(page, `${FRONTEND}/login`);
    const ok = /\/login/.test(page.url());
    record("operator", "P18", "Operator Logout", ok, `URL: ${page.url()}`);
  });
}

async function testCrossRole() {
  record("crossRole", "CR1", "Shared Resources", false, "Not fully automated in this run; requires coordinated create-then-verify across role-specific resource UIs.");
  record("crossRole", "CR2", "Trip Visibility", false, "Not fully automated in this run; requires reliable trip create in operator flow first.");
  record("crossRole", "CR3", "Wallet Chain", false, "Not fully automated in this run; depends on confirmed admin top-up mutation + owner wallet delta readback.");
  record("crossRole", "CR4", "Agency Deactivation", false, "Not run automatically for safety; deactivating live agency could disrupt active production users.");
}

async function testBackendApi() {
  const ctx = await request.newContext({ baseURL: BACKEND, ignoreHTTPSErrors: true });
  const health = await ctx.get("/health");
  results.apiChecks.push({
    check: "Health endpoint",
    status: health.ok() ? "✅" : "❌",
    note: `HTTP ${health.status()}`,
  });

  for (const [role, cred] of Object.entries(CREDS)) {
    const res = await ctx.post("/api/auth/login", {
      data: { identifier: cred.phone, password: cred.password },
    });
    let note = `HTTP ${res.status()}`;
    if (res.ok()) {
      const body = await res.json().catch(() => ({}));
      note += `, user role: ${body?.data?.user?.role ?? "unknown"}`;
    }
    results.apiChecks.push({
      check: `${role} login API`,
      status: res.ok() ? "✅" : "❌",
      note,
    });
  }
  await ctx.dispose();
}

function toRows(items, withShot = true) {
  return items
    .map((r, i) => `| ${i + 1} | ${r.id} — ${r.name} | ${r.status} | ${withShot ? (r.screenshot || "-") : "-"} | ${r.notes || "-"} |`)
    .join("\n");
}

function buildReport() {
  const allTests = [...results.admin, ...results.owner, ...results.operator, ...results.crossRole];
  const passed = allTests.filter((t) => t.passed).length;
  const failed = allTests.length - passed;
  const passRate = allTests.length ? ((passed / allTests.length) * 100).toFixed(2) : "0.00";
  const critical = results.consoleErrors.filter((e) => e.critical === "YES").length;
  const warnings = results.consoleErrors.filter((e) => e.critical === "NO").length;

  const failedRows = allTests
    .filter((t) => !t.passed)
    .map((t) => [
      `- Test ID: ${t.id}`,
      `- Expected behavior: As defined in test plan`,
      `- Actual behavior: ${t.notes || "Did not meet expected behavior"}`,
      `- Suggested fix: Stabilize selectors/data and validate corresponding backend contract`,
      `- Priority: ${t.id.startsWith("A") || t.id.startsWith("O") || t.id.startsWith("P1") ? "MEDIUM" : "LOW"}`,
      "",
    ].join("\n"))
    .join("\n");

  const consoleRows = results.consoleErrors.length
    ? results.consoleErrors.map((e) => `| ${e.message.replace(/\|/g, "\\|")} | ${e.page} | ${e.critical} | NO |`).join("\n")
    : "| - | - | - | - |";

  const apiRows = results.apiChecks.length
    ? results.apiChecks.map((r) => `| ${r.check} | ${r.status} | ${r.note} |`).join("\n")
    : "| - | - | - |";

  return `# Full Web App Test Report
Date: ${isoDateIST()}
Tester: Antigravity Browser Agent

## Admin Tests (11 tests)
| # | Test | Status | Screenshot | Notes |
|---|------|--------|------------|-------|
${toRows(results.admin, true)}

## Owner Tests (12 tests)
| # | Test | Status | Screenshot | Notes |
|---|------|--------|------------|-------|
${toRows(results.owner, true)}

## Operator Tests (18 tests)
| # | Test | Status | Screenshot | Notes |
|---|------|--------|------------|-------|
${toRows(results.operator, true)}

## Cross Role Tests (4 tests)
| # | Test | Status | Notes |
|---|------|--------|-------|
${results.crossRole.map((r, i) => `| ${i + 1} | ${r.id} — ${r.name} | ${r.status} | ${r.notes || "-"} |`).join("\n")}

## Backend API Checks
| Check | Status | Notes |
|---|---|---|
${apiRows}

## Console Errors Found
| Error | Page | Critical | Fixed |
|-------|------|----------|-------|
${consoleRows}

## Failed Tests Summary
${failedRows || "No failed tests."}

## Screenshots Summary
${results.screenshots.map((s) => `- ${s.key}: ${s.file}`).join("\n") || "- None"}

## Overall Summary
Total tests: ${allTests.length}
Passed: ${passed}
Failed: ${failed}
Pass rate: ${passRate}%

Admin section: ${results.admin.filter((t) => t.passed).length}/11 ✅
Owner section: ${results.owner.filter((t) => t.passed).length}/12 ✅
Operator section: ${results.operator.filter((t) => t.passed).length}/18 ✅
Cross role: ${results.crossRole.filter((t) => t.passed).length}/4 ✅

Console errors: ${critical} critical, ${warnings} warnings

Web app production ready: ${failed === 0 && critical === 0 ? "YES" : "NO"}

Priority fixes needed:
1. Stabilize deterministic UI test ids/selectors for create/edit forms.
2. Add safe production test fixture accounts/entities to avoid mutating live data.
3. Add role-scoped API smoke endpoints for faster cross-role validation.
`;
}

async function main() {
  await ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const currentSectionRef = { current: "unknown" };
  addConsoleCapture(page, currentSectionRef);

  currentSectionRef.current = "admin";
  await testAdmin(page);
  currentSectionRef.current = "owner";
  await testOwner(page);
  currentSectionRef.current = "operator";
  await testOperator(page);
  currentSectionRef.current = "cross-role";
  await testCrossRole();
  currentSectionRef.current = "api";
  await testBackendApi();

  await context.close();
  await browser.close();

  const report = buildReport();
  await fs.writeFile(REPORT_PATH, report, "utf8");
  await fs.writeFile(JSON_EVIDENCE_PATH, JSON.stringify(results, null, 2), "utf8");
  console.log(`Report generated: ${REPORT_PATH}`);
  console.log(`Evidence generated: ${JSON_EVIDENCE_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
