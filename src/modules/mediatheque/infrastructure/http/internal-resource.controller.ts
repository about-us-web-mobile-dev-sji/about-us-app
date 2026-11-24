import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../auth/infrastructure/api/guard/auth.guard.js';
import { verifyWebOrigin } from '../../../auth/infrastructure/api/auth-transport.js';
import { RegisterInternalResource } from '../../application/use-cases/commands/register-internal-resource/register-internal-resource.js';
import { RegisterInternalResourceDto } from './dto/register-internal-resource.dto.js';

@Controller('internal')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class InternalResourceController {
  constructor(
    private readonly registerInternalResource: RegisterInternalResource,
    private readonly config: ConfigService,
  ) {}

  @Post('resource')
  register(
    @Req() req: AuthenticatedRequest,
    @Body() body: RegisterInternalResourceDto,
  ) {
    if (req.cookies?.access_token) {
      verifyWebOrigin(req, this.config.getOrThrow<string>('auth.webOrigin'));
    }
    return this.registerInternalResource.handle(body);
  }
}
