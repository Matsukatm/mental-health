// backend/index.js
// Minimal Node.js backend using Express + mysql2 + models.js
// Env vars: PORT, DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET (for real auth)

const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const cors = require('cors');
const morgan = require('morgan');
const { createSchema, dao } = require('./models');

const PORT = process.env.PORT || 4000;

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  // DB connection pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mental_health',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
  });

  // init schema (idempotent)
  const conn = await pool.getConnection();
  try { await createSchema(conn); } finally { conn.release(); }

  // Health
  app.get('/health', (req, res) => res.json({ ok: true }));

  // Simple auth mock routes (replace with provider integration in production)
  app.post('/auth/signup', async (req, res) => {
    const { email, password, nickname, consents } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    const id = crypto.randomUUID();
    const password_hash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
    const conn = await pool.getConnection();
    try {
      await dao.createUser(conn, { id, email, password_hash });
      await dao.upsertProfile(conn, { user_id: id, nickname: nickname || null, preferences: { journal_default_private: true }, consent_privacy: consents?.privacy ? 1 : 0, consent_caregiver: consents?.caregiver ? 1 : 0 });
      res.json({ id, email, nickname });
    } catch (e) { console.error(e); res.status(500).json({ error: 'signup failed' }); }
    finally { conn.release(); }
  });

  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    const conn = await pool.getConnection();
    try {
      const user = await dao.getUserByEmail(conn, email);
      if (!user) return res.status(404).json({ error: 'not found' });
      if (password && user.password_hash) {
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash !== user.password_hash) return res.status(401).json({ error: 'invalid credentials' });
      }
      res.json({ id: user.id, email: user.email, role: user.role });
    } catch (e) { console.error(e); res.status(500).json({ error: 'login failed' }); }
    finally { conn.release(); }
  });

  // Profile
  app.get('/me/:email', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const user = await dao.getUserByEmail(conn, req.params.email);
      if (!user) return res.status(404).json({ error: 'not found' });
      res.json(user);
    } catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  // Check-ins
  app.post('/checkins', async (req, res) => {
    const { user_id, date_key, mood, mood_label, note, actions } = req.body || {};
    if (!user_id || !date_key || !mood) return res.status(400).json({ error: 'user_id,date_key,mood required' });
    const id = crypto.randomUUID();
    const conn = await pool.getConnection();
    try {
      await dao.addCheckIn(conn, { id, user_id, date_key, mood, mood_label, note, actions });
      res.json({ id });
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'check-in already exists for this date' });
      console.error(e); res.status(500).json({ error: 'failed' });
    } finally { conn.release(); }
  });

  app.get('/checkins', async (req, res) => {
    const { user_id, from, to } = req.query;
    if (!user_id || !from || !to) return res.status(400).json({ error: 'user_id, from, to required' });
    const conn = await pool.getConnection();
    try {
      const rows = await dao.getCheckInsInRange(conn, user_id, from, to);
      res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  app.get('/checkins/summary', async (req, res) => {
    const { user_id, days = 30 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const conn = await pool.getConnection();
    try {
      const rows = await dao.getCheckInsSummary(conn, user_id, Number(days));
      res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  // Journal (ciphertext only)
  app.post('/journal', async (req, res) => {
    const { user_id, mood, mood_label, tags, encrypted = 1, ciphertext, iv, salt, attachment_url } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (encrypted && (!ciphertext || !iv || !salt)) return res.status(400).json({ error: 'ciphertext, iv, salt required when encrypted=1' });
    const id = crypto.randomUUID();
    const conn = await pool.getConnection();
    try {
      await dao.addJournalEntry(conn, { id, user_id, mood, mood_label, tags, encrypted, ciphertext, iv, salt, attachment_url });
      res.json({ id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  app.get('/journal', async (req, res) => {
    const { user_id, from, to } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const conn = await pool.getConnection();
    try {
      const rows = await dao.getJournalEntries(conn, user_id, { from, to });
      res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  // Community
  app.post('/threads', async (req, res) => {
    const { author_user_id, title, content, anonymous = 1 } = req.body || {};
    if (!author_user_id || !title || !content) return res.status(400).json({ error: 'author_user_id, title, content required' });
    const id = crypto.randomUUID();
    const conn = await pool.getConnection();
    try { await dao.createThread(conn, { id, author_user_id, title, content, anonymous }); res.json({ id }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  app.get('/threads', async (req, res) => {
    const { page = 1, per_page = 10 } = req.query;
    const conn = await pool.getConnection();
    try { const rows = await dao.listThreads(conn, { page: Number(page), per_page: Number(per_page) }); res.json(rows); }
    catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  app.get('/threads/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try { const data = await dao.getThreadWithPosts(conn, req.params.id); if (!data.thread) return res.status(404).json({ error: 'not found' }); res.json(data); }
    catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  app.post('/threads/:id/posts', async (req, res) => {
    const { author_user_id, content, anonymous = 1 } = req.body || {};
    if (!author_user_id || !content) return res.status(400).json({ error: 'author_user_id, content required' });
    const id = crypto.randomUUID();
    const conn = await pool.getConnection();
    try { await dao.addPost(conn, { id, thread_id: req.params.id, author_user_id, content, anonymous }); res.json({ id }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  // Moderation flags
  app.post('/flags', async (req, res) => {
    const { resource_type, resource_id, reporter_user_id, reason } = req.body || {};
    if (!resource_type || !resource_id || !reporter_user_id) return res.status(400).json({ error: 'resource_type, resource_id, reporter_user_id required' });
    const id = crypto.randomUUID();
    const conn = await pool.getConnection();
    try { await dao.flagResource(conn, { id, resource_type, resource_id, reporter_user_id, reason }); res.json({ id }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  // Crisis resources
  app.get('/resources/crisis', async (req, res) => {
    const { region } = req.query;
    if (!region) return res.status(400).json({ error: 'region required' });
    const conn = await pool.getConnection();
    try { const rows = await dao.getCrisisResourcesByRegion(conn, region); res.json(rows); }
    catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  // Admin metrics (basic)
  app.get('/admin/metrics/checkins', async (req, res) => {
    const { user_id, days = 30 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const conn = await pool.getConnection();
    try { const rows = await dao.getCheckInsSummary(conn, user_id, Number(days)); res.json(rows); }
    catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
    finally { conn.release(); }
  });

  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

main().catch((e) => { console.error('fatal', e); process.exit(1); });
