import { test, expect } from '@playwright/test';

test.describe('Public Page Routes', () => {
  test('should load the home page at /', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Catalyser/);
    await expect(page.getByText('Know the True')).toBeVisible();
  });

  test('should load the about page at /about', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('About');
    await expect(page.getByText('Catalyser is the leading catalytic converter pricing platform')).toBeVisible();
    await expect(page.getByText('How It Works')).toBeVisible();
    await expect(page.getByText('Our AI Assistant')).toBeVisible();
  });

  test('should load the contact page at /contact', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact');
    await expect(page.getByText('support@catalyser.com')).toBeVisible();
    await expect(page.getByText('+1 (555) 123-4567')).toBeVisible();
    await expect(page.getByText('Send a Message')).toBeVisible();
  });

  test('should load the terms page at /terms', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Terms of');
    await expect(page.getByText('1. Acceptance of Terms')).toBeVisible();
    await expect(page.getByText('2. Description of Service')).toBeVisible();
  });

  test('should load the privacy page at /privacy', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy');
    await expect(page.getByText('1. Information We Collect')).toBeVisible();
    await expect(page.getByText('2. How We Use Your Information')).toBeVisible();
  });

  test('should load the catalogue page at /catalogue', async ({ page }) => {
    // Mock APIs so the page loads without a real backend
    await page.route('**/api/v1/converters?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { data: [], page: 1, limit: 24, hasMore: false },
        }),
      });
    });
    await page.route('**/api/v1/converters/brands', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/catalogue');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Catalogue');
  });

  test('should load the pricing section on the home page', async ({ page }) => {
    // /pricing has no dedicated route; the pricing section lives on the home page at #pricing
    await page.goto('/');
    const pricingSection = page.locator('#pricing');
    await expect(pricingSection).toBeVisible();
    await expect(page.getByText('Simple, Transparent')).toBeVisible();
  });
});

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the Catalyser logo linking to home', async ({ page }) => {
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible();
    await expect(page.locator('header').getByText('Catalyser', { exact: false })).toBeVisible();
  });

  test('should display navigation links for unauthenticated users', async ({ page }) => {
    // Desktop nav links (hidden on mobile, but present in DOM for desktop viewport)
    await expect(page.locator('header nav').getByRole('link', { name: 'Catalogue' })).toBeVisible();
    await expect(page.locator('header nav').getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(page.locator('header nav').getByRole('link', { name: 'About' })).toBeVisible();

    // Auth buttons
    await expect(page.locator('header').getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('should navigate to Catalogue from header', async ({ page }) => {
    // Mock the APIs for catalogue page
    await page.route('**/api/v1/converters?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { data: [], page: 1, limit: 24, hasMore: false },
        }),
      });
    });
    await page.route('**/api/v1/converters/brands', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.locator('header nav').getByRole('link', { name: 'Catalogue' }).click();
    await expect(page).toHaveURL(/\/catalogue/);
  });

  test('should navigate to About from header', async ({ page }) => {
    await page.locator('header nav').getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about/);
  });

  test('should navigate to login from Sign In', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to register from Get Started', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Footer Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the footer with correct sections', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Section headings
    await expect(footer.getByText('Platform')).toBeVisible();
    await expect(footer.getByText('Legal')).toBeVisible();
    await expect(footer.getByText('Connect')).toBeVisible();

    // Copyright text
    const year = new Date().getFullYear().toString();
    await expect(footer.getByText(new RegExp(`${year} Catalyser`))).toBeVisible();
  });

  test('should have correct Platform links in footer', async ({ page }) => {
    const footer = page.locator('footer');

    await expect(footer.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('href', '/catalogue');
    await expect(footer.getByRole('link', { name: 'Pricing Plans' })).toHaveAttribute('href', '/pricing');
    await expect(footer.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  test('should have correct Legal links in footer', async ({ page }) => {
    const footer = page.locator('footer');

    await expect(footer.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    await expect(footer.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
  });

  test('should navigate to Terms of Service from footer', async ({ page }) => {
    await page.locator('footer').getByRole('link', { name: 'Terms of Service' }).click();
    await expect(page).toHaveURL(/\/terms/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Terms of');
  });

  test('should navigate to Privacy Policy from footer', async ({ page }) => {
    await page.locator('footer').getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy');
  });

  test('should navigate to Contact from footer', async ({ page }) => {
    await page.locator('footer').getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact');
  });

  test('should display support email in footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByText('support@catalyser.com')).toBeVisible();
  });
});
