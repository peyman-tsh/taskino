import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ApiErrorResponse,
  ErrorResponseFactory,
} from '../common/errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const normalizedError = ErrorResponseFactory.fromException(exception);

    const body: ApiErrorResponse = {
      ...normalizedError,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    response.status(normalizedError.statusCode).json(body);
  }
}
