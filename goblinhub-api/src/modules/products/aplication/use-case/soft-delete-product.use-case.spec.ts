import { SoftDeleteProductoUseCase } from './soft-deled-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { Producto } from '../../domain/entities/product.entity';
import { CategoriaProducto } from '../../domain/enums/product.enum';

describe('SoftDeleteProductoUseCase', () => {
  let useCase: SoftDeleteProductoUseCase;
  let productRepo: jest.Mocked<ProductRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockId = 'uuid-123';
  const mockAdminId = 'admin-uuid';

  const mockProducto = new Producto(
    mockId,
    'Producto Mock',
    CategoriaProducto.ACCESORIOS,
    100,
    5,
    2,
    false,
    false,
    true,
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    productRepo = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    userRepo = {
      findRolById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new SoftDeleteProductoUseCase(productRepo, userRepo);
  });

  it('debe realizar el soft delete exitosamente si el usuario es admin', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.findById.mockResolvedValue(mockProducto);
    productRepo.delete.mockResolvedValue(undefined);

    await useCase.softDeleteProducto(mockId, mockAdminId);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(productRepo.findById).toHaveBeenCalledWith(mockId);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(productRepo.delete).toHaveBeenCalledWith(mockId);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene permisos', async () => {
    userRepo.findRolById.mockResolvedValue(null);

    await expect(
      useCase.softDeleteProducto(mockId, 'client-uuid'),
    ).rejects.toThrow(ForbiddenException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(productRepo.delete).not.toHaveBeenCalled();
  });

  it('debe lanzar HttpException 404 si el producto no existe', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.softDeleteProducto(mockId, mockAdminId),
    ).rejects.toThrow(HttpException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(productRepo.delete).not.toHaveBeenCalled();
  });

  it('debe lanzar HttpException 500 si el repositorio falla inesperadamente', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.findById.mockRejectedValue(new Error('Fallo crítico'));

    await expect(
      useCase.softDeleteProducto(mockId, mockAdminId),
    ).rejects.toThrow(HttpException);
  });

  it('debe re-lanzar el error si ya es una instancia de HttpException', async () => {
    const customError = new HttpException('Error manual', 403);
    userRepo.findRolById.mockRejectedValue(customError);

    await expect(
      useCase.softDeleteProducto(mockId, mockAdminId),
    ).rejects.toThrow(customError);
  });
});
