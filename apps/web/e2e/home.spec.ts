import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load with the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Catalyser/);
  });

  test('should display the hero section', async ({ page }) => {
    // The hero heading contains "Know the True", "Value", "of Every", "Converter"
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Know the True')).toBeVisible();
    await expect(page.getByText('of Every')).toBeVisible();

    // Hero badge
    await expect(page.getByText('AI-Powered Pricing Platform')).toBeVisible();

    // Hero description
    await expect(
      page.getByText(/Access real-time pricing for 19,800\+ catalytic converters/),
    ).toBeVisible();

    // CTA buttons
    await expect(page.getByRole('link', { name: /Browse Catalogue/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Start Free Trial/ })).toBeVisible();

    // Stats
    await expect(page.getByText('19,800+')).toBeVisible();
    await expect(page.getByText('Converters')).toBeVisible();
    await expect(page.getByText('99')).toBeVisible();
    await expect(page.getByText('Brands')).toBeVisible();
  });

  test('should display the metal prices ticker', async ({ page }) => {
    // Each metal symbol and name should be visible
    await expect(page.getByText('Pt')).toBeVisible();
    await expect(page.getByText('Platinum')).toBeVisible();
    await expect(page.getByText('Pd')).toBeVisible();
    await expect(page.getByText('Palladium')).toBeVisible();
    await expect(page.getByText('Rh')).toBeVisible();
    await expect(page.getByText('Rhodium')).toBeVisible();

    // Prices should be displayed (dollar amounts)
    await expect(page.getByText('$982.50')).toBeVisible();
    await expect(page.getByText('$1,045.30')).toBeVisible();
    await expect(page.getByText('$4,750.00')).toBeVisible();
  });

  test('should display the search bar', async ({ page }) => {
    await expect(page.getByText('Find Any Converter')).toBeVisible();
    await expect(
      page.getByText('Search by converter code, brand name, or serial number'),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/Search converters/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Search' }),
    ).toBeVisible();
  });

  test('should navigate to catalogue when "Browse Catalogue" is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /Browse Catalogue/ }).click();
    await expect(page).toHaveURL(/\/catalogue/);
  });

  test('should navigate to register when "Start Free Trial" is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /Start Free Trial/ }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should display the features section', async ({ page }) => {
    await expect(
      page.getByText('Everything You Need for'),
    ).toBeVisible();
    await expect(page.getByText('19,800+ Converters')).toBeVisible();
    await expect(page.getByText('Real-Time Pricing')).toBeVisible();
    await expect(page.getByText('AI Assistant')).toBeVisible();
  });

  test('should display the pricing section', async ({ page }) => {
    await expect(page.getByText('Simple, Transparent')).toBeVisible();
    await expect(page.getByText('Free', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Business')).toBeVisible();
    await expect(page.getByText('Most Popular')).toBeVisible();
  });

  test('should submit search and navigate to catalogue', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search converters/);
    await searchInput.fill('BMW');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/catalogue\?search=BMW/);
  });
});
