# DeliverAI Mail Dashboard

## Overview

DeliverAI Mail is an AI-powered email deliverability platform that provides real-time insights into email campaign performance, compliance monitoring, and provider-specific analytics. The application helps users optimize their email sending reputation across major mailbox providers (Gmail, Yahoo, Outlook) by tracking key deliverability metrics, enforcing authentication standards (SPF, DKIM, DMARC), and providing AI-driven recommendations for improving inbox placement rates.

The platform combines a React-based dashboard with a PostgreSQL database backend, offering features for managing email campaigns, templates, subscriber lists, and comprehensive deliverability analytics.

## Recent Changes

**November 14, 2025 - Database Migration to Custom PostgreSQL**
- Migrated from Neon serverless PostgreSQL to custom self-hosted PostgreSQL database
- Updated database driver from `@neondatabase/serverless` to standard `pg` (node-postgres)
- Configured `sslmode=disable` in DATABASE_URL to handle self-signed SSL certificates
- Verified all 16 database tables successfully migrated with complete schema and indexes
- Confirmed authentication system (signup/login) working correctly with new database
- Multi-tenant data isolation verified and functioning
- **Note**: Database credentials stored securely in Replit Secrets

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React 19 with TypeScript, served via Vite development server

**Key Design Decisions**:
- **Component-based UI**: Modular React components for dashboard widgets, charts, lists, and forms
- **Single Page Application (SPA)**: Client-side routing managed through state (`currentPage`) rather than a routing library, keeping the architecture simple for a dashboard-focused application
- **Tailwind CSS for Styling**: Utility-first CSS framework with custom configuration for brand colors and design tokens, augmented with shadcn/ui component patterns
- **CDN-delivered Dependencies**: Major libraries (React, Recharts, Lucide icons) loaded via importmap from aistudiocdn.com, reducing bundle size and leveraging browser caching

**Rationale**: This architecture provides fast development velocity and a responsive UI without the overhead of a full routing framework. The component structure separates concerns (KPI tiles, charts, lists) making it easy to iterate on individual features.

**Trade-offs**: 
- Pros: Simple mental model, fast hot-reload during development, minimal build complexity
- Cons: Manual state management for navigation, potential prop-drilling as app grows

### Data Visualization

**Recharts Library**: Used for deliverability metrics visualization (bar charts, radial gauges)

**Key Components**:
- `SpamRateGauge`: Radial chart showing Gmail spam rates with color-coded thresholds (green <0.10%, yellow 0.10-0.30%, red >0.30%)
- `DomainPerformanceChart`: Bar chart comparing delivery, complaint, and spam rates across email providers
- Custom tooltips and styling to match dark mode UI theme

**Rationale**: Recharts provides responsive, accessible charts with minimal configuration while maintaining visual consistency with the dashboard's design system.

### Backend Architecture

**Technology Stack**: Express.js server with TypeScript, running on Node.js

**API Structure**: RESTful endpoints organized by resource type:
- `/api/subscribers` - Subscriber management (CRUD operations)
- `/api/templates` - Email template management
- `/api/campaigns` - Campaign creation and monitoring
- `/api/settings` - SMTP and sender configuration
- `/api/analytics` - Deliverability metrics and reporting

**Request/Response Flow**:
1. Client components fetch data via standard `fetch()` API calls
2. Express routes validate requests and interact with database via Drizzle ORM
3. Responses return JSON data conforming to TypeScript interfaces defined in `types.ts` and `shared/schema.ts`

**Rationale**: Express provides a lightweight, flexible foundation for API development. The RESTful design makes the API intuitive and easy to extend. TypeScript ensures type safety across the client-server boundary.

**Trade-offs**:
- Pros: Simple to understand, extensive ecosystem, minimal magic
- Cons: No built-in validation layer (relies on Zod schemas), manual error handling patterns

### Database Layer

**Database**: Custom self-hosted PostgreSQL database

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Schema** (defined in `shared/schema.ts`) - 16 tables:

**Authentication & User Management**:
1. **users**: User accounts with bcrypt password hashing, company info, role-based access, 2FA support
2. **sessions**: Session tokens for authentication with expiration tracking
3. **user_settings**: Per-user configuration preferences

**Core Email Management**:
4. **subscribers**: Email addresses with status tracking (active, unsubscribed, bounced, complained), list memberships, custom metadata, and GDPR double opt-in support
5. **lists**: Subscriber list organization for segmentation
6. **emailTemplates**: Reusable HTML/text email templates with subject lines and thumbnails
7. **campaigns**: Email sending campaigns linked to templates and subscriber lists with scheduling support
8. **campaignSubscribers**: Junction table tracking which subscribers received which campaigns

**Analytics & Tracking**:
9. **campaignAnalytics**: Per-campaign metrics (opens, clicks, bounces, complaints, deliverability rates)
10. **linkClicks**: Individual link click tracking with timestamps
11. **webVersionViews**: Web version page view tracking

**Email Provider Integration**:
12. **emailProviderIntegrations**: Encrypted AWS SES credentials storage per user (multi-tenant)
13. **settings**: Application-wide configuration key-value store

**Compliance & Management**:
14. **blacklist**: Domain and email blocklist for compliance
15. **rules**: Automation rules for subscriber management
16. **notifications**: User notification system

**Schema Validation**: Drizzle-Zod integration generates Zod schemas from database schema definitions, ensuring runtime validation matches database constraints

**Connection Management**: 
- Uses standard node-postgres (`pg`) driver with connection pooling
- Custom PostgreSQL database configured via DATABASE_URL environment variable
- SSL disabled (`sslmode=disable`) to handle self-signed certificates on custom database server
- Connection pooling via `pg.Pool` for efficient resource management

**Migration**: Successfully migrated from Neon serverless PostgreSQL to custom self-hosted PostgreSQL database (November 14, 2025)

**Rationale**: Drizzle offers a type-safe, SQL-like query builder that feels familiar to developers while preventing common SQL injection vulnerabilities. The standard PostgreSQL driver provides maximum compatibility with self-hosted databases.

**Trade-offs**:
- Pros: Excellent TypeScript integration, migrations managed via drizzle-kit (`npm run db:push`), lightweight compared to Prisma, full control over database infrastructure
- Cons: Smaller community than alternatives, manual SSL certificate management for self-hosted databases

### AI Integration

**Google Generative AI (Gemini)**: Powers the AI Assistant feature

**Implementation** (`components/AIAssistant.tsx`):
- Uses Gemini 1.5 Flash model for fast, cost-effective responses
- System instruction configures the AI as a deliverability expert with context about the user's current metrics
- Markdown-formatted responses rendered via `marked` library
- Suggested prompts guide users toward actionable deliverability improvements

**API Key Management**: Gemini API key loaded from environment variables and exposed to client via Vite's `define` configuration

**Rationale**: Gemini provides strong performance for conversational AI at a lower cost than alternatives. The streaming response capability (not currently implemented) allows for future UX improvements.

**Trade-offs**:
- Pros: Powerful language understanding, good at technical explanations, affordable
- Cons: API key exposed to client (security consideration), no built-in conversation memory

### Authentication & Authorization

**Current State**: Full session-based authentication implemented

**Authentication System**:
- **Session Tokens**: 32-byte cryptographically secure tokens generated via `randomBytes()`
- **Password Security**: bcrypt hashing with salt rounds of 10
- **Session Expiration**: 30-day token lifetime with automatic cleanup
- **Multi-Tenancy**: Complete data isolation per user via `userId` foreign keys and auth middleware

**API Endpoints**:
- `POST /api/auth/signup`: User registration with email validation and password strength requirements (min 8 chars, letter + number)
- `POST /api/auth/login`: Email/password authentication returning session token
- `GET /api/auth/me`: Current user profile retrieval
- Protected routes use Authorization header: `Bearer <token>`

**Authorization Middleware**: All protected API endpoints validate session tokens and inject `userId` into request context for multi-tenant data isolation

**Security Features**:
- Email uniqueness validation
- Password strength enforcement (minimum 8 characters, must contain letters and numbers)
- Case-insensitive email matching
- Secure session token generation
- Database-backed session validation

### Compliance Monitoring System

**Compliance Checklist Feature**: Real-time validation of email authentication protocols

**Monitored Standards**:
- SPF (Sender Policy Framework) alignment
- DKIM (DomainKeys Identified Mail) signatures
- DMARC (Domain-based Message Authentication) policy
- One-Click Unsubscribe headers (List-Unsubscribe)
- TLS encryption for mail transport
- Feedback Loop (FBL) configuration

**Status Indicators**: Pass/warn/fail states with actionable remediation links

**Rationale**: Email deliverability heavily depends on proper authentication configuration. The checklist provides at-a-glance validation of critical infrastructure, helping users maintain high sender reputation.

**Current Implementation**: Mock data in frontend; backend implementation would require integrating with DNS lookup services and SMTP testing tools.

## External Dependencies

### Third-Party Services

**Custom PostgreSQL Database**: 
- Self-hosted PostgreSQL server (custom instance)
- Configured via `DATABASE_URL` environment variable (stored in Replit Secrets)
- Standard TCP connections with SSL disabled for self-signed certificates
- Managed via `npm run db:push` for schema synchronization

**Google Generative AI (Gemini)**:
- AI-powered deliverability assistant
- Requires `GEMINI_API_KEY` environment variable
- Uses Gemini 1.5 Flash model

**CDN Services**:
- aistudiocdn.com: Delivers React, React DOM, Recharts, Lucide icons, and Gemini SDK
- Google Fonts: Inter font family for typography
- Tailwind CSS CDN: Development-time styling (production should use built CSS)

### NPM Dependencies

**Core Framework**:
- `react` & `react-dom` (19.2.0): UI framework
- `vite` (6.2.0): Build tool and development server
- `express` (5.1.0): Web server framework
- `typescript` (5.8.2): Type safety

**Database & ORM**:
- `drizzle-orm` (0.44.7): Type-safe ORM
- `drizzle-kit` (0.31.6): Schema migrations
- `pg` (latest): Standard PostgreSQL driver for node.js
- `drizzle-zod` (0.8.3): Schema validation

**UI & Visualization**:
- `recharts` (3.3.0): Data visualization charts
- `lucide-react` (0.548.0): Icon library
- `tailwindcss` (4.1.17): Utility-first CSS framework
- `tailwindcss-animate` (1.0.7): Animation utilities

**AI & Utilities**:
- `@google/generative-ai` (0.21.0): Gemini API client
- `marked` (13.0.3): Markdown parsing for AI responses
- `zod` (4.1.12): Runtime schema validation
- `ws` (8.18.3): WebSocket library for database connections

**Build Tools**:
- `@vitejs/plugin-react` (5.0.0): React integration for Vite
- `autoprefixer` (10.4.22): CSS vendor prefixing
- `tsx` (4.20.6): TypeScript execution

### API Integrations

**Current Integrations**: None beyond Gemini AI

**Potential Future Integrations**:
- **SMTP Providers**: SendGrid, Mailgun, Amazon SES for actual email sending
- **DNS Lookup Services**: For validating SPF/DKIM/DMARC records
- **Email Verification**: Services like ZeroBounce or NeverBounce for list hygiene
- **Analytics Providers**: For tracking email opens/clicks (currently stub data)
- **Feedback Loop Services**: Yahoo CFL, Gmail Postmaster Tools API

### Environment Variables

**Required Configuration**:
- `DATABASE_URL`: PostgreSQL connection string for custom database
  - Format: `postgresql://username:password@host:port/database?sslmode=disable`
  - Example: `postgresql://myuser:mypass@db.example.com:5432/mydb?sslmode=disable`
  - Note: `sslmode=disable` required for self-signed SSL certificates
  - **Security**: Never commit actual credentials. Store in Replit Secrets or environment variables.
- `GEMINI_API_KEY`: Google Generative AI API key for AI assistant feature
  - **Security**: Store in Replit Secrets, never commit to repository

**Optional Configuration**:
- `ENCRYPTION_KEY`: Key for encrypting AWS SES credentials (auto-generated in development, must be set in production)
- `TRACKING_SECRET`: Secret for validating tracking tokens (auto-generated in development, must be set in production)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`: AWS SES credentials (users configure their own via dashboard)