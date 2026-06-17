// Audit Log Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId: mongoose.Types.ObjectId;
  payload: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
  },
  { timestamps: false }
);

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Helper function to create audit log
export const createAuditLog = async (
  userId: mongoose.Types.ObjectId,
  action: string,
  resourceType: string,
  resourceId: mongoose.Types.ObjectId,
  payload: Record<string, unknown> = {},
  ipAddress?: string
): Promise<void> => {
  try {
    await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId,
      payload,
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
