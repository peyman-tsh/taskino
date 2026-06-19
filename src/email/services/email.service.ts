import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
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

  async sendPasswordReset(
    recipient: string,
    firstName: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipient,
        subject: 'بازیابی رمز عبور تسکینو',
        text: `سلام ${firstName}`,
        html: this.buildPasswordResetTemplate(firstName),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Password reset email could not be sent',
      );
    }
  }

  private buildPasswordResetTemplate(
    firstName: string,
  ): string {
    return `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">
        <h2>بازیابی رمز عبور تسکینو</h2>
        <p>سلام ${this.escapeHtml(firstName)}،</p>
        <p>برای ثبت رمز عبور جدید روی لینک زیر کلیک کنید:</p>
        <p>این لینک پس از ۱۵ دقیقه منقضی می‌شود.</p>
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
