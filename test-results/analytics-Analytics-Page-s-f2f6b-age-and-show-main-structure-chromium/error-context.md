# Test info

- Name: Analytics Page >> should load analytics page and show main structure
- Location: /Users/Lenchman/gigeire/tests/analytics.spec.ts:9:7

# Error details

```
Error: Timed out 15000ms waiting for expect(locator).toBeVisible()

Locator: locator('h1:has-text("Analytics")')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 15000ms
  - waiting for locator('h1:has-text("Analytics")')

    at /Users/Lenchman/gigeire/tests/analytics.spec.ts:14:60
```

# Page snapshot

```yaml
- alert
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- button "Collapse issues badge":
  - img
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/1
  - button "next" [disabled]:
    - img "next"
- img
- img
- text: Next.js 15.3.2 Turbopack
- img
- dialog "Runtime Error":
  - text: Runtime Error
  - button "Copy Stack Trace":
    - img
  - button "No related documentation found" [disabled]:
    - img
  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools":
    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
    - img
  - paragraph: "Error: Cannot find module '../chunks/ssr/[turbopack]_runtime.js' Require stack: - /Users/Lenchman/gigeire/.next/server/pages/_document.js - /Users/Lenchman/gigeire/node_modules/next/dist/server/require.js - /Users/Lenchman/gigeire/node_modules/next/dist/server/load-components.js - /Users/Lenchman/gigeire/node_modules/next/dist/build/utils.js - /Users/Lenchman/gigeire/node_modules/next/dist/build/swc/options.js - /Users/Lenchman/gigeire/node_modules/next/dist/build/swc/index.js - /Users/Lenchman/gigeire/node_modules/next/dist/build/next-config-ts/transpile-config.js - /Users/Lenchman/gigeire/node_modules/next/dist/server/config.js - /Users/Lenchman/gigeire/node_modules/next/dist/server/next.js - /Users/Lenchman/gigeire/node_modules/next/dist/server/lib/start-server.js"
  - button "Show More"
  - paragraph: Call Stack 47
  - button "Show 46 ignore-listed frame(s)":
    - text: Show 46 ignore-listed frame(s)
    - img
  - text: Object.<anonymous> .next/server/pages/_document.js (2:17)
- contentinfo:
  - paragraph: This error happened while generating the page. Any console logs will be displayed in the terminal window.
  - region "Error feedback":
    - paragraph:
      - link "Was this helpful?":
        - /url: https://nextjs.org/telemetry#error-feedback
    - button "Mark as helpful"
    - button "Mark as not helpful"
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import { skipAuthIfPossible } from './helpers/auth';
   3 |
   4 | test.describe('Analytics Page', () => {
   5 |   test.beforeEach(async ({ page }) => {
   6 |     await skipAuthIfPossible(page);
   7 |   });
   8 |
   9 |   test('should load analytics page and show main structure', async ({ page }) => {
   10 |     // Navigate to analytics page
   11 |     await page.goto('/analytics');
   12 |     
   13 |     // Wait for the page to load - check for the main title
>  14 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
      |                                                            ^ Error: Timed out 15000ms waiting for expect(locator).toBeVisible()
   15 |     
   16 |     // Check that the main navigation is present
   17 |     const mainNav = page.locator('nav, [role="navigation"], text=Dashboard').first();
   18 |     await expect(mainNav).toBeVisible({ timeout: 5000 });
   19 |   });
   20 |
   21 |   test('should display summary cards with financial metrics', async ({ page }) => {
   22 |     await page.goto('/analytics');
   23 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
   24 |     
   25 |     // Check for the four main summary cards
   26 |     await expect(page.locator('text=Total Invoiced')).toBeVisible();
   27 |     await expect(page.locator('text=Total Paid')).toBeVisible();
   28 |     await expect(page.locator('text=Average Gig Value')).toBeVisible();
   29 |     await expect(page.locator('text=Active Gigs')).toBeVisible();
   30 |     
   31 |     // Check that the cards show monetary values (€ symbol)
   32 |     const euroSymbols = page.locator('text=/€[0-9,]+/');
   33 |     await expect(euroSymbols.first()).toBeVisible({ timeout: 5000 });
   34 |   });
   35 |
   36 |   test('should display booking funnel chart with year toggles', async ({ page }) => {
   37 |     await page.goto('/analytics');
   38 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
   39 |     
   40 |     // Wait for charts section to load
   41 |     await page.waitForTimeout(2000);
   42 |     
   43 |     // Check for Booking Funnel section
   44 |     await expect(page.locator('text=Booking Funnel')).toBeVisible();
   45 |     
   46 |     // Check for year toggle buttons
   47 |     const thisYearButton = page.locator('button:has-text("This Year")').first();
   48 |     const lastYearButton = page.locator('button:has-text("Last Year")').first();
   49 |     
   50 |     await expect(thisYearButton).toBeVisible();
   51 |     await expect(lastYearButton).toBeVisible();
   52 |     
   53 |     // Check that one of the buttons is selected (default state)
   54 |     const activeButton = page.locator('button:has-text("This Year"), button:has-text("Last Year")').first();
   55 |     await expect(activeButton).toBeVisible();
   56 |     
   57 |     // Test year toggle functionality
   58 |     await lastYearButton.click();
   59 |     await page.waitForTimeout(500); // Give time for any data updates
   60 |     
   61 |     await thisYearButton.click();
   62 |     await page.waitForTimeout(500);
   63 |   });
   64 |
   65 |   test('should display monthly earnings chart with year toggles', async ({ page }) => {
   66 |     await page.goto('/analytics');
   67 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
   68 |     
   69 |     await page.waitForTimeout(2000);
   70 |     
   71 |     // Check for Monthly Earnings section
   72 |     await expect(page.locator('text=Monthly Earnings')).toBeVisible();
   73 |     
   74 |     // Check for year toggle buttons in Monthly Earnings section
   75 |     const earningsSection = page.locator('text=Monthly Earnings').locator('..').locator('..');
   76 |     const thisYearBtn = earningsSection.locator('button:has-text("This Year")');
   77 |     const lastYearBtn = earningsSection.locator('button:has-text("Last Year")');
   78 |     
   79 |     await expect(thisYearBtn).toBeVisible();
   80 |     await expect(lastYearBtn).toBeVisible();
   81 |     
   82 |     // Test that the chart area is present (either with data or empty state)
   83 |     const chartContainer = earningsSection.locator('[class*="h-["], .recharts-wrapper, text=/No paid invoices/').first();
   84 |     await expect(chartContainer).toBeVisible({ timeout: 5000 });
   85 |   });
   86 |
   87 |   test('should display top clients table with proper structure', async ({ page }) => {
   88 |     await page.goto('/analytics');
   89 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
   90 |     
   91 |     await page.waitForTimeout(2000);
   92 |     
   93 |     // Check for Top Clients section
   94 |     await expect(page.locator('text=Top Clients')).toBeVisible();
   95 |     
   96 |     // Check for subtitle indicating all-time data
   97 |     await expect(page.locator('text=Based on all-time data')).toBeVisible();
   98 |     
   99 |     // Check for table structure or empty state
  100 |     const topClientsSection = page.locator('text=Top Clients').locator('..').locator('..');
  101 |     
  102 |     // Either we have a table with headers or an empty state message
  103 |     await Promise.race([
  104 |       expect(topClientsSection.locator('th:has-text("Client Name"), text=Client Name')).toBeVisible({ timeout: 3000 }),
  105 |       expect(topClientsSection.locator('text=/No client data/i')).toBeVisible({ timeout: 3000 })
  106 |     ]);
  107 |     
  108 |     // If table is present, check for all expected columns
  109 |     const clientNameHeader = topClientsSection.locator('th:has-text("Client Name"), text=Client Name').first();
  110 |     if (await clientNameHeader.isVisible().catch(() => false)) {
  111 |       await expect(topClientsSection.locator('text=Gigs, th:has-text("Gigs")')).toBeVisible();
  112 |       await expect(topClientsSection.locator('text=Total Invoiced, th:has-text("Total Invoiced")')).toBeVisible();
  113 |       await expect(topClientsSection.locator('text=Total Paid, th:has-text("Total Paid")')).toBeVisible();
  114 |       await expect(topClientsSection.locator('text=Avg Payment Time, th:has-text("Avg Payment Time")')).toBeVisible();
```