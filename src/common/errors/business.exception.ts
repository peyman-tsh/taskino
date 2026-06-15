import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorDetail } from './api-error-response.interface';
import { ErrorCode } from './error-code.enum';

export class BusinessException extends HttpException {
  constructor(
    code: ErrorCode | string,
    message: string,
    statusCode = HttpStatus.BAD_REQUEST,
    errors: ApiErrorDetail[] | string[] | null = null,
  ) {
    super({ statusCode, code, message, errors }, statusCode);
  }
}
