import crypto from 'crypto';

export interface EmailTrackingOptions {
  campaignId: string;
  subscriberId: string;
  trackingDomain: string;
}

export interface EmailContent {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

const TRACKING_SECRET = process.env.TRACKING_SECRET || (() => {
  const devSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  WARNING: TRACKING_SECRET environment variable not set!');
  console.warn('⚠️  Using randomly generated secret for development.');
  console.warn('⚠️  SET TRACKING_SECRET in production for persistent token validation!');
  return devSecret;
})();

export class EmailTrackingService {
  private trackingDomain: string;

  constructor(trackingDomain: string) {
    this.trackingDomain = trackingDomain;
  }

  generateTrackingPixel(options: EmailTrackingOptions): string {
    const trackingToken = this.generateTrackingToken(options);
    return `<img src="${this.trackingDomain}/track/open/${trackingToken}" width="1" height="1" alt="" style="display:block" />`;
  }

  wrapLinksWithTracking(htmlContent: string, options: EmailTrackingOptions): { html: string; links: string[] } {
    const links: string[] = [];
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>/gi;
    
    const wrappedHtml = htmlContent.replace(linkRegex, (match, url, attrs) => {
      if (url.startsWith('#') || url.startsWith('mailto:')) {
        return match;
      }

      links.push(url);
      const trackingToken = this.generateClickTrackingToken(options, url);
      const trackingUrl = `${this.trackingDomain}/track/click/${trackingToken}`;
      
      return `<a href="${trackingUrl}"${attrs}>`;
    });

    return { html: wrappedHtml, links };
  }

  injectUnsubscribeLink(htmlContent: string, subscriberId: string, userId?: string): string {
    // Always use HMAC-signed token with userId for security
    const unsubscribeToken = this.generateUnsubscribeToken(subscriberId, userId);
    const unsubscribeUrl = `${this.trackingDomain}/api/public/unsubscribe/${unsubscribeToken}`;
    
    // Replace merge tag if present
    htmlContent = htmlContent.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
    
    const unsubscribeHtml = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
        <p>Don't want to receive these emails? <a href="${unsubscribeUrl}" style="color: #4F46E5;">Unsubscribe</a></p>
      </div>
    `;

    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${unsubscribeHtml}</body>`);
    }
    
    return htmlContent + unsubscribeHtml;
  }

  processEmailForTracking(content: EmailContent, options: EmailTrackingOptions & { userId?: string }): EmailContent {
    let processedHtml = content.htmlContent;

    // Replace web version URL placeholder with HMAC-signed token
    if (options.userId) {
      const webVersionToken = this.generateWebVersionToken(options.campaignId, options.subscriberId, options.userId);
      const webVersionUrl = `${this.trackingDomain}/api/public/view/${webVersionToken}`;
      processedHtml = processedHtml.replace(/\{\{web_version_url\}\}/g, webVersionUrl);
    }

    const { html: wrappedHtml } = this.wrapLinksWithTracking(processedHtml, options);
    processedHtml = wrappedHtml;

    processedHtml = this.injectUnsubscribeLink(processedHtml, options.subscriberId, options.userId);

    const trackingPixel = this.generateTrackingPixel(options);
    
    const bodyCloseRegex = /<\/body>/i;
    if (bodyCloseRegex.test(processedHtml)) {
      processedHtml = processedHtml.replace(bodyCloseRegex, `${trackingPixel}</body>`);
    } else {
      processedHtml += trackingPixel;
    }

    return {
      subject: content.subject,
      htmlContent: processedHtml,
      textContent: content.textContent,
    };
  }

  replaceMergeTags(content: string, subscriber: { firstName?: string; lastName?: string; email: string }): string {
    return content
      .replace(/\{\{firstName\}\}/g, subscriber.firstName || '')
      .replace(/\{\{lastName\}\}/g, subscriber.lastName || '')
      .replace(/\{\{email\}\}/g, subscriber.email)
      .replace(/\{\{fullName\}\}/g, `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim());
  }

  private generateTrackingToken(options: EmailTrackingOptions): string {
    const expiresAt = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days
    const data = `${options.campaignId}:${options.subscriberId}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    const tokenData = `${data}:${signature}`;
    return Buffer.from(tokenData).toString('base64url');
  }

  private generateClickTrackingToken(options: EmailTrackingOptions, targetUrl: string): string {
    const expiresAt = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days
    const urlB64 = Buffer.from(targetUrl).toString('base64url');
    const urlHash = crypto.createHash('sha256').update(targetUrl).digest('hex').substring(0, 16);
    const data = `${options.campaignId}:${options.subscriberId}:${urlHash}:${expiresAt}:${urlB64}`;
    const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    const tokenData = `${data}:${signature}`;
    return Buffer.from(tokenData).toString('base64url');
  }

  private generateUnsubscribeToken(subscriberId: string, userId?: string): string {
    const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year
    const data = userId 
      ? `${subscriberId}:${userId}:${expiresAt}`
      : `${subscriberId}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    const tokenData = `${data}:${signature}`;
    return Buffer.from(tokenData).toString('base64url');
  }

  private generateWebVersionToken(campaignId: string, subscriberId: string, userId: string): string {
    const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year
    const data = `${campaignId}:${subscriberId}:${userId}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    const tokenData = `${data}:${signature}`;
    return Buffer.from(tokenData).toString('base64url');
  }

  static decodeTrackingToken(token: string): { campaignId: string; subscriberId: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 4) return null;
      
      const [campaignId, subscriberId, expiresAtStr, signature] = parts;
      
      const data = `${campaignId}:${subscriberId}:${expiresAtStr}`;
      const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid tracking token signature');
        return null;
      }
      
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() > expiresAt) {
        console.error('Tracking token expired');
        return null;
      }
      
      if (!campaignId || !subscriberId) return null;
      return { campaignId, subscriberId };
    } catch (error) {
      console.error('Error decoding tracking token:', error);
      return null;
    }
  }

  static decodeClickTrackingToken(token: string): { campaignId: string; subscriberId: string; url: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 6) {
        console.error(`Invalid click tracking token format: expected 6 parts, got ${parts.length}`);
        return null;
      }
      
      const [campaignId, subscriberId, urlHash, expiresAtStr, urlB64, signature] = parts;
      
      const data = `${campaignId}:${subscriberId}:${urlHash}:${expiresAtStr}:${urlB64}`;
      const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid click tracking token signature');
        return null;
      }
      
      let targetUrl: string;
      try {
        targetUrl = Buffer.from(urlB64, 'base64url').toString('utf-8');
      } catch {
        console.error('Failed to decode URL from base64');
        return null;
      }
      
      const computedUrlHash = crypto.createHash('sha256').update(targetUrl).digest('hex').substring(0, 16);
      if (urlHash !== computedUrlHash) {
        console.error('URL hash mismatch in click tracking token');
        return null;
      }
      
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() > expiresAt) {
        console.error('Click tracking token expired');
        return null;
      }
      
      if (!campaignId || !subscriberId || !targetUrl) return null;
      return { campaignId, subscriberId, url: targetUrl };
    } catch (error) {
      console.error('Error decoding click tracking token:', error);
      return null;
    }
  }

  static decodeUnsubscribeToken(token: string): { subscriberId: string; userId?: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      
      // Support both formats: old (subscriberId:expiry:sig) and new (subscriberId:userId:expiry:sig)
      if (parts.length === 3) {
        // Old format without userId
        const [subscriberId, expiresAtStr, signature] = parts;
        
        const data = `${subscriberId}:${expiresAtStr}`;
        const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');
        
        if (signature !== expectedSignature) {
          console.error('Invalid unsubscribe token signature');
          return null;
        }
        
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Date.now() > expiresAt) {
          console.error('Unsubscribe token expired');
          return null;
        }
        
        return { subscriberId };
      } else if (parts.length === 4) {
        // New format with userId
        const [subscriberId, userId, expiresAtStr, signature] = parts;
        
        const data = `${subscriberId}:${userId}:${expiresAtStr}`;
        const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');
        
        if (signature !== expectedSignature) {
          console.error('Invalid unsubscribe token signature');
          return null;
        }
        
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Date.now() > expiresAt) {
          console.error('Unsubscribe token expired');
          return null;
        }
        
        return { subscriberId, userId };
      }
      
      console.error(`Invalid unsubscribe token format: expected 3 or 4 parts, got ${parts.length}`);
      return null;
    } catch (error) {
      console.error('Error decoding unsubscribe token:', error);
      return null;
    }
  }

  static decodeWebVersionToken(token: string): { campaignId: string; subscriberId: string; userId: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 5) {
        console.error(`Invalid web version token format: expected 5 parts, got ${parts.length}`);
        return null;
      }
      
      const [campaignId, subscriberId, userId, expiresAtStr, signature] = parts;
      
      const data = `${campaignId}:${subscriberId}:${userId}:${expiresAtStr}`;
      const hmac = crypto.createHmac('sha256', TRACKING_SECRET);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid web version token signature');
        return null;
      }
      
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() > expiresAt) {
        console.error('Web version token expired');
        return null;
      }
      
      if (!campaignId || !subscriberId || !userId) return null;
      return { campaignId, subscriberId, userId };
    } catch (error) {
      console.error('Error decoding web version token:', error);
      return null;
    }
  }
}

export interface BatchEmailJob {
  campaignId: string;
  userId: string;
  subscribers: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }>;
  emailContent: EmailContent;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

export class BatchEmailProcessor {
  private batchSize: number;
  private delayBetweenBatches: number;

  constructor(batchSize = 100, delayBetweenBatchesMs = 1000) {
    this.batchSize = batchSize;
    this.delayBetweenBatches = delayBetweenBatchesMs;
  }

  async processCampaign(
    job: BatchEmailJob,
    sendEmail: (params: {
      to: string;
      from: string;
      fromName: string;
      replyTo?: string;
      subject: string;
      html: string;
      text?: string;
    }) => Promise<void>,
    trackingService: EmailTrackingService,
    onProgress?: (sent: number, total: number) => void
  ): Promise<{ sent: number; failed: number }> {
    const total = job.subscribers.length;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < total; i += this.batchSize) {
      const batch = job.subscribers.slice(i, i + this.batchSize);
      
      const batchPromises = batch.map(async (subscriber) => {
        try {
          let processedContent = {
            ...job.emailContent,
            subject: trackingService.replaceMergeTags(job.emailContent.subject, subscriber),
            htmlContent: trackingService.replaceMergeTags(job.emailContent.htmlContent, subscriber),
          };

          processedContent = trackingService.processEmailForTracking(processedContent, {
            campaignId: job.campaignId,
            subscriberId: subscriber.id,
            trackingDomain: trackingService['trackingDomain'],
            userId: job.userId,
          });

          await sendEmail({
            to: subscriber.email,
            from: job.fromEmail,
            fromName: job.fromName,
            replyTo: job.replyTo,
            subject: processedContent.subject,
            html: processedContent.htmlContent,
            text: processedContent.textContent,
          });

          sent++;
          if (onProgress) onProgress(sent, total);
        } catch (error) {
          console.error(`Failed to send email to ${subscriber.email}:`, error);
          failed++;
        }
      });

      await Promise.allSettled(batchPromises);

      if (i + this.batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }

    return { sent, failed };
  }
}
