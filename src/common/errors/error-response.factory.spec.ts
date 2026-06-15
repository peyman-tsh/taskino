import { BadRequestException, HttpStatus } from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { BusinessException } from './business.exception';
import { ErrorCode } from './error-code.enum';
import { ErrorResponseFactory } from './error-response.factory';

describe('ErrorResponseFactory', () => {
  it('normalizes class-validator bad request errors', () => {
    const error = ErrorResponseFactory.fromException(
      new BadRequestException(['title should not be empty']),
    );

    expect(error).toEqual(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_FAILED,
        message: ['title should not be empty'],
        errors: null,
      }),
    );
  });

  it('preserves business exception codes', () => {
    const error = ErrorResponseFactory.fromException(
      new BusinessException('TASK_ALREADY_SCORED', 'Task score already applied'),
    );

    expect(error).toEqual(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'TASK_ALREADY_SCORED',
        message: 'Task score already applied',
      }),
    );
  });

  it('normalizes mongo cast errors', () => {
    const error = ErrorResponseFactory.fromException({
      name: 'CastError',
      path: '_id',
      value: 'bad-id',
    });

    expect(error).toEqual(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.INVALID_OBJECT_ID,
        message: 'Invalid _id: bad-id',
      }),
    );
  });

  it('normalizes duplicate key errors', () => {
    const duplicateError = Object.assign(
      new MongoServerError({ message: 'duplicate key' }),
      {
        code: 11000,
        keyValue: { email: 'user@example.com' },
      },
    );

    const error = ErrorResponseFactory.fromException(duplicateError);

    expect(error).toEqual(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        code: ErrorCode.DUPLICATE_KEY,
        message: 'email already exists',
      }),
    );
  });
});
