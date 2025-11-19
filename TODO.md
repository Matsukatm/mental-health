# Project TODO

This file tracks remaining tasks to make the app fully functional and market-ready. Use the checkboxes to manage progress.

## 1) Security & Authentication
- [ ] Replace mock auth with a real provider (Firebase/Supabase/Auth0/Cognito) or self-managed JWT auth
- [ ] Implement password hashing (bcrypt/argon2) if email/password is kept
- [ ] Add JWT/session verification middleware in backend; attach user to req
- [ ] Enforce authorization (resource ownership, admin-only routes)
- [ ] Add input validation (zod/joi) on all endpoints
- [ ] Sanitize community content to prevent XSS/HTML injection
- [ ] Add rate limiting and basic DoS protection (e.g., express-rate-limit)
- [ ] Add CAPTCHA/anti-spam on signup/posting if needed

## 2) Frontend API Integration
- [ ] Introduce API base (VITE_API_BASE) and API client wrapper (fetch JSON, errors)
- [ ] Auth: wire signup/login to backend; persist user and token in context
- [ ] Mood/Check-in: POST /checkins on save; GET /checkins(+summary) for Dashboard
- [ ] Journal: POST /journal with ciphertext; GET /journal; decrypt client-side
- [ ] Community: GET /threads; POST /threads; GET /threads/:id; POST /threads/:id/posts
- [ ] Crisis resources: GET /resources/crisis?region=XX
- [ ] Admin: use /admin/metrics endpoints (and extend as needed)
- [ ] Remove localStorage fallbacks or keep as offline cache with sync strategy

## 3) Journal Encryption UX
- [ ] Improve passphrase UX (set/confirm, session cache, warnings)
- [ ] Explain irrecoverability of encrypted content without passphrase
- [ ] Optional: in-memory key derivation caching until tab close

## 4) Community & Moderation
- [ ] Editing/deleting threads and posts (with time windows)
- [ ] Moderation UI for admins: review flags, resolve/dismiss, ban if needed
- [ ] Auto-flagging/bad language filters; rate limited posting

## 5) Admin/NGO Dashboards
- [ ] Global aggregates (DAU/WAU/MAU, total check-ins, avg mood by region)
- [ ] Time range filters (7/30/90 days) and compare periods
- [ ] CSV/JSON export endpoints (non-PII) and scheduled reports (email)
- [ ] Crisis resources CMS (create/update hotlines with audit trail)

## 6) Notifications & Reminders
- [ ] Email/push reminders for daily check-ins (FCM/Web Push + backend jobs)
- [ ] Notification preferences UI & tokens management
- [ ] Digest emails (weekly/monthly) with progress summaries

## 7) Privacy, Legal & Compliance
- [ ] Real Privacy Policy & Terms of Service pages/content
- [ ] Consent capture and storage (privacy, caregiver/guardian where applicable)
- [ ] GDPR/CCPA: user data export and data deletion endpoints & UI
- [ ] Data minimization: separate PII from activity data; limit joins access
- [ ] Audit logs for admin/moderation actions

## 8) Accessibility & Internationalization
- [ ] Full keyboard navigation audit, focus management on all modals
- [ ] ARIA attributes for dynamic components (forms, toasts, loaders)
- [ ] Color contrast checks for light/dark themes, high-contrast mode
- [ ] Expand i18n coverage (wrap all strings; ES done partially only for crisis labels)
- [ ] RTL support check if targeting RTL locales

## 9) UX, Theming & Mobile
- [ ] Mobile nav polish (drawer, safe-area insets, larger tap targets)
- [ ] Chart readability on small screens; responsive layouts for all grids
- [ ] Brand design pass: logo, palette, typography, illustration system
- [ ] Add framer-motion or CSS motion with prefers-reduced-motion support

## 10) Performance & Reliability
- [ ] Frontend code-splitting (lazy load heavy pages: Community/Admin)
- [ ] Memoize heavy data transforms; virtualize large lists if needed
- [ ] Backend: optimize queries, add relevant indexes beyond current ones
- [ ] Introduce background job system (BullMQ/Cloud Tasks) for reminders & metrics

## 11) DevOps & Deployment
- [ ] Environments: dev, staging, prod with separate DBs and secrets
- [ ] CI/CD pipeline (lint, tests, migrations, deploy)
- [ ] DB migrations tooling (Knex/Prisma/Flyway) for schema evolution
- [ ] Monitoring/observability: centralized logs, Sentry (FE+BE), APM/metrics
- [ ] DB backups & restore procedure
- [ ] CORS allowlist and security headers for production

## 12) Testing
- [ ] Unit tests for crypto utils, reducers, components
- [ ] Backend endpoint tests (supertest)
- [ ] E2E tests (Playwright/Cypress) for core flows: signup → onboarding → check-in → journal → dashboard
- [ ] Load testing for community and check-ins

## 13) Content & Data
- [ ] Verify and maintain crisis hotlines dataset (by region) with editorial process
- [ ] Caregiver/Resource content: commission or license high-quality guides; update cadence
- [ ] Add disclaimers & clear crisis escalation steps

## 14) Monetization & Analytics (optional)
- [ ] Decide pricing or donation model; integrate Stripe if necessary
- [ ] Privacy-first analytics (Plausible, PostHog, etc.)
- [ ] Onboarding funnel tracking and retention metrics

## 15) Known Gaps (short-term fixes)
- [ ] Backend auth: add JWT and middleware; restrict routes to authenticated users
- [ ] Implement phone OTP and magic link (provider-based) or remove from UI until ready
- [ ] Add validation for all POST/PUT payloads and sanitize user-generated content
- [ ] Frontend: wire API calls and remove remaining local-only pathways
- [ ] Improve NotFound handling by migrating to react-router (optional but recommended)

## 16) Deployment Checklist
- [ ] Configure production DB and apply schema
- [ ] Seed crisis resources data
- [ ] Configure environment variables (.env) for FE/BE
- [ ] Set up CDN or static hosting for frontend; secure API behind HTTPS
- [ ] Final accessibility & QA pass

