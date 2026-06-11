import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { NodeFileSystem } from '../file-system.provider';
import type { IFileSystem } from '../file-system.provider';

const UPLOAD_DIR_SEGMENT = 'excel';

@Injectable()
export class ExcelStorageService {
  private readonly uploadDir = join(
    process.cwd(),
    'uploads',
    UPLOAD_DIR_SEGMENT,
  );

  constructor(
    @Inject(NodeFileSystem.name)
    private readonly fileSystem: IFileSystem,
  ) {}

  async save(file: Express.Multer.File): Promise<{
    fileName: string;
    filePath: string;
  }> {
    await this.fileSystem.mkdir(this.uploadDir, { recursive: true });
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = join(this.uploadDir, fileName);
    await this.fileSystem.writeFile(filePath, file.buffer);
    return { fileName, filePath };
  }

  read(filePath: string): Promise<Buffer> {
    return this.fileSystem.readFile(filePath);
  }

  async ensureExists(filePath: string): Promise<void> {
    if (!(await this.fileSystem.access(filePath))) {
      throw new NotFoundException('File not found on server');
    }
  }

  async deleteIfExists(filePath?: string): Promise<void> {
    if (!filePath) return;

    try {
      await this.fileSystem.unlink(filePath);
    } catch {
      // The database record can still be removed if the file is already gone.
    }
  }
}
