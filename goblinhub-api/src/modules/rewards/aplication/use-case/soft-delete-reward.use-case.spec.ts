import { SoftDeleteRewardUseCase } from './sd-reward.use-case';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { HttpException } from '@nestjs/common';
import { Recompensa } from '../../domain/entities/reward.entity';
import { TipoRecompensa } from '../../domain/enums/reward.enum';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

describe('SoftDeleteRewardUseCase', () => {
  let useCase: SoftDeleteRewardUseCase;
  let rewardRepo: jest.Mocked<RewardRepository>;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  const mockId = 1;
  const adminUserId = 'admin-uuid-1234';

  beforeEach(() => {
    rewardRepo = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<RewardRepository>;

    usuarioRepo = {
      findRolById: jest.fn().mockResolvedValue(RolUsuario.admin),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new SoftDeleteRewardUseCase(rewardRepo, usuarioRepo);
  });

  it('debe realizar el soft delete exitosamente si la recompensa existe', async () => {
    // 1. Simulamos que la recompensa existe
    rewardRepo.findById.mockResolvedValue(
      new Recompensa(1, 'Test', undefined, 100, TipoRecompensa.DESCUENTO),
    );
    // 2. Simulamos que el delete funciona (retorna void)
    rewardRepo.delete.mockResolvedValue(undefined);

    await useCase.softDeleteReward(mockId, adminUserId);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rewardRepo.findById).toHaveBeenCalledWith(mockId);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rewardRepo.delete).toHaveBeenCalledWith(mockId);
  });

  it('debe lanzar HttpException 404 si la recompensa no existe', async () => {
    // Simulamos que el repositorio devuelve null
    rewardRepo.findById.mockResolvedValue(null);

    await expect(useCase.softDeleteReward(mockId, adminUserId)).rejects.toThrow(
      HttpException,
    );

    // Verificamos que NO se intente borrar si no existe
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rewardRepo.delete).not.toHaveBeenCalled();
  });

  it('debe lanzar HttpException 500 si el repositorio falla inesperadamente', async () => {
    // Simulamos un error genérico (ej. base de datos fuera de línea)
    rewardRepo.findById.mockRejectedValue(new Error('Fallo de conexión'));

    await expect(useCase.softDeleteReward(mockId, adminUserId)).rejects.toThrow(
      HttpException,
    );
  });

  it('debe re-lanzar el error si ya es una instancia de HttpException', async () => {
    // Cubrimos la rama "if (error instanceof HttpException)" del catch
    const customError = new HttpException('Error manual', 403);
    rewardRepo.findById.mockRejectedValue(customError);

    await expect(useCase.softDeleteReward(mockId, adminUserId)).rejects.toThrow(
      customError,
    );
  });
});
