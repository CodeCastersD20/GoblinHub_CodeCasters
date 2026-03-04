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
import { GetMeUseCase } from '../../application/use-case/getMe.use-case';
import { SignInUseCase } from '../../application/use-case/signin.use-case';
import {
  RefreshTokenDto,
  RegisterUserDto,
  SignInDto,
  SignInTestuserDto,
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
    private readonly getMeUseCase: GetMeUseCase,
    private readonly signInUseCase: SignInUseCase,
  ) {}

  /** Endpoint de login limpio — solo devuelve access_token y refresh_token */
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto) {
    return await this.signInUseCase.execute(dto.email, dto.password);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() registerUserDto: RegisterUserDto) {
    return await this.registerUserService.register(registerUserDto);
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
    return this.getMeUseCase.execute(id, email);
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

  /** Solo para desarrollo/testing interno — bloqueado en producción */
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
}
