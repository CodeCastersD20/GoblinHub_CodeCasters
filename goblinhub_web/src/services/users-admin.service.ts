import api from "../lib/api";

export interface AdminUserApi {
  id: string;
  nombre: string;
  apellidos: string;
  email: string | null;
  nivel_experiencia: "novato" | "intermedio" | "veterano";
  rol: "admin" | "empleado" | "jugador";
  activo: boolean;
  foto_perfil_url: string | null;
  created_at: string;
  eventos_asistidos: number;
}

export interface AdminUserUpdateDto {
  nombre?: string;
  apellidos?: string;
  nivel_experiencia?: "novato" | "intermedio" | "veterano";
  rol?: "admin" | "empleado" | "jugador";
  activo?: boolean;
}

export const getAdminUsers = () => api.get<AdminUserApi[]>("/auth/admin/users");

export const updateAdminUser = (id: string, data: AdminUserUpdateDto) =>
  api.patch<{ message: string }>(`/auth/admin/users/${id}`, data);

export const deleteAdminUser = (id: string) =>
  api.delete<{ message: string }>(`/auth/admin/users/${id}`);
