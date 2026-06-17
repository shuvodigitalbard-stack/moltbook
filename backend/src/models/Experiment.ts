// Experiment Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IExperimentMetric {
  sessionId: mongoose.Types.ObjectId;
  variant: 'A' | 'B';
  tokensUsed: number;
  latencyMs: number;
  cost: number;
  qualityScore?: number;
  taskCompleted: boolean;
  recordedAt: Date;
}

export interface IExperiment extends Document {
  teamId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  agentA: mongoose.Types.ObjectId;
  agentB: mongoose.Types.ObjectId;
  trafficSplit: number;
  metrics: IExperimentMetric[];
  status: 'draft' | 'running' | 'completed';
  winner: 'A' | 'B' | null;
  significance?: {
    pValue: number;
    isSignificant: boolean;
    recommendedWinner: 'A' | 'B' | null;
  };
  startedAt?: Date;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExperimentMetricSchema = new Schema<IExperimentMetric>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  variant: { type: String, enum: ['A', 'B'], required: true },
  tokensUsed: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  qualityScore: { type: Number, min: 1, max: 5 },
  taskCompleted: { type: Boolean, default: false },
  recordedAt: { type: Date, default: Date.now },
});

const ExperimentSchema = new Schema<IExperiment>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    agentA: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    agentB: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    trafficSplit: { type: Number, default: 50, min: 0, max: 100 },
    metrics: [ExperimentMetricSchema],
    status: {
      type: String,
      enum: ['draft', 'running', 'completed'],
      default: 'draft',
    },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    significance: {
      pValue: { type: Number },
      isSignificant: { type: Boolean },
      recommendedWinner: { type: String, enum: ['A', 'B', null] },
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ExperimentSchema.index({ teamId: 1, status: 1 });

export const Experiment = mongoose.model<IExperiment>('Experiment', ExperimentSchema);
