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
  rol: "admin" | "empleado" | "jugador";
}
