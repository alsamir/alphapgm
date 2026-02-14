import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should render the login form correctly', async ({ page }) => {
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByText('Sign in to access converter pricing')).toBeVisible();

    // Form fields
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Link to register
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
  });

  test('should require email and password fields', async ({ page }) => {
    // Click sign in without filling the form -- HTML5 validation should prevent submission
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');

    // Both fields have the "required" attribute
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should validate email format via HTML5 validation', async ({ page }) => {
    const emailInput = page.getByLabel('Email');
    // Type an invalid email
    await emailInput.fill('not-an-email');
    await page.getByLabel('Password').fill('password123');

    // Click the submit button
    await page.getByRole('button', { name: 'Sign In' }).click();

    // The form should not navigate away because of HTML5 email validation
    await expect(page).toHaveURL(/\/login/);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye toggle button (it is the button inside the password field's relative container)
    await page.locator('button:has(svg)').filter({ has: page.locator('svg') }).nth(0).click();

    // Try to find the toggle -- it is the button adjacent to the password input
    // The toggle is the button element inside the relative div wrapping the password input
    const toggleButton = page.locator('form .relative button[type="button"]');
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Toggle back
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should show error on failed login', async ({ page }) => {
    // Mock the login API to return an error
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid email or password' }),
      });
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Error message should appear
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('should redirect to dashboard on successful login', async ({ page }) => {
    // Mock the login API to succeed
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'mock-token-123',
            user: { id: 1, email: 'test@example.com', username: 'testuser', roles: ['ROLE_USER'] },
          },
        }),
      });
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to register page via link', async ({ page }) => {
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should render the registration form correctly', async ({ page }) => {
    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByText('Get 20 free credits to start')).toBeVisible();

    // Form fields
    await expect(page.getByLabel('Email *')).toBeVisible();
    await expect(page.getByLabel('Username *')).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Password *')).toBeVisible();
    await expect(page.getByLabel('Confirm Password *')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

    // Link to login
    await expect(page.getByText('Already have an account?')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('should require mandatory fields', async ({ page }) => {
    // Email and username are required
    const emailInput = page.getByLabel('Email *');
    const usernameInput = page.getByLabel('Username *');
    const passwordInput = page.getByLabel('Password *');
    const confirmInput = page.getByLabel('Confirm Password *');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(usernameInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(confirmInput).toHaveAttribute('required', '');
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.getByLabel('Email *').fill('test@example.com');
    await page.getByLabel('Username *').fill('testuser');
    await page.getByLabel('Password *').fill('password123');
    await page.getByLabel('Confirm Password *').fill('differentpassword');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should show error when password is too short', async ({ page }) => {
    await page.getByLabel('Email *').fill('test@example.com');
    await page.getByLabel('Username *').fill('testuser');
    await page.getByLabel('Password *').fill('short');
    await page.getByLabel('Confirm Password *').fill('short');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('should show error on failed registration', async ({ page }) => {
    // Mock the register API to return an error
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Email already in use' }),
      });
    });

    await page.getByLabel('Email *').fill('existing@example.com');
    await page.getByLabel('Username *').fill('existinguser');
    await page.getByLabel('Password *').fill('password123');
    await page.getByLabel('Confirm Password *').fill('password123');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Email already in use')).toBeVisible();
  });

  test('should redirect to dashboard on successful registration', async ({ page }) => {
    // Mock the register API to succeed
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'mock-token-456',
            user: { id: 2, email: 'new@example.com', username: 'newuser', roles: ['ROLE_USER'] },
          },
        }),
      });
    });

    await page.getByLabel('Email *').fill('new@example.com');
    await page.getByLabel('Username *').fill('newuser');
    await page.getByLabel('Full Name').fill('New User');
    await page.getByLabel('Phone').fill('+1 555 000 0000');
    await page.getByLabel('Password *').fill('password123');
    await page.getByLabel('Confirm Password *').fill('password123');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to login page via link', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
