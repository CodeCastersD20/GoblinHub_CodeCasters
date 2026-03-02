import { CreateProductoUseCase } from './create-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { HttpException } from '@nestjs/common';

describe('CreateProductoUseCase', () => {
  let useCase: CreateProductoUseCase;
  let productRepo: jest.Mocked<ProductRepository>;

  const mockDto = {
    nombre: 'Dados de Resina Epóxica',
    categoria: 'Accesorios',
    precio: 250,
    stock: 10,
    marca: 'Goblin Workshop',
    descripcion: 'Dados hechos a mano para D&D',
    precio_original: 300,
    imagen_url: 'http://imagen.jpg'
  } as any;

  beforeEach(() => {
    // Mockeamos el repositorio
    productRepo = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    useCase = new CreateProductoUseCase(productRepo);
  });

  it('debe crear un producto exitosamente', async () => {
    // Simulamos que el repo guarda y retorna el producto con ID
    const mockCreatedProduct = { ...mockDto, id: 'uuid-generado' };
    productRepo.create.mockResolvedValue(mockCreatedProduct);

    // cast to any so we can assert the id field that Producto doesn’t declare
    const result = await useCase.createProducto(mockDto) as any;

    expect(productRepo.create).toHaveBeenCalled();
    expect((result as any).id).toBe('uuid-generado');
    expect(result.nombre).toBe(mockDto.nombre);
  });

  it('debe lanzar HttpException 500 si el repositorio falla', async () => {
    // Simulamos un error de base de datos
    productRepo.create.mockRejectedValue(new Error('Fallo de conexión'));

    await expect(useCase.createProducto(mockDto)).rejects.toThrow(HttpException);
  });
  
  it('debe re-lanzar HttpException si el error ya es una instancia de HttpException', async () => {
    // Caso de borde para cubrir la línea del catch que verifica la instancia
    productRepo.create.mockRejectedValue(new HttpException('Error controlado', 400));

    try {
      await useCase.createProducto(mockDto);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
    }
  });
});