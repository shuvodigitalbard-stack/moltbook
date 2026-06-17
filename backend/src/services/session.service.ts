// Session Service
import { Session, ISession } from '../models/Session';
import { Agent } from '../models/Agent';
import { Experiment } from '../models/Experiment';
import { createAuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export interface RunAgentInput {
  agentId: string;
  userId: string;
  message: string;
  sessionId?: string;
}

export class SessionService {
  /**
   * Create a new session or continue existing
   */
  async createSession(input: RunAgentInput): Promise<ISession> {
    const agent = await Agent.findById(input.agentId);
    if (!agent) throw new Error('Agent not found');

    // Check for active experiment
    let experimentId: mongoose.Types.ObjectId | undefined;
    let variant: 'A' | 'B' | undefined;

    const activeExperiment = await Experiment.findOne({
      $or: [{ agentA: input.agentId }, { agentB: input.agentId }],
      status: 'running',
    });

    if (activeExperiment) {
      experimentId = activeExperiment._id;
      if (activeExperiment.agentA.toString() === input.agentId) {
        variant = 'A';
      } else {
        variant = 'B';
      }
    }

    const session = await Session.create({
      agentId: input.agentId,
      userId: input.userId,
      messages: [
        { role: 'system', content: agent.systemPrompt, timestamp: new Date() },
        { role: 'user', content: input.message, timestamp: new Date() },
      ],
      status: 'pending',
      experimentId,
      variant,
      startedAt: new Date(),
    });

    await createAuditLog(
      new mongoose.Types.ObjectId(input.userId),
      'session.create',
      'Session',
      session._id,
      { agentId: input.agentId }
    );

    return session;
  }

  /**
   * Get session by ID
   */
  async getById(sessionId: string): Promise<ISession | null> {
    return Session.findById(sessionId);
  }

  /**
   * Get sessions by user
   */
  async getByUser(userId: string, limit: number = 20): Promise<ISession[]> {
    return Session.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Get active sessions
   */
  async getActive(teamId: string): Promise<ISession[]> {
    return Session.find({ status: { $in: ['running', 'pending', 'paused'] } })
      .sort({ createdAt: -1 });
  }

  /**
   * Update session status
   */
  async updateStatus(
    sessionId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  ): Promise<ISession | null> {
    const update: Record<string, unknown> = { status };
    if (status === 'completed' || status === 'failed') {
      update.completedAt = new Date();
    }
    return Session.findByIdAndUpdate(sessionId, update, { new: true });
  }

  /**
   * Update session tokens and cost
   */
  async updateUsage(
    sessionId: string,
    tokenUsage: { prompt: number; completion: number; total: number },
    cost: number
  ): Promise<void> {
    await Session.findByIdAndUpdate(sessionId, {
      tokenUsage,
      cost,
    });
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    message: { role: string; content: string; toolCallId?: string; toolName?: string }
  ): Promise<ISession | null> {
    return Session.findByIdAndUpdate(
      sessionId,
      { $push: { messages: { ...message, timestamp: new Date() } } },
      { new: true }
    );
  }

  /**
   * Inject prompt into running session
   */
  async injectPrompt(
    sessionId: string,
    injectionText: string,
    injectionRole: 'system' | 'user',
    userId: string
  ): Promise<ISession | null> {
    const session = await Session.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          messages: {
            role: injectionRole,
            content: injectionText,
            timestamp: new Date(),
          },
          injections: {
            text: injectionText,
            role: injectionRole,
            injectedBy: new mongoose.Types.ObjectId(userId),
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (session) {
      await createAuditLog(
        new mongoose.Types.ObjectId(userId),
        'session.inject',
        'Session',
        new mongoose.Types.ObjectId(sessionId),
        { injectionText: injectionText.substring(0, 100) }
      );
    }

    return session;
  }

  /**
   * Update session memory
   */
  async updateMemory(
    sessionId: string,
    key: string,
    value: unknown,
    scope: 'agent' | 'session' | 'user'
  ): Promise<ISession | null> {
    const session = await Session.findById(sessionId);
    if (!session) return null;

    session.memory[key] = { value, scope, updatedAt: new Date() };
    await session.save();
    return session;
  }

  /**
   * Get session memory
   */
  async getMemory(sessionId: string): Promise<Record<string, unknown>> {
    const session = await Session.findById(sessionId);
    return session?.memory || {};
  }

  /**
   * Update session context (full messages array)
   */
  async updateContext(
    sessionId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<ISession | null> {
    return Session.findByIdAndUpdate(
      sessionId,
      { messages: messages.map(m => ({ ...m, timestamp: new Date() })) },
      { new: true }
    );
  }

  /**
   * Handle decision node
   */
  async handleDecision(
    sessionId: string,
    nodeId: string,
    choice: string
  ): Promise<ISession | null> {
    return Session.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          'decisionNodes.$[elem].chosen': choice,
          'decisionNodes.$[elem].timestamp': new Date(),
        },
      },
      {
        new: true,
        arrayFilters: [{ 'elem.nodeId': nodeId }],
      }
    );
  }
}

export const sessionService = new SessionService();
