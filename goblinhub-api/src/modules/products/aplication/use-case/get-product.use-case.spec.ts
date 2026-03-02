import { GetProductoUseCase } from './get-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { HttpException } from '@nestjs/common';
import { CategoriaProducto } from '../../domain/enums/product.enum';

describe('GetProductoUseCase', () => {
  let useCase: GetProductoUseCase;
  let productRepo: jest.Mocked<ProductRepository>;

  const mockProduct = {
    id: 'uuid-123',
    nombre: 'Playmat Pro',
    categoria: 'Accesorios',
    precio: 500,
    stock: 5,
  } as any;

  beforeEach(() => {
    productRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCategory: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    useCase = new GetProductoUseCase(productRepo);
  });

  describe('getAllProductos', () => {
    it('debe retornar todos los productos', async () => {
      productRepo.findAll.mockResolvedValue([mockProduct]);
      const result = await useCase.getAllProductos();
      expect(result).toEqual([mockProduct]);
    });

    it('debe lanzar 404 si el arreglo está vacío', async () => {
      productRepo.findAll.mockResolvedValue([]);
      await expect(useCase.getAllProductos()).rejects.toThrow(HttpException);
    });

    it('debe lanzar 500 si falla el repositorio', async () => {
      productRepo.findAll.mockRejectedValue(new Error('DB Error'));
      await expect(useCase.getAllProductos()).rejects.toThrow(HttpException);
    });
  });

  describe('getByIdProducto', () => {
    it('debe retornar un producto por su ID', async () => {
      productRepo.findById.mockResolvedValue(mockProduct);
      const result = await useCase.getByIdProducto('uuid-123');
      expect(result).toEqual(mockProduct);
    });

    it('debe lanzar 404 si no se encuentra el producto', async () => {
      productRepo.findById.mockResolvedValue(null);
      await expect(useCase.getByIdProducto('uuid-999')).rejects.toThrow(HttpException);
    });

    it('debe lanzar 500 si falla el repositorio', async () => {
      productRepo.findById.mockRejectedValue(new Error('DB Error'));
      await expect(useCase.getByIdProducto('uuid-123')).rejects.toThrow(HttpException);
    });
  });

  describe('getByCategoriaProducto', () => {
    const validCategory = Object.values(CategoriaProducto)[0] as CategoriaProducto;

    it('debe retornar productos de una categoría', async () => {
      productRepo.findByCategory.mockResolvedValue([mockProduct]);
      const result = await useCase.getByCategoriaProducto(validCategory);
      expect(result).toEqual([mockProduct]);
    });

    it('debe lanzar 404 si no hay productos en esa categoría', async () => {
      productRepo.findByCategory.mockResolvedValue([]);
      await expect(useCase.getByCategoriaProducto(validCategory)).rejects.toThrow(HttpException);
    });

    it('debe lanzar 500 si falla el repositorio', async () => {
      productRepo.findByCategory.mockRejectedValue(new Error('DB Error'));
      await expect(useCase.getByCategoriaProducto(validCategory)).rejects.toThrow(HttpException);
    });
  });
});