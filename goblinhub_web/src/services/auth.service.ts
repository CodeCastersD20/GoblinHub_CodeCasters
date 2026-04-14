import api from "../lib/api";
import type {
  RegisterUserDto,
  MeResponseDto,
  UpdatePerfilDto,
} from "../types/auth.types";

export const login = (email: string, password: string) =>
  api.post("/auth/signin", { email, password });

export const register = (data: RegisterUserDto) =>
  api.post("/auth/signup", data);

export const getMe = () => api.get<MeResponseDto>("/auth/me");

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("rol");
};

export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (
  accessToken: string,
  newPassword: string,
  confirmPassword: string,
) =>
  api.post("/auth/reset-password", {
    accessToken,
    newPassword,
    confirmPassword,
  });

export const uploadFotoPerfil = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.put<{ foto_perfil_url: string }>("/auth/me/foto", form);
};

export const updatePerfil = (data: UpdatePerfilDto) =>
  api.patch<{ message: string }>("/auth/me", data);

export const getAdminUsers = (q?: string, rol?: string) =>
  api.get("/auth/admin/users", {
    params: {
      q: q || undefined,   // Si no hay texto, no envía 'q' o va vacío
      rol: rol !== 'todos' ? rol : undefined // Si el filtro es 'todos', no filtramos por rol
    }
  });