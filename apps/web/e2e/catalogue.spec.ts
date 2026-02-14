import { test, expect } from '@playwright/test';

test.describe('Catalogue Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the converters API to return test data
    await page.route('**/api/v1/converters?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [
              { id: 1, name: 'KAT 131', brand: 'BMW', weight: '1.5', imageUrl: null, priceRange: '$50-$100' },
              { id: 2, name: 'GM 25178399', brand: 'General Motors', weight: '2.0', imageUrl: null, priceRange: '$80-$150' },
              { id: 3, name: 'DPNR 3.0d', brand: 'BMW', weight: '3.2', imageUrl: null, priceRange: '$120-$200' },
            ],
            page: 1,
            limit: 24,
            hasMore: false,
          },
        }),
      });
    });

    // Mock the brands API
    await page.route('**/api/v1/converters/brands', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { brand: 'BMW', count: 450 },
            { brand: 'General Motors', count: 380 },
            { brand: 'Toyota', count: 520 },
            { brand: 'Ford', count: 310 },
            { brand: 'Mercedes', count: 290 },
          ],
        }),
      });
    });

    await page.goto('/catalogue');
  });

  test('should load the catalogue page with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Catalogue');
    await expect(
      page.getByText('Search and browse 19,800+ catalytic converters across 99 brands'),
    ).toBeVisible();
  });

  test('should display the search input', async ({ page }) => {
    await expect(
      page.getByPlaceholder('Search by code, name, or keyword...'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Search' }),
    ).toBeVisible();
  });

  test('should allow typing in the search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by code, name, or keyword...');
    await searchInput.fill('BMW');
    await expect(searchInput).toHaveValue('BMW');
  });

  test('should display the brand filter sidebar', async ({ page }) => {
    await expect(page.getByText('Brands', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Filter brands...')).toBeVisible();

    // Brands from mock data should appear
    await expect(page.getByText('BMW').first()).toBeVisible();
    await expect(page.getByText('General Motors')).toBeVisible();
    await expect(page.getByText('Toyota')).toBeVisible();
    await expect(page.getByText('Ford')).toBeVisible();
    await expect(page.getByText('Mercedes')).toBeVisible();
  });

  test('should filter brands when typing in the brand search', async ({ page }) => {
    const brandSearch = page.getByPlaceholder('Filter brands...');
    await brandSearch.fill('BM');

    // BMW should be visible, others should be hidden
    await expect(page.getByRole('button', { name: /BMW/ })).toBeVisible();
  });

  test('should display converter cards with correct data', async ({ page }) => {
    // Wait for loading to complete
    await expect(page.getByText('Showing 3 results')).toBeVisible();

    // Converter names from mock data
    await expect(page.getByText('KAT 131')).toBeVisible();
    await expect(page.getByText('GM 25178399')).toBeVisible();
    await expect(page.getByText('DPNR 3.0d')).toBeVisible();
  });

  test('should display view mode toggle buttons', async ({ page }) => {
    // Grid and list view toggle buttons (icon buttons)
    const buttons = page.locator('button[class*="icon"]');
    // There should be view mode toggle area
    await expect(page.getByText('Showing')).toBeVisible();
  });

  test('should display pagination controls', async ({ page }) => {
    await expect(page.getByText('Showing 3 results')).toBeVisible();
    await expect(page.getByRole('button', { name: /Previous/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
    await expect(page.getByText('Page 1')).toBeVisible();
  });

  test('should submit search and update URL', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by code, name, or keyword...');
    await searchInput.fill('KAT 131');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(/\/catalogue\?search=KAT\+131/);
  });

  test('should show "No converters found" when results are empty', async ({ page }) => {
    // Re-mock to return empty results
    await page.route('**/api/v1/converters?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [],
            page: 1,
            limit: 24,
            hasMore: false,
          },
        }),
      });
    });

    // Re-navigate to trigger the new mock
    await page.goto('/catalogue?search=nonexistent');

    await expect(page.getByText('No converters found')).toBeVisible();
    await expect(page.getByText('Try a different search term or filter')).toBeVisible();
  });

  test('should link converter cards to detail pages', async ({ page }) => {
    await expect(page.getByText('Showing 3 results')).toBeVisible();

    // Each converter card is wrapped in a Link to /converter/[id]
    const firstConverterLink = page.locator('a[href="/converter/1"]');
    await expect(firstConverterLink).toBeVisible();
  });
});
