import { test, expect } from "@playwright/test";

test.describe("Contacto / About Us page", () => {
  test("renders the contact heading", async ({ page }) => {
    await page.goto("/contacto");
    await expect(
      page.getByRole("heading", { name: "Página de Contacto" }),
    ).toBeVisible();
  });

  test("contacto page is reachable via navigation", async ({ page }) => {
    await page.goto("/login");
    await page.goto("/contacto");
    await expect(page).toHaveURL(/\/contacto/);
  });
});
