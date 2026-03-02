import { UpdateRewardUseCase } from './update-reward.use-case';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { HttpException } from '@nestjs/common';

describe('UpdateRewardUseCase', () => {
  let useCase: UpdateRewardUseCase;
  let rewardRepo: jest.Mocked<RewardRepository>;

  const mockExistingReward = {
    id: 1,
    nombre: 'Cupón de Descuento',
    descripcion: '10% de descuento en la tienda',
    costo_puntos: 50,
    tipo: 'Descuento',
    valor_descuento: 10,
    activa: true,
  } as any;

  beforeEach(() => {
    rewardRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<RewardRepository>;

    useCase = new UpdateRewardUseCase(rewardRepo);
  });

  it('debe actualizar la recompensa mezclando los nuevos datos con los existentes', async () => {
    rewardRepo.findById.mockResolvedValue(mockExistingReward);
    
    const updateDto = {
      nombre: 'Cupón Pro',
      costo_puntos: 100
    };

    rewardRepo.update.mockImplementation((id, data) => Promise.resolve({ ...mockExistingReward, ...data }));

    const result = await useCase.updateReward(1, updateDto);

    expect(rewardRepo.update).toHaveBeenCalled();
    expect(result.nombre).toBe('Cupón Pro');
    expect(result.costo_puntos).toBe(100);
    expect(result.descripcion).toBe(mockExistingReward.descripcion); 
    expect(result.id).toBe(mockExistingReward.id);
  });

  // --- ESTE ES EL TEST QUE TE DARÁ EL 100% DE BRANCHES ---
  it('debe mantener los valores originales si el DTO viene vacío (Nullish Coalescing)', async () => {
    rewardRepo.findById.mockResolvedValue(mockExistingReward);
    
    // Simulamos que el update recibe la entidad construida solo con valores originales
    rewardRepo.update.mockImplementation((id, data) => Promise.resolve({ ...mockExistingReward, ...data }));

    const result = await useCase.updateReward(1, {}); // DTO vacío

    expect(rewardRepo.update).toHaveBeenCalled();
    expect(result.nombre).toBe(mockExistingReward.nombre);
    expect(result.descripcion).toBe(mockExistingReward.descripcion);
    expect(result.costo_puntos).toBe(mockExistingReward.costo_puntos);
    expect(result.activa).toBe(mockExistingReward.activa);
  });
  // -------------------------------------------------------

  it('debe lanzar HttpException 404 si la recompensa no existe', async () => {
    rewardRepo.findById.mockResolvedValue(null);

    await expect(useCase.updateReward(999, {}))
      .rejects.toThrow(HttpException);
  });

  it('debe lanzar HttpException 500 si el repositorio falla al buscar', async () => {
    rewardRepo.findById.mockRejectedValue(new Error('Error de base de datos'));

    await expect(useCase.updateReward(1, {}))
      .rejects.toThrow(HttpException);
  });

  it('debe re-lanzar HttpException si ocurre dentro del catch', async () => {
    const errorHttp = new HttpException('No autorizado', 401);
    rewardRepo.findById.mockRejectedValue(errorHttp);

    await expect(useCase.updateReward(1, {}))
      .rejects.toThrow(errorHttp);
  });
});