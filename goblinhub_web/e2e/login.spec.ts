import { test, expect, type Page } from "@playwright/test";

const errorMessage = "Correo o contraseña incorrectos";

async function mockSigninFail(page: Page) {
  await page.route("**/auth/signin", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: errorMessage }),
    }),
  );
}

test.describe("Login - bad path (/login)", () => {
  test.beforeEach(async ({ page }) => {
    await mockSigninFail(page);
    await page.goto("/login");
  });

  test("muestra mensaje de error con credenciales inválidas", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("Correo electrónico")
      .fill("noexiste@goblin.com");
    await page.getByPlaceholder("Contraseña").fill("ContraseñaIncorrecta1");

    await page.getByRole("button", { name: /login/i }).click();

    await expect(page.locator(".error-msg")).toHaveText(errorMessage, {
      timeout: 10_000,
    });
    await expect(page).toHaveURL("/login");
  });

  test("no guarda token ni rol en localStorage tras un login fallido", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("Correo electrónico")
      .fill("noexiste@goblin.com");
    await page.getByPlaceholder("Contraseña").fill("ContraseñaIncorrecta1");

    await page.getByRole("button", { name: /login/i }).click();

    await expect(page.locator(".error-msg")).toBeVisible({ timeout: 10_000 });

    const storage = await page.evaluate(() => ({
      token: localStorage.getItem("token"),
      refresh_token: localStorage.getItem("refresh_token"),
      rol: localStorage.getItem("rol"),
    }));

    expect(storage.token).toBeNull();
    expect(storage.refresh_token).toBeNull();
    expect(storage.rol).toBeNull();
  });

  test("muestra mensaje de error al enviar el formulario vacío", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /login/i }).click();

    await expect(page.locator(".error-msg")).toHaveText(errorMessage, {
      timeout: 10_000,
    });
    await expect(page.getByPlaceholder("Correo electrónico")).toBeVisible();
    await expect(page.getByPlaceholder("Contraseña")).toBeVisible();
  });

  test("el formulario vuelve a estar habilitado tras el error", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("Correo electrónico")
      .fill("noexiste@goblin.com");
    await page.getByPlaceholder("Contraseña").fill("ContraseñaIncorrecta1");

    await page.getByRole("button", { name: /login/i }).click();
    await expect(page.locator(".error-msg")).toBeVisible({ timeout: 10_000 });

    const button = page.getByRole("button", { name: /login/i });
    await expect(button).toBeEnabled();
    await expect(page.locator(".error-msg")).toHaveText(errorMessage);
  });
});