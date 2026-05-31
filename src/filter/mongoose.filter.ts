import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | any = 'Internal server error';
    let errors: any = null;

    // -----------------------------
    // 1. NestJS HttpException
    // -----------------------------
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      message =
        typeof res === 'string'
          ? res
          : (res as any).message || exception.message;

      errors = (res as any).errors || null;
    }

    // -----------------------------
    // 2. Mongoose Validation Error
    // -----------------------------
    else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';

      errors = Object.values(exception.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
      }));
    }

    // -----------------------------
    // 3. CastError (invalid ObjectId)
    // -----------------------------
    else if (exception.name === 'CastError') {
      status = HttpStatus.BAD_REQUEST;

      message = `Invalid ${exception.path}: ${exception.value}`;
    }

    // -----------------------------
    // 4. Duplicate Key Error (MongoDB)
    // -----------------------------
    else if (
      exception instanceof MongoServerError &&
      exception.code === 11000
    ) {
      status = HttpStatus.CONFLICT;

      const field = Object.keys(exception.keyValue || {})[0];

      message = `${field} already exists`;
    }

    // -----------------------------
    // 5. General MongoServerError
    // -----------------------------
    else if (exception instanceof MongoServerError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    }

    // -----------------------------
    // 6. Unknown Error
    // -----------------------------
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception?.message || 'Unexpected error';
    }

    // -----------------------------
    // Response format
    // -----------------------------
    response.status(status).json({
      statusCode: status,
      path: request.url,
      method: request.method,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}