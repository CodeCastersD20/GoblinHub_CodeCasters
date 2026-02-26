import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/connect/prisma.service';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
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
}
