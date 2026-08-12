import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SupabaseValidationTokenService } from '../../application/use-case/validationT.use-case';
import { SupabaseRefreshTokenService } from '../../application/use-case/refreshT.use-case';
import { SupabaseGetUserProfileService } from '../../application/use-case/getUserProfile.use-case';
import { SupabaseCreateTestUserService } from '../../application/use-case/login-user.use-case';
import { SupabaseRegisterUserService } from '../../application/use-case/register-user.use-case';
import { GetMeUseCase } from '../../application/use-case/getMe.use-case';
import { SignInUseCase } from '../../application/use-case/signin.use-case';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  RegisterUserDto,
  ResetPasswordDto,
  AdminUpdateUserDto,
  SignInDto,
  SignInTestuserDto,
} from '../../application/dto/auth.dto';
import { SupabaseAuthGuard } from '../../guard/supabse-auth.guard';
import { RefreshTokenThrottlerGuard } from '../../guard/refresh-token-throttler.guard';
import type { AuthenticatedRequest } from '../../interfaces/types/authenticated-request.interface';
import { ForgotPasswordUseCase } from '../../application/use-case/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/use-case/reset-password.use-case';
import { UpdateFotoPerfilUseCase } from '../../application/use-case/update-foto-perfil.use-case';
import { UpdatePerfilUseCase } from '../../application/use-case/update-perfil.use-case';
import type { UpdatePerfilDto } from '../../application/use-case/update-perfil.use-case';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../guard/roles.decorator';
import { RolUsuario } from '../../domain/enums/user.enum';
import { RolesGuard } from '../../guard/roles.guard';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';

@Controller('auth')
export class SupabaseAuthController {
  /* istanbul ignore next */
  constructor(
    private readonly validationService: SupabaseValidationTokenService,
    private readonly refreshService: SupabaseRefreshTokenService,
    private readonly getUserProfileService: SupabaseGetUserProfileService,
    private readonly createTestUserService: SupabaseCreateTestUserService,
    private readonly registerUserService: SupabaseRegisterUserService,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly updateFotoPerfilUseCase: UpdateFotoPerfilUseCase,
    private readonly updatePerfilUseCase: UpdatePerfilUseCase,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /** Endpoint de login limpio — solo devuelve access_token y refresh_token */
  @Throttle({ default: { limit: 5, ttl: 90000 } })
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  /* istanbul ignore next */
  async signIn(@Body() dto: SignInDto) {
    return await this.signInUseCase.signInWithCredentials(
      dto.email,
      dto.password,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 90000 } })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  /* istanbul ignore next */
  async signUp(@Body() registerUserDto: RegisterUserDto) {
    return await this.registerUserService.register(registerUserDto);
  }

  @UseGuards(RefreshTokenThrottlerGuard)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  /* istanbul ignore next */
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.refreshService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @UseGuards(SupabaseAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Token not found in header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    return await this.getUserProfileService.getUserProfile(token);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async getMe(@Request() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    const id: string = req.user.id;
    const email: string | undefined = req.user.email;
    return this.getMeUseCase.getMyProfile(id, email);
  }

  @Get('verify')
  @UseGuards(SupabaseAuthGuard)
  verifyToken(@Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return {
      success: true,
      user: req.user,
      message: 'Token valid and user authenticated',
    };
  }

  @Throttle({ default: { limit: 5, ttl: 90000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  /* istanbul ignore next */
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.forgotPasswordUseCase.forgotPassword(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 90000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  /* istanbul ignore next */
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.resetPasswordUseCase.resetPassword(
      dto.accessToken,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  /** Solo para desarrollo/testing interno — bloqueado en producción */
  @Post('test/signin')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(RolUsuario.admin)
  @HttpCode(HttpStatus.OK)
  /* istanbul ignore next */
  async signInTestestuser(@Body() signInTestUserDto: SignInTestuserDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Not available');
    }
    return await this.createTestUserService.signInTestuser(
      signInTestUserDto.email,
      signInTestUserDto.password,
    );
  }

  /* istanbul ignore next */
  @Patch('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar datos del perfil del usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado correctamente' })
  @HttpCode(HttpStatus.OK)
  async updatePerfil(
    @Body() dto: UpdatePerfilDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    await this.updatePerfilUseCase.execute(req.user.id, dto);
    return { message: 'Perfil actualizado correctamente' };
  }

  /* istanbul ignore next */
  @Put('me/foto')
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar foto de perfil del usuario autenticado',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de perfil (jpeg, png, webp, gif · máx 5 MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'URL pública de la nueva foto de perfil',
    schema: {
      example: { foto_perfil_url: 'https://…/profiles/uuid/uuid.jpg' },
    },
  })
  async updateFotoPerfil(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ foto_perfil_url: string }> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    if (!file)
      throw new BadRequestException('Se requiere un archivo de imagen válido');
    const url = await this.updateFotoPerfilUseCase.update(req.user.id, file);
    return { foto_perfil_url: url };
  }

  /* istanbul ignore next */
  @Delete('me/foto')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminar foto de perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Foto de perfil eliminada' })
  @HttpCode(HttpStatus.OK)
  async deleteFotoPerfil(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    await this.updateFotoPerfilUseCase.delete(req.user.id);
    return { message: 'Foto de perfil eliminada correctamente' };
  }

  @Get('admin/users')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(RolUsuario.admin, RolUsuario.empleado)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Listar usuarios para panel administrativo filtrados',
  })
  @ApiResponse({ status: 200, description: 'Usuarios listados correctamente' })
  async getAdminUsers(
    @Query('q') terminoBusqueda?: string, // Lo que el usuario escribe en el input
    @Query('rol') rolFiltro?: string, // El valor del select (ej. 'admin', 'empleado', 'todos')
  ) {
    // Ahora le pasamos estos parámetros a tu repositorio para que haga la magia en la BD
    return await this.usuarioRepository.findAllForAdmin(
      terminoBusqueda,
      rolFiltro,
    );
  }

  @Patch('admin/users/:id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(RolUsuario.admin, RolUsuario.empleado)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar usuario desde panel administrativo' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado correctamente',
  })
  async updateAdminUser(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<{ message: string }> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');

    const currentRole = await this.usuarioRepository.findRolById(req.user.id);
    if (!currentRole) {
      throw new UnauthorizedException('User role not found');
    }

    if (currentRole !== RolUsuario.admin) {
      const sanitizedDto: AdminUpdateUserDto = {
        nombre: dto.nombre,
        apellidos: dto.apellidos,
        nivel_experiencia: dto.nivel_experiencia,
      };
      await this.usuarioRepository.updateUserForAdmin(id, sanitizedDto);
      return { message: 'Usuario actualizado correctamente' };
    }

    await this.usuarioRepository.updateUserForAdmin(id, dto);
    return { message: 'Usuario actualizado correctamente' };
  }

  @Delete('admin/users/:id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(RolUsuario.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Desactivar usuario (soft delete) desde admin' })
  @ApiResponse({
    status: 200,
    description: 'Usuario desactivado correctamente',
  })
  async deleteAdminUser(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    await this.usuarioRepository.softDeleteForAdmin(id);
    return { message: 'Usuario desactivado correctamente' };
  }
}
