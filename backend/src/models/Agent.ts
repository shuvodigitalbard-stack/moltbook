// Agent Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentVersion {
  systemPrompt: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  tools: string[];
  createdAt: Date;
  tag: string;
}

export interface IAgent extends Document {
  name: string;
  description: string;
  teamId: mongoose.Types.ObjectId;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  systemPrompt: string;
  tools: string[];
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  versions: IAgentVersion[];
  status: 'active' | 'archived';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentVersionSchema = new Schema<IAgentVersion>({
  systemPrompt: { type: String, required: true },
  parameters: {
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 2048 },
    topP: { type: Number, default: 1.0 },
  },
  tools: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  tag: { type: String, default: 'draft' },
});

const AgentSchema = new Schema<IAgent>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'openrouter'],
      required: true,
    },
    model: { type: String, required: true },
    systemPrompt: { type: String, default: '' },
    tools: [{ type: String }],
    parameters: {
      temperature: { type: Number, default: 0.7, min: 0, max: 2 },
      maxTokens: { type: Number, default: 2048, min: 1, max: 128000 },
      topP: { type: Number, default: 1.0, min: 0, max: 1 },
    },
    versions: [AgentVersionSchema],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AgentSchema.index({ teamId: 1, status: 1 });
AgentSchema.index({ name: 'text', description: 'text' });

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);
