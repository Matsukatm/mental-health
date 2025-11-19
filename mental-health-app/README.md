# MindfulSpace — Mental Health Awareness Web App

MindfulSpace is a calming, privacy‑minded web experience for building healthy emotional habits. It helps people check in with their mood, reflect in a secure journal, learn from gentle insights, and connect safely with others.

This README provides:
- A user‑centric overview of what MindfulSpace does, how it feels to use, and why it matters
- A developer‑centric overview of the architecture, tech stack, setup, and roadmap


## User Perspective

### What MindfulSpace helps you do
- Build a daily habit
  - Check in with your mood using friendly emoji and quick micro‑actions (drink water, walk, meditate)
  - Write short reflections to ground yourself and notice patterns
- Understand your patterns
  - Dashboard shows mood trends (line chart) and a 4‑week heatmap
  - Habit streaks encourage consistency in a gentle way
  - Tips for today: simple suggestions based on recent entries
- Reflect privately
  - Journal your thoughts with optional client‑side encryption (you control the passphrase)
  - Tag entries (e.g., gratitude, anxiety) and optionally add a mood tag
- Connect safely (optional)
  - Explore anonymous community threads and challenges
  - Create supportive posts, or join small challenges (e.g., gratitude week)
  - Report content that feels unsafe or off-topic (moderation tools available)
- Get support quickly
  - Crisis modal/page with local hotlines, grounding exercises, and immediate coping steps
  - Clear crisis resource links when you need fast help
- Personalize your experience
  - Onboarding sets a nickname, region, and preferences (reminders, community opt‑in, private journal)
  - Light/dark theme toggle and language select (early i18n, EN/ES labels for crisis content)

### Pages and what you can do there
- Landing
  - Learn what MindfulSpace is, see key features and testimonials, and sign up or log in
- Auth (Login/Signup)
  - Login with email (magic link UI) or phone OTP UI stub
  - Signup with email/password, nickname (optional), and consent checkboxes
- Onboarding
  - Quick steps to set nickname, region, baseline mood, and preferences
- Daily Check‑in
  - Select mood, write a short reflection, choose micro‑actions, save your check‑in
- Dashboard
  - See your recent mood trends, 4‑week heatmap, habit streaks, and gentle suggestions
- Journal
  - Create entries, tag them, optionally encrypt with your passphrase
  - Open entries in a modal and decrypt client��side when encrypted
- Community
  - Browse threads, open posts, create a new post (anonymous option)
  - Pagination and simple group challenges
- Caregiver/Resources
  - Helpful quick guides, an explainer video embed, and a crisis resource link
- Crisis (Modal/Page)
  - Emergency hotlines by region, grounding exercises, coping steps based on your recent mood
- Admin/NGO Dashboard (MVP)
  - Basic metrics: total check‑ins, average mood, and a simple trend overview

### Privacy by default
- You control your journal passphrase; encrypted entries are unreadable without it
- Non‑PII analytics approach for admin/NGO dashboards (aggregates only)
- Clear consent for privacy; community is optional


## Developer Perspective

### Repository layout
```
mental-health/ (project root)
├─ mental-health-app/         # Frontend (Vite + React)
│  ├─ src/
│  │  ├─ App.jsx             # App, custom hash router, providers, pages, components
│  │  ├─ index.css           # Theme and landing page styles (refreshed with hero imagery)
│  │  └─ main.jsx            # React entry
│  └─ ...
├─ backend/                  # Node.js backend (Express + mysql2)
│  ├─ models.js              # MySQL schema (DDL) + DAO helpers
│  └─ index.js               # Express API (auth mock, check-ins, journal, community, crisis)
├─ README.md                 # This file
└─ TODO.md                   # Roadmap and tasks to reach production readiness
```

### Tech stack
- Frontend
  - Vite + React (function components), hash‑based router (no dependency)
  - CSS with custom theme, glassmorphism, responsive layout
  - Client‑side encryption using WebCrypto (AES‑GCM + PBKDF2) for journals
  - Accessibility patterns: keyboard focus, aria-live, modal focus‑trap, reduced motion respect
- Backend
  - Node.js + Express
  - MySQL (mysql2/promise), schema and DAO in backend/models.js
  - REST endpoints for auth (mock), check‑ins, journal (encrypted), community, crisis resources, metrics (MVP)

### Architecture overview
- Frontend contexts
  - AuthContext: user session (mocked in MVP, prepared for provider swap)
  - MoodContext: check‑ins and suggestions (local → replace with API calls)
  - JournalContext: encrypted journal entries, passphrase state, decrypt helpers
  - CommunityContext: thread list and new post creation (local → replace with API calls)
- Backend responsibilities
  - Data storage (MySQL)
  - Check‑in ingest and summaries
  - Journal storage of ciphertext (never plaintext or passphrase)
  - Community threads and posts
  - Crisis resources (by region)

### Database schema (MySQL)
- users, user_profiles
- check_ins: mood, note, actions, unique (user_id, date)
- journal_entries: ciphertext, iv, salt, tags, (optional) mood tag
- threads, posts: community content (anonymous option)
- moderation_flags: reporting system scaffolding
- crisis_resources: hotline dataset (admin-editable)

See backend/models.js for full DDL and DAO helpers.

### API endpoints (MVP)
- Health: GET /health
- Auth (mock):
  - POST /auth/signup { email, password?, nickname?, consents? }
  - POST /auth/login { email, password? }
  - GET /me/:email
- Check‑ins:
  - POST /checkins { user_id, date_key, mood, mood_label?, note?, actions? }
  - GET /checkins?user_id&from&to
  - GET /checkins/summary?user_id&days
- Journal (encrypted only):
  - POST /journal { user_id, ciphertext, iv, salt, mood?, tags? }
  - GET /journal?user_id&from?&to?
- Community:
  - POST /threads { author_user_id, title, content, anonymous? }
  - GET /threads?page&per_page
  - GET /threads/:id
  - POST /threads/:id/posts { author_user_id, content, anonymous? }
- Moderation:
  - POST /flags { resource_type, resource_id, reporter_user_id, reason? }
- Crisis resources: GET /resources/crisis?region
- Admin: GET /admin/metrics/checkins?user_id&days (user-scoped MVP)

### Running locally
Prerequisites: Node 18+, MySQL

1) Database
```
CREATE DATABASE mental_health CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2) Backend
```
cd backend
npm init -y
npm install express mysql2 cors morgan
set PORT=4000
set DB_HOST=localhost
set DB_USER=root
set DB_PASS=
set DB_NAME=mental_health
node index.js
```
- The server will auto‑create tables.
- Visit http://localhost:4000/health → { ok: true }

3) Frontend
```
cd ../mental-health-app
npm install
# point frontend to your API
# create .env with: VITE_API_BASE=http://localhost:4000
npm run dev
```
- Open the printed URL (usually http://localhost:5173)

### Deployment blueprint
- Frontend: build with Vite and deploy to Vercel/Netlify/Cloudflare Pages
- Backend: deploy to Render/Fly/Railway or a VPS (Node + PM2), add HTTPS and CORS allowlist
- Database: managed MySQL (PlanetScale, RDS, Cloud SQL)
- Add environment variables and secrets in your platform
- Set up CI/CD, migrations, backups, and monitoring (see TODO.md)

### Security and privacy notes
- Journal: encryption is client‑side. Store only ciphertext, iv, salt. Never store passphrase.
- Move from mock auth to real provider/JWT
- Add validation, sanitization, authorization guards (owner checks, admin only), and rate limiting
- Ensure legal pages and consent flows for production

### Accessibility and i18n
- Accessible modals with focus trap and Escape close
- aria-live regions for feedback, keyboard focus styles
- Light/dark themes, early EN/ES labels for crisis content
- Expand i18n coverage and add RTL checks if needed

### Roadmap (see TODO.md for full list)
- Replace mock auth with provider (JWT), owner checks, admin RBAC
- Frontend: wire all contexts/pages to API; remove local‑only fallbacks
- Add moderation UI, global NGO analytics and exports
- Reminders/notifications (email/push), scheduled digests
- Legal/compliance (Privacy Policy, ToS, GDPR/CCPA export/delete)
- Accessibility audits; more languages; mobile polish
- Tests (unit/integration/E2E), CI/CD pipeline, migrations and monitoring

### Contributing
- Open issues for bugs and feature requests
- Fork and submit PRs
- Please follow accessibility, privacy, and security best practices

### License
- Specify your license (e.g., MIT) here before open‑sourcing

---
MindfulSpace is intentionally calm, inclusive, and privacy‑aware. It’s designed to help people build mindful habits safely—one small step at a time.
