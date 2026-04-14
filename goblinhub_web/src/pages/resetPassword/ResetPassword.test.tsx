import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../lib/api", () => ({
  default: { post: vi.fn() },
}));

import ResetPassword from "./ResetPassword";
import api from "../../lib/api";

const mockPost = vi.mocked(api.post);

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
  });

  it("shows invalid link message when hash is empty", () => {
    render(<ResetPassword />);
    expect(screen.getByText(/Enlace inválido/)).toBeInTheDocument();
  });

  it("shows invalid link when type is not recovery", () => {
    window.location.hash = "#access_token=TOKEN&type=signup";
    render(<ResetPassword />);
    expect(screen.getByText(/Enlace inválido/)).toBeInTheDocument();
  });

  it("shows invalid link when access_token is missing", () => {
    window.location.hash = "#type=recovery";
    render(<ResetPassword />);
    expect(screen.getByText(/Enlace inválido/)).toBeInTheDocument();
  });

  it("renders the reset password form with a valid hash", () => {
    window.location.hash = "#access_token=TOKEN&type=recovery";
    render(<ResetPassword />);
    expect(
      screen.getByRole("heading", { name: "Nueva contraseña" }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nueva contraseña")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Confirmar contraseña"),
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    window.location.hash = "#access_token=TOKEN&type=recovery";
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText("Nueva contraseña"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar contraseña"), {
      target: { value: "Different2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    expect(
      await screen.findByText("Las contraseñas no coinciden"),
    ).toBeInTheDocument();
  });

  it("shows error when password is shorter than 8 characters", async () => {
    window.location.hash = "#access_token=TOKEN&type=recovery";
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText("Nueva contraseña"), {
      target: { value: "Ab1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar contraseña"), {
      target: { value: "Ab1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    expect(
      await screen.findByText(/al menos 8 caracteres/),
    ).toBeInTheDocument();
  });

  it("shows error when password has no uppercase letter", async () => {
    window.location.hash = "#access_token=TOKEN&type=recovery";
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText("Nueva contraseña"), {
      target: { value: "alllower1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar contraseña"), {
      target: { value: "alllower1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    expect(
      await screen.findByText(/debe tener al menos una minúscula/),
    ).toBeInTheDocument();
  });

  it("submits successfully and navigates to /login", async () => {
    window.location.hash = "#access_token=TOKEN&type=recovery";
    mockPost.mockResolvedValue({ data: {} } as never);
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText("Nueva contraseña"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar contraseña"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("calls api.post with the correct payload", async () => {
    window.location.hash = "#access_token=MYTOKEN&type=recovery";
    mockPost.mockResolvedValue({ data: {} } as never);
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText("Nueva contraseña"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar contraseña"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/auth/reset-password", {
        accessToken: "MYTOKEN",
        newPassword: "Password1",
        confirmPassword: "Password1",
      }),
    );
  });

  it("shows API error message on failure", async () => {
    window.location.hash = "#access_token=TOKEN&type=recovery";
    const err = Object.assign(new Error("Token expirado"), {
      isAxiosError: true,
      response: { data: { message: "Token expirado" } },
    });
    mockPost.mockRejectedValue(err);
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText("Nueva contraseña"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmar contraseña"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    expect(await screen.findByText("Token expirado")).toBeInTheDocument();
  });
});
