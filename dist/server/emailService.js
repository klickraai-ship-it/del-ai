import { generateTrackingToken, generateClickTrackingToken, generateUnsubscribeToken, generateWebVersionToken, decodeTrackingToken, decodeClickTrackingToken, decodeUnsubscribeToken, decodeWebVersionToken, } from './trackingTokens.js';
export class EmailTrackingService {
    constructor(trackingDomain) {
        this.trackingDomain = trackingDomain;
    }
    generateTrackingPixel(options) {
        const trackingToken = generateTrackingToken(options.campaignId, options.subscriberId);
        return `<img src="${this.trackingDomain}/track/open/${trackingToken}" width="1" height="1" alt="" style="display:block" />`;
    }
    wrapLinksWithTracking(htmlContent, options) {
        const links = [];
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>/gi;
        const wrappedHtml = htmlContent.replace(linkRegex, (match, url, attrs) => {
            if (url.startsWith('#') || url.startsWith('mailto:')) {
                return match;
            }
            links.push(url);
            const trackingToken = generateClickTrackingToken(options.campaignId, options.subscriberId, url);
            const trackingUrl = `${this.trackingDomain}/track/click/${trackingToken}`;
            return `<a href="${trackingUrl}"${attrs}>`;
        });
        return { html: wrappedHtml, links };
    }
    injectUnsubscribeLink(htmlContent, subscriberId, userId) {
        // Always use HMAC-signed token with userId for security
        if (!userId) {
            throw new Error('userId is required for unsubscribe token generation');
        }
        const unsubscribeToken = generateUnsubscribeToken(subscriberId, userId);
        const unsubscribeUrl = `${this.trackingDomain}/unsubscribe/${unsubscribeToken}`;
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
    processEmailForTracking(content, options) {
        let processedHtml = content.htmlContent;
        // Replace web version URL placeholder with HMAC-signed token
        if (options.userId) {
            const webVersionToken = generateWebVersionToken(options.campaignId, options.subscriberId, options.userId);
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
        }
        else {
            processedHtml += trackingPixel;
        }
        return {
            subject: content.subject,
            htmlContent: processedHtml,
            textContent: content.textContent,
        };
    }
    replaceMergeTags(content, subscriber) {
        return content
            .replace(/\{\{firstName\}\}/g, subscriber.firstName || '')
            .replace(/\{\{lastName\}\}/g, subscriber.lastName || '')
            .replace(/\{\{email\}\}/g, subscriber.email)
            .replace(/\{\{fullName\}\}/g, `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim());
    }
    // Static methods for backward compatibility - delegate to centralized token functions
    static decodeTrackingToken(token) {
        return decodeTrackingToken(token);
    }
    static decodeClickTrackingToken(token) {
        return decodeClickTrackingToken(token);
    }
    static decodeUnsubscribeToken(token) {
        return decodeUnsubscribeToken(token);
    }
    static decodeWebVersionToken(token) {
        return decodeWebVersionToken(token);
    }
}
export class BatchEmailProcessor {
    constructor(batchSize = 100, delayBetweenBatchesMs = 1000) {
        this.batchSize = batchSize;
        this.delayBetweenBatches = delayBetweenBatchesMs;
    }
    async processCampaign(job, sendEmail, trackingService, onProgress) {
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
                    if (onProgress)
                        onProgress(sent, total);
                }
                catch (error) {
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
