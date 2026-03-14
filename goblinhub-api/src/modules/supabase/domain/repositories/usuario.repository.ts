import { NivelExperiencia, RolUsuario } from '../enums/user.enum';

export interface UsuarioPerfil {
  rol: RolUsuario;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  fecha_nacimiento: Date;
  nivel_experiencia: NivelExperiencia;
  puntos_fidelidad: number;
  bio: string | null;
  foto_perfil_url: string | null;
}

export interface UpdatePerfilData {
  nombre?: string;
  apellidos?: string;
  telefono?: string | null;
  fecha_nacimiento?: Date;
  nivel_experiencia?: NivelExperiencia;
  bio?: string | null;
}

export interface AdminUserSummary {
  id: string;
  nombre: string;
  apellidos: string;
  email: string | null;
  nivel_experiencia: NivelExperiencia;
  rol: RolUsuario;
  activo: boolean;
  foto_perfil_url: string | null;
  created_at: Date;
  eventos_asistidos: number;
}

export interface AdminUserUpdateData {
  nombre?: string;
  apellidos?: string;
  nivel_experiencia?: NivelExperiencia;
  rol?: RolUsuario;
  activo?: boolean;
}

export abstract class UsuarioRepository {
  abstract findRolById(id_usuario: string): Promise<RolUsuario | null>;
  abstract findProfileById(id_usuario: string): Promise<UsuarioPerfil | null>;
  abstract findAllForAdmin(): Promise<AdminUserSummary[]>;
  abstract updateUserForAdmin(
    id_usuario: string,
    data: AdminUserUpdateData,
  ): Promise<void>;
  abstract softDeleteForAdmin(id_usuario: string): Promise<void>;
  abstract updateFotoPerfil(
    id_usuario: string,
    foto_perfil_url: string | null,
  ): Promise<void>;
  abstract updateProfile(
    id_usuario: string,
    data: UpdatePerfilData,
  ): Promise<void>;
}
