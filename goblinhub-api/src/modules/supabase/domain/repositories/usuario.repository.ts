import { RolUsuario } from '../enums/user.enum';

export interface UsuarioPerfil {
  rol: RolUsuario;
  nombre: string;
}

export abstract class UsuarioRepository {
  abstract findRolById(id_usuario: string): Promise<RolUsuario | null>;
  abstract findProfileById(id_usuario: string): Promise<UsuarioPerfil | null>;
}
