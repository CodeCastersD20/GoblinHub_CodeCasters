import { RolUsuario } from '../enums/user.enum';

export interface UsuarioPerfil {
  rol: RolUsuario;
  nombre: string;
  foto_perfil_url: string | null;
}

export abstract class UsuarioRepository {
  abstract findRolById(id_usuario: string): Promise<RolUsuario | null>;
  abstract findProfileById(id_usuario: string): Promise<UsuarioPerfil | null>;
  abstract updateFotoPerfil(
    id_usuario: string,
    foto_perfil_url: string | null,
  ): Promise<void>;
}
