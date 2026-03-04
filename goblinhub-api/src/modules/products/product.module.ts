import { Module } from '@nestjs/common';
import { ProductoController } from './interfaces/controllers/product.controller';
import { GetProductoUseCase } from './aplication/use-case/get-product.use-case';
import { CreateProductoUseCase } from './aplication/use-case/create-product.use-case';
import { UpdateProductoUseCase } from './aplication/use-case/update-product.use-case';
import { SoftDeleteProductoUseCase } from './aplication/use-case/soft-deled-product.use-case';
import { ProductRepository } from './domain/repositories/product.respository';
import { ProductoPrismaRepository } from './infrastructure/prisma/product.repository';
import { PrismaModule } from '../../connect/prisma.module';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';

@Module({
  controllers: [ProductoController],
  providers: [
    GetProductoUseCase,
    CreateProductoUseCase,
    UpdateProductoUseCase,
    SoftDeleteProductoUseCase,
    {
      provide: ProductRepository,
      useClass: ProductoPrismaRepository,
    },
  ],
  imports: [PrismaModule, SupabaseAuthModule],
})
export class ProductoModule {}
