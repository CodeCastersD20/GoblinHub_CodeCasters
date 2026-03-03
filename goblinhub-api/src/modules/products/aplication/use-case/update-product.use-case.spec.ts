import { UpdateProductoUseCase } from './update-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { Producto } from '../../domain/entities/product.entity';
import { CategoriaProducto } from '../../domain/enums/product.enum';
import { UpdateProductoDto } from '../dtos/update-product.dto';

describe('UpdateProductoUseCase', () => {
  let useCase: UpdateProductoUseCase;
  let productRepo: jest.Mocked<ProductRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockExistingProduct = new Producto(
    'uuid-123',
    'Producto Original',
    CategoriaProducto.ACCESORIOS,
    100,
    5,
    2,
    false,
    false,
    true,
    new Date('2023-01-01'),
    new Date('2023-01-01'),
    'Marca A',
    'Desc A',
    120,
    'url_A',
  );

  beforeEach(() => {
    productRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    userRepo = {
      findRolById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new UpdateProductoUseCase(productRepo, userRepo);
  });

  it('debe actualizar el producto combinando datos nuevos y existentes', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.findById.mockResolvedValue(mockExistingProduct);

    const updateDto: UpdateProductoDto = {
      nombre: 'Nombre Actualizado',
      precio: 150,
    };

    const updatedProduct = new Producto(
      'uuid-123',
      'Nombre Actualizado',
      CategoriaProducto.ACCESORIOS,
      150,
      5,
      2,
      false,
      false,
      true,
      new Date('2023-01-01'),
      new Date(),
      'Marca A',
      'Desc A',
      120,
      'url_A',
    );
    productRepo.update.mockResolvedValue(updatedProduct);

    const result = await useCase.updateProducto(
      'uuid-123',
      updateDto,
      'admin-uuid',
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(productRepo.update).toHaveBeenCalled();
    expect(result.nombre).toBe('Nombre Actualizado');
    expect(result.precio).toBe(150);
    expect(result.categoria).toBe(mockExistingProduct.categoria);
    expect(result.id_producto).toBe(mockExistingProduct.id_producto);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene permisos', async () => {
    userRepo.findRolById.mockResolvedValue(null);

    await expect(
      useCase.updateProducto('uuid-123', {}, 'client-uuid'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar HttpException 404 si el producto no existe', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.updateProducto('uuid-999', {}, 'admin-uuid'),
    ).rejects.toThrow(HttpException);
  });

  it('debe lanzar HttpException 500 si falla el repositorio al buscar', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.findById.mockRejectedValue(new Error('Fallo DB'));

    await expect(
      useCase.updateProducto('uuid-123', {}, 'admin-uuid'),
    ).rejects.toThrow(HttpException);
  });

  it('debe re-lanzar HttpException si ocurre dentro del catch', async () => {
    const errorHttp = new HttpException('Error custom', 401);
    userRepo.findRolById.mockRejectedValue(errorHttp);

    await expect(
      useCase.updateProducto('uuid-123', {}, 'admin-uuid'),
    ).rejects.toThrow(errorHttp);
  });
});
