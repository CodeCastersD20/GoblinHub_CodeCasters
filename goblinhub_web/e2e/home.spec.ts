import { test, expect } from "@playwright/test";

const MOCK_USER = {
  id: "test-uuid",
  nombre: "Goblin",
  email: "goblin@test.com",
  rol: "jugador",
  nivel_experiencia: "veterano",
  puntos_fidelidad: 250,
};

// ── Página de inicio pública (/)" ──
test.describe("Página de Inicio pública (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("muestra el título principal de la landing", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("muestra el logo y el nombre GoblinHub", async ({ page }) => {
    await expect(page.locator(".lp-hero__logo")).toBeVisible();
    await expect(page.getByText("GoblinHub")).toBeVisible();
  });

  test("muestra el botón de ver inventario", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /ver inventario/i }),
    ).toBeVisible();
  });

  test("muestra el botón de próximos eventos", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /próximos eventos/i }),
    ).toBeVisible();
  });

  test("muestra la sección de categorías", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Wargames/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Juegos de Mesa/i }),
    ).toBeVisible();
  });

  test("muestra la dirección de la tienda con Hermosillo", async ({ page }) => {
    await expect(page.locator(".lp-store__address")).toBeVisible();
    await expect(page.locator(".lp-store__address")).toContainText(
      /Hermosillo/i,
    );
  });

  test("renderiza el contenedor del mapa", async ({ page }) => {
    await expect(page.locator("[data-testid='map-section']")).toBeVisible();
  });

  test("sin sesión permanece en / mostrando la landing pública", async ({
    page,
  }) => {
    await expect(page).toHaveURL("/");
  });

  test("con sesión redirige a /home", async ({ page }) => {
    await page.route("**/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USER),
      }),
    );
    await page.addInitScript(() => {
      localStorage.setItem("token", "fake-test-token-e2e");
    });
    await page.goto("/");
    await expect(page).toHaveURL("/home");
  });
});

// ── Página de inicio autenticada (/home) ──
test.describe("Página de Inicio autenticada (/home)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/auth/me", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_USER),
        });
      }
      return route.continue();
    });

    await page.addInitScript(() => {
      localStorage.setItem("token", "fake-test-token-e2e");
    });

    await page.goto("/home");
  });

  test("muestra el saludo de bienvenida con el nombre del usuario", async ({
    page,
  }) => {
    await expect(page.getByText("¡Bienvenido, Goblin!")).toBeVisible();
  });

  test("muestra el rol del usuario", async ({ page }) => {
    await expect(page.getByText("Jugador")).toBeVisible();
  });

  test("muestra los puntos de fidelidad", async ({ page }) => {
    await expect(page.getByText("250")).toBeVisible();
  });

  test("muestra el nivel de experiencia", async ({ page }) => {
    await expect(page.getByText("Veterano")).toBeVisible();
  });

  test("muestra la dirección de la tienda", async ({ page }) => {
    await expect(page.locator(".ah-store__address")).toBeVisible();
    await expect(page.locator(".ah-store__address")).toContainText(
      /Hermosillo/i,
    );
  });

  test("renderiza el contenedor del mapa", async ({ page }) => {
    await expect(page.locator("[data-testid='map-section']")).toBeVisible();
  });
});

test("redirige a /login cuando no hay token autenticado", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL("/login");
});
