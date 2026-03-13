import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import {
  AdminUserSummary,
  AdminUserUpdateData,
  UsuarioRepository,
  UsuarioPerfil,
  UpdatePerfilData,
} from '../../domain/repositories/usuario.repository';
import { NivelExperiencia, RolUsuario } from '../../domain/enums/user.enum';

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
      select: {
        rol: true,
        nombre: true,
        apellidos: true,
        telefono: true,
        fecha_nacimiento: true,
        nivel_experiencia: true,
        puntos_fidelidad: true,
        bio: true,
        foto_perfil_url: true,
      },
    });

    if (!usuario) return null;

    return {
      rol: usuario.rol as RolUsuario,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono,
      fecha_nacimiento: usuario.fecha_nacimiento,
      nivel_experiencia: usuario.nivel_experiencia as NivelExperiencia,
      puntos_fidelidad: usuario.puntos_fidelidad,
      bio: usuario.bio,
      foto_perfil_url: usuario.foto_perfil_url,
    };
  }

  async findAllForAdmin(): Promise<AdminUserSummary[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { deleted_at: null },
      select: {
        id_usuario: true,
        nombre: true,
        apellidos: true,
        nivel_experiencia: true,
        rol: true,
        activo: true,
        foto_perfil_url: true,
        created_at: true,
        inscripciones: {
          where: { deleted_at: null },
          select: { id_inscripcion: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return usuarios.map((u) => ({
      id: u.id_usuario,
      nombre: u.nombre,
      apellidos: u.apellidos,
      email: null,
      nivel_experiencia: u.nivel_experiencia as NivelExperiencia,
      rol: u.rol as RolUsuario,
      activo: u.activo,
      foto_perfil_url: u.foto_perfil_url,
      created_at: u.created_at,
      eventos_asistidos: u.inscripciones.length,
    }));
  }

  async updateUserForAdmin(
    id_usuario: string,
    data: AdminUserUpdateData,
  ): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario },
      data,
    });
  }

  async softDeleteForAdmin(id_usuario: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario },
      data: {
        activo: false,
        deleted_at: new Date(),
      },
    });
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

  async updateProfile(
    id_usuario: string,
    data: UpdatePerfilData,
  ): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario },
      data,
    });
  }
}
