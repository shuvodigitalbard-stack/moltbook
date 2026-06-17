// Session Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
  timestamp: Date;
}

export interface ISession extends Document {
  agentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  messages: IMessage[];
  memory: Record<string, unknown>;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  experimentId?: mongoose.Types.ObjectId;
  variant?: 'A' | 'B';
  decisionNodes: {
    nodeId: string;
    options: string[];
    chosen?: string;
    timestamp?: Date;
  }[];
  injections: {
    text: string;
    role: 'system' | 'user';
    injectedBy: mongoose.Types.ObjectId;
    timestamp: Date;
  }[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['system', 'user', 'assistant', 'tool'], required: true },
  content: { type: String, required: true },
  toolCallId: { type: String },
  toolName: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const SessionSchema = new Schema<ISession>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [MessageSchema],
    memory: { type: Schema.Types.Mixed, default: {} },
    tokenUsage: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    cost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'paused'],
      default: 'pending',
    },
    experimentId: { type: Schema.Types.ObjectId, ref: 'Experiment' },
    variant: { type: String, enum: ['A', 'B'] },
    decisionNodes: [{
      nodeId: String,
      options: [String],
      chosen: String,
      timestamp: Date,
    }],
    injections: [{
      text: String,
      role: { type: String, enum: ['system', 'user'] },
      injectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now },
    }],
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

SessionSchema.index({ agentId: 1, status: 1 });
SessionSchema.index({ userId: 1, createdAt: -1 });
SessionSchema.index({ experimentId: 1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
