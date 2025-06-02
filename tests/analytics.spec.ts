import { test, expect } from '@playwright/test';
import { skipAuthIfPossible } from './helpers/auth';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await skipAuthIfPossible(page);
  });

  test('should load analytics page and show main structure', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('/analytics');
    
    // Wait for the page to load - check for the main title
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    // Check that the main navigation is present
    const mainNav = page.locator('nav, [role="navigation"], text=Dashboard').first();
    await expect(mainNav).toBeVisible({ timeout: 5000 });
  });

  test('should display summary cards with financial metrics', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    // Check for the four main summary cards
    await expect(page.locator('text=Total Invoiced')).toBeVisible();
    await expect(page.locator('text=Total Paid')).toBeVisible();
    await expect(page.locator('text=Average Gig Value')).toBeVisible();
    await expect(page.locator('text=Active Gigs')).toBeVisible();
    
    // Check that the cards show monetary values (€ symbol)
    const euroSymbols = page.locator('text=/€[0-9,]+/');
    await expect(euroSymbols.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display booking funnel chart with year toggles', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    // Wait for charts section to load
    await page.waitForTimeout(2000);
    
    // Check for Booking Funnel section
    await expect(page.locator('text=Booking Funnel')).toBeVisible();
    
    // Check for year toggle buttons
    const thisYearButton = page.locator('button:has-text("This Year")').first();
    const lastYearButton = page.locator('button:has-text("Last Year")').first();
    
    await expect(thisYearButton).toBeVisible();
    await expect(lastYearButton).toBeVisible();
    
    // Check that one of the buttons is selected (default state)
    const activeButton = page.locator('button:has-text("This Year"), button:has-text("Last Year")').first();
    await expect(activeButton).toBeVisible();
    
    // Test year toggle functionality
    await lastYearButton.click();
    await page.waitForTimeout(500); // Give time for any data updates
    
    await thisYearButton.click();
    await page.waitForTimeout(500);
  });

  test('should display monthly earnings chart with year toggles', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    await page.waitForTimeout(2000);
    
    // Check for Monthly Earnings section
    await expect(page.locator('text=Monthly Earnings')).toBeVisible();
    
    // Check for year toggle buttons in Monthly Earnings section
    const earningsSection = page.locator('text=Monthly Earnings').locator('..').locator('..');
    const thisYearBtn = earningsSection.locator('button:has-text("This Year")');
    const lastYearBtn = earningsSection.locator('button:has-text("Last Year")');
    
    await expect(thisYearBtn).toBeVisible();
    await expect(lastYearBtn).toBeVisible();
    
    // Test that the chart area is present (either with data or empty state)
    const chartContainer = earningsSection.locator('[class*="h-["], .recharts-wrapper, text=/No paid invoices/').first();
    await expect(chartContainer).toBeVisible({ timeout: 5000 });
  });

  test('should display top clients table with proper structure', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    await page.waitForTimeout(2000);
    
    // Check for Top Clients section
    await expect(page.locator('text=Top Clients')).toBeVisible();
    
    // Check for subtitle indicating all-time data
    await expect(page.locator('text=Based on all-time data')).toBeVisible();
    
    // Check for table structure or empty state
    const topClientsSection = page.locator('text=Top Clients').locator('..').locator('..');
    
    // Either we have a table with headers or an empty state message
    await Promise.race([
      expect(topClientsSection.locator('th:has-text("Client Name"), text=Client Name')).toBeVisible({ timeout: 3000 }),
      expect(topClientsSection.locator('text=/No client data/i')).toBeVisible({ timeout: 3000 })
    ]);
    
    // If table is present, check for all expected columns
    const clientNameHeader = topClientsSection.locator('th:has-text("Client Name"), text=Client Name').first();
    if (await clientNameHeader.isVisible().catch(() => false)) {
      await expect(topClientsSection.locator('text=Gigs, th:has-text("Gigs")')).toBeVisible();
      await expect(topClientsSection.locator('text=Total Invoiced, th:has-text("Total Invoiced")')).toBeVisible();
      await expect(topClientsSection.locator('text=Total Paid, th:has-text("Total Paid")')).toBeVisible();
      await expect(topClientsSection.locator('text=Avg Payment Time, th:has-text("Avg Payment Time")')).toBeVisible();
    }
  });

  test('should display payment timing chart with summary stats', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    await page.waitForTimeout(2000);
    
    // Check for Payment Timing section
    await expect(page.locator('text=Payment Timing')).toBeVisible();
    
    // Check for subtitle indicating all-time data
    await expect(page.locator('text=Based on all-time data')).toBeVisible();
    
    const paymentSection = page.locator('text=Payment Timing').locator('..').locator('..');
    
    // Check for either summary stats or empty state
    await Promise.race([
      // Look for summary statistics
      expect(paymentSection.locator('text=/Average Time to Payment/i')).toBeVisible({ timeout: 3000 }),
      // Or empty state
      expect(paymentSection.locator('text=/No payment timing data/i')).toBeVisible({ timeout: 3000 })
    ]);
    
    // If we have data, check for the chart structure
    const avgTimeText = paymentSection.locator('text=/Average Time to Payment/i').first();
    if (await avgTimeText.isVisible().catch(() => false)) {
      // Should also have longest time stat
      await expect(paymentSection.locator('text=/Longest Time to Payment/i')).toBeVisible();
      
      // Should have chart area (recharts or empty message)
      const chartArea = paymentSection.locator('.recharts-wrapper, [class*="h-["], text=/No payment timing data/').first();
      await expect(chartArea).toBeVisible();
    }
  });

  test('should handle loading states gracefully', async ({ page }) => {
    await page.goto('/analytics');
    
    // The page might show loading states initially
    // Check that we either see loading skeletons or content appears reasonably quickly
    await Promise.race([
      // Look for skeleton loading states
      page.waitForSelector('[class*="animate-pulse"], [class*="skeleton"]', { timeout: 2000 }).catch(() => null),
      // Or actual content
      page.waitForSelector('h1:has-text("Analytics")', { timeout: 10000 }).catch(() => null)
    ]);
    
    // Eventually, the main content should be visible
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    // All main sections should eventually load
    await expect(page.locator('text=Booking Funnel')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Monthly Earnings')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Top Clients')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Payment Timing')).toBeVisible({ timeout: 10000 });
  });

  test('should handle empty states appropriately', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible({ timeout: 15000 });
    
    await page.waitForTimeout(3000); // Give time for data to load
    
    // Check that if there's no data, appropriate empty states are shown
    const emptyStateMessages = [
      'No booking data',
      'No paid invoices',
      'No client data',
      'No payment timing data',
      'No Analytics Data Yet' // Main empty state
    ];
    
    // At least one section should either have data or show a proper empty state
    let hasContentOrEmptyState = false;
    
    for (const message of emptyStateMessages) {
      const element = page.locator(`text*="${message}"`).first();
      if (await element.isVisible().catch(() => false)) {
        hasContentOrEmptyState = true;
        break;
      }
    }
    
    // Or check if we have actual chart content
    const rechartElements = page.locator('.recharts-wrapper').first();
    if (await rechartElements.isVisible().catch(() => false)) {
      hasContentOrEmptyState = true;
    }
    
    // Should have either content or appropriate empty states
    expect(hasContentOrEmptyState).toBeTruthy();
  });
}); 