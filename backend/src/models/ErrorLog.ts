import mongoose, { Document, Schema } from 'mongoose';

export interface IErrorLog extends Document {
  type: 'uncaught_exception' | 'unhandled_rejection' | 'express' | 'mongodb' | 'redis' | 'telegram_bot' | 'socket_io' | 'validation' | 'scheduler' | 'frontend' | 'axios';
  name: string;
  message: string;
  stack?: string;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  requestBody?: string;
  query?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  headers?: string;
  environment: string;
  gitCommit?: string;
  railwayDeployment?: string;
  metadata?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  fingerprint: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const errorLogSchema = new Schema<IErrorLog>(
  {
    type: {
      type: String,
      enum: ['uncaught_exception', 'unhandled_rejection', 'express', 'mongodb', 'redis', 'telegram_bot', 'socket_io', 'validation', 'scheduler', 'frontend', 'axios'],
      required: true,
    },
    name: { type: String, required: true },
    message: { type: String, required: true },
    stack: { type: String },
    statusCode: { type: Number },
    endpoint: { type: String },
    method: { type: String },
    requestBody: { type: String },
    query: { type: String },
    userId: { type: String },
    userAgent: { type: String },
    ip: { type: String },
    headers: { type: String },
    environment: { type: String, default: 'production' },
    gitCommit: { type: String },
    railwayDeployment: { type: String },
    metadata: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    fingerprint: { type: String, index: true },
    count: { type: Number, default: 1 },
    firstOccurrence: { type: Date, default: Date.now },
    lastOccurrence: { type: Date, default: Date.now },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ severity: 1, createdAt: -1 });
errorLogSchema.index({ resolved: 1, createdAt: -1 });
errorLogSchema.index({ fingerprint: 1, createdAt: -1 });

export const ErrorLog = mongoose.model<IErrorLog>('ErrorLog', errorLogSchema);
