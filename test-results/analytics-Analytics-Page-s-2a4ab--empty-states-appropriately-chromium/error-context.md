# Test info

- Name: Analytics Page >> should handle empty states appropriately
- Location: /Users/Lenchman/gigeire/tests/analytics.spec.ts:174:7

# Error details

```
Error: Timed out 15000ms waiting for expect(locator).toBeVisible()

Locator: locator('h1:has-text("Analytics")')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 15000ms
  - waiting for locator('h1:has-text("Analytics")')

    at /Users/Lenchman/gigeire/tests/analytics.spec.ts:176:60
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
  115 |     }
  116 |   });
  117 |
  118 |   test('should display payment timing chart with summary stats', async ({ page }) => {
  119 |     await page.goto('/analytics');
  120 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
  121 |     
  122 |     await page.waitForTimeout(2000);
  123 |     
  124 |     // Check for Payment Timing section
  125 |     await expect(page.locator('text=Payment Timing')).toBeVisible();
  126 |     
  127 |     // Check for subtitle indicating all-time data
  128 |     await expect(page.locator('text=Based on all-time data')).toBeVisible();
  129 |     
  130 |     const paymentSection = page.locator('text=Payment Timing').locator('..').locator('..');
  131 |     
  132 |     // Check for either summary stats or empty state
  133 |     await Promise.race([
  134 |       // Look for summary statistics
  135 |       expect(paymentSection.locator('text=/Average Time to Payment/i')).toBeVisible({ timeout: 3000 }),
  136 |       // Or empty state
  137 |       expect(paymentSection.locator('text=/No payment timing data/i')).toBeVisible({ timeout: 3000 })
  138 |     ]);
  139 |     
  140 |     // If we have data, check for the chart structure
  141 |     const avgTimeText = paymentSection.locator('text=/Average Time to Payment/i').first();
  142 |     if (await avgTimeText.isVisible().catch(() => false)) {
  143 |       // Should also have longest time stat
  144 |       await expect(paymentSection.locator('text=/Longest Time to Payment/i')).toBeVisible();
  145 |       
  146 |       // Should have chart area (recharts or empty message)
  147 |       const chartArea = paymentSection.locator('.recharts-wrapper, [class*="h-["], text=/No payment timing data/').first();
  148 |       await expect(chartArea).toBeVisible();
  149 |     }
  150 |   });
  151 |
  152 |   test('should handle loading states gracefully', async ({ page }) => {
  153 |     await page.goto('/analytics');
  154 |     
  155 |     // The page might show loading states initially
  156 |     // Check that we either see loading skeletons or content appears reasonably quickly
  157 |     await Promise.race([
  158 |       // Look for skeleton loading states
  159 |       page.waitForSelector('[class*="animate-pulse"], [class*="skeleton"]', { timeout: 2000 }).catch(() => null),
  160 |       // Or actual content
  161 |       page.waitForSelector('h1:has-text("Analytics")', { timeout: 10000 }).catch(() => null)
  162 |     ]);
  163 |     
  164 |     // Eventually, the main content should be visible
  165 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
  166 |     
  167 |     // All main sections should eventually load
  168 |     await expect(page.locator('text=Booking Funnel')).toBeVisible({ timeout: 10000 });
  169 |     await expect(page.locator('text=Monthly Earnings')).toBeVisible({ timeout: 10000 });
  170 |     await expect(page.locator('text=Top Clients')).toBeVisible({ timeout: 10000 });
  171 |     await expect(page.locator('text=Payment Timing')).toBeVisible({ timeout: 10000 });
  172 |   });
  173 |
  174 |   test('should handle empty states appropriately', async ({ page }) => {
  175 |     await page.goto('/analytics');
> 176 |     await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
      |                                                            ^ Error: Timed out 15000ms waiting for expect(locator).toBeVisible()
  177 |     
  178 |     await page.waitForTimeout(3000); // Give time for data to load
  179 |     
  180 |     // Check that if there's no data, appropriate empty states are shown
  181 |     const emptyStateMessages = [
  182 |       'No booking data',
  183 |       'No paid invoices',
  184 |       'No client data',
  185 |       'No payment timing data',
  186 |       'No Analytics Data Yet' // Main empty state
  187 |     ];
  188 |     
  189 |     // At least one section should either have data or show a proper empty state
  190 |     let hasContentOrEmptyState = false;
  191 |     
  192 |     for (const message of emptyStateMessages) {
  193 |       const element = page.locator(`text*="${message}"`).first();
  194 |       if (await element.isVisible().catch(() => false)) {
  195 |         hasContentOrEmptyState = true;
  196 |         break;
  197 |       }
  198 |     }
  199 |     
  200 |     // Or check if we have actual chart content
  201 |     const rechartElements = page.locator('.recharts-wrapper').first();
  202 |     if (await rechartElements.isVisible().catch(() => false)) {
  203 |       hasContentOrEmptyState = true;
  204 |     }
  205 |     
  206 |     // Should have either content or appropriate empty states
  207 |     expect(hasContentOrEmptyState).toBeTruthy();
  208 |   });
  209 | }); 
```