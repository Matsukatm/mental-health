// models.js
// MySQL schema and minimal DAO helpers for the mental health app
// Requires mysql2/promise connection
// Usage:
//  const mysql = require('mysql2/promise');
//  const { createSchema, dropSchema, dao } = require('./models');
//  (async () => {
//    const conn = await mysql.createConnection({ host, user, password, database, multipleStatements: true });
//    await createSchema(conn);
//    // use dao.*
//  })();

const DDL = {
  users: `CREATE TABLE IF NOT EXISTS users (
    id            CHAR(36) NOT NULL,
    email         VARCHAR(191) NOT NULL UNIQUE,
    phone         VARCHAR(32) NULL,
    password_hash VARCHAR(191) NULL, -- if using email/password; otherwise NULL for magic link
    role          ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    INDEX idx_users_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  user_profiles: `CREATE TABLE IF NOT EXISTS user_profiles (
    user_id       CHAR(36) NOT NULL,
    nickname      VARCHAR(100) NULL,
    age_range     ENUM('minor','18-24','25-34','35-44','45-54','55+') NULL,
    region        VARCHAR(64) NULL,
    consent_privacy    TINYINT(1) NOT NULL DEFAULT 0,
    consent_caregiver  TINYINT(1) NOT NULL DEFAULT 0,
    preferences   JSON NULL, -- {"reminders":true, "community_opt_in":true, "journal_default_private":true}
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  check_ins: `CREATE TABLE IF NOT EXISTS check_ins (
    id         CHAR(36) NOT NULL,
    user_id    CHAR(36) NOT NULL,
    date_key   DATE NOT NULL, -- enforce one per day if desired
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mood       TINYINT NOT NULL, -- 1..5
    mood_label VARCHAR(32) NULL,
    note       VARCHAR(500) NULL, -- optional short reflection
    actions    JSON NULL, -- {"water":true,"walk":false,"meditate":true}
    PRIMARY KEY (id),
    UNIQUE KEY uq_checkins_user_day (user_id, date_key),
    INDEX idx_checkins_user (user_id),
    INDEX idx_checkins_date (date_key),
    CONSTRAINT fk_checkins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  journal_entries: `CREATE TABLE IF NOT EXISTS journal_entries (
    id          CHAR(36) NOT NULL,
    user_id     CHAR(36) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mood        TINYINT NULL, -- 1..5
    mood_label  VARCHAR(32) NULL,
    tags        JSON NULL, -- ["gratitude","anxiety"]
    encrypted   TINYINT(1) NOT NULL DEFAULT 1,
    ciphertext  LONGTEXT NULL, -- base64
    iv          VARCHAR(255) NULL, -- base64
    salt        VARCHAR(255) NULL, -- base64
    attachment_url VARCHAR(500) NULL,
    PRIMARY KEY (id),
    INDEX idx_journal_user (user_id),
    CONSTRAINT fk_journal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  threads: `CREATE TABLE IF NOT EXISTS threads (
    id          CHAR(36) NOT NULL,
    author_user_id CHAR(36) NOT NULL,
    title       VARCHAR(191) NOT NULL,
    content     TEXT NOT NULL,
    anonymous   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL,
    replies_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_threads_author (author_user_id),
    CONSTRAINT fk_threads_user FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  posts: `CREATE TABLE IF NOT EXISTS posts (
    id           CHAR(36) NOT NULL,
    thread_id    CHAR(36) NOT NULL,
    author_user_id CHAR(36) NOT NULL,
    content      TEXT NOT NULL,
    anonymous    TINYINT(1) NOT NULL DEFAULT 1,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_posts_thread (thread_id),
    INDEX idx_posts_author (author_user_id),
    CONSTRAINT fk_posts_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
    CONSTRAINT fk_posts_user FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  moderation_flags: `CREATE TABLE IF NOT EXISTS moderation_flags (
    id            CHAR(36) NOT NULL,
    resource_type ENUM('thread','post') NOT NULL,
    resource_id   CHAR(36) NOT NULL,
    reporter_user_id CHAR(36) NOT NULL,
    reason        VARCHAR(191) NULL,
    status        ENUM('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_by   CHAR(36) NULL,
    resolved_at   TIMESTAMP NULL,
    PRIMARY KEY (id),
    INDEX idx_flags_resource (resource_type, resource_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  crisis_resources: `CREATE TABLE IF NOT EXISTS crisis_resources (
    id           INT NOT NULL AUTO_INCREMENT,
    region       VARCHAR(64) NOT NULL,
    display_name VARCHAR(191) NOT NULL,
    number       VARCHAR(64) NOT NULL,
    note         VARCHAR(191) NULL,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_crisis_region (region)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
};

async function createSchema(conn) {
  await conn.query(DDL.users);
  await conn.query(DDL.user_profiles);
  await conn.query(DDL.check_ins);
  await conn.query(DDL.journal_entries);
  await conn.query(DDL.threads);
  await conn.query(DDL.posts);
  await conn.query(DDL.moderation_flags);
  await conn.query(DDL.crisis_resources);
}

async function dropSchema(conn) {
  // Drop in reverse dependency order
  await conn.query('DROP TABLE IF EXISTS moderation_flags');
  await conn.query('DROP TABLE IF EXISTS posts');
  await conn.query('DROP TABLE IF EXISTS threads');
  await conn.query('DROP TABLE IF EXISTS journal_entries');
  await conn.query('DROP TABLE IF EXISTS check_ins');
  await conn.query('DROP TABLE IF EXISTS user_profiles');
  await conn.query('DROP TABLE IF EXISTS crisis_resources');
  await conn.query('DROP TABLE IF EXISTS users');
}

// Minimal DAO helpers (skeletons)
const dao = {
  // USERS
  async createUser(conn, { id, email, phone = null, password_hash = null, role = 'user' }) {
    const sql = `INSERT INTO users (id, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`;
    await conn.execute(sql, [id, email, phone, password_hash, role]);
  },
  async upsertProfile(conn, { user_id, nickname = null, age_range = null, region = null, preferences = null, consent_privacy = 0, consent_caregiver = 0 }) {
    const sql = `INSERT INTO user_profiles (user_id, nickname, age_range, region, preferences, consent_privacy, consent_caregiver)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nickname=VALUES(nickname), age_range=VALUES(age_range), region=VALUES(region), preferences=VALUES(preferences), consent_privacy=VALUES(consent_privacy), consent_caregiver=VALUES(consent_caregiver)`;
    await conn.execute(sql, [user_id, nickname, age_range, region, preferences ? JSON.stringify(preferences) : null, consent_privacy, consent_caregiver]);
  },
  async getUserByEmail(conn, email) {
    const [rows] = await conn.execute(`SELECT * FROM users WHERE email=?`, [email]);
    return rows[0] || null;
  },

  // CHECK-INS
  async addCheckIn(conn, { id, user_id, date_key, mood, mood_label = null, note = null, actions = null }) {
    const sql = `INSERT INTO check_ins (id, user_id, date_key, mood, mood_label, note, actions) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await conn.execute(sql, [id, user_id, date_key, mood, mood_label, note, actions ? JSON.stringify(actions) : null]);
  },
  async getCheckInsInRange(conn, user_id, from, to) {
    const sql = `SELECT * FROM check_ins WHERE user_id=? AND date_key BETWEEN ? AND ? ORDER BY date_key ASC`;
    const [rows] = await conn.execute(sql, [user_id, from, to]);
    return rows;
  },
  async getCheckInsSummary(conn, user_id, days = 30) {
    const sql = `SELECT DATE(date_key) AS d, COUNT(*) AS c, AVG(mood) AS avg_mood FROM check_ins WHERE user_id=? AND date_key >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY d ORDER BY d ASC`;
    const [rows] = await conn.execute(sql, [user_id, days]);
    return rows;
  },

  // JOURNAL (encrypted)
  async addJournalEntry(conn, { id, user_id, mood = null, mood_label = null, tags = null, encrypted = 1, ciphertext = null, iv = null, salt = null, attachment_url = null }) {
    const sql = `INSERT INTO journal_entries (id, user_id, mood, mood_label, tags, encrypted, ciphertext, iv, salt, attachment_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await conn.execute(sql, [id, user_id, mood, mood_label, tags ? JSON.stringify(tags) : null, encrypted ? 1 : 0, ciphertext, iv, salt, attachment_url]);
  },
  async getJournalEntries(conn, user_id, { from = null, to = null } = {}) {
    let sql = `SELECT id, user_id, created_at, mood, mood_label, tags, encrypted, ciphertext, iv, salt, attachment_url FROM journal_entries WHERE user_id=?`;
    const params = [user_id];
    if (from) { sql += ` AND created_at >= ?`; params.push(from); }
    if (to) { sql += ` AND created_at <= ?`; params.push(to); }
    sql += ` ORDER BY created_at DESC`;
    const [rows] = await conn.execute(sql, params);
    return rows;
  },

  // COMMUNITY
  async createThread(conn, { id, author_user_id, title, content, anonymous = 1 }) {
    const sql = `INSERT INTO threads (id, author_user_id, title, content, anonymous) VALUES (?, ?, ?, ?, ?)`;
    await conn.execute(sql, [id, author_user_id, title, content, anonymous ? 1 : 0]);
  },
  async listThreads(conn, { page = 1, per_page = 10 } = {}) {
    const offset = (page - 1) * per_page;
    const sql = `SELECT * FROM threads ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await conn.execute(sql, [per_page, offset]);
    return rows;
  },
  async addPost(conn, { id, thread_id, author_user_id, content, anonymous = 1 }) {
    const sql = `INSERT INTO posts (id, thread_id, author_user_id, content, anonymous) VALUES (?, ?, ?, ?, ?)`;
    await conn.execute(sql, [id, thread_id, author_user_id, content, anonymous ? 1 : 0]);
    await conn.execute(`UPDATE threads SET replies_count = replies_count + 1 WHERE id=?`, [thread_id]);
  },
  async getThreadWithPosts(conn, thread_id) {
    const [[thread]] = await conn.execute(`SELECT * FROM threads WHERE id=?`, [thread_id]);
    const [posts] = await conn.execute(`SELECT * FROM posts WHERE thread_id=? ORDER BY created_at ASC`, [thread_id]);
    return { thread, posts };
  },

  // MODERATION
  async flagResource(conn, { id, resource_type, resource_id, reporter_user_id, reason = null }) {
    const sql = `INSERT INTO moderation_flags (id, resource_type, resource_id, reporter_user_id, reason) VALUES (?, ?, ?, ?, ?)`;
    await conn.execute(sql, [id, resource_type, resource_id, reporter_user_id, reason]);
  },

  // CRISIS RESOURCES
  async upsertCrisisResource(conn, { id = null, region, display_name, number, note = null }) {
    if (id) {
      await conn.execute(`UPDATE crisis_resources SET region=?, display_name=?, number=?, note=? WHERE id=?`, [region, display_name, number, note, id]);
      return id;
    } else {
      const sql = `INSERT INTO crisis_resources (region, display_name, number, note) VALUES (?, ?, ?, ?)`;
      const [res] = await conn.execute(sql, [region, display_name, number, note]);
      return res.insertId;
    }
  },
  async getCrisisResourcesByRegion(conn, region) {
    const [rows] = await conn.execute(`SELECT * FROM crisis_resources WHERE region=? ORDER BY display_name ASC`, [region]);
    return rows;
  }
};

module.exports = { createSchema, dropSchema, dao };
