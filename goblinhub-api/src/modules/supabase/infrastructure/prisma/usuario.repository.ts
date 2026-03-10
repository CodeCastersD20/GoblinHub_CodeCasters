import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import {
  UsuarioRepository,
  UsuarioPerfil,
} from '../../domain/repositories/usuario.repository';
import { RolUsuario } from '../../domain/enums/user.enum';

@Injectable()
export class UsuarioRepositoryPrisma extends UsuarioRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findRolById(id_usuario: string): Promise<RolUsuario | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
      select: { rol: true },
    });

    if (!usuario) return null;

    return usuario.rol as RolUsuario;
  }

  async findProfileById(id_usuario: string): Promise<UsuarioPerfil | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
      select: { rol: true, nombre: true, foto_perfil_url: true },
    });

    if (!usuario) return null;

    return {
      rol: usuario.rol as RolUsuario,
      nombre: usuario.nombre,
      foto_perfil_url: usuario.foto_perfil_url,
    };
  }

  async updateFotoPerfil(
    id_usuario: string,
    foto_perfil_url: string | null,
  ): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario },
      data: { foto_perfil_url },
    });
  }
}
