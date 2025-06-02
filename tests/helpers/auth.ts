import { Page } from '@playwright/test';

export async function skipAuthIfPossible(page: Page) {
  // Try to navigate directly to analytics first
  await page.goto('/analytics');
  
  // Wait a moment to see if we get redirected to login
  await page.waitForTimeout(1000);
  
  // Check if we're already authenticated by looking for the analytics page
  const analyticsTitle = page.locator('h1:has-text("Analytics")');
  if (await analyticsTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
    return; // Already authenticated
  }
  
  // If not authenticated, try to handle login gracefully
  await handleLogin(page);
}

async function handleLogin(page: Page) {
  // Navigate to root and wait for redirect behavior
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  // Check for various possible login states
  const currentUrl = page.url();
  
  // If we're on a login page, try to find credentials in environment or use defaults
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Use environment variables if available, otherwise skip
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'password123';
    
    await emailInput.fill(testEmail);
    
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill(testPassword);
    
    // Find and click login button
    const loginBtn = page.locator(
      'button:has-text("Login"), button:has-text("Sign In"), button:has-text("Continue"), button[type="submit"]'
    ).first();
    
    if (await loginBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loginBtn.click();
      
      // Wait for login to complete
      await page.waitForTimeout(3000);
    }
  }
  
  // Try to navigate to analytics regardless of login state
  await page.goto('/analytics');
} 