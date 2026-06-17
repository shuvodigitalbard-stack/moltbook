// Analytics Service - SQLite version
import { getDB, getAll, getOne } from '../utils/db';

export interface UsageAnalytics {
  dailyTokens: { date: string; openai: number; anthropic: number; openrouter: number }[];
  costPerAgent: { agentId: string; agentName: string; cost: number }[];
  sessionsOverTime: { date: string; count: number }[];
  providerDistribution: { provider: string; count: number }[];
  topSessions: { sessionId: string; agentName: string; cost: number; tokens: number }[];
}

export class AnalyticsService {
  async getUsage(teamId: string, days: number = 30): Promise<UsageAnalytics> {
    const db = await getDB();
    const agents = getAll(db, 'SELECT * FROM agents WHERE team_id = ?', [teamId]);
    if (agents.length === 0) {
      return { dailyTokens: [], costPerAgent: [], sessionsOverTime: [], providerDistribution: [], topSessions: [] };
    }

    const agentIds = agents.map(a => a.id);
    const placeholders = agentIds.map(() => '?').join(',');
    const sessions = getAll(db, `SELECT * FROM sessions WHERE agent_id IN (${placeholders})`, agentIds);

    const dailyTokensMap = new Map<string, any>();
    const sessionsByDate = new Map<string, number>();
    const costByAgent = new Map<string, number>();
    const providerCount = new Map<string, number>();

    for (const session of sessions) {
      const date = (session.created_at as string)?.split('T')[0] || '';
      const agent = agents.find(a => a.id === session.agent_id);
      const provider = agent?.provider || 'unknown';

      const existing = dailyTokensMap.get(date) || { openai: 0, anthropic: 0, openrouter: 0 };
      const tokens = JSON.parse(session.token_usage as string);
      existing[provider] = (existing[provider] || 0) + (tokens.total || 0);
      dailyTokensMap.set(date, existing);

      sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1);
      costByAgent.set(session.agent_id as string, (costByAgent.get(session.agent_id as string) || 0) + (session.cost || 0));
      providerCount.set(provider, (providerCount.get(provider) || 0) + 1);
    }

    const agentMap = new Map(agents.map(a => [a.id, a.name]));

    return {
      dailyTokens: Array.from(dailyTokensMap.entries()).map(([date, tokens]) => ({ date, ...tokens })),
      costPerAgent: Array.from(costByAgent.entries()).map(([agentId, cost]) => ({
        agentId, agentName: agentMap.get(agentId) || 'Unknown', cost: Math.round(cost * 100) / 100,
      })),
      sessionsOverTime: Array.from(sessionsByDate.entries()).map(([date, count]) => ({ date, count })),
      providerDistribution: Array.from(providerCount.entries()).map(([provider, count]) => ({ provider, count })),
      topSessions: sessions
        .sort((a: any, b: any) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 10)
        .map((s: any) => ({
          sessionId: s.id,
          agentName: agentMap.get(s.agent_id) || 'Unknown',
          cost: s.cost || 0,
          tokens: JSON.parse(s.token_usage).total || 0,
        })),
    };
  }
}

export const analyticsService = new AnalyticsService();
