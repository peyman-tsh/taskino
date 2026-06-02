import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

/**
 * Interface for file system operations.
 * Abstracts native fs module for better testability.
 */
export interface IFileSystem {
  writeFile(filePath: string, data: Buffer | string): Promise<void>;
  readFile(filePath: string): Promise<Buffer>;
  mkdir(dirPath: string, options?: { recursive: boolean }): Promise<void>;
  access(filePath: string): Promise<boolean>;
  unlink(filePath: string): Promise<void>;
}

/**
 * Production implementation of IFileSystem using Node.js fs module.
 */
@Injectable()
export class NodeFileSystem implements IFileSystem {
  async writeFile(filePath: string, data: Buffer | string): Promise<void> {
    await fs.promises.writeFile(filePath, data);
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  async mkdir(dirPath: string, options?: { recursive: boolean }): Promise<void> {
    await fs.promises.mkdir(dirPath, options);
  }

  async access(filePath: string): Promise<boolean> {
    return fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  async unlink(filePath: string): Promise<void> {
    await unlink(filePath);
  }
}