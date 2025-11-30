import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to dismiss the onboarding tour if it's visible
 */
async function dismissTour(page: Page) {
  try {
    // Wait a bit for the tour to appear (it might be animating in)
    await page.waitForTimeout(500);

    // Try multiple strategies to dismiss the tour
    // Strategy 1: Click "Skip Tour" button
    const skipButton = page.getByRole('button', { name: /skip tour/i });
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      // Wait for dialog to close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }

    // Strategy 2: Click the X close button in the dialog header
    const closeButton = page.locator('button:has([class*="lucide-x"]), button[aria-label*="close" i]').first();
    if (await closeButton.isVisible({ timeout: 2000 })) {
      await closeButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }

    // Strategy 3: Press Escape key
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 1000 })) {
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }
  } catch {
    // Tour might not be visible, which is fine - just continue
  }
}

/**
 * Helper function to sign in a user
 * Creates a test user if needed and signs them in
 */
async function signInUser(page: Page, email = 'test@example.com', password = 'password123') {
  // Check if we're already on the documents page (already signed in)
  const currentUrl = page.url();
  if (currentUrl.includes('/documents') && !currentUrl.includes('/sign-in')) {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    // Verify we can see documents content
    try {
      await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 5000 });
      return; // Already signed in
    } catch {
      // Not actually signed in, continue with sign-in flow
    }
  }

  // Navigate to sign-in page
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle' });

  // Fill sign-in form
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  // Click sign in button and wait for navigation
  await Promise.all([
    page.waitForURL('**/documents', { timeout: 15000 }).catch(() => {
      // If navigation fails, check if we need to sign up
    }),
    page.click('button[type="submit"]'),
  ]);

  // If we're still on sign-in page, try to sign up first
  if (page.url().includes('/sign-in')) {
    // Navigate to sign-up
    await page.goto('http://localhost:3000/sign-up', { waitUntil: 'networkidle' });

    // Fill sign-up form
    const nameInput = page.locator('input[id="name"]').first();
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill('Test User');
    }
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', password);

    // Submit sign-up
    await Promise.all([page.waitForURL('**/documents', { timeout: 15000 }), page.click('button[type="submit"]')]);

    // If sign-up also failed, try sign-in again (user might already exist)
    if (page.url().includes('/sign-up') || page.url().includes('/sign-in')) {
      await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle' });
      await page.fill('input[id="email"]', email);
      await page.fill('input[id="password"]', password);
      await Promise.all([page.waitForURL('**/documents', { timeout: 15000 }), page.click('button[type="submit"]')]);
    }
  }

  // Final check - ensure we're on documents page
  await page.waitForURL('**/documents', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Verify documents page content is visible
  await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 10000 });

  // Dismiss tour popup if it appears
  await dismissTour(page);
}

test.describe('Document Analysis E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should complete full document analysis flow', async ({ page }) => {
    // Step 1: Sign in
    await signInUser(page);

    // Step 2: Dismiss tour if visible (signInUser already does this, but ensure it's done)
    await dismissTour(page);

    // Step 3: Verify we're on the documents page
    await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 10000 });

    // Step 4: Upload a document (if upload functionality is available)
    const uploadTab = page.getByRole('tab', { name: /^upload$/i });
    if (await uploadTab.isVisible({ timeout: 2000 })) {
      await uploadTab.click();

      // Check if upload area is visible
      const uploadArea = page.getByText(/drag and drop/i);
      await expect(uploadArea).toBeVisible({ timeout: 5000 });
    }

    // Step 5: Navigate to document list
    const listTab = page.getByRole('tab', { name: /^my documents$/i });
    if (await listTab.isVisible({ timeout: 2000 })) {
      await listTab.click();

      // Wait for document list to load
      await page.waitForSelector('[data-testid="document-list"], .empty-state, [data-testid="empty-state"]', {
        timeout: 5000,
      });
    }

    // Step 6: If documents exist, click on one to view
    const documentCard = page.locator('[data-testid="document-card"]').first();
    if (await documentCard.isVisible({ timeout: 2000 })) {
      await documentCard.click();

      // Wait for document viewer to load
      await expect(page.getByText(/analysis/i).first()).toBeVisible({ timeout: 10000 });

      // Step 7: Test Q&A interface
      const qaInput = page.locator('textarea[placeholder*="question"], textarea[placeholder*="ask"]').first();
      if (await qaInput.isVisible({ timeout: 2000 })) {
        await qaInput.fill('What is this document about?');
        const sendButton = page
          .locator('button[type="submit"], button:has-text("Send"), button:has-text("Ask")')
          .first();
        await sendButton.click();

        // Wait for response (with timeout)
        await page.waitForSelector('.message, [data-testid="ai-response"], [data-testid="message"]', {
          timeout: 30000,
        });
      }

      // Step 8: Test summary tab
      const summaryTab = page.getByRole('tab', { name: /summary/i });
      if (await summaryTab.isVisible({ timeout: 2000 })) {
        await summaryTab.click();
        await page.waitForTimeout(2000); // Wait for summary to load
      }

      // Step 9: Test entities tab
      const entitiesTab = page.getByRole('tab', { name: /entities/i });
      if (await entitiesTab.isVisible({ timeout: 2000 })) {
        await entitiesTab.click();
        await page.waitForTimeout(2000); // Wait for entities to load
      }

      // Step 10: Test sentiment tab
      const sentimentTab = page.getByRole('tab', { name: /sentiment/i });
      if (await sentimentTab.isVisible({ timeout: 2000 })) {
        await sentimentTab.click();
        await page.waitForTimeout(2000); // Wait for sentiment to load
      }
    }
  });

  test('should handle empty document list', async ({ page }) => {
    // Sign in first
    await signInUser(page);

    // Navigate to documents page (in case we're not already there)
    await page.goto('http://localhost:3000/documents', { waitUntil: 'networkidle' });

    // Wait for page to be ready
    await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 10000 });

    // Dismiss tour popup if visible
    await dismissTour(page);

    // Click on "My Documents" tab
    const listTab = page.getByRole('tab', { name: /^my documents$/i });
    await expect(listTab).toBeVisible({ timeout: 10000 });
    await listTab.click();

    // Wait for tab content to load
    await page.waitForTimeout(1000);

    // Should show empty state - try multiple possible selectors
    const emptyState = page
      .getByText(/no documents/i)
      .or(page.getByText(/you haven't uploaded/i))
      .or(page.getByText(/get started/i))
      .or(page.locator('[data-testid="empty-state"]'))
      .first();
    await expect(emptyState).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between pages', async ({ page }) => {
    // Sign in first
    await signInUser(page);

    // Navigate to documents page
    await page.goto('http://localhost:3000/documents', { waitUntil: 'networkidle' });
    await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 10000 });

    // Dismiss tour popup if visible
    await dismissTour(page);

    // Navigate to analytics
    const analyticsLink = page.getByRole('link', { name: /analytics/i });
    if (await analyticsLink.isVisible({ timeout: 5000 })) {
      await analyticsLink.click();
      await page.waitForURL('**/analytics', { timeout: 10000 });
      await expect(page.getByText(/analytics/i).first()).toBeVisible({ timeout: 10000 });
    }

    // Navigate back to documents
    const documentsLink = page.getByRole('link', { name: /documents/i });
    if (await documentsLink.isVisible({ timeout: 5000 })) {
      await documentsLink.click();
      await page.waitForURL('**/documents', { timeout: 10000 });
      await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
