import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("redirects to /login when not authenticated", async ({ page }) => {
    // Clear storage to simulate unauthenticated state
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/auth-home");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page loads with correct form elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder(/correo electrónico/i)).toBeVisible();
    await expect(page.getByPlaceholder(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
  });

  test("forgot password link is visible on login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/olvidaste tu contraseña/i)).toBeVisible();
  });
});
