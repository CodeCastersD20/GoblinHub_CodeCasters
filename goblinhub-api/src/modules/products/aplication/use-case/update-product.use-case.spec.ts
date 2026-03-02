import { UpdateProductoUseCase } from './update-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { HttpException } from '@nestjs/common';
import { Producto } from '../../domain/entities/product.entity';

describe('UpdateProductoUseCase', () => {
  let useCase: UpdateProductoUseCase;
  let productRepo: jest.Mocked<ProductRepository>;

  const mockExistingProduct = {
    id_producto: 'uuid-123',
    nombre: 'Producto Original',
    categoria: 'General',
    precio: 100,
    stock: 5,
    stock_minimo: 2,
    popular: false,
    es_nuevo: false,
    activo: true,
    created_at: new Date('2023-01-01'),
    marca: 'Marca A',
    descripcion: 'Desc A',
    precio_original: 120,
    imagen_url: 'url_A',
    deleted_at: null
  } as any;

  beforeEach(() => {
    productRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    useCase = new UpdateProductoUseCase(productRepo);
  });

  it('debe actualizar el producto combinando datos nuevos y existentes', async () => {
    productRepo.findById.mockResolvedValue(mockExistingProduct);
    
    const updateDto = {
      nombre: 'Nombre Actualizado',
      precio: 150
      // Los demás campos vendrán del producto existente
    };

    productRepo.update.mockImplementation((id, data) => Promise.resolve({ ...mockExistingProduct, ...data }));

    const result = await useCase.updateProducto('uuid-123', updateDto);

    expect(productRepo.update).toHaveBeenCalled();
    expect(result.nombre).toBe('Nombre Actualizado');
    expect(result.precio).toBe(150);
    expect(result.categoria).toBe(mockExistingProduct.categoria); // Se mantuvo el original
    expect(result.id_producto).toBe(mockExistingProduct.id_producto); // El ID no cambió
  });

  it('debe lanzar HttpException 404 si el producto no existe', async () => {
    productRepo.findById.mockResolvedValue(null);

    await expect(useCase.updateProducto('uuid-999', {}))
      .rejects.toThrow(HttpException);
  });

  it('debe lanzar HttpException 500 si falla el repositorio al buscar', async () => {
    productRepo.findById.mockRejectedValue(new Error('Fallo DB'));

    await expect(useCase.updateProducto('uuid-123', {}))
      .rejects.toThrow(HttpException);
  });

  it('debe re-lanzar HttpException si ocurre dentro del catch', async () => {
    const errorHttp = new HttpException('Error custom', 401);
    productRepo.findById.mockRejectedValue(errorHttp);

    await expect(useCase.updateProducto('uuid-123', {}))
      .rejects.toThrow(errorHttp);
  });
});