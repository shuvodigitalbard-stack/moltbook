// Analytics Service
import { Session } from '../models/Session';
import { Task } from '../models/Task';
import { Agent } from '../models/Agent';

export interface UsageAnalytics {
  dailyTokens: { date: string; openai: number; anthropic: number; openrouter: number }[];
  costPerAgent: { agentId: string; agentName: string; cost: number }[];
  sessionsOverTime: { date: string; count: number }[];
  providerDistribution: { provider: string; count: number }[];
  topSessions: { sessionId: string; agentName: string; cost: number; tokens: number }[];
}

export class AnalyticsService {
  async getUsage(teamId: string, days: number = 30): Promise<UsageAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all sessions for the team's agents
    const agents = await Agent.find({ teamId });
    const agentIds = agents.map(a => a._id);
    const agentMap = new Map(agents.map(a => [a._id.toString(), a.name]));

    const sessions = await Session.find({
      agentId: { $in: agentIds },
      createdAt: { $gte: startDate },
    });

    // Daily tokens by provider
    const dailyTokensMap = new Map<string, { openai: number; anthropic: number; openrouter: number }>();
    const sessionsByDate = new Map<string, number>();
    const costByAgent = new Map<string, number>();
    const providerCount = new Map<string, number>();

    for (const session of sessions) {
      const date = session.createdAt.toISOString().split('T')[0];
      const agentId = session.agentId.toString();
      const agent = agents.find(a => a._id.toString() === agentId);
      const provider = agent?.provider || 'unknown';

      // Daily tokens
      const existing = dailyTokensMap.get(date) || { openai: 0, anthropic: 0, openrouter: 0 };
      existing[provider as keyof typeof existing] = (existing[provider as keyof typeof existing] || 0) + session.tokenUsage.total;
      dailyTokensMap.set(date, existing);

      // Sessions over time
      sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1);

      // Cost per agent
      costByAgent.set(agentId, (costByAgent.get(agentId) || 0) + session.cost);

      // Provider distribution
      providerCount.set(provider, (providerCount.get(provider) || 0) + 1);
    }

    // Format results
    const dailyTokens = Array.from(dailyTokensMap.entries()).map(([date, tokens]) => ({
      date,
      ...tokens,
    }));

    const costPerAgent = Array.from(costByAgent.entries()).map(([agentId, cost]) => ({
      agentId,
      agentName: agentMap.get(agentId) || 'Unknown',
      cost: Math.round(cost * 100) / 100,
    }));

    const sessionsOverTime = Array.from(sessionsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    const providerDistribution = Array.from(providerCount.entries()).map(([provider, count]) => ({
      provider,
      count,
    }));

    const topSessions = sessions
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
      .map(s => ({
        sessionId: s._id.toString(),
        agentName: agentMap.get(s.agentId.toString()) || 'Unknown',
        cost: s.cost,
        tokens: s.tokenUsage.total,
      }));

    return {
      dailyTokens,
      costPerAgent,
      sessionsOverTime,
      providerDistribution,
      topSessions,
    };
  }
}

export const analyticsService = new AnalyticsService();
