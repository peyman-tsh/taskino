import { HttpException, HttpStatus } from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';
import { NormalizedApiError } from './api-error-response.interface';
import { ErrorCode } from './error-code.enum';

type HttpExceptionResponse = {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  error?: string;
  errors?: unknown;
};

export class ErrorResponseFactory {
  static fromException(exception: unknown): NormalizedApiError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof MongooseError.ValidationError) {
      return this.fromMongooseValidationError(exception);
    }

    if (this.isMongoCastError(exception)) {
      return this.fromMongoCastError(exception);
    }

    if (exception instanceof MongoServerError && exception.code === 11000) {
      return this.fromDuplicateKeyError(exception);
    }

    if (exception instanceof MongoServerError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.DATABASE_ERROR,
        message: exception.message,
        errors: null,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message:
        exception instanceof Error ? exception.message : 'Internal server error',
      errors: null,
    };
  }

  private static fromHttpException(exception: HttpException): NormalizedApiError {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        statusCode,
        code: this.codeFromHttpStatus(statusCode),
        message: response,
        errors: null,
      };
    }

    const body = response as HttpExceptionResponse;

    return {
      statusCode,
      code: body.code ?? this.codeFromHttpStatus(statusCode, body.message),
      message: body.message ?? exception.message,
      error: body.error,
      errors: this.normalizeErrors(body.errors),
    };
  }

  private static fromMongooseValidationError(
    exception: MongooseError.ValidationError,
  ): NormalizedApiError {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Validation failed',
      errors: Object.values(exception.errors).map((error) => ({
        field: error.path,
        message: error.message,
      })),
    };
  }

  private static fromMongoCastError(exception: {
    path?: string;
    value?: unknown;
  }): NormalizedApiError {
    const field = exception.path ?? 'field';

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: ErrorCode.INVALID_OBJECT_ID,
      message: `Invalid ${field}: ${String(exception.value)}`,
      errors: [{ field, message: 'Invalid identifier format' }],
    };
  }

  private static fromDuplicateKeyError(
    exception: MongoServerError,
  ): NormalizedApiError {
    const keyValue = exception.keyValue as Record<string, unknown> | undefined;
    const field = Object.keys(keyValue ?? {})[0] ?? 'field';

    return {
      statusCode: HttpStatus.CONFLICT,
      code: ErrorCode.DUPLICATE_KEY,
      message: `${field} already exists`,
      errors: [{ field, message: 'Duplicate value' }],
    };
  }

  private static normalizeErrors(
    errors: unknown,
  ): NormalizedApiError['errors'] {
    if (!errors) return null;
    if (Array.isArray(errors)) return errors;
    if (typeof errors === 'string') return [errors];
    return null;
  }

  private static isMongoCastError(
    exception: unknown,
  ): exception is { name: string; path?: string; value?: unknown } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      (exception as { name?: string }).name === 'CastError'
    );
  }

  private static codeFromHttpStatus(
    statusCode: number,
    message?: string | string[],
  ): ErrorCode {
    if (statusCode === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
      return ErrorCode.VALIDATION_FAILED;
    }

    const codes: Partial<Record<HttpStatus, ErrorCode>> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
    };

    return codes[statusCode as HttpStatus] ?? ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
