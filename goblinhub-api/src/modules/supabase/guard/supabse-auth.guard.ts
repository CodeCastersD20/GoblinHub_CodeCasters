import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SupabaseValidationTokenService } from '../application/use-case/validationT.use-case';
import {
  SupabaseUser,
  AuthenticatedRequest,
} from '../interfaces/types/authenticated-request.interface';
import { ValidationResult } from '../interfaces/types/validation-result.interface';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly validationTokenService: SupabaseValidationTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException(
        'Authorization header is missing or invalid',
      );
    }

    const token = authHeader.split(' ')[1]; // Assuming "Bearer <
    if (!token) {
      throw new UnauthorizedException(
        'Token is missing from Authorization header',
      );
    }
    try {
      const result: ValidationResult =
        await this.validationTokenService.validtoken(token);

      if (result.success && result.user) {
        request.user = result.user as SupabaseUser;
        this.logger.log(
          `token validated successfully for user: ${
            result.user.email ?? result.user.id
          }`,
        );
        return true;
      }
      throw new UnauthorizedException('Invalid token');
    } catch (error: unknown) {
      const errorMesage = this.extractErrorMessage(error);
      this.logger.error(`Token validation failed: ${errorMesage}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Extracts a meaningful error message from various error types.
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (
      error &&
      typeof error == 'object' &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    ) {
      return (error as { message: string }).message;
    }

    return 'Unknown error';
  }
}
