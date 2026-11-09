import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'node:crypto';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../auth/infrastructure/api/guard/auth.guard.js';
import { verifyWebOrigin } from '../../../auth/infrastructure/api/auth-transport.js';
import { ConfirmUpload } from '../../application/use-cases/commands/confirm-upload/confirm-upload.js';
import { DeleteMedia } from '../../application/use-cases/commands/delete-media/delete-media.js';
import { ImportFromUrl } from '../../application/use-cases/commands/import-from-url/import-from-url.js';
import { ImportLocal } from '../../application/use-cases/commands/import-local/import-local.js';
import { RequestPresignedUrl } from '../../application/use-cases/commands/request-presigned-url/request-presigned-url.js';
import { ListRessources } from '../../application/use-cases/queries/list-ressources/list-ressources.js';
import { ConfirmUploadDto } from './dto/confirm-upload.dto.js';
import { ImportFromUrlDto } from './dto/import-from-url.dto.js';
import { ImportLocalDto } from './dto/import-local.dto.js';
import { ListRessourcesDto } from './dto/list-ressources.dto.js';
import { RequestPresignedUrlDto } from './dto/request-presigned-url.dto.js';

@Controller('mediatheque')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class MediathequeController {
  constructor(
    private readonly requestPresignedUrl: RequestPresignedUrl,
    private readonly confirmUpload: ConfirmUpload,
    private readonly importFromUrl: ImportFromUrl,
    private readonly importLocal: ImportLocal,
    private readonly deleteMedia: DeleteMedia,
    private readonly listRessources: ListRessources,
    private readonly config: ConfigService,
  ) {}

  private mutation(req: AuthenticatedRequest) {
    if (req.cookies?.access_token) {
      verifyWebOrigin(req, this.config.getOrThrow<string>('auth.webOrigin'));
    }
  }

  @Get()
  list(@Query() query: ListRessourcesDto) {
    return this.listRessources.handle(query);
  }

  @Post('presign')
  requestUploadUrl(
    @Req() req: AuthenticatedRequest,
    @Body() body: RequestPresignedUrlDto,
  ) {
    this.mutation(req);
    return this.requestPresignedUrl.handle(body);
  }

  @Post('confirm')
  confirm(@Req() req: AuthenticatedRequest, @Body() body: ConfirmUploadDto) {
    this.mutation(req);
    return this.confirmUpload.handle(body);
  }

  @Post('import-url')
  importUrl(@Req() req: AuthenticatedRequest, @Body() body: ImportFromUrlDto) {
    this.mutation(req);
    return this.importFromUrl.handle(body);
  }

  @Post('import-local')
  importLocalFile(
    @Req() req: AuthenticatedRequest,
    @Body() body: ImportLocalDto,
  ) {
    this.mutation(req);
    return this.importLocal.handle(body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: UUID,
  ) {
    this.mutation(req);
    await this.deleteMedia.handle({ id });
  }
}
