import { SoftDeleteProductoUseCase } from './soft-deled-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { HttpException } from '@nestjs/common';

describe('SoftDeleteProductoUseCase', () => {
  let useCase: SoftDeleteProductoUseCase;
  let productRepo: jest.Mocked<ProductRepository>;

  const mockId = 'uuid-123';

  beforeEach(() => {
    // Mockeamos solo los métodos que necesitamos
    productRepo = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    useCase = new SoftDeleteProductoUseCase(productRepo);
  });

  it('debe realizar el soft delete exitosamente si el producto existe', async () => {
    // 1. Simulamos que el producto existe
    productRepo.findById.mockResolvedValue({ id: mockId } as any);
    // 2. Simulamos que el delete funciona (retorna void según tu código)
    productRepo.delete.mockResolvedValue(undefined);

    await useCase.softDeleteProducto(mockId);

    expect(productRepo.findById).toHaveBeenCalledWith(mockId);
    expect(productRepo.delete).toHaveBeenCalledWith(mockId);
  });

  it('debe lanzar HttpException 404 si el producto no existe', async () => {
    // Simulamos que el repositorio no encuentra nada
    productRepo.findById.mockResolvedValue(null);

    await expect(useCase.softDeleteProducto(mockId)).rejects.toThrow(HttpException);
    
    // Verificamos que no intente borrar si no existe
    expect(productRepo.delete).not.toHaveBeenCalled();
  });

  it('debe lanzar HttpException 500 si el repositorio falla inesperadamente', async () => {
    // Simulamos un error genérico (ej. base de datos caída)
    productRepo.findById.mockRejectedValue(new Error('Fallo crítico'));

    await expect(useCase.softDeleteProducto(mockId)).rejects.toThrow(HttpException);
  });

  it('debe re-lanzar el error si ya es una instancia de HttpException', async () => {
    // Cubrimos el "if (error instanceof HttpException)" del catch
    const customError = new HttpException('Error manual', 403);
    productRepo.findById.mockRejectedValue(customError);

    await expect(useCase.softDeleteProducto(mockId)).rejects.toThrow(customError);
  });
});