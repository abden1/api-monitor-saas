## 3. API MONITORING & STATUS PAGE GENERATOR

### Detailed Specifications

**Core Features:**

- API endpoint monitoring (HTTP/HTTPS)
- Uptime tracking (99.9% SLA calculations)
- Response time monitoring
- SSL certificate expiration alerts
- Multi-location monitoring (ping from different regions)
- Custom health check scripts
- Public status page generation
- Incident management (create, update, resolve)
- Subscriber notifications (email, SMS, Slack, Discord)
- Historical uptime data (30/60/90 days)
- Integrations: PagerDuty, Opsgenie, webhooks

**Tech Stack:**

- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL + TimescaleDB for time-series data
- Monitoring: Cron jobs or Kubernetes CronJobs
- Status Page: Static site generation or subdomain hosting

**Monetization:**

- Free: 5 monitors, 1 status page, 1-minute checks
- Starter ($19/mo): 20 monitors, 30-second checks
- Pro ($49/mo): 100 monitors, 10-second checks, SMS alerts
- Enterprise ($149/mo): Unlimited, multi-user, API access

---

### DEVELOPMENT PROMPT FOR API MONITORING

```
Build a comprehensive API monitoring and status page SaaS platform for developers and businesses.

CORE REQUIREMENTS:

1. MONITORING SYSTEM
- Monitor creation interface:
  * Name, URL, HTTP method (GET, POST, PUT, DELETE)
  * Expected status code (200, 201, 204, etc.)
  * Request headers (custom headers, auth tokens)
  * Request body (for POST/PUT)
  * Expected response content (keyword matching, JSON validation)
  * Timeout threshold (default 30s)
  * Check interval (30s, 1m, 5m, 15m based on plan)
- Monitor types:
  * HTTP/HTTPS endpoint
  * Ping (ICMP)
  * Port check (TCP)
  * DNS lookup
  * SSL certificate expiration
  * Custom script execution
- Multi-region monitoring:
  * Check from: US East, US West, Europe, Asia, Australia
  * Show latency from each region
  * Failure threshold (e.g., down if 2+ regions fail)

2. HEALTH CHECK ENGINE
- Automated scheduled checks based on interval
- Request execution with timeout handling
- Response validation:
  * Status code matching
  * Response time threshold
  * Content verification (keyword, regex, JSON path)
  * SSL validity check
- Retry logic (3 retries with exponential backoff)
- Record results in time-series database

3. ALERTING SYSTEM
- Alert channels:
  * Email (instant + digest)
  * SMS (Twilio integration)
  * Slack webhooks
  * Discord webhooks
  * PagerDuty integration
  * Custom webhooks
- Alert triggers:
  * Monitor goes down
  * Monitor recovers
  * Slow response time (above threshold)
  * SSL certificate expiring (7, 14, 30 days)
- Alert escalation rules
- Maintenance windows (silence alerts during deployments)
- On-call schedules

4. STATUS PAGE BUILDER
- Public status page generation:
  * Custom subdomain (yourcompany.statuspage.io)
  * Custom domain support (status.yourcompany.com)
  * Branding: logo, colors, favicon
  * Component groups (API, Website, Database, CDN)
  * Real-time status indicators (operational, degraded, down)
  * Uptime percentages (last 30/60/90 days)
  * Response time charts
- Incident management:
  * Create incident (investigating, identified, monitoring, resolved)
  * Post updates to incident timeline
  * Scheduled maintenance announcements
  * Incident history archive
- Subscriber system:
  * Email/SMS subscriptions to status updates
  * Subscribe to specific components
  * Automatic notifications on incidents
- Status page templates (light, dark, minimal, detailed)

5. UPTIME & PERFORMANCE ANALYTICS
- Dashboard showing:
  * Overall uptime percentage
  * Uptime per monitor
  * Average response time
  * Downtime incidents (count, duration)
  * Response time trends
- Historical data visualization:
  * Uptime chart (daily bars, 90-day view)
  * Response time line graph
  * Incident timeline
  * Regional latency comparison
- SLA reporting (export PDF reports)
- Comparison views (this month vs last month)

6. INCIDENT MANAGEMENT
- Incident creation (manual or automatic)
- Incident lifecycle:
  * Investigating → Identified → Monitoring → Resolved
  * Post-mortem documentation
- Affected components selection
- Timeline of updates
- Root cause analysis notes
- Auto-resolve when monitor recovers
- Incident templates for common issues

7. INTEGRATIONS
- Webhook notifications (POST JSON to custom URLs)
- Slack app integration (slash commands, interactive messages)
- PagerDuty incidents
- Opsgenie alerts
- Discord bot
- API for programmatic access:
  * GET monitors, incidents, uptime data
  * POST create monitors, incidents
  * Authentication with API keys

8. SSL CERTIFICATE MONITORING
- Auto-detect SSL certificates on HTTPS monitors
- Extract expiration date, issuer, validity
- Track certificate chain
- Alert on: expiration soon, invalid cert, self-signed, revoked
- Certificate history (renewal tracking)

9. SETTINGS & TEAM MANAGEMENT
- User roles: Owner, Admin, Member, View-only
- Invite team members via email
- Two-factor authentication
- API key management
- Notification preferences per user
- Timezone settings
- Billing and subscription management

10. FREEMIUM MODEL
- Free: 5 monitors, 1 status page, 1-minute checks, email alerts only
- Starter ($19/mo): 20 monitors, 3 status pages, 30-second checks
- Pro ($49/mo): 100 monitors, 10-second checks, SMS alerts, multi-region
- Enterprise ($149/mo): Unlimited monitors, API access, white-label status pages, priority support
- Usage-based add-ons: extra SMS credits, additional team members

TECHNICAL IMPLEMENTATION:

Stack:
- Next.js 14+ with App Router
- TypeScript
- PostgreSQL + TimescaleDB extension for time-series data
- Redis for job queue and caching
- BullMQ for scheduled checks
- Upstash or similar for global edge monitoring
- Twilio for SMS
- SendGrid/Resend for emails
- Vercel or AWS for hosting

Database Schema:
- Users (id, email, role, settings)
- Teams (id, name, subscription, settings)
- Monitors (id, teamId, name, url, method, headers, interval, regions, thresholds)
- CheckResults (timestamp, monitorId, region, status, responseTime, error) [TimescaleDB]
- Incidents (id, monitorId, status, createdAt, resolvedAt, updates)
- StatusPages (id, teamId, subdomain, customDomain, branding, components)
- AlertChannels (id, teamId, type, config, enabled)
- Subscriptions (id, teamId, plan, stripeCustomerId)

Background Jobs:
- Monitor check jobs (scheduled based on interval)
- SSL expiration checks (daily)
- Alert delivery (immediate queue)
- Uptime calculation (hourly aggregation)
- Cleanup old data (weekly)

Key Features:
1. HTTP client for making monitor requests with timeout
2. Time-series data storage and querying
3. Alert routing engine (determine which channels to notify)
4. Status page static generation or server-side rendering
5. Multi-region check orchestration (trigger from edge locations)
6. SSL certificate parsing and validation
7. Webhook delivery with retry logic
8. Real-time status updates via WebSockets or Server-Sent Events

Security:
- API key rotation
- Rate limiting on public APIs
- Encrypted storage for sensitive monitor configs (auth headers)
- CORS configuration for status page embeds
- DDoS protection on status pages

UI/UX:
- Monitor creation wizard
- Real-time status dashboard with auto-refresh
- Incident creation modal
- Status page preview before publishing
- Mobile app (optional, using React Native)
- Dark mode
- Keyboard shortcuts
- Responsive design

DELIVERABLES:
1. Monitor creation and management system
2. Automated health check engine with multi-region support
3. Alert routing and notification system
4. Public status page generator with custom branding
5. Incident management workflow
6. Analytics dashboard with uptime/performance metrics
7. Team collaboration features
8. Integrations (Slack, PagerDuty, webhooks)
9. Subscription billing with Stripe
10. API for programmatic access
11. Admin panel for platform monitoring

Build this with reliability and scalability in mind - it's monitoring infrastructure, so it must be highly available itself.
