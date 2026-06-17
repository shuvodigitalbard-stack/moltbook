// Task Service
import { Task, ITask } from '../models/Task';
import { createAuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

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
  async create(input: CreateTaskInput): Promise<ITask> {
    const task = await Task.create({
      ...input,
      referenceFiles: input.referenceFiles || [],
      priority: input.priority || 'normal',
      status: 'pending',
      output: '',
      createdBy: input.userId,
    });

    await createAuditLog(
      new mongoose.Types.ObjectId(input.userId),
      'task.create',
      'Task',
      task._id,
      { title: input.title, type: input.type }
    );

    return task;
  }

  async getByTeam(teamId: string, status?: string): Promise<ITask[]> {
    const query: Record<string, unknown> = { teamId };
    if (status) query.status = status;
    return Task.find(query).sort({ createdAt: -1 });
  }

  async getById(taskId: string): Promise<ITask | null> {
    return Task.findById(taskId);
  }

  async updateStatus(taskId: string, status: ITask['status'], userId: string): Promise<ITask | null> {
    const update: Record<string, unknown> = { status };
    if (status === 'approved') {
      update.approvedBy = new mongoose.Types.ObjectId(userId);
    }
    return Task.findByIdAndUpdate(taskId, update, { new: true });
  }

  async updateOutput(taskId: string, output: string): Promise<ITask | null> {
    return Task.findByIdAndUpdate(taskId, { output, status: 'review' }, { new: true });
  }

  async delete(taskId: string): Promise<boolean> {
    const result = await Task.findByIdAndDelete(taskId);
    return !!result;
  }
}

export const taskService = new TaskService();
