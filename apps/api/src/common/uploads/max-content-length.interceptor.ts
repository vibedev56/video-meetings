import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

/**
 * Builds an interceptor that refuses an upload by its `Content-Length` header
 * before multer reads the body. `Connection: close` stops the server from
 * draining a body it will never use. Requests without a numeric header are
 * limited by multer instead.
 */
export function createMaxContentLengthInterceptor(
  limitBytes: number,
  message: string,
): Type<NestInterceptor> {
  @Injectable()
  class MaxContentLengthInterceptor implements NestInterceptor {
    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      const http = context.switchToHttp();
      const request = http.getRequest<Request>();
      const response = http.getResponse<Response>();
      const contentLength = Number(request.headers['content-length']);

      if (
        request.headers['content-length'] !== undefined &&
        contentLength > limitBytes
      ) {
        response.setHeader('Connection', 'close');
        throw new PayloadTooLargeException(message);
      }

      return next.handle();
    }
  }

  return MaxContentLengthInterceptor;
}
