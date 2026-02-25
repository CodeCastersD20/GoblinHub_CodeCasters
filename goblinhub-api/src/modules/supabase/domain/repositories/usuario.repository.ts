import { RolUsuario } from '../enums/user.enum';

export abstract class UsuarioRepository {
  abstract findRolById(id_usuario: string): Promise<RolUsuario | null>;
}
