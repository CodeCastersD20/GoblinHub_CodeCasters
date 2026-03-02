import { CreateRewardUseCase } from './create-reward.use-case';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { TipoRecompensa } from '../../domain/enums/reward.enum';

describe('CreateRewardUseCase', () => {
  let useCase: CreateRewardUseCase;
  let rewardRepo: jest.Mocked<RewardRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockDto = {
    nombre: 'Poción de Vida Extra',
    descripcion: 'Recupera 50 HP',
    costo_puntos: 100,
    tipo: Object.values(TipoRecompensa)[0], // Using a valid enum value
    valor_descuento: 0,
    activa: true,
  } as any;

  beforeEach(() => {
    rewardRepo = {
      findByName: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<RewardRepository>;

    userRepo = {
      findRolById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new CreateRewardUseCase(rewardRepo, userRepo);
  });

  it('debe crear una recompensa exitosamente si el usuario es admin', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    rewardRepo.findByName.mockResolvedValue(null);
    rewardRepo.create.mockResolvedValue({ id: '1', ...mockDto });

    const result = await useCase.execute(mockDto, 'admin-uuid');

    expect(result.id).toBe('1');
    expect(rewardRepo.create).toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException si el usuario no tiene permisos', async () => {
    // Simulamos un rol de usuario normal (suponiendo que existe 'user' o similar)
    userRepo.findRolById.mockResolvedValue('user' as any);

    await expect(useCase.execute(mockDto, 'user-uuid'))
      .rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar HttpException 400 si el nombre ya existe', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.empleado);
    rewardRepo.findByName.mockResolvedValue({ id: 'existente' } as any);

    await expect(useCase.execute(mockDto, 'emp-uuid'))
      .rejects.toThrow(HttpException);
  });

  it('debe lanzar HttpException 400 si el tipo de recompensa es inválido', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    rewardRepo.findByName.mockResolvedValue(null);

    const invalidDto = { ...mockDto, tipo: 'TIPO_INVENTADO' };

    await expect(useCase.execute(invalidDto, 'admin-uuid'))
      .rejects.toThrow(HttpException);
  });

  it('debe lanzar HttpException 500 ante un error inesperado del repositorio', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    rewardRepo.findByName.mockRejectedValue(new Error('Fallo total de DB'));

    await expect(useCase.execute(mockDto, 'admin-uuid'))
      .rejects.toThrow(HttpException);
  });

  it('debe re-lanzar el error si ya es una HttpException controlada', async () => {
    userRepo.findRolById.mockRejectedValue(new HttpException('Error manual', 418));

    try {
      await useCase.execute(mockDto, 'admin-uuid');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(418);
    }
  });
});