// MoltBook Models - SQLite/sql.js version
import { getDB, getOne, getAll, run, genId, saveDB } from '../utils/db';

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'architect' | 'analyst' | 'viewer';
  team_id: string;
  is_active: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  team_id: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  system_prompt: string;
  tools: string; // JSON array
  parameters: string; // JSON object
  versions: string; // JSON array
  status: 'active' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  agent_id: string;
  user_id: string;
  messages: string; // JSON array
  memory: string; // JSON object
  token_usage: string; // JSON object
  cost: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  experiment_id: string | null;
  variant: 'A' | 'B' | null;
  decision_nodes: string; // JSON array
  injections: string; // JSON array
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  team_id: string;
  title: string;
  type: 'generation' | 'summarization' | 'research' | 'translation' | 'analysis';
  input_text: string;
  reference_files: string; // JSON array
  assigned_agent: string;
  output: string;
  status: 'pending' | 'running' | 'review' | 'approved' | 'rejected';
  priority: 'urgent' | 'normal' | 'batch';
  approved_by: string | null;
  previous_outputs: string; // JSON array
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Experiment {
  id: string;
  team_id: string;
  name: string;
  description: string;
  agent_a: string;
  agent_b: string;
  traffic_split: number;
  metrics: string; // JSON array
  status: 'draft' | 'running' | 'completed';
  winner: 'A' | 'B' | null;
  significance: string | null; // JSON object
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  team_id: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  encrypted_key: string;
  iv: string;
  salt: string;
  label: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  payload: string; // JSON object
  ip_address: string | null;
  timestamp: string;
}

// Re-export db helpers for convenience
export { getDB, getOne, getAll, run, genId, saveDB };
