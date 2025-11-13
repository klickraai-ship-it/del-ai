import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import {
  subscribers,
  emailTemplates,
  campaigns,
  campaignSubscribers,
  campaignAnalytics,
  settings,
  linkClicks,
  users,
  sessions,
  insertSubscriberSchema,
  insertEmailTemplateSchema,
  insertCampaignSchema,
  insertSettingSchema,
  type Subscriber,
  type EmailTemplate,
  type Campaign,
  type CampaignAnalytics,
  type User,
  type Session,
} from "@/shared/schema";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import { setupTrackingRoutes } from "./tracking";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Middleware to validate session and extract userId
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.token, token),
        sql`${sessions.expiresAt} > NOW()`
      ))
      .limit(1);
    
    if (!session) {
      return res.status(401).json({ message: "Unauthorized - Invalid or expired token" });
    }
    
    // Add userId to request for use in route handlers
    req.userId = session.userId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Helper to generate secure session token
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  setupTrackingRoutes(app);
  
  // ========== AUTH API (Public - No Auth Required) ==========
  
  // Sign up
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name, companyName } = req.body;
      
      // Validate input
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Password strength check (min 8 chars, at least one letter and one number)
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLetter || !hasNumber) {
        return res.status(400).json({ message: "Password must contain at least one letter and one number" });
      }
      
      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          name,
          companyName: companyName || null,
        })
        .returning();
      
      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      await db.insert(sessions).values({
        userId: newUser.id,
        token: sessionToken,
        expiresAt,
      });
      
      // Return user and token (excluding password hash)
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        user: userWithoutPassword,
        token: sessionToken,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      await db.insert(sessions).values({
        userId: user.id,
        token: sessionToken,
        expiresAt,
      });
      
      // Return user and token (excluding password hash)
      const { passwordHash: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        token: sessionToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7);
      
      if (token) {
        await db.delete(sessions).where(eq(sessions.token, token));
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, (req as any).userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
  
  // ========== SUBSCRIBERS API ==========
  
  // Get all subscribers
  app.get("/api/subscribers", requireAuth, async (req, res) => {
    try {
      const { status, list } = req.query;
      const userId = (req as any).userId;
      
      let conditions = [eq(subscribers.userId, userId)];
      
      if (status) {
        conditions.push(eq(subscribers.status, status as string));
      }
      
      const results = await db
        .select()
        .from(subscribers)
        .where(and(...conditions))
        .orderBy(desc(subscribers.createdAt));
      
      // Filter by list if provided
      let filteredResults = results;
      if (list) {
        filteredResults = results.filter(s => s.lists.includes(list as string));
      }
      
      res.json(filteredResults);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });
  
  // Get single subscriber
  app.get("/api/subscribers/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [subscriber] = await db
        .select()
        .from(subscribers)
        .where(and(
          eq(subscribers.id, req.params.id),
          eq(subscribers.userId, userId)
        ));
      
      if (!subscriber) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      
      res.json(subscriber);
    } catch (error) {
      console.error("Error fetching subscriber:", error);
      res.status(500).json({ message: "Failed to fetch subscriber" });
    }
  });
  
  // Create subscriber
  app.post("/api/subscribers", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const validatedData = insertSubscriberSchema.parse(req.body);
      
      const [newSubscriber] = await db
        .insert(subscribers)
        .values({
          ...validatedData,
          userId,
        })
        .returning();
      
      res.status(201).json(newSubscriber);
    } catch (error) {
      console.error("Error creating subscriber:", error);
      res.status(400).json({ message: "Failed to create subscriber", error: String(error) });
    }
  });
  
  // Update subscriber
  app.patch("/api/subscribers/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      // Filter out protected/system fields to prevent userId reassignment and tenant breakout
      const { userId: _, id: __, createdAt: ___, updatedAt: ____, ...allowedUpdates } = req.body;
      
      const [updated] = await db
        .update(subscribers)
        .set(allowedUpdates)
        .where(and(
          eq(subscribers.id, req.params.id),
          eq(subscribers.userId, userId)
        ))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating subscriber:", error);
      res.status(500).json({ message: "Failed to update subscriber" });
    }
  });
  
  // Delete subscriber
  app.delete("/api/subscribers/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [deleted] = await db
        .delete(subscribers)
        .where(and(
          eq(subscribers.id, req.params.id),
          eq(subscribers.userId, userId)
        ))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      
      res.json({ message: "Subscriber deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      res.status(500).json({ message: "Failed to delete subscriber" });
    }
  });
  
  // ========== EMAIL TEMPLATES API ==========
  
  // Get all templates
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const templates = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.userId, userId))
        .orderBy(desc(emailTemplates.createdAt));
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
  
  // Get single template
  app.get("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.id, req.params.id),
          eq(emailTemplates.userId, userId)
        ));
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });
  
  // Create template
  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      
      const [newTemplate] = await db
        .insert(emailTemplates)
        .values({
          ...validatedData,
          userId,
        })
        .returning();
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(400).json({ message: "Failed to create template", error: String(error) });
    }
  });
  
  // Update template
  app.patch("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      // Filter out protected/system fields to prevent userId reassignment and tenant breakout
      const { userId: _, id: __, createdAt: ___, updatedAt: ____, ...allowedUpdates } = req.body;
      
      const [updated] = await db
        .update(emailTemplates)
        .set(allowedUpdates)
        .where(and(
          eq(emailTemplates.id, req.params.id),
          eq(emailTemplates.userId, userId)
        ))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });
  
  // Delete template
  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [deleted] = await db
        .delete(emailTemplates)
        .where(and(
          eq(emailTemplates.id, req.params.id),
          eq(emailTemplates.userId, userId)
        ))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });
  
  // Duplicate template
  app.post("/api/templates/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [original] = await db
        .select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.id, req.params.id),
          eq(emailTemplates.userId, userId)
        ));
      
      if (!original) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const [duplicated] = await db
        .insert(emailTemplates)
        .values({
          userId,
          name: `${original.name} (Copy)`,
          subject: original.subject,
          htmlContent: original.htmlContent,
          textContent: original.textContent,
          thumbnailUrl: original.thumbnailUrl,
        })
        .returning();
      
      res.status(201).json(duplicated);
    } catch (error) {
      console.error("Error duplicating template:", error);
      res.status(500).json({ message: "Failed to duplicate template" });
    }
  });
  
  // ========== CAMPAIGNS API ==========
  
  // Get all campaigns
  app.get("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const userId = (req as any).userId;
      
      let conditions = [eq(campaigns.userId, userId)];
      
      if (status) {
        conditions.push(eq(campaigns.status, status as string));
      }
      
      const results = await db
        .select()
        .from(campaigns)
        .where(and(...conditions))
        .orderBy(desc(campaigns.createdAt));
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });
  
  // Get single campaign with analytics
  app.get("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId)
        ));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get analytics
      const [analytics] = await db
        .select()
        .from(campaignAnalytics)
        .where(and(
          eq(campaignAnalytics.campaignId, req.params.id),
          eq(campaignAnalytics.userId, userId)
        ));
      
      // Get template if exists
      let template = null;
      if (campaign.templateId) {
        const [tmpl] = await db
          .select()
          .from(emailTemplates)
          .where(and(
            eq(emailTemplates.id, campaign.templateId),
            eq(emailTemplates.userId, userId)
          ));
        template = tmpl;
      }
      
      res.json({ ...campaign, analytics, template });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });
  
  // Create campaign
  app.post("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const validatedData = insertCampaignSchema.parse(req.body);
      
      const campaignData: any = {
        ...validatedData,
        userId,
      };
      
      // Convert date strings to Date objects if present
      if (campaignData.scheduledAt) {
        campaignData.scheduledAt = new Date(campaignData.scheduledAt);
      }
      if (campaignData.sentAt) {
        campaignData.sentAt = new Date(campaignData.sentAt);
      }
      
      const [newCampaign] = await db
        .insert(campaigns)
        .values(campaignData)
        .returning();
      
      // Create initial analytics record
      await db.insert(campaignAnalytics).values({
        userId,
        campaignId: newCampaign.id,
      });
      
      res.status(201).json(newCampaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(400).json({ message: "Failed to create campaign", error: String(error) });
    }
  });
  
  // Update campaign
  app.patch("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      // Filter out protected/system fields to prevent userId reassignment and tenant breakout
      const { userId: _, id: __, createdAt: ___, updatedAt: ____, sentAt: _____, ...allowedUpdates } = req.body;
      
      const [updated] = await db
        .update(campaigns)
        .set(allowedUpdates)
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId)
        ))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });
  
  // Delete campaign
  app.delete("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      // Delete related records first (filtering by userId for security)
      await db.delete(campaignSubscribers).where(and(
        eq(campaignSubscribers.campaignId, req.params.id),
        eq(campaignSubscribers.userId, userId)
      ));
      await db.delete(campaignAnalytics).where(and(
        eq(campaignAnalytics.campaignId, req.params.id),
        eq(campaignAnalytics.userId, userId)
      ));
      
      const [deleted] = await db
        .delete(campaigns)
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId)
        ))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });
  
  // Send campaign (mark as sending and create subscriber records)
  app.post("/api/campaigns/:id/send", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId)
        ));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      if (campaign.status === 'sent' || campaign.status === 'sending') {
        return res.status(400).json({ message: "Campaign already sent or sending" });
      }
      
      // Get subscribers matching the campaign lists (only for this user)
      const eligibleSubscribers = await db
        .select()
        .from(subscribers)
        .where(and(
          eq(subscribers.status, 'active'),
          eq(subscribers.userId, userId)
        ));
      
      // Filter by lists
      const targetSubscribers = eligibleSubscribers.filter(sub =>
        campaign.lists.length === 0 || campaign.lists.some(list => sub.lists.includes(list))
      );
      
      // Create campaign_subscribers records
      if (targetSubscribers.length > 0) {
        const subscriberRecords = targetSubscribers.map(sub => ({
          userId,
          campaignId: campaign.id,
          subscriberId: sub.id,
          status: 'pending' as const,
        }));
        
        await db.insert(campaignSubscribers).values(subscriberRecords);
      }
      
      // Update campaign status
      const [updated] = await db
        .update(campaigns)
        .set({
          status: 'sending',
          sentAt: new Date(),
        })
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId)
        ))
        .returning();
      
      // Update analytics
      await db
        .update(campaignAnalytics)
        .set({
          totalSubscribers: targetSubscribers.length,
        })
        .where(and(
          eq(campaignAnalytics.campaignId, req.params.id),
          eq(campaignAnalytics.userId, userId)
        ));
      
      res.json({
        ...updated,
        message: `Campaign queued for sending to ${targetSubscribers.length} subscribers`,
      });
    } catch (error) {
      console.error("Error sending campaign:", error);
      res.status(500).json({ message: "Failed to send campaign" });
    }
  });
  
  // Get campaign analytics
  app.get("/api/campaigns/:id/analytics", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [analytics] = await db
        .select()
        .from(campaignAnalytics)
        .where(and(
          eq(campaignAnalytics.campaignId, req.params.id),
          eq(campaignAnalytics.userId, userId)
        ));
      
      if (!analytics) {
        return res.status(404).json({ message: "Campaign analytics not found" });
      }
      
      const clicksData = await db
        .select({
          url: linkClicks.url,
          count: sql<number>`count(*)::int`,
        })
        .from(linkClicks)
        .where(and(
          eq(linkClicks.campaignId, req.params.id),
          eq(linkClicks.userId, userId)
        ))
        .groupBy(linkClicks.url)
        .orderBy(sql`count(*) DESC`);
      
      res.json({
        ...analytics,
        linkClicks: clicksData,
      });
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      res.status(500).json({ message: "Failed to fetch campaign analytics" });
    }
  });
  
  // ========== DASHBOARD DATA API ==========
  
  // Get dashboard summary
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      // Get recent campaigns analytics
      const recentCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.status, 'sent'),
          eq(campaigns.userId, userId)
        ))
        .orderBy(desc(campaigns.sentAt))
        .limit(10);
      
      let totalDelivered = 0;
      let totalBounced = 0;
      let totalComplained = 0;
      let totalUnsubscribed = 0;
      let totalSent = 0;
      
      for (const campaign of recentCampaigns) {
        const [analytics] = await db
          .select()
          .from(campaignAnalytics)
          .where(eq(campaignAnalytics.campaignId, campaign.id));
        
        if (analytics) {
          totalSent += analytics.sent;
          totalDelivered += analytics.delivered;
          totalBounced += analytics.bounced;
          totalComplained += analytics.complained;
          totalUnsubscribed += analytics.unsubscribed;
        }
      }
      
      // Calculate KPIs
      const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0';
      const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : '0.00';
      const complaintRate = totalDelivered > 0 ? ((totalComplained / totalDelivered) * 100).toFixed(2) : '0.00';
      const unsubscribeRate = totalDelivered > 0 ? ((totalUnsubscribed / totalDelivered) * 100).toFixed(2) : '0.00';
      
      const dashboardData = {
        kpis: [
          { title: 'Delivery Rate', value: `${deliveryRate}%`, change: '+0.1%', changeType: 'increase' as const, period: 'vs last 7d' },
          { title: 'Hard Bounce Rate', value: `${bounceRate}%`, change: '-0.05%', changeType: 'decrease' as const, period: 'vs last 7d' },
          { title: 'Complaint Rate', value: `${complaintRate}%`, change: '+0.02%', changeType: 'increase' as const, period: 'vs last 7d' },
          { title: 'Unsubscribe Rate', value: `${unsubscribeRate}%`, change: '0.00%', changeType: 'neutral' as const, period: 'vs last 7d' },
        ],
        gmailSpamRate: parseFloat(complaintRate) || 0.12,
        domainPerformance: [
          { name: 'Gmail', deliveryRate: parseFloat(deliveryRate) || 99.1, complaintRate: parseFloat(complaintRate) || 0.12, spamRate: parseFloat(complaintRate) || 0.12 },
          { name: 'Yahoo', deliveryRate: 99.5, complaintRate: 0.09, spamRate: 0.08 },
          { name: 'Outlook', deliveryRate: 98.8, complaintRate: 0.15, spamRate: 0.18 },
          { name: 'Other', deliveryRate: 97.5, complaintRate: 0.20, spamRate: 0.25 },
        ],
        complianceChecklist: [
          { id: 'spf', name: 'SPF Alignment', status: 'pass' as const, details: 'SPF record is valid and aligned.', fixLink: '#' },
          { id: 'dkim', name: 'DKIM Alignment', status: 'pass' as const, details: 'DKIM signatures are valid and aligned.', fixLink: '#' },
          { id: 'dmarc', name: 'DMARC Policy', status: 'warn' as const, details: 'p=none policy detected. Consider tightening to quarantine/reject.', fixLink: '#' },
          { id: 'list_unsub', name: 'One-Click Unsubscribe', status: 'pass' as const, details: 'List-Unsubscribe headers are correctly implemented.', fixLink: '#' },
          { id: 'tls', name: 'TLS Encryption', status: 'pass' as const, details: '100% of mail sent over TLS.', fixLink: '#' },
          { id: 'fbl', name: 'Feedback Loops', status: 'fail' as const, details: 'Yahoo CFL not configured. Complaints may be missed.', fixLink: '#' },
        ],
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });
  
  // ========== CAMPAIGN SENDING API ==========
  
  app.post("/api/campaigns/:id/send", requireAuth, async (req, res) => {
    try {
      const campaignId = req.params.id;
      const userId = (req as any).userId;
      
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.userId, userId)
        ))
        .limit(1);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      if (campaign.status === 'sent') {
        return res.status(400).json({ message: "Campaign has already been sent" });
      }
      
      let emailContent = { subject: campaign.subject, htmlContent: '', textContent: '' };
      
      if (campaign.templateId) {
        const [template] = await db
          .select()
          .from(emailTemplates)
          .where(and(
            eq(emailTemplates.id, campaign.templateId),
            eq(emailTemplates.userId, userId)
          ))
          .limit(1);
        
        if (template) {
          emailContent.htmlContent = template.htmlContent;
          emailContent.textContent = template.textContent || '';
        }
      } else {
        emailContent.htmlContent = '<html><body><p>Default email content</p></body></html>';
      }
      
      let targetSubscribers = await db
        .select()
        .from(subscribers)
        .where(and(
          eq(subscribers.status, 'active'),
          eq(subscribers.userId, userId)
        ));
      
      if (campaign.lists.length > 0) {
        targetSubscribers = targetSubscribers.filter(sub => 
          sub.lists.some(list => campaign.lists.includes(list))
        );
      }
      
      if (targetSubscribers.length === 0) {
        return res.status(400).json({ message: "No active subscribers found for this campaign" });
      }
      
      for (const subscriber of targetSubscribers) {
        await db.insert(campaignSubscribers).values({
          userId,
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          status: 'pending',
        }).onConflictDoNothing();
      }
      
      await db
        .update(campaigns)
        .set({ status: 'sending' })
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.userId, userId)
        ));
      
      res.json({
        message: "Campaign sending started",
        recipientCount: targetSubscribers.length,
        status: 'sending',
      });
      
      const trackingDomain = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      
      setImmediate(async () => {
        try {
          const { EmailTrackingService, BatchEmailProcessor } = await import('./emailService');
          const trackingService = new EmailTrackingService(trackingDomain);
          const batchProcessor = new BatchEmailProcessor(100, 1000);
          
          let sentCount = 0;
          let failedCount = 0;
          
          const { emailService } = await import('./emailProvider');
          
          for (const subscriber of targetSubscribers) {
            try {
              const processedContentBase = {
                subject: trackingService.replaceMergeTags(emailContent.subject, subscriber),
                htmlContent: trackingService.replaceMergeTags(emailContent.htmlContent, subscriber),
                textContent: emailContent.textContent,
              };
              
              const processedContent = trackingService.processEmailForTracking(processedContentBase, {
                campaignId: campaign.id,
                subscriberId: subscriber.id,
                trackingDomain,
                userId: campaign.userId,
              });
              
              console.log(`Sending email to ${subscriber.email} for campaign ${campaign.id}`);
              
              await emailService.sendEmail({
                to: subscriber.email,
                from: campaign.fromEmail,
                fromName: campaign.fromName,
                replyTo: campaign.replyTo,
                subject: processedContent.subject,
                html: processedContent.htmlContent,
                text: processedContent.textContent,
              });
              
              await db.execute(sql`
                UPDATE campaign_subscribers
                SET status = 'sent', sent_at = NOW(), html_content = ${processedContent.htmlContent}
                WHERE campaign_id = ${campaign.id}
                AND subscriber_id = ${subscriber.id}
              `);
              
              sentCount++;
            } catch (error) {
              console.error(`Failed to send email to ${subscriber.email}:`, error);
              await db.execute(sql`
                UPDATE campaign_subscribers
                SET status = 'failed'
                WHERE campaign_id = ${campaign.id}
                AND subscriber_id = ${subscriber.id}
              `);
              failedCount++;
            }
          }
          
          await db
            .update(campaigns)
            .set({ 
              status: 'sent',
              sentAt: new Date(),
            })
            .where(eq(campaigns.id, campaignId));
          
          await db.insert(campaignAnalytics).values({
            userId: campaign.userId,
            campaignId: campaign.id,
            totalSubscribers: targetSubscribers.length,
            sent: sentCount,
            delivered: sentCount,
            failed: failedCount,
          }).onConflictDoUpdate({
            target: campaignAnalytics.campaignId,
            set: {
              sent: sentCount,
              delivered: sentCount,
              failed: failedCount,
            },
          });
          
          console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
        } catch (error) {
          console.error(`Error in background campaign send:`, error);
          await db
            .update(campaigns)
            .set({ status: 'failed' })
            .where(eq(campaigns.id, campaignId));
        }
      });
      
    } catch (error) {
      console.error("Error starting campaign send:", error);
      res.status(500).json({ message: "Failed to start campaign send" });
    }
  });
  
  app.get("/api/campaigns/:id/analytics/clicks", requireAuth, async (req, res) => {
    try {
      const campaignId = req.params.id;
      const userId = (req as any).userId;
      
      const clicks = await db
        .select()
        .from(linkClicks)
        .where(and(
          eq(linkClicks.campaignId, campaignId),
          eq(linkClicks.userId, userId)
        ))
        .orderBy(desc(linkClicks.clickedAt));
      
      const linkStats = clicks.reduce((acc, click) => {
        if (!acc[click.url]) {
          acc[click.url] = { url: click.url, clicks: 0, uniqueClicks: new Set() };
        }
        acc[click.url].clicks++;
        acc[click.url].uniqueClicks.add(click.subscriberId);
        return acc;
      }, {} as Record<string, { url: string; clicks: number; uniqueClicks: Set<string> }>);
      
      const linkStatsArray = Object.values(linkStats).map(stat => ({
        url: stat.url,
        totalClicks: stat.clicks,
        uniqueClicks: stat.uniqueClicks.size,
      }));
      
      res.json({
        campaignId,
        totalClicks: clicks.length,
        uniqueClickers: new Set(clicks.map(c => c.subscriberId)).size,
        linkStats: linkStatsArray,
        recentClicks: clicks.slice(0, 50),
      });
    } catch (error) {
      console.error("Error fetching click analytics:", error);
      res.status(500).json({ message: "Failed to fetch click analytics" });
    }
  });
  
  // ========== SETTINGS API ==========
  
  // Get all settings
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      
      // Convert to key-value object
      const settingsObj = allSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      
      res.json(settingsObj);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });
  
  // Get single setting
  app.get("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const [setting] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, req.params.key));
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });
  
  // Update or create setting
  app.put("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const { value } = req.body;
      
      const [existing] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, req.params.key));
      
      if (existing) {
        const [updated] = await db
          .update(settings)
          .set({
            value,
          })
          .where(eq(settings.key, req.params.key))
          .returning();
        
        res.json(updated);
      } else {
        const [created] = await db
          .insert(settings)
          .values({
            key: req.params.key,
            value,
          })
          .returning();
        
        res.status(201).json(created);
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });
  
  // Delete setting
  app.delete("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const [deleted] = await db
        .delete(settings)
        .where(eq(settings.key, req.params.key))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json({ message: "Setting deleted successfully" });
    } catch (error) {
      console.error("Error deleting setting:", error);
      res.status(500).json({ message: "Failed to delete setting" });
    }
  });

  // ========== PUBLIC SUBSCRIBER API (No Auth Required) ==========
  
  // Public subscribe endpoint
  app.post("/api/public/subscribe", async (req, res) => {
    try {
      const { email, firstName, lastName, lists } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // For now, assign to a default user (in production, this would be based on form/domain)
      // You can enhance this to accept a userId or API key in the request
      const defaultUserId = req.body.userId; // Passed from embedded form
      
      if (!defaultUserId) {
        return res.status(400).json({ message: "userId is required for subscription" });
      }
      
      // Check if subscriber already exists
      const [existing] = await db
        .select()
        .from(subscribers)
        .where(and(
          eq(subscribers.email, email.toLowerCase()),
          eq(subscribers.userId, defaultUserId)
        ));
      
      if (existing) {
        // Update existing subscriber to resubscribe if they were unsubscribed
        const [updated] = await db
          .update(subscribers)
          .set({
            status: 'active',
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            lists: lists || existing.lists,
            consentGiven: true,
            consentTimestamp: new Date(),
          })
          .where(eq(subscribers.id, existing.id))
          .returning();
        
        return res.json({ message: "Successfully resubscribed", subscriber: updated });
      }
      
      // Create new subscriber
      const [newSubscriber] = await db
        .insert(subscribers)
        .values({
          userId: defaultUserId,
          email: email.toLowerCase(),
          firstName,
          lastName,
          status: 'active',
          lists: lists || [],
          consentGiven: true,
          consentTimestamp: new Date(),
        })
        .returning();
      
      res.status(201).json({ message: "Successfully subscribed", subscriber: newSubscriber });
    } catch (error) {
      console.error("Error in public subscribe:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });
  
  // Unsubscribe endpoint (token-based, no auth required)
  app.get("/api/public/unsubscribe/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Decode and validate HMAC-signed token
      const { EmailTrackingService } = await import("./emailService");
      const decoded = EmailTrackingService.decodeUnsubscribeToken(token);
      
      if (!decoded) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #e74c3c;">Invalid Unsubscribe Link</h1>
              <p>This unsubscribe link is invalid or has expired.</p>
            </body>
          </html>
        `);
      }
      
      const { subscriberId, userId } = decoded;
      
      // SECURITY: Require userId for multi-tenant isolation
      // Legacy tokens without userId are rejected - all new tokens must include userId
      if (!userId) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #e74c3c;">Invalid Unsubscribe Link</h1>
              <p>This unsubscribe link is invalid. Please use the unsubscribe link from a recent email.</p>
            </body>
          </html>
        `);
      }
      
      // Update subscriber status with multi-tenant verification
      const [updated] = await db
        .update(subscribers)
        .set({ status: 'unsubscribed' })
        .where(and(
          eq(subscribers.id, subscriberId),
          eq(subscribers.userId, userId)
        ))
        .returning();
      
      if (!updated) {
        return res.status(404).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #e74c3c;">Subscriber Not Found</h1>
              <p>We couldn't find your subscription.</p>
            </body>
          </html>
        `);
      }
      
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1 style="color: #27ae60;">Successfully Unsubscribed</h1>
            <p>You have been unsubscribed from this mailing list.</p>
            <p style="color: #7f8c8d; font-size: 14px;">Email: ${updated.email}</p>
          </body>
          </html>
      `);
    } catch (error) {
      console.error("Error in unsubscribe:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1 style="color: #e74c3c;">Error</h1>
            <p>An error occurred while processing your unsubscribe request.</p>
          </body>
        </html>
      `);
    }
  });
  
  // View email in browser (web version)
  app.get("/api/public/view/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Decode and validate HMAC-signed token
      const { EmailTrackingService } = await import("./emailService");
      const decoded = EmailTrackingService.decodeWebVersionToken(token);
      
      if (!decoded) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #e74c3c;">Invalid Link</h1>
              <p>This web version link is invalid or has expired.</p>
            </body>
          </html>
        `);
      }
      
      const { campaignId, subscriberId, userId } = decoded;
      
      // Fetch campaign with template
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.userId, userId)
        ));
      
      if (!campaign) {
        return res.status(404).send("<h1>Campaign not found</h1>");
      }
      
      // Fetch template
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.id, campaign.templateId),
          eq(emailTemplates.userId, userId)
        ));
      
      if (!template) {
        return res.status(404).send("<h1>Email template not found</h1>");
      }
      
      // Fetch subscriber for personalization
      const [subscriber] = await db
        .select()
        .from(subscribers)
        .where(and(
          eq(subscribers.id, subscriberId),
          eq(subscribers.userId, userId)
        ));
      
      // Replace merge tags
      let htmlContent = template.htmlContent;
      
      if (subscriber) {
        htmlContent = htmlContent
          .replace(/\{\{first_name\}\}/g, subscriber.firstName || '')
          .replace(/\{\{last_name\}\}/g, subscriber.lastName || '')
          .replace(/\{\{email\}\}/g, subscriber.email || '');
      }
      
      // Generate unsubscribe URL with HMAC token
      const trackingService = new EmailTrackingService(`${req.protocol}://${req.get('host')}`);
      const unsubToken = trackingService['generateUnsubscribeToken'](subscriberId);
      const unsubscribeUrl = `${req.protocol}://${req.get('host')}/api/public/unsubscribe/${unsubToken}`;
      
      htmlContent = htmlContent
        .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
        .replace(/\{\{campaign_name\}\}/g, campaign.name || '');
      
      // Add web version banner at the top
      const banner = `
        <div style="background: #f8f9fa; padding: 10px; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #6c757d; border-bottom: 1px solid #dee2e6;">
          📧 Viewing web version of "${template.name}"
        </div>
      `;
      
      res.send(banner + htmlContent);
    } catch (error) {
      console.error("Error in web version:", error);
      res.status(500).send("<h1>Error loading email</h1>");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
