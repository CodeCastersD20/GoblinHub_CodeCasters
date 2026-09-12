import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("driver.js", () => ({
  driver: vi.fn().mockReturnValue({
    setSteps: vi.fn(),
    drive: vi.fn(),
    destroy: vi.fn(),
    isActive: vi.fn(() => false),
  }),
}));

import { driver } from "driver.js";
import GuideTour from "./guideTour";

const driverMock = vi.mocked(driver);

const TOUR_DONE_KEY = "gh_guided_tour_done";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GuideTour />
    </MemoryRouter>,
  );
}

describe("GuideTour", () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("muestra el botón de ayuda en páginas normales", () => {
    renderAt("/");
    expect(
      screen.getByRole("button", { name: "Mostrar guía de la plataforma" }),
    ).toBeInTheDocument();
  });

  it("inicia el tour al hacer clic en el botón", () => {
    renderAt("/eventos");
    fireEvent.click(
      screen.getByRole("button", { name: "Mostrar guía de la plataforma" }),
    );
    expect(driverMock).toHaveBeenCalled();
  });

  it("no se muestra en /login", () => {
    renderAt("/login");
    expect(
      screen.queryByRole("button", { name: "Mostrar guía de la plataforma" }),
    ).not.toBeInTheDocument();
  });

  it("arranca automáticamente en la primera visita al inicio", () => {
    vi.useFakeTimers();
    renderAt("/");
    vi.advanceTimersByTime(700);
    expect(driverMock).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("no arranca automáticamente si el tour ya se completó", () => {
    localStorage.setItem(TOUR_DONE_KEY, "done");
    vi.useFakeTimers();
    renderAt("/");
    vi.advanceTimersByTime(700);
    expect(driverMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});