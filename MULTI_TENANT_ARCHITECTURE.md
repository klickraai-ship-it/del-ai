# Multi-Tenant Architecture Guide

## Overview
This application uses a **row-level multi-tenancy** model where all tenant-specific data is isolated using a `userId` column. Every table that contains tenant-specific data includes a `userId` foreign key to the `users` table.

## Security Model

### Database-Level Isolation
All tenant-specific tables include:
- **userId column**: Foreign key to `users.id` with `CASCADE DELETE`
- **Indexes**: All userId columns are indexed for query performance
- **Composite unique constraints**: Parent tables have `UNIQUE(id, userId)` to prevent ID reuse across tenants
- **Composite foreign keys**: Child tables enforce `(childId, userId) → (parentId, userId)` relationships

### Application-Level Enforcement (CRITICAL)

⚠️ **IMPORTANT**: The database schema alone does NOT fully prevent cross-tenant data access. Application code MUST enforce tenant isolation in ALL queries.

**Every database query MUST:**
1. Filter by the authenticated user's `userId` from session (NEVER from client input)
2. Verify tenant ownership before updates/deletes
3. Never trust client-provided IDs or userId without tenant verification
4. Use `.strict()` Zod schemas to reject unknown keys (prevents userId smuggling)
5. Sanitize PATCH/PUT payloads to prevent userId reassignment

## Authentication & Security

### Session-Based Authentication
The application uses session-based authentication with Bearer tokens:

1. **Signup**: POST `/api/auth/signup`
   - Validates email format and password strength (min 8 chars)
   - Checks for duplicate emails
   - Hashes password with bcrypt (cost factor 10)
   - Creates user and session token (30-day expiration)

2. **Login**: POST `/api/auth/login`
   - Verifies email and password
   - Creates new session with secure random token
   - Returns user data and Bearer token

3. **Logout**: POST `/api/auth/logout`
   - Deletes session from database
   - Client should discard token

4. **Get Current User**: GET `/api/auth/me`
   - Returns authenticated user data
   - Requires valid Bearer token

### requireAuth Middleware
All tenant-scoped routes use the `requireAuth` middleware:

```typescript
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  // CRITICAL: Attach userId from session, never from client
  (req as any).userId = session.userId;
  next();
}
```

### Multi-Layer Security Defense

#### Layer 1: Zod Schema Validation with `.strict()`
All client-side insert schemas use `.strict()` to reject unknown keys:

```typescript
// ✅ CORRECT - Rejects userId injection
export const insertSubscriberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  // ... other fields
}).strict(); // CRITICAL: Blocks {"userId":"victim-id",...}

// ❌ WRONG - Allows userId smuggling
export const insertSubscriberSchema = z.object({
  email: z.string().email(),
  // ...
}); // Missing .strict() - vulnerable!
```

**Attack Prevention:**
```bash
# Attack attempt:
POST /api/subscribers
Body: {"userId":"victim-id","email":"sub@example.com"}

# Response: 400 Bad Request
{"error": "Unrecognized key: userId"}
```

#### Layer 2: Server-Side userId Injection
All CREATE operations inject userId from session, NOT from client:

```typescript
// ✅ CORRECT - userId from session
app.post('/api/subscribers', requireAuth, async (req, res) => {
  const validatedData = insertSubscriberSchema.parse(req.body); // .strict() rejects userId
  
  const [subscriber] = await db.insert(subscribers).values({
    ...validatedData,
    userId: (req as any).userId, // From session, not client!
  }).returning();
});

// ❌ WRONG - Vulnerable to userId override
app.post('/api/subscribers', requireAuth, async (req, res) => {
  const [subscriber] = await db.insert(subscribers).values({
    userId: (req as any).userId, // Could be overwritten by ...req.body!
    ...req.body, // DANGEROUS - spreads last, overwrites userId
  }).returning();
});
```

#### Layer 3: PATCH/PUT Payload Sanitization
All update operations strip protected fields before database updates:

```typescript
// ✅ CORRECT - Sanitizes userId
app.patch('/api/subscribers/:id', requireAuth, async (req, res) => {
  // Strip protected/system fields
  const { userId, id, createdAt, updatedAt, ...allowedUpdates } = req.body;
  
  const [updated] = await db
    .update(subscribers)
    .set(allowedUpdates) // SAFE - userId cannot be changed
    .where(
      and(
        eq(subscribers.id, req.params.id),
        eq(subscribers.userId, (req as any).userId)
      )
    )
    .returning();
});

// ❌ WRONG - Allows userId reassignment
app.patch('/api/subscribers/:id', requireAuth, async (req, res) => {
  const [updated] = await db
    .update(subscribers)
    .set({...req.body}) // DANGEROUS - allows userId override!
    .where(
      and(
        eq(subscribers.id, req.params.id),
        eq(subscribers.userId, (req as any).userId)
      )
    )
    .returning();
});
```

**Attack Prevention:**
```bash
# Attack attempt:
PATCH /api/subscribers/abc123
Body: {"userId":"victim-id","email":"hacked@example.com"}

# Result:
# - email updated to "hacked@example.com" (allowed)
# - userId remains original value (protected)
# - Attack FAILED - tenant isolation maintained
```

#### Layer 4: Query-Level Tenant Filtering
All GET/UPDATE/DELETE operations filter by userId from session:

```typescript
// ✅ CORRECT - Always filter by userId
app.get('/api/subscribers', requireAuth, async (req, res) => {
  const subs = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.userId, (req as any).userId)); // REQUIRED
});

// ❌ WRONG - Missing userId filter
app.get('/api/subscribers', requireAuth, async (req, res) => {
  const subs = await db.select().from(subscribers); // Returns ALL users' data!
});
```

### Security Testing Results

All attack vectors have been tested and blocked:

✅ **CREATE Attack (Blocked)**
- Request: `POST /api/subscribers {"userId":"victim-id","email":"sub@example.com"}`
- Response: `400 "Unrecognized key: userId"`
- Result: `.strict()` schema validation prevents injection

✅ **UPDATE Attack (Blocked)**
- Request: `PATCH /api/subscribers/123 {"userId":"victim-id","email":"new@example.com"}`
- Response: `200` with original userId unchanged
- Result: Payload sanitization strips userId field

✅ **Legitimate Operations (Working)**
- Request: `POST /api/subscribers {"email":"legit@example.com"}`
- Response: `201` with server-injected userId
- Result: Normal operations work correctly

## Tables with Tenant Isolation

### Core Tables
- ✅ `users` - Foundation table (tenant identity)
- ✅ `sessions` - User sessions (userId FK)
- ✅ `user_settings` - User preferences (userId FK)

### Domain Tables
- ✅ `subscribers` - Email subscribers (userId + unique email per user)
- ✅ `email_templates` - Email templates (userId + unique name per user)
- ✅ `campaigns` - Email campaigns (userId)
- ✅ `lists` - Subscriber lists (userId + unique name per user)
- ✅ `blacklist` - Blocked emails/domains (userId)
- ✅ `rules` - Automation rules (userId)

### Join & Analytics Tables
- ✅ `campaign_subscribers` - Campaign-subscriber relationships (userId, composite FK)
- ✅ `link_clicks` - Click tracking (userId, composite FK)
- ✅ `campaign_analytics` - Campaign metrics (userId, composite FK)

## Query Patterns

### ✅ CORRECT - Always filter by userId
```typescript
// Fetch user's campaigns
const campaigns = await db
  .select()
  .from(campaigns)
  .where(eq(campaigns.userId, authenticatedUserId));

// Fetch single campaign with ownership check
const campaign = await db
  .select()
  .from(campaigns)
  .where(
    and(
      eq(campaigns.id, campaignId),
      eq(campaigns.userId, authenticatedUserId)
    )
  )
  .limit(1);

// Update with ownership verification
await db
  .update(campaigns)
  .set({ name: 'Updated Name' })
  .where(
    and(
      eq(campaigns.id, campaignId),
      eq(campaigns.userId, authenticatedUserId)
    )
  );

// Delete with ownership verification
await db
  .delete(campaigns)
  .where(
    and(
      eq(campaigns.id, campaignId),
      eq(campaigns.userId, authenticatedUserId)
    )
  );
```

### ❌ WRONG - Missing userId filter (SECURITY VULNERABILITY)
```typescript
// DON'T DO THIS - No tenant isolation!
const campaign = await db
  .select()
  .from(campaigns)
  .where(eq(campaigns.id, campaignId)); // Missing userId check!

// DON'T DO THIS - Could update another user's data!
await db
  .update(campaigns)
  .set({ name: 'Updated' })
  .where(eq(campaigns.id, campaignId)); // Missing userId check!
```

## Join Query Patterns

### ✅ CORRECT - Filter all tables by same userId
```typescript
const campaignWithTemplate = await db
  .select()
  .from(campaigns)
  .leftJoin(
    emailTemplates,
    and(
      eq(campaigns.templateId, emailTemplates.id),
      eq(emailTemplates.userId, authenticatedUserId) // Ensure same tenant
    )
  )
  .where(
    and(
      eq(campaigns.id, campaignId),
      eq(campaigns.userId, authenticatedUserId)
    )
  );
```

### ❌ WRONG - Join without tenant verification
```typescript
// DON'T DO THIS - Could join cross-tenant data!
const campaignWithTemplate = await db
  .select()
  .from(campaigns)
  .leftJoin(
    emailTemplates,
    eq(campaigns.templateId, emailTemplates.id) // Missing userId check on join!
  )
  .where(eq(campaigns.id, campaignId)); // Missing userId filter!
```

## Data Import/Export

### Import
When importing data (subscribers, campaigns, etc.):
```typescript
// Always set userId to authenticated user
await db.insert(subscribers).values({
  userId: authenticatedUserId, // REQUIRED
  email: importedEmail,
  firstName: importedFirstName,
  // ...
});
```

### Export
When exporting data:
```typescript
// Always filter by userId
const data = await db
  .select()
  .from(subscribers)
  .where(eq(subscribers.userId, authenticatedUserId));
```

## GDPR Compliance

User deletion automatically cascades to all related data:
```typescript
// Delete user and ALL their data (cascade)
await db
  .delete(users)
  .where(eq(users.id, userId));

// This automatically deletes:
// - sessions, user_settings
// - subscribers, email_templates, campaigns
// - lists, blacklist, rules
// - campaign_subscribers, link_clicks, campaign_analytics
```

Subscriber data includes GDPR compliance fields:
- `consentGiven` - Boolean flag for explicit consent
- `consentTimestamp` - When consent was given
- `gdprDataExportedAt` - Last data export timestamp

## Testing Multi-Tenant Isolation

### Unit Tests
```typescript
test('users cannot access other users data', async () => {
  const user1Id = 'user-1';
  const user2Id = 'user-2';
  
  // User 1 creates a campaign
  const campaign = await createCampaign({ userId: user1Id, name: 'Test' });
  
  // User 2 tries to fetch User 1's campaign
  const result = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.id, campaign.id),
        eq(campaigns.userId, user2Id) // Different user
      )
    );
  
  expect(result).toHaveLength(0); // Should find nothing
});
```

### Integration Tests
1. Create two test users with separate sessions
2. Create data for user A (authenticated)
3. Attempt to access user A's data as user B (different session)
4. Verify access is denied (empty results or 404)
5. Attempt to update/delete user A's data as user B
6. Verify operation fails (no rows affected)

### Security Penetration Tests
1. **userId Injection in CREATE**:
   - Send `POST /api/subscribers {"userId":"victim-id","email":"test@example.com"}`
   - Expect: `400 "Unrecognized key: userId"`
   
2. **userId Reassignment in UPDATE**:
   - Send `PATCH /api/subscribers/123 {"userId":"victim-id",...}`
   - Expect: `200` with original userId unchanged
   
3. **Cross-Tenant Access in GET**:
   - Create subscriber as User A
   - Try to fetch as User B
   - Expect: Empty array or 404

## Common Pitfalls

### 1. Trusting Client-Provided IDs or userId
```typescript
// ❌ WRONG - Trusts userId from client
app.post('/api/subscribers', async (req, res) => {
  await db.insert(subscribers).values(req.body); // Contains malicious userId!
});

// ✅ CORRECT - userId from session only
app.post('/api/subscribers', requireAuth, async (req, res) => {
  const validatedData = insertSubscriberSchema.parse(req.body); // .strict() blocks userId
  await db.insert(subscribers).values({
    ...validatedData,
    userId: (req as any).userId, // From session
  });
});
```

### 2. Forgetting userId in Joins
Always verify userId on BOTH sides of a join to prevent cross-tenant associations.

### 3. Batch Operations
When performing batch operations, always filter by userId:
```typescript
// ✅ CORRECT - Delete all user's campaigns
await db
  .delete(campaigns)
  .where(eq(campaigns.userId, authenticatedUserId));

// ❌ WRONG - Could delete other users' data
await db.delete(campaigns); // Missing where clause!
```

### 4. Missing `.strict()` on Zod Schemas
```typescript
// ❌ WRONG - Allows unknown keys
export const insertSubscriberSchema = z.object({
  email: z.string().email(),
});

// ✅ CORRECT - Rejects unknown keys
export const insertSubscriberSchema = z.object({
  email: z.string().email(),
}).strict(); // Prevents userId smuggling
```

### 5. Spreading req.body in Updates
```typescript
// ❌ WRONG - Allows userId override
app.patch('/api/subscribers/:id', requireAuth, async (req, res) => {
  await db.update(subscribers).set({...req.body}); // DANGEROUS!
});

// ✅ CORRECT - Sanitizes protected fields
app.patch('/api/subscribers/:id', requireAuth, async (req, res) => {
  const { userId, id, createdAt, updatedAt, ...allowed } = req.body;
  await db.update(subscribers).set(allowed); // SAFE
});
```

## Composite Unique Constraints

The following tables have composite unique constraints:

### subscribers
- `UNIQUE(userId, email)` - Each user can have subscriber with unique email
- `UNIQUE(id, userId)` - ID is unique within tenant scope

### email_templates
- `UNIQUE(userId, name)` - Template names must be unique per user
- `UNIQUE(id, userId)` - ID is unique within tenant scope

### campaigns
- `UNIQUE(id, userId)` - ID is unique within tenant scope

### lists
- `UNIQUE(userId, name)` - List names must be unique per user

## Composite Foreign Keys

Child tables enforce same-tenant relationships with composite FKs:

### campaign_subscribers
- `(campaign_id, user_id) → campaigns(id, user_id)`
- `(subscriber_id, user_id) → subscribers(id, user_id)`
- Prevents linking campaigns/subscribers from different tenants

### link_clicks
- `(campaign_id, user_id) → campaigns(id, user_id)`
- Prevents tracking clicks for other users' campaigns

### campaign_analytics
- `(campaign_id, user_id) → campaigns(id, user_id)`
- Prevents viewing analytics for other users' campaigns

## Performance Considerations

### Indexes
All userId columns are indexed for fast filtering:
- `sessions_user_id_idx`
- `user_settings_user_id_idx`
- `lists_user_id_idx`
- `blacklist_user_id_idx`
- `rules_user_id_idx`
- `subscribers_user_id_idx`
- `email_templates_user_id_idx`
- `campaigns_user_id_idx`
- `campaign_subscribers_user_id_idx`
- `link_clicks_user_id_idx`
- `campaign_analytics_user_id_idx`

### Query Optimization
- Always include userId in WHERE clauses (enables index usage)
- Use compound indexes for common filter combinations
- Consider materialized views for complex cross-table queries

## Migration Notes

All userId columns were added with NOT NULL constraints. When applying to existing data:
1. Tables were truncated to allow adding NOT NULL userId columns
2. Future migrations will preserve data by setting default userId before constraint
3. Always backup data before schema changes
4. Use `npm run db:push --force` to apply schema changes

## Production Security Checklist

Before deploying to production, verify:

- [x] **Authentication**: Bcrypt password hashing with cost factor 10
- [x] **Session Management**: Bearer tokens with 30-day expiration
- [x] **Middleware**: requireAuth applied to ALL tenant-scoped routes
- [x] **Schema Validation**: All insert schemas use `.strict()`
- [x] **CREATE Operations**: userId injected from session, never from client
- [x] **UPDATE Operations**: req.body sanitized to strip userId/id/timestamps
- [x] **Query Filtering**: All queries filter by session userId
- [x] **Database Constraints**: Composite FKs enforce same-tenant relationships
- [x] **Cascade Deletes**: ON DELETE CASCADE configured correctly
- [x] **Attack Testing**: userId injection/reassignment attacks blocked
- [x] **GDPR Compliance**: Consent and data export fields present

## Summary

✅ **Database provides**: Structure, indexes, cascade deletes, unique constraints, composite FKs
✅ **Application provides**: 
  - Session-based authentication with bcrypt
  - requireAuth middleware on all protected routes
  - Zod `.strict()` schemas blocking userId injection
  - Payload sanitization preventing userId reassignment
  - Query-level tenant filtering by session userId

This is the industry-standard approach used by:
- Stripe (API keys scope to accounts)
- GitHub (repo ownership)
- Slack (workspace isolation)
- Most B2B SaaS platforms

The key is **defense in depth** with multiple security layers working together to prevent tenant breakout attacks.
