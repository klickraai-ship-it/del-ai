import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

export interface SESEmailParams {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export class SESEmailService {
  private client: SESClient;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);
    
    if (this.isConfigured) {
      this.client = new SESClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID!,
          secretAccessKey: AWS_SECRET_ACCESS_KEY!,
        },
      });
    } else {
      console.warn('AWS SES not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
      this.client = null as any;
    }
  }

  async sendEmail(params: SESEmailParams): Promise<{ messageId: string }> {
    if (!this.isConfigured) {
      throw new Error('AWS SES is not configured. Please set AWS credentials in environment variables.');
    }

    const fromAddress = params.fromName 
      ? `${params.fromName} <${params.from}>`
      : params.from;

    const sesParams: SendEmailCommandInput = {
      Source: fromAddress,
      Destination: {
        ToAddresses: [params.to],
      },
      Message: {
        Subject: {
          Data: params.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: params.html,
            Charset: 'UTF-8',
          },
          Text: params.text ? {
            Data: params.text,
            Charset: 'UTF-8',
          } : undefined,
        },
      },
      ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    };

    try {
      const command = new SendEmailCommand(sesParams);
      const result = await this.client.send(command);
      
      if (!result.MessageId) {
        throw new Error('No MessageId returned from SES');
      }

      return { messageId: result.MessageId };
    } catch (error) {
      console.error('Error sending email via SES:', error);
      throw error;
    }
  }

  async sendBulkEmails(emails: SESEmailParams[]): Promise<{ sent: number; failed: number; errors: any[] }> {
    if (!this.isConfigured) {
      throw new Error('AWS SES is not configured. Please set AWS credentials in environment variables.');
    }

    let sent = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const email of emails) {
      try {
        await this.sendEmail(email);
        sent++;
      } catch (error) {
        failed++;
        errors.push({ email: email.to, error });
      }
    }

    return { sent, failed, errors };
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }
}

export const sesEmailService = new SESEmailService();
