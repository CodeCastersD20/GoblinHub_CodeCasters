import { SoftDeleteRewardUseCase } from './sd-reward.use-case';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { HttpException } from '@nestjs/common';

describe('SoftDeleteRewardUseCase', () => {
  let useCase: SoftDeleteRewardUseCase;
  let rewardRepo: jest.Mocked<RewardRepository>;

  const mockId = 1;

  beforeEach(() => {
    rewardRepo = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<RewardRepository>;

    useCase = new SoftDeleteRewardUseCase(rewardRepo);
  });

  it('debe realizar el soft delete exitosamente si la recompensa existe', async () => {
    // 1. Simulamos que la recompensa existe
    rewardRepo.findById.mockResolvedValue({ id: mockId } as any);
    // 2. Simulamos que el delete funciona (retorna void)
    rewardRepo.delete.mockResolvedValue(undefined);

    await useCase.softDeleteReward(mockId);

    expect(rewardRepo.findById).toHaveBeenCalledWith(mockId);
    expect(rewardRepo.delete).toHaveBeenCalledWith(mockId);
  });

  it('debe lanzar HttpException 404 si la recompensa no existe', async () => {
    // Simulamos que el repositorio devuelve null
    rewardRepo.findById.mockResolvedValue(null);

    await expect(useCase.softDeleteReward(mockId)).rejects.toThrow(HttpException);
    
    // Verificamos que NO se intente borrar si no existe
    expect(rewardRepo.delete).not.toHaveBeenCalled();
  });

  it('debe lanzar HttpException 500 si el repositorio falla inesperadamente', async () => {
    // Simulamos un error genérico (ej. base de datos fuera de línea)
    rewardRepo.findById.mockRejectedValue(new Error('Fallo de conexión'));

    await expect(useCase.softDeleteReward(mockId)).rejects.toThrow(HttpException);
  });

  it('debe re-lanzar el error si ya es una instancia de HttpException', async () => {
    // Cubrimos la rama "if (error instanceof HttpException)" del catch
    const customError = new HttpException('Error manual', 403);
    rewardRepo.findById.mockRejectedValue(customError);

    await expect(useCase.softDeleteReward(mockId)).rejects.toThrow(customError);
  });
});