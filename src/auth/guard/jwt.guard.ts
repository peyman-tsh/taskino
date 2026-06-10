import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
//   canActivate(context: ExecutionContext) {
//     console.log('JwtAuthGuard canActivate called');
//     return super.canActivate(context);
//   }

//   handleRequest(err: any, user: any, info: any) {
//     console.log('JwtAuthGuard handleRequest');
//     console.log('err:', err);
//     console.log('user:', user);
//     console.log('info:', info);

//     if (err || !user) {
//       throw err || new UnauthorizedException('Invalid or missing token');
//     }

//     return user;
//   }
}