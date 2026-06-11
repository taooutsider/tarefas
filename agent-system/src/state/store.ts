import crypto from "node:crypto";
import type Database from "better-sqlite3";
import type { Approval, ApprovalStatus, Job, JobEvent, JobStatus } from "./types.js";

type JobRow = {
  id: string;
  chat_id: string;
  user_id: string;
  goal: string;
  status: JobStatus;
  result: string | null;
  error: string | null;
  run_state: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type JobEventRow = {
  id: string;
  job_id: string;
  type: string;
  message: string;
  metadata: string | null;
  created_at: string;
};

type ApprovalRow = {
  id: string;
  job_id: string;
  chat_id: string;
  user_id: string;
  interruption_index: number;
  agent_name: string;
  tool_name: string;
  arguments_json: string;
  status: ApprovalStatus;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
};

export class AgentStore {
  constructor(private readonly db: Database.Database) {}

  createJob(input: { chatId: string; userId: string; goal: string }): Job {
    const now = nowIso();
    const job: Job = {
      id: makeId("job"),
      chatId: input.chatId,
      userId: input.userId,
      goal: input.goal,
      status: "queued",
      result: null,
      error: null,
      runState: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
    };

    this.db
      .prepare(
        `insert into jobs (
          id, chat_id, user_id, goal, status, result, error, run_state,
          created_at, updated_at, started_at, completed_at
        ) values (
          @id, @chatId, @userId, @goal, @status, @result, @error, @runState,
          @createdAt, @updatedAt, @startedAt, @completedAt
        )`,
      )
      .run(job);

    this.appendJobEvent(job.id, "created", "Job criado.", { goal: input.goal });
    return job;
  }

  getJob(jobId: string): Job | null {
    const row = this.db.prepare("select * from jobs where id = ?").get(jobId) as JobRow | undefined;
    return row ? mapJob(row) : null;
  }

  listRecentJobs(chatId: string, limit = 10): Job[] {
    const rows = this.db
      .prepare("select * from jobs where chat_id = ? order by updated_at desc limit ?")
      .all(chatId, limit) as JobRow[];

    return rows.map(mapJob);
  }

  updateJob(
    jobId: string,
    patch: Partial<Pick<Job, "status" | "result" | "error" | "runState" | "startedAt" | "completedAt">>,
  ): Job {
    const current = this.getJob(jobId);
    if (!current) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const next = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };

    this.db
      .prepare(
        `update jobs set
          status = @status,
          result = @result,
          error = @error,
          run_state = @runState,
          updated_at = @updatedAt,
          started_at = @startedAt,
          completed_at = @completedAt
        where id = @id`,
      )
      .run(next);

    return next;
  }

  appendJobEvent(jobId: string, type: string, message: string, metadata?: unknown): JobEvent {
    const event: JobEvent = {
      id: makeId("evt"),
      jobId,
      type,
      message,
      metadata: metadata === undefined ? null : JSON.stringify(metadata),
      createdAt: nowIso(),
    };

    this.db
      .prepare(
        `insert into job_events (id, job_id, type, message, metadata, created_at)
         values (@id, @jobId, @type, @message, @metadata, @createdAt)`,
      )
      .run(event);

    return event;
  }

  listJobEvents(jobId: string, limit = 20): JobEvent[] {
    const rows = this.db
      .prepare(
        `select * from job_events
         where job_id = ?
         order by created_at desc
         limit ?`,
      )
      .all(jobId, limit) as JobEventRow[];

    return rows.reverse().map(mapJobEvent);
  }

  upsertApproval(input: {
    jobId: string;
    chatId: string;
    userId: string;
    interruptionIndex: number;
    agentName: string;
    toolName: string;
    argumentsJson: string;
  }): Approval {
    const existing = this.getApprovalByJobInterruption(input.jobId, input.interruptionIndex);
    if (existing) {
      return existing;
    }

    const approval: Approval = {
      id: makeId("app"),
      status: "pending",
      requestedAt: nowIso(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null,
      ...input,
    };

    this.db
      .prepare(
        `insert into approvals (
          id, job_id, chat_id, user_id, interruption_index, agent_name, tool_name,
          arguments_json, status, requested_at, resolved_at, resolved_by, resolution_note
        ) values (
          @id, @jobId, @chatId, @userId, @interruptionIndex, @agentName, @toolName,
          @argumentsJson, @status, @requestedAt, @resolvedAt, @resolvedBy, @resolutionNote
        )`,
      )
      .run(approval);

    this.appendJobEvent(input.jobId, "approval_requested", "Aprovação humana solicitada.", {
      approvalId: approval.id,
      toolName: approval.toolName,
      agentName: approval.agentName,
    });

    return approval;
  }

  getApproval(approvalId: string): Approval | null {
    const row = this.db
      .prepare("select * from approvals where id = ?")
      .get(approvalId) as ApprovalRow | undefined;
    return row ? mapApproval(row) : null;
  }

  getApprovalByJobInterruption(jobId: string, interruptionIndex: number): Approval | null {
    const row = this.db
      .prepare("select * from approvals where job_id = ? and interruption_index = ?")
      .get(jobId, interruptionIndex) as ApprovalRow | undefined;
    return row ? mapApproval(row) : null;
  }

  listPendingApprovals(chatId: string, limit = 10): Approval[] {
    const rows = this.db
      .prepare(
        `select * from approvals
         where chat_id = ? and status = 'pending'
         order by requested_at desc
         limit ?`,
      )
      .all(chatId, limit) as ApprovalRow[];

    return rows.map(mapApproval);
  }

  resolveApproval(
    approvalId: string,
    status: Extract<ApprovalStatus, "approved" | "denied">,
    resolvedBy: string,
    resolutionNote: string | null,
  ): Approval {
    const current = this.getApproval(approvalId);
    if (!current) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (current.status !== "pending") {
      return current;
    }

    const resolvedAt = nowIso();
    this.db
      .prepare(
        `update approvals set
          status = ?,
          resolved_at = ?,
          resolved_by = ?,
          resolution_note = ?
        where id = ?`,
      )
      .run(status, resolvedAt, resolvedBy, resolutionNote, approvalId);

    this.appendJobEvent(current.jobId, `approval_${status}`, `Aprovação ${status}.`, {
      approvalId,
      resolvedBy,
      resolutionNote,
    });

    return {
      ...current,
      status,
      resolvedAt,
      resolvedBy,
      resolutionNote,
    };
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    chatId: row.chat_id,
    userId: row.user_id,
    goal: row.goal,
    status: row.status,
    result: row.result,
    error: row.error,
    runState: row.run_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapJobEvent(row: JobEventRow): JobEvent {
  return {
    id: row.id,
    jobId: row.job_id,
    type: row.type,
    message: row.message,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

function mapApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    jobId: row.job_id,
    chatId: row.chat_id,
    userId: row.user_id,
    interruptionIndex: row.interruption_index,
    agentName: row.agent_name,
    toolName: row.tool_name,
    argumentsJson: row.arguments_json,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolutionNote: row.resolution_note,
  };
}
