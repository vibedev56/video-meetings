import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth-user.js';
import { AssertCanUploadMeetingFileQuery } from './queries/assert-can-upload-meeting-file.query.js';

type UploadRequest = Request & { user?: AuthUser };

/**
 * Runs before multer reads the body, so a request to a foreign or full meeting
 * is refused without writing a file to disk.
 */
@Injectable()
export class UploadMeetingFileGuard implements CanActivate {
  constructor(private readonly queryBus: QueryBus) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<UploadRequest>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    await this.queryBus.execute(
      new AssertCanUploadMeetingFileQuery(
        request.user.id,
        String(request.params.id),
      ),
    );

    return true;
  }
}
