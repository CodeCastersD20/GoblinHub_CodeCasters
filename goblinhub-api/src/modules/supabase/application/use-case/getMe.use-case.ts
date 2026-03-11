import { Injectable, NotFoundException } from '@nestjs/common';
import {
  UsuarioRepository,
  type UsuarioPerfil,
} from '../../domain/repositories/usuario.repository';
import { NivelExperiencia } from '../../domain/enums/user.enum';

export interface MeResult {
  id: string;
  email: string | undefined;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  fecha_nacimiento: Date;
  nivel_experiencia: UsuarioPerfil['nivel_experiencia'];
  puntos_fidelidad: number;
  bio: string | null;
  rol: UsuarioPerfil['rol'];
  foto_perfil_url: string | null;
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
      apellidos: perfil.apellidos as string,
      telefono: perfil.telefono as string | null,
      fecha_nacimiento: perfil.fecha_nacimiento,
      nivel_experiencia: perfil.nivel_experiencia as NivelExperiencia,
      puntos_fidelidad: perfil.puntos_fidelidad as number,
      bio: perfil.bio as string | null,
      rol: perfil.rol,
      foto_perfil_url: perfil.foto_perfil_url,
    };
  }
}
