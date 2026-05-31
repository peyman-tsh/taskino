import { IsString, IsInt, IsEnum, Min, Max, IsOptional, Matches } from 'class-validator';
import { validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsString()
  NODE_ENV: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  @Matches(/^mongodb:\/\/.+$/)
  MONGODB_URI: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  BCRYPT_SALT_ROUNDS?: number;

  @IsString()
  @IsOptional()
  SWAGGER_PATH?: string;

  @IsString()
  @IsOptional()
  SWAGGER_DOCS_PATH?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}