import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { NivelExperiencia } from '../../domain/enums/user.enum';
import { Redis } from 'ioredis';

export interface UpdatePerfilDto {
  nombre?: string;
  apellidos?: string;
  telefono?: string | null;
  fecha_nacimiento?: string; // ISO string from frontend
  nivel_experiencia?: NivelExperiencia;
  bio?: string | null;
}

@Injectable()
export class UpdatePerfilUseCase {
  private readonly redisClient: Redis;

  /* istanbul ignore next */
  constructor(private readonly usuarioRepository: UsuarioRepository) {
    this.redisClient = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
    );
  }

  async execute(id_usuario: string, dto: UpdatePerfilDto): Promise<void> {
    const perfil = await this.usuarioRepository.findProfileById(id_usuario);
    if (!perfil) throw new NotFoundException('Usuario no encontrado');

    await this.usuarioRepository.updateProfile(id_usuario, {
      ...(dto.nombre !== undefined && { nombre: dto.nombre }),
      ...(dto.apellidos !== undefined && { apellidos: dto.apellidos }),
      ...(dto.telefono !== undefined && { telefono: dto.telefono }),
      ...(dto.fecha_nacimiento !== undefined && {
        fecha_nacimiento: new Date(dto.fecha_nacimiento),
      }),
      ...(dto.nivel_experiencia !== undefined && {
        nivel_experiencia: dto.nivel_experiencia,
      }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
    });

    // Invalidar caché del perfil del usuario para mantener consistencia
    const cacheKey = `user:${id_usuario}:profile`;
    await this.redisClient.del(cacheKey);
  }
}
