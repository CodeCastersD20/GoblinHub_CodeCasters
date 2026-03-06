import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import { Recompensa } from '../../domain/entities/reward.entity';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { TipoRecompensaMapper } from '../mappers/reward-status.mapper';
import { Recompensa as PrismaRecompensa } from '@prisma/client';

@Injectable()
export class RewardPrismaRepository extends RewardRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  // --- Método Auxiliar para evitar repetir código ---
  private mapToDomain(prismaReward: PrismaRecompensa): Recompensa {
    return new Recompensa(
      prismaReward.id_recompensa,
      prismaReward.nombre,
      prismaReward.descripcion ?? undefined,
      prismaReward.costo_puntos,
      TipoRecompensaMapper.toDomain(prismaReward.tipo),
      prismaReward.valor_descuento
        ? prismaReward.valor_descuento.toNumber()
        : undefined,
      prismaReward.activa,
      prismaReward.id_creador ?? undefined,
    );
  }

  async create(reward: Recompensa, id_creador: string): Promise<Recompensa> {
    const created = await this.prisma.recompensa.create({
      data: {
        nombre: reward.nombre,
        descripcion: reward.descripcion,
        costo_puntos: reward.costo_puntos,
        tipo: TipoRecompensaMapper.toPrisma(reward.tipo),
        valor_descuento: reward.valor_descuento,
        activa: reward.activa,
        id_creador: id_creador,
      },
    });

    return this.mapToDomain(created);
  }

  async findAll(): Promise<Recompensa[]> {
    const rewards = await this.prisma.recompensa.findMany({
      where: { deleted_at: null }, // Solo traemos los que no tienen soft delete
    });

    return rewards.map((reward) => this.mapToDomain(reward));
  }

  async findById(id: number): Promise<Recompensa | null> {
    const reward = await this.prisma.recompensa.findFirst({
      where: { id_recompensa: id, deleted_at: null },
    });

    if (!reward) return null;

    return this.mapToDomain(reward);
  }

  // Equivalente a tu findByCategory, pero para el nombre
  async findByName(nombre: string): Promise<Recompensa | null> {
    const reward = await this.prisma.recompensa.findFirst({
      where: {
        nombre: nombre,
        deleted_at: null,
      },
    });

    if (!reward) return null;

    return this.mapToDomain(reward);
  }

  async update(id: number, rewardData: Recompensa): Promise<Recompensa> {
    const updated = await this.prisma.recompensa.update({
      where: { id_recompensa: id },
      data: {
        nombre: rewardData.nombre,
        descripcion: rewardData.descripcion,
        costo_puntos: rewardData.costo_puntos,
        tipo: TipoRecompensaMapper.toPrisma(rewardData.tipo),
        valor_descuento: rewardData.valor_descuento,
        activa: rewardData.activa,
      },
    });

    return this.mapToDomain(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.recompensa.update({
      where: { id_recompensa: id },
      data: {
        deleted_at: new Date(),
        activa: false, // Lo desactivamos inmediatamente como buena práctica
      },
    });
  }
}
