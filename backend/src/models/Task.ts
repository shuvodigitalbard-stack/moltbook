// Task Model
import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  teamId: mongoose.Types.ObjectId;
  title: string;
  type: 'generation' | 'summarization' | 'research' | 'translation' | 'analysis';
  inputText: string;
  referenceFiles: string[];
  assignedAgent: mongoose.Types.ObjectId;
  output: string;
  status: 'pending' | 'running' | 'review' | 'approved' | 'rejected';
  priority: 'urgent' | 'normal' | 'batch';
  approvedBy?: mongoose.Types.ObjectId;
  previousOutputs: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['generation', 'summarization', 'research', 'translation', 'analysis'],
      required: true,
    },
    inputText: { type: String, required: true },
    referenceFiles: [{ type: String }],
    assignedAgent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    output: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'running', 'review', 'approved', 'rejected'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['urgent', 'normal', 'batch'],
      default: 'normal',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    previousOutputs: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

TaskSchema.index({ teamId: 1, status: 1 });
TaskSchema.index({ assignedAgent: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
