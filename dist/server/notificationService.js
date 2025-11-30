import { db } from './db.js';
import * as schema from '../shared/schema.js';
export async function createNotification(userId, type, message) {
    try {
        await db.insert(schema.notifications).values({
            userId,
            type,
            message,
            read: false,
        });
    }
    catch (error) {
        console.error('Failed to create notification:', error);
    }
}
export async function notifyCampaignSent(userId, campaignName, recipientCount) {
    await createNotification(userId, 'campaign_sent', `Campaign "${campaignName}" sent to ${recipientCount.toLocaleString()} subscriber${recipientCount !== 1 ? 's' : ''}`);
}
export async function notifyBounces(userId, campaignName, bounceCount) {
    await createNotification(userId, 'bounce', `${bounceCount} email${bounceCount !== 1 ? 's' : ''} bounced in campaign "${campaignName}"`);
}
export async function notifyComplaints(userId, campaignName, complaintCount) {
    await createNotification(userId, 'complaint', `${complaintCount} spam complaint${complaintCount !== 1 ? 's' : ''} received for campaign "${campaignName}"`);
}
