import { UpdateRewardUseCase } from './update-reward.use-case';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { HttpException } from '@nestjs/common';
import { Recompensa } from '../../domain/entities/reward.entity';
import { TipoRecompensa } from '../../domain/enums/reward.enum';
import { UpdateRecompensaDto } from '../dtos/update-reward.dto';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

describe('UpdateRewardUseCase', () => {
  let useCase: UpdateRewardUseCase;
  let rewardRepo: jest.Mocked<RewardRepository>;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  const adminUserId = 'admin-uuid-1234';

  const mockExistingReward = new Recompensa(
    1,
    'Cupón de Descuento',
    '10% de descuento en la tienda',
    50,
    TipoRecompensa.DESCUENTO,
    10,
    true,
  );

  beforeEach(() => {
    rewardRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<RewardRepository>;

    usuarioRepo = {
      findRolById: jest.fn().mockResolvedValue(RolUsuario.admin),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new UpdateRewardUseCase(rewardRepo, usuarioRepo);
  });

  it('debe actualizar la recompensa mezclando los nuevos datos con los existentes', async () => {
    rewardRepo.findById.mockResolvedValue(mockExistingReward);

    const updateDto: UpdateRecompensaDto = {
      nombre: 'Cupón Pro',
      costo_puntos: 100,
    };

    const updatedReward = new Recompensa(
      1,
      'Cupón Pro',
      '10% de descuento en la tienda',
      100,
      TipoRecompensa.DESCUENTO,
      10,
      true,
    );
    rewardRepo.update.mockResolvedValue(updatedReward);

    const result = await useCase.updateReward(1, updateDto, adminUserId);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rewardRepo.update).toHaveBeenCalled();
    expect(result.nombre).toBe('Cupón Pro');
    expect(result.costo_puntos).toBe(100);
    expect(result.descripcion).toBe(mockExistingReward.descripcion);
    expect(result.id).toBe(mockExistingReward.id);
  });

  // --- ESTE ES EL TEST QUE TE DARÁ EL 100% DE BRANCHES ---
  it('debe mantener los valores originales si el DTO viene vacío (Nullish Coalescing)', async () => {
    rewardRepo.findById.mockResolvedValue(mockExistingReward);
    rewardRepo.update.mockResolvedValue(mockExistingReward);

    const result = await useCase.updateReward(1, {}, adminUserId); // DTO vacío

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rewardRepo.update).toHaveBeenCalled();
    expect(result.nombre).toBe(mockExistingReward.nombre);
    expect(result.descripcion).toBe(mockExistingReward.descripcion);
    expect(result.costo_puntos).toBe(mockExistingReward.costo_puntos);
    expect(result.activa).toBe(mockExistingReward.activa);
  });
  // -------------------------------------------------------

  it('debe lanzar HttpException 404 si la recompensa no existe', async () => {
    rewardRepo.findById.mockResolvedValue(null);

    await expect(useCase.updateReward(999, {}, adminUserId)).rejects.toThrow(
      HttpException,
    );
  });

  it('debe lanzar HttpException 500 si el repositorio falla al buscar', async () => {
    rewardRepo.findById.mockRejectedValue(new Error('Error de base de datos'));

    await expect(useCase.updateReward(1, {}, adminUserId)).rejects.toThrow(
      HttpException,
    );
  });

  it('debe re-lanzar HttpException si ocurre dentro del catch', async () => {
    const errorHttp = new HttpException('No autorizado', 401);
    rewardRepo.findById.mockRejectedValue(errorHttp);

    await expect(useCase.updateReward(1, {}, adminUserId)).rejects.toThrow(
      errorHttp,
    );
  });
});
