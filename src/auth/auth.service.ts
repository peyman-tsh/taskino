import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { UserDocument, UserRole } from '../user/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Response structure for registration
 */
export interface RegisterResponse {
  user: Omit<UserDocument, 'password'>;
  accessToken: string;
}

/**
 * Response structure for login
 */
export interface LoginResponse {
  user: Omit<UserDocument, 'password'>;
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('app.jwtSecret') ??
      'your-super-secret-jwt-key';
    this.jwtExpiresIn =
      this.configService.get<string>('app.jwtExpiresIn') ?? '15m';
  }

  /**
   * Register a new user with JWT token generation
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const { password } = registerDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userService.create(registerDto, hashedPassword);
    const accessToken = this.generateToken(user);

    return {
      user,
      accessToken,
    };
  }

  /**
   * Login user and return JWT token
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { mobile, password } = loginDto;

    // Find user by email (with password field)
    const user = await this.userService.findByMobile(mobile);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const accessToken = this.generateToken(user);

    return {
      user,
      accessToken,
    };
  }

  /**
   * Generate JWT access token
   */
  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.roles || UserRole.SPECIALIST,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn as any,
    } as any);
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(payload: {
    sub: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Logout (token revocation - client-side in stateless JWT)
   */
  async logout(userId: string): Promise<void> {
    // For stateless JWT, logout is handled client-side
    // Implement token blacklisting here if using stateful JWT
    return;
  }
}
