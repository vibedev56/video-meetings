import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { MAX_REQUEST_BYTES } from './meeting-file.policy.js';

/**
 * Refuses an upload by its `Content-Length` header before multer reads the
 * body. `Connection: close` stops the server from draining a body it will
 * never use. Requests without the header are limited by multer instead.
 */
@Injectable()
export class MaxContentLengthInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const contentLength = Number(request.headers['content-length']);

    if (
      request.headers['content-length'] !== undefined &&
      contentLength > MAX_REQUEST_BYTES
    ) {
      response.setHeader('Connection', 'close');
      throw new PayloadTooLargeException('File is too large');
    }

    return next.handle();
  }
}
