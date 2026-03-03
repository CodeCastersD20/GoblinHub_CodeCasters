import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger'; // Importaciones de Swagger
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import { CreateProductoUseCase } from '../../aplication/use-case/create-product.use-case';
import { UpdateProductoUseCase } from '../../aplication/use-case/update-product.use-case';
import { SoftDeleteProductoUseCase } from '../../aplication/use-case/soft-deled-product.use-case';
import { GetProductoUseCase } from '../../aplication/use-case/get-product.use-case';
import { Producto } from '../../domain/entities/product.entity';
import { CreateProductoDto } from '../../aplication/dtos/create-product.dtos';
import { UpdateProductoDto } from '../../aplication/dtos/update-product.dto';
import { CategoriaProducto } from '../../domain/enums/product.enum';
import type { AuthenticatedRequest } from '../../../supabase/interfaces/types/authenticated-request.interface';

@ApiTags('Productos') // Agrupa este controlador en la sección "Productos" de Swagger
@Controller('productos')
export class ProductoController {
  constructor(
    private readonly getUseCase: GetProductoUseCase,
    private readonly createUseCase: CreateProductoUseCase,
    private readonly updateUseCase: UpdateProductoUseCase,
    private readonly deleteUseCase: SoftDeleteProductoUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos activos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos recuperada con éxito.',
  })
  async getAllProductos(): Promise<Producto[]> {
    return this.getUseCase.getAllProductos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por su UUID' })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Producto encontrado.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  async getProductoById(@Param('id') id: string): Promise<Producto> {
    return this.getUseCase.getByIdProducto(id);
  }

  @Get('categoria/:categoria')
  @ApiOperation({ summary: 'Filtrar productos por categoría' })
  @ApiParam({
    name: 'categoria',
    enum: CategoriaProducto,
    description: 'Categoría del producto',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos de la categoría recuperados.',
  })
  async getProductosByCategoria(
    @Param('categoria') categoria: CategoriaProducto,
  ): Promise<Producto[]> {
    return this.getUseCase.getByCategoriaProducto(categoria);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('access-token') // Requiere token JWT
  @ApiOperation({ summary: 'Crear un nuevo producto (Admin)' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente.' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para realizar esta acción.',
  })
  async createProducto(
    @Body() createProductoDto: CreateProductoDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Producto> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return this.createUseCase.createProducto(createProductoDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'UUID del producto a actualizar' })
  @ApiResponse({ status: 200, description: 'Producto actualizado.' })
  @ApiResponse({
    status: 404,
    description: 'No se encontró el producto para actualizar.',
  })
  async updateProducto(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Producto> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return this.updateUseCase.updateProducto(
      id,
      updateProductoDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminación lógica de un producto' })
  @ApiParam({ name: 'id', description: 'UUID del producto a eliminar' })
  @ApiResponse({ status: 200, description: 'Producto marcado como eliminado.' })
  async deleteProducto(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return this.deleteUseCase.softDeleteProducto(id, req.user.id);
  }
}
