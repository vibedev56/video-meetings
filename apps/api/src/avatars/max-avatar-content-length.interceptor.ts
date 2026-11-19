import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { MAX_AVATAR_REQUEST_BYTES } from './avatar.policy.js';

/** Refuses an oversized avatar by `Content-Length` before multer reads the body. */
@Injectable()
export class MaxAvatarContentLengthInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (
      request.headers['content-length'] !== undefined &&
      Number(request.headers['content-length']) > MAX_AVATAR_REQUEST_BYTES
    ) {
      response.setHeader('Connection', 'close');
      throw new PayloadTooLargeException('Avatar is too large (max 2 MB)');
    }

    return next.handle();
  }
}
