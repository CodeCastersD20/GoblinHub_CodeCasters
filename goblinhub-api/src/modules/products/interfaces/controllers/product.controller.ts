import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateProductoUseCase } from '../../aplication/use-case/create-product.use-case';
import { UpdateProductoUseCase } from '../../aplication/use-case/update-product.use-case';
import { SoftDeleteProductoUseCase } from '../../aplication/use-case/soft-deled-product.use-case';
import { GetProductoUseCase } from '../../aplication/use-case/get-product.use-case';
import { Producto } from '../../domain/entities/product.entity';
import { CreateProductoDto } from '../../aplication/dtos/create-product.dtos';
import { UpdateProductoDto } from '../../aplication/dtos/update-product.dto';
import { CategoriaProducto } from '../../domain/enums/product.enum';

@Controller('productos') // Usar plural ('productos') es el estándar en APIs REST
export class ProductoController {
  constructor(
    private readonly getUseCase: GetProductoUseCase,
    private readonly createUseCase: CreateProductoUseCase,
    private readonly updateUseCase: UpdateProductoUseCase,
    private readonly deleteUseCase: SoftDeleteProductoUseCase,
  ) {}

  @Get()
  async getAllProductos(): Promise<Producto[]> {
    return this.getUseCase.getAllProductos();
  }

  // Nota: El ID ahora es string porque estamos usando UUIDs
  @Get(':id')
  async getProductoById(@Param('id') id: string): Promise<Producto> {
    return this.getUseCase.getByIdProducto(id);
  }

  // Endpoint extra que armamos para filtrar por las categorías de tu enum
  @Get('categoria/:categoria')
  async getProductosByCategoria(
    @Param('categoria') categoria: CategoriaProducto,
  ): Promise<Producto[]> {
    return this.getUseCase.getByCategoriaProducto(categoria);
  }

  @Post()
  async createProducto(
    @Body() createProductoDto: CreateProductoDto,
  ): Promise<Producto> {
    return this.createUseCase.createProducto(createProductoDto);
  }

  @Put(':id')
  async updateProducto(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ): Promise<Producto> {
    return this.updateUseCase.updateProducto(id, updateProductoDto);
  }

  // Corregido el typo: @Delete(':id') en lugar de @Delete('id')
  @Delete(':id')
  async deleteProducto(@Param('id') id: string): Promise<void> {
    return this.deleteUseCase.softDeleteProducto(id); // Devolvemos void como acordamos
  }
}