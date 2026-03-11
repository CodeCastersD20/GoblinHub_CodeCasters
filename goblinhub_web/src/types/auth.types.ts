export interface RegisterUserDto {
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  telefono?: string;
  fecha_nacimiento: string; // "YYYY-MM-DD"
  bio?: string;
  nivel_experiencia?: "novato" | "intermedio" | "veterano";
}

export interface LoginResponseDto {
  access_token: string;
  refresh_token?: string;
}

export interface MeResponseDto {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  fecha_nacimiento: string; // "YYYY-MM-DD"
  rol: "admin" | "empleado" | "jugador";
  nivel_experiencia?: "novato" | "intermedio" | "veterano";
  puntos_fidelidad?: number;
  bio?: string | null;
  foto_perfil_url?: string | null;
}

export interface UpdatePerfilDto {
  nombre?: string;
  apellidos?: string;
  telefono?: string | null;
  fecha_nacimiento?: string;
  nivel_experiencia?: "novato" | "intermedio" | "veterano";
  bio?: string | null;
}
