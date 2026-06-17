// Session Service - SQLite version
import { getDB, getOne, getAll, run, genId, saveDB } from '../utils/db';

export interface RunAgentInput {
  agentId: string;
  userId: string;
  message: string;
  sessionId?: string;
}

export class SessionService {
  async createSession(input: RunAgentInput): Promise<any> {
    const db = await getDB();
    const agent = getOne(db, 'SELECT * FROM agents WHERE id = ?', [input.agentId]);
    if (!agent) throw new Error('Agent not found');

    const id = genId();
    const messages = [
      { role: 'system', content: agent.system_prompt, timestamp: new Date().toISOString() },
      { role: 'user', content: input.message, timestamp: new Date().toISOString() },
    ];

    run(db, `INSERT INTO sessions (id, agent_id, user_id, messages, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.agentId, input.userId, JSON.stringify(messages), 'pending', new Date().toISOString()]);

    saveDB(db);
    return this.getById(id);
  }

  async getById(sessionId: string): Promise<any | null> {
    const db = await getDB();
    return getOne(db, 'SELECT * FROM sessions WHERE id = ?', [sessionId]);
  }

  async getByUser(userId: string, limit: number = 20): Promise<any[]> {
    const db = await getDB();
    return getAll(db, 'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
  }

  async getActive(teamId: string): Promise<any[]> {
    const db = await getDB();
    return getAll(db, `SELECT s.* FROM sessions s
      JOIN agents a ON s.agent_id = a.id
      WHERE a.team_id = ? AND s.status IN ('running', 'pending', 'paused')
      ORDER BY s.created_at DESC`, [teamId]);
  }

  async updateStatus(sessionId: string, status: string): Promise<any | null> {
    const db = await getDB();
    let updates = "status = ?, updated_at = datetime('now')";
    const params: any[] = [status];
    if (status === 'completed' || status === 'failed') {
      updates += ", completed_at = datetime('now')";
    }
    params.push(sessionId);
    run(db, `UPDATE sessions SET ${updates} WHERE id = ?`, params);
    saveDB(db);
    return this.getById(sessionId);
  }

  async updateUsage(sessionId: string, tokenUsage: any, cost: number): Promise<void> {
    const db = await getDB();
    run(db, "UPDATE sessions SET token_usage = ?, cost = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(tokenUsage), cost, sessionId]);
    saveDB(db);
  }

  async addMessage(sessionId: string, message: any): Promise<any | null> {
    const db = await getDB();
    const session = getOne(db, 'SELECT messages FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return null;
    const messages = JSON.parse(session.messages as string);
    messages.push({ ...message, timestamp: new Date().toISOString() });
    run(db, "UPDATE sessions SET messages = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(messages), sessionId]);
    saveDB(db);
    return this.getById(sessionId);
  }

  async injectPrompt(sessionId: string, injectionText: string, injectionRole: string, userId: string): Promise<any | null> {
    const db = await getDB();
    const session = getOne(db, 'SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return null;

    const messages = JSON.parse(session.messages as string);
    messages.push({ role: injectionRole, content: injectionText, timestamp: new Date().toISOString() });

    const injections = JSON.parse(session.injections as string);
    injections.push({ text: injectionText, role: injectionRole, injectedBy: userId, timestamp: new Date().toISOString() });

    run(db, "UPDATE sessions SET messages = ?, injections = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(messages), JSON.stringify(injections), sessionId]);
    saveDB(db);
    return this.getById(sessionId);
  }

  async updateMemory(sessionId: string, key: string, value: unknown, scope: string): Promise<any | null> {
    const db = await getDB();
    const session = getOne(db, 'SELECT memory FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return null;
    const memory = JSON.parse(session.memory as string);
    memory[key] = { value, scope, updatedAt: new Date().toISOString() };
    run(db, "UPDATE sessions SET memory = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(memory), sessionId]);
    saveDB(db);
    return this.getById(sessionId);
  }

  async getMemory(sessionId: string): Promise<Record<string, unknown>> {
    const db = await getDB();
    const session = getOne(db, 'SELECT memory FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return {};
    return JSON.parse(session.memory as string);
  }

  async updateContext(sessionId: string, messages: any[]): Promise<any | null> {
    const db = await getDB();
    const msgs = messages.map(m => ({ ...m, timestamp: new Date().toISOString() }));
    run(db, "UPDATE sessions SET messages = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(msgs), sessionId]);
    saveDB(db);
    return this.getById(sessionId);
  }

  async handleDecision(sessionId: string, nodeId: string, choice: string): Promise<any | null> {
    const db = await getDB();
    const session = getOne(db, 'SELECT decision_nodes FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return null;
    const nodes = JSON.parse(session.decision_nodes as string);
    const node = nodes.find((n: any) => n.nodeId === nodeId);
    if (node) {
      node.chosen = choice;
      node.timestamp = new Date().toISOString();
    }
    run(db, "UPDATE sessions SET decision_nodes = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(nodes), sessionId]);
    saveDB(db);
    return this.getById(sessionId);
  }
}

export const sessionService = new SessionService();
