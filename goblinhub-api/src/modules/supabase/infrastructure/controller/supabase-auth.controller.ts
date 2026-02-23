import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { SupabaseValidationTokenService } from '../../application/use-case/validationT.use-case';
import { SupabaseRefreshTokenService } from '../../application/use-case/refreshT.use-case';
import { SupabaseGetUserProfileService } from '../../application/use-case/getUserProfile.use-case';
import { SupabaseCreateTestUserService } from '../../application/use-case/login-user.use-case';
import { SupabaseRegisterUserService } from '../../application/use-case/register-user.use-case';
import {
  //   CreateTesruserDto,
  RefreshTokenDto,
  RegisterUserDto,
  SignInTestuserDto,
  validateTokenDto,
} from '../../application/dto/auth.dto';
import { SupabaseAuthGuard } from '../../guard/supabse-auth.guard';
import type { AuthenticatedRequest } from '../../interfaces/types/authenticated-request.interface';

@Controller('auth')
export class SupabaseAuthController {
  constructor(
    private readonly validationService: SupabaseValidationTokenService,
    private readonly refreshService: SupabaseRefreshTokenService,
    private readonly getUserProfileService: SupabaseGetUserProfileService,
    private readonly createTestUserService: SupabaseCreateTestUserService,
    private readonly registerUserService: SupabaseRegisterUserService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() registerUserDto: RegisterUserDto) {
    return await this.registerUserService.register(registerUserDto);
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() validateTokenDto: validateTokenDto) {
    return await this.validationService.validtoken(validateTokenDto.token);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.refreshService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @UseGuards(SupabaseAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Token no encontrado en el header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token no encontrado');
    }

    return await this.getUserProfileService.getUserProfile(token);
  }

  @Get('verify')
  @UseGuards(SupabaseAuthGuard)
  verifyToken(@Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    return {
      success: true,
      user: req.user,
      message: 'Token valido y usuario autenticado',
    };
  }

  @Post('test/signin')
  @HttpCode(HttpStatus.OK)
  async signInTestestuser(@Body() signInTestUserDto: SignInTestuserDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Not available');
    }
    return await this.createTestUserService.signInTestuser(
      signInTestUserDto.email,
      signInTestUserDto.password,
    );
  }

  //   @Get('test/users')
  //   @HttpCode(HttpStatus.OK)
  //   listTestUsers() {
  //     return this.createTestUserService.listAuthUsers();
  //   }
}
