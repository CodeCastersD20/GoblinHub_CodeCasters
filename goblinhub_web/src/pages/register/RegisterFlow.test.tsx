import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../services/auth.service", () => ({
  register: vi.fn(),
}));

import RegisterFlow from "./RegisterFlow";
import { register } from "../../services/auth.service";

const mockRegister = vi.mocked(register);

/** Fills all required fields in Register step 1 */
function fillStep1() {
  fireEvent.change(screen.getByPlaceholderText("Tu nombre"), {
    target: { value: "Juan" },
  });
  fireEvent.change(screen.getByPlaceholderText("Tu apellido"), {
    target: { value: "Perez" },
  });
  fireEvent.change(screen.getByPlaceholderText("Tu telefono"), {
    target: { value: "5551234" },
  });
  fireEvent.change(screen.getByPlaceholderText("Tu correo"), {
    target: { value: "juan@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Tu contraseña"), {
    target: { value: "password123" },
  });
  const dateInput = document.querySelector(
    'input[type="date"]',
  ) as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: "1990-01-01" } });
}

describe("RegisterFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 (personal info) by default", () => {
    render(<RegisterFlow />);
    expect(screen.getByText("Información personal")).toBeInTheDocument();
  });

  it("advances to step 2 (interests) after completing step 1", () => {
    render(<RegisterFlow />);
    fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText(/Nivel de Experiencia/i)).toBeInTheDocument();
  });

  it("goes back to step 1 from step 2 when clicking Anterior", () => {
    render(<RegisterFlow />);
    fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    // Now in step 2, click Anterior
    fireEvent.click(screen.getByRole("button", { name: /Anterior/ }));
    expect(screen.getByText("Información personal")).toBeInTheDocument();
  });

  it("calls register service and navigates to /login on successful registration", async () => {
    mockRegister.mockResolvedValue(undefined as never);
    render(<RegisterFlow />);

    // Step 1
    fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    // Step 2: select nivel and game type
    fireEvent.click(screen.getByText(/Novato/));
    fireEvent.click(screen.getAllByText(/Wargames/)[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Siguiente/ })[0]);

    // Step 3: accept terms and complete registration
    const termsCheckbox = document.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    fireEvent.click(termsCheckbox);
    fireEvent.click(
      screen.getByRole("button", { name: /Completar Registro/i }),
    );

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });
});
