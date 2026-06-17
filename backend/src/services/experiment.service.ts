// Experiment Service - SQLite version
import { getDB, getOne, getAll, run, genId, saveDB } from '../utils/db';

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
  async create(input: CreateExperimentInput): Promise<any> {
    const db = await getDB();
    const id = genId();
    run(db, `INSERT INTO experiments (id, team_id, name, description, agent_a, agent_b, traffic_split, status, winner, metrics, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.teamId, input.name, input.description || '', input.agentA, input.agentB,
       input.trafficSplit || 50, 'draft', null, '[]', input.userId]);
    saveDB(db);
    return this.getById(id);
  }

  async getByTeam(teamId: string): Promise<any[]> {
    const db = await getDB();
    return getAll(db, 'SELECT * FROM experiments WHERE team_id = ? ORDER BY created_at DESC', [teamId]);
  }

  async getById(experimentId: string): Promise<any | null> {
    const db = await getDB();
    return getOne(db, 'SELECT * FROM experiments WHERE id = ?', [experimentId]);
  }

  async start(experimentId: string): Promise<any | null> {
    const db = await getDB();
    run(db, "UPDATE experiments SET status = 'running', started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [experimentId]);
    saveDB(db);
    return this.getById(experimentId);
  }

  async complete(experimentId: string): Promise<any | null> {
    const db = await getDB();
    const exp = getOne(db, 'SELECT * FROM experiments WHERE id = ?', [experimentId]);
    if (!exp) return null;

    const metrics = JSON.parse(exp.metrics as string);
    const metricsA = metrics.filter((m: any) => m.variant === 'A');
    const metricsB = metrics.filter((m: any) => m.variant === 'B');

    let winner: string | null = null;
    let pValue = 1;

    if (metricsA.length > 0 && metricsB.length > 0) {
      const avgA = metricsA.reduce((s: number, m: any) => s + (m.qualityScore || 0), 0) / metricsA.length;
      const avgB = metricsB.reduce((s: number, m: any) => s + (m.qualityScore || 0), 0) / metricsB.length;
      const varA = metricsA.reduce((s: number, m: any) => s + Math.pow((m.qualityScore || 0) - avgA, 2), 0) / metricsA.length;
      const varB = metricsB.reduce((s: number, m: any) => s + Math.pow((m.qualityScore || 0) - avgB, 2), 0) / metricsB.length;
      const pooledStd = Math.sqrt((varA / metricsA.length) + (varB / metricsB.length));
      if (pooledStd > 0) {
        const tStat = Math.abs(avgA - avgB) / pooledStd;
        pValue = Math.max(0.001, Math.min(1, 2 * (1 - this.normalCDF(tStat))));
      }
      winner = avgA > avgB ? 'A' : avgB > avgA ? 'B' : null;
    }

    const significance = { pValue, isSignificant: pValue < 0.05, recommendedWinner: winner };
    run(db, "UPDATE experiments SET status = 'completed', completed_at = datetime('now'), winner = ?, significance = ?, updated_at = datetime('now') WHERE id = ?",
      [winner, JSON.stringify(significance), experimentId]);
    saveDB(db);
    return this.getById(experimentId);
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }
}

export const experimentService = new ExperimentService();
