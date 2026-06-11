import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SeedFixedTasksDto {
  @ApiProperty({
    description: 'Absolute path of the four-sheet fixed-task Excel file',
    example:
      'C:\\Users\\Zarnegar\\Downloads\\-1408847228164432127_81294547954101.xlsx',
  })
  @IsString()
  @IsNotEmpty()
  sourcePath: string;
}
