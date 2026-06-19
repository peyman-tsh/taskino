import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { AuthService } from './services/auth.service';
import { PasswordResetService } from './services/password-reset.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user and returns JWT access token',
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticates user and returns JWT access token',
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a password reset verification code',
    description:
      'Finds the account by mobile and sends a six-digit code to its email.',
    security: [],
  })
  @ApiResponse({ status: 200, description: 'Request accepted' })
  requestPasswordReset(@Body() dto: ForgotPasswordDto) {
    return this.passwordResetService.requestReset(dto.mobile);
  }

  @Post('password/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify the password reset code',
    description:
      'Returns a temporary resetToken and the password change endpoint.',
    security: [],
  })
  @ApiResponse({ status: 200, description: 'Verification code accepted' })
  @ApiResponse({ status: 400, description: 'Code is invalid or expired' })
  verifyPasswordResetCode(@Body() dto: VerifyPasswordResetCodeDto) {
    return this.passwordResetService.verifyCode(dto.mobile, dto.code);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password after code verification',
    security: [],
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Password reset session is invalid or expired',
  })
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.passwordResetService.changePassword(
      dto.resetToken,
      dto.newPassword,
    );
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deprecated alias for password/change',
    security: [],
    deprecated: true,
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.changePassword(
      dto.token,
      dto.newPassword,
    );
  }
}
