import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './user.controller';
import { UserService } from './services/user.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserQueryService } from './services/user-query.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserQueryService],
  exports: [UserService, UserQueryService],
})
export class UserModule {}
