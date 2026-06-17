import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { validate } from './config/env.validation';
import appConfig from './config/app.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './task/task.module';
import { LeaveRequestModule } from './LeaveRequest/LeaveRequest.module';
import { ExcelModule } from './excel/excel.module';
import { NotificationModule } from './notification/notification.module';
import { ManagerModule } from './manager/manager.module';
import { InternalEventBusModule } from './common/events/internal-event-bus.module';
import { FixedTaskModule } from './fixedTask/fixed-task.module';
import { SupervisorModule } from './supervisor/supervisor.module';

function withRetryableWritesDisabled(uri: string): string {
  if (/[?&]retryWrites=/.test(uri)) {
    return uri.replace(/([?&])retryWrites=[^&]*/, '$1retryWrites=false');
  }

  return `${uri}${uri.includes('?') ? '&' : '?'}retryWrites=false`;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
      load: [appConfig],
    }),
    InternalEventBusModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: withRetryableWritesDisabled(
          configService.get<string>('MONGODB_URI')!,
        ),
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    TaskModule,
    LeaveRequestModule,
    ExcelModule,
    NotificationModule,
    ManagerModule,
    FixedTaskModule,
    SupervisorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
