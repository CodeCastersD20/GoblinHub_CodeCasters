import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import Register from "./Register";

describe("Register (step 1)", () => {
  const mockOnSiguiente = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the personal information form", () => {
    render(<Register onSiguiente={mockOnSiguiente} />);
    expect(screen.getByText("Información personal")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tu nombre")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tu apellido")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tu correo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tu contraseña")).toBeInTheDocument();
  });

  it("shows validation errors when all fields are empty", () => {
    render(<Register onSiguiente={mockOnSiguiente} />);
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/apellido es requerido/i)).toBeInTheDocument();
    expect(mockOnSiguiente).not.toHaveBeenCalled();
  });

  it("shows invalid email error", () => {
    render(<Register onSiguiente={mockOnSiguiente} />);
    fireEvent.change(screen.getByPlaceholderText("Tu nombre"), {
      target: { value: "Juan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Tu apellido"), {
      target: { value: "Perez" },
    });
    fireEvent.change(screen.getByPlaceholderText("Tu correo"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText(/Correo inválido/)).toBeInTheDocument();
    expect(mockOnSiguiente).not.toHaveBeenCalled();
  });

  it("shows error when password is shorter than 6 characters", () => {
    render(<Register onSiguiente={mockOnSiguiente} />);
    fireEvent.change(screen.getByPlaceholderText("Tu contraseña"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText(/Mínimo 6 caracteres/)).toBeInTheDocument();
    expect(mockOnSiguiente).not.toHaveBeenCalled();
  });

  it("calls onSiguiente with form data when all fields are valid", () => {
    render(<Register onSiguiente={mockOnSiguiente} />);

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
    // Set date field by querying it by type
    const dateInput = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "1990-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    expect(mockOnSiguiente).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Juan",
        apellido: "Perez",
        correo: "juan@example.com",
        contrasena: "password123",
      }),
    );
  });
});
