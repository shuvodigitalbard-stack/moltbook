// Experiment Service
import { Experiment, IExperiment } from '../models/Experiment';
import { Session } from '../models/Session';
import { createAuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export interface CreateExperimentInput {
  name: string;
  description?: string;
  agentA: string;
  agentB: string;
  trafficSplit?: number;
  teamId: string;
  userId: string;
}

export class ExperimentService {
  async create(input: CreateExperimentInput): Promise<IExperiment> {
    const experiment = await Experiment.create({
      ...input,
      description: input.description || '',
      trafficSplit: input.trafficSplit || 50,
      status: 'draft',
      winner: null,
      metrics: [],
      createdBy: input.userId,
    });

    await createAuditLog(
      new mongoose.Types.ObjectId(input.userId),
      'experiment.create',
      'Experiment',
      experiment._id,
      { name: input.name }
    );

    return experiment;
  }

  async getByTeam(teamId: string): Promise<IExperiment[]> {
    return Experiment.find({ teamId }).sort({ createdAt: -1 });
  }

  async getById(experimentId: string): Promise<IExperiment | null> {
    return Experiment.findById(experimentId);
  }

  async start(experimentId: string): Promise<IExperiment | null> {
    return Experiment.findByIdAndUpdate(
      experimentId,
      { status: 'running', startedAt: new Date() },
      { new: true }
    );
  }

  async complete(experimentId: string): Promise<IExperiment | null> {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) return null;

    // Calculate significance
    const metricsA = experiment.metrics.filter(m => m.variant === 'A');
    const metricsB = experiment.metrics.filter(m => m.variant === 'B');

    let winner: 'A' | 'B' | null = null;
    let pValue = 1;

    if (metricsA.length > 0 && metricsB.length > 0) {
      const avgA = metricsA.reduce((sum, m) => sum + (m.qualityScore || 0), 0) / metricsA.length;
      const avgB = metricsB.reduce((sum, m) => sum + (m.qualityScore || 0), 0) / metricsB.length;

      // Simplified t-test approximation
      const varA = metricsA.reduce((sum, m) => sum + Math.pow((m.qualityScore || 0) - avgA, 2), 0) / metricsA.length;
      const varB = metricsB.reduce((sum, m) => sum + Math.pow((m.qualityScore || 0) - avgB, 2), 0) / metricsB.length;
      const pooledStd = Math.sqrt((varA / metricsA.length) + (varB / metricsB.length));

      if (pooledStd > 0) {
        const tStat = Math.abs(avgA - avgB) / pooledStd;
        // Approximate p-value (simplified)
        pValue = Math.max(0.001, Math.min(1, 2 * (1 - this.normalCDF(tStat))));
      }

      winner = avgA > avgB ? 'A' : avgB > avgA ? 'B' : null;
    }

    return Experiment.findByIdAndUpdate(
      experimentId,
      {
        status: 'completed',
        completedAt: new Date(),
        winner,
        significance: {
          pValue,
          isSignificant: pValue < 0.05,
          recommendedWinner: winner,
        },
      },
      { new: true }
    );
  }

  async recordMetric(
    experimentId: string,
    metric: {
      sessionId: string;
      variant: 'A' | 'B';
      tokensUsed: number;
      latencyMs: number;
      cost: number;
      qualityScore?: number;
      taskCompleted: boolean;
    }
  ): Promise<IExperiment | null> {
    return Experiment.findByIdAndUpdate(
      experimentId,
      {
        $push: {
          metrics: { ...metric, recordedAt: new Date() },
        },
      },
      { new: true }
    );
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }
}

export const experimentService = new ExperimentService();
