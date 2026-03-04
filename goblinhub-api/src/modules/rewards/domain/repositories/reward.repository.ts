import { Recompensa } from '../entities/reward.entity';

export abstract class RewardRepository {
  abstract findAll(): Promise<Recompensa[]>;
  abstract findById(id: number): Promise<Recompensa | null>;
  abstract findByName(nombre: string): Promise<Recompensa | null>;
  abstract create(recompensa: Recompensa): Promise<Recompensa>;
  abstract update(
    id: number,
    recompensa: Partial<Recompensa>,
  ): Promise<Recompensa>;
  abstract delete(id: number): Promise<void>;
}
