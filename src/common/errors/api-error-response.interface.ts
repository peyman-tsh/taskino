import { ErrorCode } from './error-code.enum';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface NormalizedApiError {
  statusCode: number;
  code: ErrorCode | string;
  message: string | string[];
  errors: ApiErrorDetail[] | string[] | null;
  error?: string;
}

export interface ApiErrorResponse extends NormalizedApiError {
  path: string;
  method: string;
  timestamp: string;
}
