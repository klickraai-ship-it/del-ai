import { sendEmailViaResend, isResendConfigured } from './resendEmailSender';
import { sesEmailService, SESEmailParams } from './sesService';

export interface EmailParams {
  to: string;
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailProvider = 'resend' | 'ses';

export class UnifiedEmailService {
  private provider: EmailProvider;

  constructor() {
    const configuredProvider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
    
    if (configuredProvider === 'ses' && sesEmailService.isAvailable()) {
      this.provider = 'ses';
      console.log('✅ Email provider: AWS SES');
    } else {
      this.provider = 'resend';
      console.log('✅ Email provider: Resend');
    }
  }

  async sendEmail(params: EmailParams): Promise<{ messageId?: string }> {
    if (this.provider === 'ses') {
      return await this.sendViaSES(params);
    } else {
      return await this.sendViaResend(params);
    }
  }

  private async sendViaSES(params: EmailParams): Promise<{ messageId: string }> {
    const sesParams: SESEmailParams = {
      to: params.to,
      from: params.from,
      fromName: params.fromName,
      replyTo: params.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
    };

    return await sesEmailService.sendEmail(sesParams);
  }

  private async sendViaResend(params: EmailParams): Promise<{ messageId?: string }> {
    await sendEmailViaResend(params);
    return {};
  }

  async isConfigured(): Promise<boolean> {
    if (this.provider === 'ses') {
      return sesEmailService.isAvailable();
    } else {
      return await isResendConfigured();
    }
  }

  getProvider(): EmailProvider {
    return this.provider;
  }
}

export const emailService = new UnifiedEmailService();
