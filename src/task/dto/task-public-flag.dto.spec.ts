import { plainToInstance } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';

describe('Task isPublic DTO transformation', () => {
  it.each([CreateTaskDto, UpdateTaskDto])(
    'converts multipart false for %p',
    (DtoClass) => {
      const dto = plainToInstance(
        DtoClass,
        { isPublic: 'false' },
        { enableImplicitConversion: true },
      );

      expect(dto.isPublic).toBe(false);
    },
  );

  it.each([CreateTaskDto, UpdateTaskDto])(
    'converts multipart true for %p',
    (DtoClass) => {
      const dto = plainToInstance(
        DtoClass,
        { isPublic: 'true' },
        { enableImplicitConversion: true },
      );

      expect(dto.isPublic).toBe(true);
    },
  );
});
