import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('mail.user');
    const password = this.configService.get<string>('mail.password');

    this.from = this.configService.get<string>('mail.from') ?? user ?? '';
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host') ?? 'smtp.gmail.com',
      port: this.configService.get<number>('mail.port') ?? 465,
      secure: this.configService.get<boolean>('mail.secure') ?? true,
      auth: user && password ? { user, pass: password } : undefined,
    });
  }

  async sendPasswordResetCode(
    recipient: string,
    firstName: string,
    verificationCode: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipient,
        subject: 'کد بازیابی رمز عبور تسکینو',
        text: `سلام ${firstName}، کد بازیابی رمز عبور شما: ${verificationCode}`,
        html: this.buildPasswordResetCodeTemplate(
          firstName,
          verificationCode,
        ),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Password reset email failed for "${recipient}": ${message}`,
      );
      throw new ServiceUnavailableException(
        'Password reset email could not be sent',
      );
    }
  }

  private buildPasswordResetCodeTemplate(
    firstName: string,
    verificationCode: string,
  ): string {
    return `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">
        <h2>بازیابی رمز عبور تسکینو</h2>
        <p>سلام ${this.escapeHtml(firstName)}،</p>
        <p>کد تأیید شما:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px">
          ${this.escapeHtml(verificationCode)}
        </p>
        <p>این کد پس از ۱۵ دقیقه منقضی می‌شود.</p>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[character]!,
    );
  }
}
