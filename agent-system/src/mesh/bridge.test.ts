import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runBridgeCycle, type BridgeTransport } from "./bridge.js";
import {
  createMesh,
  dispatchPendingMessages,
  getDispatchEnvelopes,
  getInboxMessages,
  initMesh,
  registerProject,
  sendProjectMessage,
} from "./mesh.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-bridge-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});

describe("bridge runner", () => {
  it("sends pending dispatches and records thread replies through a transport", async () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "agent-system",
      name: "Agent System",
      scope: "Agent orchestration",
      allowedPeers: ["agente-vlmkt"],
    });
    registerProject(mesh, {
      id: "agente-vlmkt",
      name: "Agente VLMKT",
      scope: "Agency OS architecture",
      threadId: "thread_agency",
      allowedPeers: ["agent-system"],
    });

    const message = sendProjectMessage(mesh, {
      from: "agent-system",
      to: "agente-vlmkt",
      type: "request_context",
      priority: "normal",
      subject: "Bridge runner test",
      body: "Can you answer through the bridge?",
      expectedOutput: "Short ACK.",
      requiresReply: true,
    });
    dispatchPendingMessages(mesh);

    const transport: BridgeTransport = {
      async sendMessage(input) {
        expect(input.messageId).toBe(message.id);
        expect(input.threadId).toBe("thread_agency");
        expect(input.prompt).toContain("Bridge runner test");
        return { sentTurnId: "turn_sent" };
      },
      async readReply(input) {
        expect(input.messageId).toBe(message.id);
        expect(input.sentTurnId).toBe("turn_sent");
        return { body: "ACK via bridge runner.", sourceTurnId: "turn_reply" };
      },
    };

    const result = await runBridgeCycle(mesh, transport);
    const envelope = getDispatchEnvelopes(mesh)[0];
    const reply = getInboxMessages(mesh, "agent-system").find((item) => item.type === "reply");

    expect(result.sent).toHaveLength(1);
    expect(result.replied).toHaveLength(1);
    expect(envelope?.status).toBe("replied");
    expect(envelope?.sentTurnId).toBe("turn_sent");
    expect(envelope?.replyId).toBe(result.replied[0]?.replyId);
    expect(reply?.body).toContain("ACK via bridge runner.");
    expect(reply?.body).toContain("Source turn: turn_reply");
  });

  it("marks a dispatch failed when the transport cannot send it", async () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "agent-system",
      name: "Agent System",
      scope: "Agent orchestration",
      allowedPeers: ["agente-vlmkt"],
    });
    registerProject(mesh, {
      id: "agente-vlmkt",
      name: "Agente VLMKT",
      scope: "Agency OS architecture",
      threadId: "thread_agency",
      allowedPeers: ["agent-system"],
    });

    const message = sendProjectMessage(mesh, {
      from: "agent-system",
      to: "agente-vlmkt",
      type: "request_context",
      priority: "normal",
      subject: "Bridge failure test",
      body: "This should fail.",
      expectedOutput: "No reply.",
      requiresReply: true,
    });
    dispatchPendingMessages(mesh);

    const transport: BridgeTransport = {
      async sendMessage() {
        throw new Error("thread API unavailable");
      },
      async readReply() {
        return null;
      },
    };

    const result = await runBridgeCycle(mesh, transport);
    const envelope = getDispatchEnvelopes(mesh)[0];

    expect(result.sent).toHaveLength(0);
    expect(result.failed).toEqual([{ messageId: message.id, reason: "thread API unavailable" }]);
    expect(envelope?.status).toBe("failed");
    expect(envelope?.failureReason).toBe("thread API unavailable");
  });
});
