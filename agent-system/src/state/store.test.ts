import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db.js";
import { AgentStore } from "./store.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-store-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});

describe("AgentStore", () => {
  it("creates jobs and records events", () => {
    const db = openDatabase(path.join(tmpDir, "agent.sqlite"));
    const store = new AgentStore(db);

    const job = store.createJob({ chatId: "chat-1", userId: "user-1", goal: "do work" });
    const events = store.listJobEvents(job.id);

    expect(job.status).toBe("queued");
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("created");
  });

  it("upserts and resolves approvals", () => {
    const db = openDatabase(path.join(tmpDir, "agent.sqlite"));
    const store = new AgentStore(db);
    const job = store.createJob({ chatId: "chat-1", userId: "user-1", goal: "deploy" });

    const approval = store.upsertApproval({
      jobId: job.id,
      chatId: job.chatId,
      userId: job.userId,
      interruptionIndex: 0,
      agentName: "operator",
      toolName: "propose_sensitive_action",
      argumentsJson: "{}",
    });

    const duplicate = store.upsertApproval({
      jobId: job.id,
      chatId: job.chatId,
      userId: job.userId,
      interruptionIndex: 0,
      agentName: "operator",
      toolName: "propose_sensitive_action",
      argumentsJson: "{}",
    });

    const resolved = store.resolveApproval(approval.id, "approved", "user-1", null);

    expect(duplicate.id).toBe(approval.id);
    expect(resolved.status).toBe("approved");
    expect(store.listPendingApprovals(job.chatId)).toHaveLength(0);
  });
});
