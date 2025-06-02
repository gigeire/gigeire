# Analytics Page Tests

This directory contains Playwright end-to-end tests for the Analytics page functionality.

## Quick Start

1. **Start the development server**:
   ```bash
   npm run dev
   ```
   Note the port number (usually 3000, 3001, or 3002)

2. **Run the tests**:
   ```bash
   # If running on port 3000 (default)
   npm run test:analytics

   # If running on a different port (e.g., 3001)
   PORT=3001 npm run test:analytics
   ```

3. **Watch tests run with UI**:
   ```bash
   npm run test:ui
   ```

## Test Coverage

### Current Tests (`analytics.spec.ts`)

1. **Page Structure**: Verifies the analytics page loads with proper title and navigation
2. **Summary Cards**: Checks that all four financial metric cards are displayed (Total Invoiced, Total Paid, Average Gig Value, Active Gigs)
3. **Booking Funnel**: Tests the booking funnel chart with year toggle functionality
4. **Monthly Earnings**: Verifies monthly earnings chart with year filtering
5. **Top Clients Table**: Checks the client table structure and sorting
6. **Payment Timing**: Tests payment delay chart with summary statistics
7. **Loading States**: Ensures graceful handling of loading states
8. **Empty States**: Verifies appropriate empty state messages when no data is available

## Running Tests

```bash
# Run all analytics tests (default port 3000)
npm run test:analytics

# Run with specific port
PORT=3001 npm run test:analytics

# Run tests with UI (interactive mode)
npm run test:ui

# Run all tests
npm run test

# Run single test
npx playwright test -g "should load analytics page"

# Run in headed mode (see browser)
npx playwright test --headed
```

## Authentication

Tests use a flexible authentication helper (`helpers/auth.ts`) that:
- Attempts to access pages directly first
- Falls back to login if needed
- Uses environment variables for credentials when available
- Gracefully handles different auth states

## Environment Variables

Optional environment variables for better test reliability:
- `PORT`: Development server port (default: 3000)
- `TEST_EMAIL`: Email for test login
- `TEST_PASSWORD`: Password for test login

## Troubleshooting

### "net::ERR_ABORTED" or connection errors
- Make sure `npm run dev` is running
- Check the port number and set `PORT` environment variable if needed
- Verify the app loads in your browser first

### Authentication issues
- Tests will attempt to access analytics directly
- If login is required, ensure your test credentials work manually
- Set `TEST_EMAIL` and `TEST_PASSWORD` environment variables

### Tests timeout or fail
- Increase timeouts if your development environment is slow
- Check browser developer tools for JavaScript errors
- Run tests in headed mode to see what's happening: `npx playwright test --headed`

## Test Philosophy

These tests focus on **structure and visibility** rather than specific data values:
- ✅ Chart components render
- ✅ Toggle buttons work
- ✅ Tables have proper headers
- ✅ Empty states are handled
- ❌ Specific monetary amounts
- ❌ Exact data calculations

This approach ensures tests remain stable while the business logic evolves. 