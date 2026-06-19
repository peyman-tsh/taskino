import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: process.env.SMTP_SECURE !== 'false',
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASS,
  from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
  resetUrl: process.env.PASSWORD_RESET_URL ?? 'http://localhost:3001/reset-password',
  resetTokenExpiresMinutes: Number(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES ?? 15,
  ),
}));
