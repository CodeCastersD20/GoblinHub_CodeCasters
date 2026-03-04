import { CreateRewardUseCase } from './create-reward.use-case';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { TipoRecompensa } from '../../domain/enums/reward.enum';
import { CreateRecompensaDto } from '../dtos/create-reward.dto';
import { Recompensa } from '../../domain/entities/reward.entity';

describe('CreateRewardUseCase', () => {
  let useCase: CreateRewardUseCase;
  let rewardRepo: jest.Mocked<RewardRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockDto: CreateRecompensaDto = {
    nombre: 'Poción de Vida Extra',
    descripcion: 'Recupera 50 HP',
    costo_puntos: 100,
    tipo: TipoRecompensa.DESCUENTO,
    valor_descuento: 0,
    activa: true,
  };

  const mockCreatedReward = new Recompensa(
    1,
    'Poción de Vida Extra',
    'Recupera 50 HP',
    100,
    TipoRecompensa.DESCUENTO,
    0,
    true,
  );

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
    rewardRepo.create.mockResolvedValue(mockCreatedReward);

    const result = await useCase.execute(mockDto, 'admin-uuid');

    expect(result.id).toBe(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rewardRepo.create).toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException si el usuario no tiene permisos', async () => {
    userRepo.findRolById.mockResolvedValue(null);

    await expect(useCase.execute(mockDto, 'user-uuid')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe lanzar HttpException 400 si el nombre ya existe', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.empleado);
    rewardRepo.findByName.mockResolvedValue(
      new Recompensa(
        2,
        'Poción de Vida Extra',
        undefined,
        100,
        TipoRecompensa.DESCUENTO,
      ),
    );

    await expect(useCase.execute(mockDto, 'emp-uuid')).rejects.toThrow(
      HttpException,
    );
  });

  it('debe lanzar HttpException 400 si el tipo de recompensa es inválido', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    rewardRepo.findByName.mockResolvedValue(null);

    const invalidDto: CreateRecompensaDto = {
      ...mockDto,
      tipo: 'TIPO_INVENTADO' as TipoRecompensa,
    };

    await expect(useCase.execute(invalidDto, 'admin-uuid')).rejects.toThrow(
      HttpException,
    );
  });

  it('debe lanzar HttpException 500 ante un error inesperado del repositorio', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    rewardRepo.findByName.mockRejectedValue(new Error('Fallo total de DB'));

    await expect(useCase.execute(mockDto, 'admin-uuid')).rejects.toThrow(
      HttpException,
    );
  });

  it('debe re-lanzar el error si ya es una HttpException controlada', async () => {
    userRepo.findRolById.mockRejectedValue(
      new HttpException('Error manual', 418),
    );

    try {
      await useCase.execute(mockDto, 'admin-uuid');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(418);
    }
  });
});
