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

export const getAdminUsers = (q?: string, rol?: string) => {
  return api.get("/auth/admin/users", {
    params: {
      q: q || undefined, // Si está vacío, no lo manda
      rol: rol !== "todos" ? rol : undefined, // Si es 'todos', no aplica el filtro
    },
  });
};
export const updateAdminUser = (id: string, data: AdminUserUpdateDto) =>
  api.patch<{ message: string }>(`/auth/admin/users/${id}`, data);

export const deleteAdminUser = (id: string) =>
  api.delete<{ message: string }>(`/auth/admin/users/${id}`);
