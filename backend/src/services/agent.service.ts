// Agent Service - SQLite version
import { getDB, getOne, getAll, run, genId, saveDB } from '../utils/db';

export interface CreateAgentInput {
  name: string;
  description?: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  systemPrompt?: string;
  tools?: string[];
  parameters?: { temperature?: number; maxTokens?: number; topP?: number };
  teamId: string;
  userId: string;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  status?: 'active' | 'archived';
}

export class AgentService {
  async create(input: CreateAgentInput): Promise<any> {
    const db = await getDB();
    const id = genId();
    const params = {
      temperature: input.parameters?.temperature ?? 0.7,
      maxTokens: input.parameters?.maxTokens ?? 2048,
      topP: input.parameters?.topP ?? 1.0,
    };
    const versions = [{
      systemPrompt: input.systemPrompt || '',
      parameters: params,
      tools: input.tools || [],
      tag: 'v1-draft',
      createdAt: new Date().toISOString(),
    }];

    run(db, `INSERT INTO agents (id, name, description, team_id, provider, model, system_prompt, tools, parameters, versions, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.description || '', input.teamId, input.provider, input.model,
       input.systemPrompt || '', JSON.stringify(input.tools || []), JSON.stringify(params),
       JSON.stringify(versions), 'active', input.userId]);

    saveDB(db);
    return this.getById(id);
  }

  async getByTeam(teamId: string, status?: string): Promise<any[]> {
    const db = await getDB();
    if (status) return getAll(db, 'SELECT * FROM agents WHERE team_id = ? AND status = ? ORDER BY updated_at DESC', [teamId, status]);
    return getAll(db, 'SELECT * FROM agents WHERE team_id = ? ORDER BY updated_at DESC', [teamId]);
  }

  async getById(agentId: string): Promise<any | null> {
    const db = await getDB();
    return getOne(db, 'SELECT * FROM agents WHERE id = ?', [agentId]);
  }

  async update(agentId: string, input: UpdateAgentInput, userId: string): Promise<any | null> {
    const db = await getDB();
    const agent = getOne(db, 'SELECT * FROM agents WHERE id = ?', [agentId]);
    if (!agent) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (input.name) { updates.push('name = ?'); params.push(input.name); }
    if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
    if (input.provider) { updates.push('provider = ?'); params.push(input.provider); }
    if (input.model) { updates.push('model = ?'); params.push(input.model); }
    if (input.systemPrompt) { updates.push('system_prompt = ?'); params.push(input.systemPrompt); }
    if (input.tools) { updates.push('tools = ?'); params.push(JSON.stringify(input.tools)); }
    if (input.status) { updates.push('status = ?'); params.push(input.status); }

    if (input.parameters) {
      const current = JSON.parse(agent.parameters as string);
      const merged = { ...current, ...input.parameters };
      updates.push('parameters = ?');
      params.push(JSON.stringify(merged));
    }

    // Save version if config changed
    if (input.systemPrompt || input.parameters || input.tools) {
      const versions = JSON.parse(agent.versions as string);
      const currentParams = JSON.parse(agent.parameters as string);
      versions.push({
        systemPrompt: input.systemPrompt || (agent.system_prompt as string),
        parameters: input.parameters ? { ...currentParams, ...input.parameters } : currentParams,
        tools: input.tools || JSON.parse(agent.tools as string),
        tag: `v${versions.length + 1}`,
        createdAt: new Date().toISOString(),
      });
      updates.push('versions = ?');
      params.push(JSON.stringify(versions));
    }

    updates.push("updated_at = datetime('now')");
    params.push(agentId);
    run(db, `UPDATE agents SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDB(db);

    return this.getById(agentId);
  }

  async delete(agentId: string, userId: string): Promise<boolean> {
    const db = await getDB();
    run(db, 'DELETE FROM agents WHERE id = ?', [agentId]);
    saveDB(db);
    return true;
  }

  async saveVersion(agentId: string, tag: string, userId: string): Promise<any | null> {
    const db = await getDB();
    const agent = getOne(db, 'SELECT * FROM agents WHERE id = ?', [agentId]);
    if (!agent) return null;

    const versions = JSON.parse(agent.versions as string);
    const params = JSON.parse(agent.parameters as string);
    versions.push({
      systemPrompt: agent.system_prompt as string,
      parameters: params,
      tools: JSON.parse(agent.tools as string),
      tag,
      createdAt: new Date().toISOString(),
    });

    run(db, "UPDATE agents SET versions = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(versions), agentId]);
    saveDB(db);

    return this.getById(agentId);
  }
}

export const agentService = new AgentService();
