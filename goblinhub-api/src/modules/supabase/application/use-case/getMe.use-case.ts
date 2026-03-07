import { Injectable, NotFoundException } from '@nestjs/common';
import {
  UsuarioRepository,
  type UsuarioPerfil,
} from '../../domain/repositories/usuario.repository';

export interface MeResult {
  id: string;
  email: string | undefined;
  nombre: string;
  rol: UsuarioPerfil['rol'];
}

@Injectable()
export class GetMeUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async getMyProfile(id: string, email: string | undefined): Promise<MeResult> {
    const perfil: UsuarioPerfil | null =
      await this.usuarioRepository.findProfileById(id);

    if (!perfil) {
      throw new NotFoundException('User not found in database');
    }

    return {
      id,
      email,
      nombre: perfil.nombre,
      rol: perfil.rol,
    };
  }
}
