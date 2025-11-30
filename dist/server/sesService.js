import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
export class SESEmailService {
    constructor(accessKeyId, secretAccessKey, region) {
        // Support both constructor params and environment variables
        const keyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID;
        const secretKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
        const awsRegion = region || process.env.AWS_REGION || 'us-east-1';
        this.isConfigured = !!(keyId && secretKey);
        if (this.isConfigured) {
            this.client = new SESClient({
                region: awsRegion,
                credentials: {
                    accessKeyId: keyId,
                    secretAccessKey: secretKey,
                },
            });
        }
        else {
            console.warn('AWS SES not configured. Provide credentials to constructor or set environment variables.');
            this.client = null;
        }
    }
    async sendEmail(params) {
        if (!this.isConfigured) {
            throw new Error('AWS SES is not configured. Please set AWS credentials in environment variables.');
        }
        const fromAddress = params.fromName
            ? `${params.fromName} <${params.from}>`
            : params.from;
        const sesParams = {
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
        }
        catch (error) {
            console.error('Error sending email via SES:', error);
            throw error;
        }
    }
    async sendBulkEmails(emails) {
        if (!this.isConfigured) {
            throw new Error('AWS SES is not configured. Please set AWS credentials in environment variables.');
        }
        let sent = 0;
        let failed = 0;
        const errors = [];
        for (const email of emails) {
            try {
                await this.sendEmail(email);
                sent++;
            }
            catch (error) {
                failed++;
                errors.push({ email: email.to, error });
            }
        }
        return { sent, failed, errors };
    }
    isAvailable() {
        return this.isConfigured;
    }
}
export const sesEmailService = new SESEmailService();
