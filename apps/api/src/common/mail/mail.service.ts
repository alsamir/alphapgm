import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SettingsService } from '../../modules/settings/settings.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) {
    const host = this.configService.get('SMTP_HOST');
    const port = this.configService.get('SMTP_PORT');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port || '587', 10),
        secure: port === '465',
        auth: { user, pass },
      });
      this.logger.log(`Mail transport configured: ${host}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged to console');
    }
  }

  /**
   * Get the "from" email address.
   * Priority: site_settings.smtp_from → env SMTP_FROM → default
   */
  private async getFromEmail(): Promise<string> {
    try {
      const settings = await this.settingsService.getAll();
      if (settings.smtp_from) return settings.smtp_from;
    } catch {
      // Settings service not available yet (startup), fall through
    }
    return this.configService.get('SMTP_FROM', 'dev@alphapgm.com');
  }

  async sendVerificationEmail(to: string, token: string, name?: string): Promise<void> {
    const appUrl = this.configService.get('NEXT_PUBLIC_APP_URL', 'http://localhost:3002');
    const verifyUrl = `${appUrl}/en/verify-email?token=${token}`;
    const fromEmail = await this.getFromEmail();

    const subject = 'Verify your Catalyser account';
    const html = `
      <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
        <div style="text-align:center;padding:30px 0 20px;border-bottom:2px solid #00e88f;">
          <h1 style="margin:0;font-size:24px;color:#111;">Catalyser</h1>
        </div>
        <div style="padding:30px 20px;">
          <h2 style="margin:0 0 10px;font-size:20px;">Welcome${name ? `, ${name}` : ''}!</h2>
          <p style="color:#666;line-height:1.6;">
            Thank you for creating a Catalyser account. Please verify your email address to activate your account and receive your free credits.
          </p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:#00e88f;color:#111;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
              Verify Email
            </a>
          </div>
          <p style="color:#999;font-size:13px;">
            Or copy this link: <a href="${verifyUrl}" style="color:#00e88f;">${verifyUrl}</a>
          </p>
          <p style="color:#999;font-size:12px;margin-top:20px;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align:center;padding:20px;border-top:1px solid #eee;color:#bbb;font-size:11px;">
          Catalyser — Professional Catalytic Converter Pricing
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Catalyser" <${fromEmail}>`,
          to,
          subject,
          html,
        });
        this.logger.log(`Verification email sent to ${to}`);
      } catch (error) {
        this.logger.error(`Failed to send verification email to ${to}:`, error);
        // Don't throw — email failure shouldn't block registration
      }
    } else {
      // Dev mode: log verification link
      this.logger.log(`[DEV] Verification email for ${to}:`);
      this.logger.log(`[DEV] Verify URL: ${verifyUrl}`);
    }
  }

  async sendCustomEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    const fromEmail = await this.getFromEmail();

    const html = `
      <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
        <div style="text-align:center;padding:30px 0 20px;border-bottom:2px solid #00e88f;">
          <h1 style="margin:0;font-size:24px;color:#111;">Catalyser</h1>
        </div>
        <div style="padding:30px 20px;">
          ${htmlBody}
        </div>
        <div style="text-align:center;padding:20px;border-top:1px solid #eee;color:#bbb;font-size:11px;">
          Catalyser — Professional Catalytic Converter Pricing
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Catalyser" <${fromEmail}>`,
          to,
          subject,
          html,
        });
        this.logger.log(`Custom email sent to ${to}: ${subject}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}:`, error);
        throw error;
      }
    } else {
      this.logger.log(`[DEV] Email to ${to}: ${subject}`);
      this.logger.log(`[DEV] Body: ${htmlBody.substring(0, 200)}...`);
    }
  }
}
