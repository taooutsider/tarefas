export const JOB_STATUSES = [
  "queued",
  "running",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "denied"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface Job {
  id: string;
  chatId: string;
  userId: string;
  goal: string;
  status: JobStatus;
  result: string | null;
  error: string | null;
  runState: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface JobEvent {
  id: string;
  jobId: string;
  type: string;
  message: string;
  metadata: string | null;
  createdAt: string;
}

export interface Approval {
  id: string;
  jobId: string;
  chatId: string;
  userId: string;
  interruptionIndex: number;
  agentName: string;
  toolName: string;
  argumentsJson: string;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}
