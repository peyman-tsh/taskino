import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { Task, TaskSchema } from './task.schema';
import { ExcelModule } from '../excel/excel.module';
import { UserModule } from 'src/user/user.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    UserModule,
    forwardRef(() => ProjectModule),
    ExcelModule,
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
