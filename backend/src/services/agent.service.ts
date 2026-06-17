// Agent Service
import { Agent, IAgent, IAgentVersion } from '../models/Agent';
import { createAuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export interface CreateAgentInput {
  name: string;
  description?: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  systemPrompt?: string;
  tools?: string[];
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  teamId: string;
  userId: string;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  status?: 'active' | 'archived';
}

export class AgentService {
  /**
   * Create a new agent
   */
  async create(input: CreateAgentInput): Promise<IAgent> {
    const agent = await Agent.create({
      ...input,
      description: input.description || '',
      systemPrompt: input.systemPrompt || '',
      tools: input.tools || [],
      parameters: {
        temperature: input.parameters?.temperature ?? 0.7,
        maxTokens: input.parameters?.maxTokens ?? 2048,
        topP: input.parameters?.topP ?? 1.0,
      },
      createdBy: input.userId,
      versions: [{
        systemPrompt: input.systemPrompt || '',
        parameters: {
          temperature: input.parameters?.temperature ?? 0.7,
          maxTokens: input.parameters?.maxTokens ?? 2048,
          topP: input.parameters?.topP ?? 1.0,
        },
        tools: input.tools || [],
        tag: 'v1-draft',
        createdAt: new Date(),
      }],
    });

    await createAuditLog(
      new mongoose.Types.ObjectId(input.userId),
      'agent.create',
      'Agent',
      agent._id,
      { name: input.name, provider: input.provider }
    );

    return agent;
  }

  /**
   * Get all agents for a team
   */
  async getByTeam(teamId: string, status?: string): Promise<IAgent[]> {
    const query: Record<string, unknown> = { teamId };
    if (status) query.status = status;
    return Agent.find(query).sort({ updatedAt: -1 });
  }

  /**
   * Get single agent by ID
   */
  async getById(agentId: string): Promise<IAgent | null> {
    return Agent.findById(agentId);
  }

  /**
   * Update agent
   */
  async update(
    agentId: string,
    input: UpdateAgentInput,
    userId: string
  ): Promise<IAgent | null> {
    const agent = await Agent.findById(agentId);
    if (!agent) return null;

    // Save current config as version before updating
    if (input.systemPrompt || input.parameters || input.tools) {
      const newVersion: IAgentVersion = {
        systemPrompt: input.systemPrompt || agent.systemPrompt,
        parameters: {
          temperature: input.parameters?.temperature ?? agent.parameters.temperature,
          maxTokens: input.parameters?.maxTokens ?? agent.parameters.maxTokens,
          topP: input.parameters?.topP ?? agent.parameters.topP,
        },
        tools: input.tools || agent.tools,
        tag: `v${agent.versions.length + 1}`,
        createdAt: new Date(),
      };
      agent.versions.push(newVersion);
    }

    // Update fields
    if (input.name) agent.name = input.name;
    if (input.description !== undefined) agent.description = input.description;
    if (input.provider) agent.provider = input.provider;
    if (input.model) agent.model = input.model;
    if (input.systemPrompt) agent.systemPrompt = input.systemPrompt;
    if (input.tools) agent.tools = input.tools;
    if (input.parameters) {
      if (input.parameters.temperature !== undefined) agent.parameters.temperature = input.parameters.temperature;
      if (input.parameters.maxTokens !== undefined) agent.parameters.maxTokens = input.parameters.maxTokens;
      if (input.parameters.topP !== undefined) agent.parameters.topP = input.parameters.topP;
    }
    if (input.status) agent.status = input.status;

    await agent.save();

    await createAuditLog(
      new mongoose.Types.ObjectId(userId),
      'agent.update',
      'Agent',
      agent._id,
      { name: agent.name }
    );

    return agent;
  }

  /**
   * Delete agent
   */
  async delete(agentId: string, userId: string): Promise<boolean> {
    const result = await Agent.findByIdAndDelete(agentId);
    if (result) {
      await createAuditLog(
        new mongoose.Types.ObjectId(userId),
        'agent.delete',
        'Agent',
        new mongoose.Types.ObjectId(agentId),
        { name: result.name }
      );
    }
    return !!result;
  }

  /**
   * Save agent version
   */
  async saveVersion(
    agentId: string,
    tag: string,
    userId: string
  ): Promise<IAgent | null> {
    const agent = await Agent.findById(agentId);
    if (!agent) return null;

    const newVersion: IAgentVersion = {
      systemPrompt: agent.systemPrompt,
      parameters: { ...agent.parameters },
      tools: [...agent.tools],
      tag,
      createdAt: new Date(),
    };

    agent.versions.push(newVersion);
    await agent.save();

    return agent;
  }
}

export const agentService = new AgentService();
