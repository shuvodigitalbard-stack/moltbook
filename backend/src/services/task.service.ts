// Task Service - SQLite version
import { getDB, getOne, getAll, run, genId, saveDB } from '../utils/db';

export interface CreateTaskInput {
  title: string;
  type: 'generation' | 'summarization' | 'research' | 'translation' | 'analysis';
  inputText: string;
  referenceFiles?: string[];
  assignedAgent: string;
  priority?: 'urgent' | 'normal' | 'batch';
  teamId: string;
  userId: string;
}

export class TaskService {
  async create(input: CreateTaskInput): Promise<any> {
    const db = await getDB();
    const id = genId();
    run(db, `INSERT INTO tasks (id, team_id, title, type, input_text, reference_files, assigned_agent, priority, status, output, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.teamId, input.title, input.type, input.inputText,
       JSON.stringify(input.referenceFiles || []), input.assignedAgent,
       input.priority || 'normal', 'pending', '', input.userId]);
    saveDB(db);
    return this.getById(id);
  }

  async getByTeam(teamId: string, status?: string): Promise<any[]> {
    const db = await getDB();
    if (status) return getAll(db, 'SELECT * FROM tasks WHERE team_id = ? AND status = ? ORDER BY created_at DESC', [teamId, status]);
    return getAll(db, 'SELECT * FROM tasks WHERE team_id = ? ORDER BY created_at DESC', [teamId]);
  }

  async getById(taskId: string): Promise<any | null> {
    const db = await getDB();
    return getOne(db, 'SELECT * FROM tasks WHERE id = ?', [taskId]);
  }

  async updateStatus(taskId: string, status: string, userId: string): Promise<any | null> {
    const db = await getDB();
    if (status === 'approved') {
      run(db, "UPDATE tasks SET status = ?, approved_by = ?, updated_at = datetime('now') WHERE id = ?",
        [status, userId, taskId]);
    } else {
      run(db, "UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?",
        [status, taskId]);
    }
    saveDB(db);
    return this.getById(taskId);
  }

  async updateOutput(taskId: string, output: string): Promise<any | null> {
    const db = await getDB();
    run(db, "UPDATE tasks SET output = ?, status = 'review', updated_at = datetime('now') WHERE id = ?",
      [output, taskId]);
    saveDB(db);
    return this.getById(taskId);
  }

  async delete(taskId: string): Promise<boolean> {
    const db = await getDB();
    run(db, 'DELETE FROM tasks WHERE id = ?', [taskId]);
    saveDB(db);
    return true;
  }
}

export const taskService = new TaskService();
