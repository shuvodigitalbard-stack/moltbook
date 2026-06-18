// Database connection utility - SQLite via sql.js
import initSqlJs from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

interface SQLDatabase {
  run(sql: string, params?: any[]): void;
  exec(sql: string, params?: any[]): any[];
  prepare(sql: string): any;
  export(): Uint8Array;
  close(): void;
}

let db: SQLDatabase | null = null;
const DB_PATH = path.join(process.cwd(), 'moltbook.db');

export async function getDB(): Promise<SQLDatabase> {
  if (db) return db;
  
  const SQL = await initSqlJs();
  
  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Initialize tables
  initTables(db);
  logger.info('SQLite database initialized');
  return db;
}

function initTables(db: SQLDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'viewer' CHECK(role IN ('admin','architect','analyst','viewer')),
      team_id TEXT NOT NULL REFERENCES teams(id),
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      team_id TEXT NOT NULL REFERENCES teams(id),
      provider TEXT NOT NULL CHECK(provider IN ('openai','anthropic','openrouter')),
      model TEXT NOT NULL,
      system_prompt TEXT DEFAULT '',
      tools TEXT DEFAULT '[]',
      parameters TEXT DEFAULT '{"temperature":0.7,"maxTokens":2048,"topP":1.0}',
      versions TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','archived')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      messages TEXT DEFAULT '[]',
      memory TEXT DEFAULT '{}',
      token_usage TEXT DEFAULT '{"prompt":0,"completion":0,"total":0}',
      cost REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','paused')),
      experiment_id TEXT,
      variant TEXT CHECK(variant IS NULL OR variant IN ('A','B')),
      decision_nodes TEXT DEFAULT '[]',
      injections TEXT DEFAULT '[]',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('generation','summarization','research','translation','analysis')),
      input_text TEXT NOT NULL,
      reference_files TEXT DEFAULT '[]',
      assigned_agent TEXT NOT NULL REFERENCES agents(id),
      output TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','review','approved','rejected')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','normal','batch')),
      approved_by TEXT REFERENCES users(id),
      previous_outputs TEXT DEFAULT '[]',
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      agent_a TEXT NOT NULL REFERENCES agents(id),
      agent_b TEXT NOT NULL REFERENCES agents(id),
      traffic_split INTEGER DEFAULT 50,
      metrics TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','running','completed')),
      winner TEXT CHECK(winner IS NULL OR winner IN ('A','B')),
      significance TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      provider TEXT NOT NULL CHECK(provider IN ('openai','anthropic','openrouter')),
      encrypted_key TEXT NOT NULL,
      iv TEXT NOT NULL,
      salt TEXT NOT NULL,
      label TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(team_id, provider)
    );
    
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      ip_address TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_agents_team ON agents(team_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
    CREATE INDEX IF NOT EXISTS idx_experiments_team ON experiments(team_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
  `);
}

// Helper: generate UUID
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}

// Helper: get single row
export function getOne(db: SQLDatabase, sql: string, params: any[] = []): Record<string, any> | null {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper: get all rows
export function getAll(db: SQLDatabase, sql: string, params: any[] = []): Record<string, any>[] {
  const results: Record<string, any>[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run INSERT/UPDATE/DELETE
export function run(db: SQLDatabase, sql: string, params: any[] = []): void {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

// Helper: save DB to disk (non-fatal on read-only fs)
export function saveDB(db: SQLDatabase): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    // Ignore write errors on read-only filesystems (e.g. Render free tier)
  }
}
