import { CreateProductoUseCase } from './create-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { CreateProductoDto } from '../dtos/create-product.dtos';
import { Producto } from '../../domain/entities/product.entity';
import { CategoriaProducto } from '../../domain/enums/product.enum';

describe('CreateProductoUseCase', () => {
  let useCase: CreateProductoUseCase;
  let productRepo: jest.Mocked<ProductRepository>;
  let userRepo: jest.Mocked<UsuarioRepository>;

  const mockDto: CreateProductoDto = {
    nombre: 'Dados de Resina Epóxica',
    categoria: CategoriaProducto.ACCESORIOS,
    precio: 250,
    stock: 10,
    marca: 'Goblin Workshop',
    descripcion: 'Dados hechos a mano para D&D',
    precio_original: 300,
    imagen_url: 'http://imagen.jpg',
  };

  const mockCreatedProduct = new Producto(
    'uuid-generado',
    'Dados de Resina Epóxica',
    CategoriaProducto.ACCESORIOS,
    250,
    10,
    3,
    false,
    false,
    true,
    new Date(),
    new Date(),
    'Goblin Workshop',
    'Dados hechos a mano para D&D',
    300,
    'http://imagen.jpg',
  );

  beforeEach(() => {
    productRepo = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    userRepo = {
      findRolById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new CreateProductoUseCase(productRepo, userRepo);
  });

  it('debe crear un producto exitosamente si el usuario es admin', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.create.mockResolvedValue(mockCreatedProduct);

    const result = await useCase.createProducto(mockDto, 'admin-uuid');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(productRepo.create).toHaveBeenCalled();
    expect(result.id_producto).toBe('uuid-generado');
    expect(result.nombre).toBe(mockDto.nombre);
  });

  it('debe crear un producto exitosamente si el usuario es empleado', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.empleado);
    productRepo.create.mockResolvedValue(mockCreatedProduct);

    const result = await useCase.createProducto(mockDto, 'empleado-uuid');

    expect(result.id_producto).toBe('uuid-generado');
  });

  it('debe lanzar ForbiddenException si el usuario no tiene permisos', async () => {
    userRepo.findRolById.mockResolvedValue(null);

    await expect(
      useCase.createProducto(mockDto, 'client-uuid'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar HttpException 500 si el repositorio falla', async () => {
    userRepo.findRolById.mockResolvedValue(RolUsuario.admin);
    productRepo.create.mockRejectedValue(new Error('Fallo de conexión'));

    await expect(useCase.createProducto(mockDto, 'admin-uuid')).rejects.toThrow(
      HttpException,
    );
  });

  it('debe re-lanzar HttpException si el error ya es una instancia de HttpException', async () => {
    userRepo.findRolById.mockRejectedValue(
      new HttpException('Error controlado', 400),
    );

    try {
      await useCase.createProducto(mockDto, 'admin-uuid');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
    }
  });
});
