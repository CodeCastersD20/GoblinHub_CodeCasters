import { GetRewardUseCase } from './get-reward.use-case';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { HttpException } from '@nestjs/common';
import { Recompensa } from '../../domain/entities/reward.entity';
import { TipoRecompensa } from '../../domain/enums/reward.enum';

describe('GetRewardUseCase', () => {
  let useCase: GetRewardUseCase;
  let rewardRepo: jest.Mocked<RewardRepository>;

  const mockReward = new Recompensa(
    1,
    'Descuento 10%',
    'Aplica en dados',
    50,
    TipoRecompensa.DESCUENTO,
    undefined,
    true,
  );

  beforeEach(() => {
    rewardRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
    } as unknown as jest.Mocked<RewardRepository>;

    useCase = new GetRewardUseCase(rewardRepo);
  });

  describe('getAllRewards', () => {
    it('debe retornar un array de recompensas', async () => {
      rewardRepo.findAll.mockResolvedValue([mockReward]);
      const result = await useCase.getAllRewards();
      expect(result).toEqual([mockReward]);
    });

    it('debe lanzar 404 si el array está vacío', async () => {
      rewardRepo.findAll.mockResolvedValue([]);
      await expect(useCase.getAllRewards()).rejects.toThrow(HttpException);
    });

    it('debe lanzar 500 si falla el repositorio', async () => {
      rewardRepo.findAll.mockRejectedValue(new Error('Fallo DB'));
      await expect(useCase.getAllRewards()).rejects.toThrow(HttpException);
    });
  });

  describe('getByIdReward', () => {
    it('debe retornar la recompensa por ID', async () => {
      rewardRepo.findById.mockResolvedValue(mockReward);
      const result = await useCase.getByIdReward(1);
      expect(result).toEqual(mockReward);
    });

    it('debe lanzar 404 si el ID no existe', async () => {
      rewardRepo.findById.mockResolvedValue(null);
      await expect(useCase.getByIdReward(99)).rejects.toThrow(HttpException);
    });

    it('debe lanzar 500 si ocurre un error inesperado', async () => {
      rewardRepo.findById.mockRejectedValue(new Error('Fallo crítico'));
      await expect(useCase.getByIdReward(1)).rejects.toThrow(HttpException);
    });
  });

  describe('getByNameReward', () => {
    it('debe retornar la recompensa por nombre', async () => {
      rewardRepo.findByName.mockResolvedValue(mockReward);
      const result = await useCase.getByNameReward('Descuento 10%');
      expect(result).toEqual(mockReward);
    });

    it('debe lanzar 404 si el nombre no existe', async () => {
      rewardRepo.findByName.mockResolvedValue(null);
      await expect(useCase.getByNameReward('Inexistente')).rejects.toThrow(
        HttpException,
      );
    });

    it('debe lanzar 500 si el repositorio falla', async () => {
      rewardRepo.findByName.mockRejectedValue(new Error('Fallo red'));
      await expect(useCase.getByNameReward('Error')).rejects.toThrow(
        HttpException,
      );
    });
  });
});
