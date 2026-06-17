// API Key Vault Model
import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import { config } from '../utils/config';

export interface IApiKey extends Document {
  teamId: mongoose.Types.ObjectId;
  provider: 'openai' | 'anthropic' | 'openrouter';
  encryptedKey: string;
  iv: string;
  salt: string;
  label: string;
  createdAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'openrouter'],
      required: true,
    },
    encryptedKey: { type: String, required: true },
    iv: { type: String, required: true },
    salt: { type: String, required: true },
    label: { type: String, default: '' },
  },
  { timestamps: true }
);

ApiKeySchema.index({ teamId: 1, provider: 1 }, { unique: true });

// Encrypt API key before storing
ApiKeySchema.pre('save', function (next) {
  if (!this.isModified('encryptedKey')) return next();

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(
    config.masterKey,
    salt,
    100000,
    32,
    'sha512'
  );

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(this.encryptedKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  this.encryptedKey = encrypted + ':' + authTag;
  this.iv = iv.toString('hex');
  this.salt = salt.toString('hex');

  next();
});

// Method to decrypt API key
ApiKeySchema.methods.getDecryptedKey = function (): string {
  const salt = Buffer.from(this.salt, 'hex');
  const iv = Buffer.from(this.iv, 'hex');
  const key = crypto.pbkdf2Sync(config.masterKey, salt, 100000, 32, 'sha512');

  const [encrypted, authTag] = this.encryptedKey.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
