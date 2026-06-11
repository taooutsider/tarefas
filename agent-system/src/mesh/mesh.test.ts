import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  broadcastIntroductions,
  createMesh,
  dispatchPendingMessages,
  getInboxMessages,
  getOutboxMessages,
  getProject,
  initMesh,
  listProjects,
  publishDiscovery,
  recordThreadReply,
  registerProject,
  sendProjectMessage,
} from "./mesh.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-mesh-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});

describe("mesh", () => {
  it("initializes a registry with no projects", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);

    expect(listProjects(mesh)).toEqual([]);
    expect(fs.existsSync(path.join(tmpDir, "registry.json"))).toBe(true);
  });

  it("registers a project with public memory files", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);

    registerProject(mesh, {
      id: "telegram-agent",
      name: "Telegram Agent",
      scope: "Telegram-controlled autonomous agent",
      threadId: "thread_123",
      workspaceRoot: "/work/telegram-agent",
      allowedPeers: ["todo-pwa"],
    });

    const project = getProject(mesh, "telegram-agent");

    expect(project?.id).toBe("telegram-agent");
    expect(project?.threadId).toBe("thread_123");
    expect(fs.existsSync(path.join(tmpDir, "projects", "telegram-agent", "manifest.md"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "projects", "telegram-agent", "public-summary.md"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "projects", "telegram-agent", "inbox"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "projects", "telegram-agent", "outbox"))).toBe(true);
  });

  it("routes a message from one project outbox to another project inbox", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "telegram-agent",
      name: "Telegram Agent",
      scope: "Agent shell",
      allowedPeers: ["todo-pwa"],
    });
    registerProject(mesh, {
      id: "todo-pwa",
      name: "Infinite Todo PWA",
      scope: "Todo app",
      allowedPeers: ["telegram-agent"],
    });

    const message = sendProjectMessage(mesh, {
      from: "telegram-agent",
      to: "todo-pwa",
      type: "request_context",
      priority: "normal",
      subject: "Sync pattern",
      body: "Can I reuse your sync shape?",
      expectedOutput: "Relevant files and risks.",
      requiresReply: true,
    });

    const inbox = getInboxMessages(mesh, "todo-pwa");
    const outboxPath = path.join(tmpDir, "projects", "telegram-agent", "outbox", `${message.id}.json`);
    const inboxPath = path.join(tmpDir, "projects", "todo-pwa", "inbox", `${message.id}.json`);

    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.subject).toBe("Sync pattern");
    expect(fs.existsSync(outboxPath)).toBe(true);
    expect(fs.existsSync(inboxPath)).toBe(true);
  });

  it("blocks messages to peers outside the sender allowlist", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "telegram-agent",
      name: "Telegram Agent",
      scope: "Agent shell",
      allowedPeers: ["todo-pwa"],
    });
    registerProject(mesh, {
      id: "trading-agent",
      name: "Trading Agent",
      scope: "Trading work",
      allowedPeers: ["telegram-agent"],
    });

    expect(() =>
      sendProjectMessage(mesh, {
        from: "telegram-agent",
        to: "trading-agent",
        type: "request_context",
        priority: "normal",
        subject: "Unauthorized",
        body: "Should not route.",
        expectedOutput: "Nothing.",
        requiresReply: true,
      }),
    ).toThrow(/not allowed/i);
  });

  it("broadcasts introductions from every project to every allowed peer", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "agent-system",
      name: "Agent System",
      scope: "Agent orchestration",
      workspaceRoot: "/work/agent-system",
      allowedPeers: ["*"],
    });
    registerProject(mesh, {
      id: "todo-pwa",
      name: "Todo PWA",
      scope: "Local-first todo app",
      workspaceRoot: "/work/todo-pwa",
      allowedPeers: ["*"],
    });
    registerProject(mesh, {
      id: "agency-os",
      name: "Agency OS",
      scope: "Marketing agency operations",
      workspaceRoot: "/work/agency-os",
      allowedPeers: ["*"],
    });

    const result = broadcastIntroductions(mesh);

    expect(result.sent).toHaveLength(6);
    expect(getInboxMessages(mesh, "agent-system")).toHaveLength(2);
    expect(getInboxMessages(mesh, "todo-pwa")).toHaveLength(2);
    expect(getInboxMessages(mesh, "agency-os")).toHaveLength(2);
    expect(getOutboxMessages(mesh, "agent-system")).toHaveLength(2);
    const agentIntro = getInboxMessages(mesh, "todo-pwa").find(
      (message) => message.from === "agent-system",
    );

    expect(agentIntro?.body).toContain("Ola, eu existo");
    expect(agentIntro?.body).toContain("/work/agent-system");
    expect(agentIntro?.body).toContain("Sempre que eu descobrir algo novo");
  });

  it("does not duplicate introduction broadcasts", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "agent-system",
      name: "Agent System",
      scope: "Agent orchestration",
      allowedPeers: ["*"],
    });
    registerProject(mesh, {
      id: "todo-pwa",
      name: "Todo PWA",
      scope: "Local-first todo app",
      allowedPeers: ["*"],
    });

    const first = broadcastIntroductions(mesh);
    const second = broadcastIntroductions(mesh);

    expect(first.sent).toHaveLength(2);
    expect(second.sent).toHaveLength(0);
    expect(second.skipped).toHaveLength(2);
    expect(getInboxMessages(mesh, "agent-system")).toHaveLength(1);
    expect(getInboxMessages(mesh, "todo-pwa")).toHaveLength(1);
  });

  it("publishes discoveries to all allowed peers without requiring a reply", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "agent-system",
      name: "Agent System",
      scope: "Agent orchestration",
      allowedPeers: ["*"],
    });
    registerProject(mesh, {
      id: "todo-pwa",
      name: "Todo PWA",
      scope: "Local-first todo app",
      allowedPeers: ["*"],
    });
    registerProject(mesh, {
      id: "agency-os",
      name: "Agency OS",
      scope: "Marketing agency operations",
      allowedPeers: ["todo-pwa"],
    });

    const result = publishDiscovery(mesh, {
      from: "agent-system",
      subject: "Mesh learned dispatch",
      body: "Dispatch should be explicit and auditable.",
    });

    expect(result.sent).toHaveLength(2);
    expect(getInboxMessages(mesh, "todo-pwa").at(0)?.type).toBe("discovery");
    expect(getInboxMessages(mesh, "todo-pwa").at(0)?.requiresReply).toBe(false);
    expect(getInboxMessages(mesh, "agency-os").at(0)?.subject).toBe("Mesh learned dispatch");
  });

  it("dispatches reply-required inbox messages to projects with thread ids", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "agent-system",
      name: "Agent System",
      scope: "Agent orchestration",
      allowedPeers: ["todo-pwa"],
    });
    registerProject(mesh, {
      id: "todo-pwa",
      name: "Todo PWA",
      scope: "Local-first todo app",
      threadId: "thread_todo",
      allowedPeers: ["agent-system"],
    });

    const message = sendProjectMessage(mesh, {
      from: "agent-system",
      to: "todo-pwa",
      type: "request_context",
      priority: "normal",
      subject: "Sync pattern",
      body: "Which sync files matter?",
      expectedOutput: "Relevant files and risks.",
      requiresReply: true,
    });

    const result = dispatchPendingMessages(mesh);
    const dispatched = getInboxMessages(mesh, "todo-pwa")[0];
    const dispatchPath = path.join(tmpDir, "dispatch", `${message.id}.json`);

    expect(result.dispatched).toHaveLength(1);
    expect(result.dispatched[0]?.threadId).toBe("thread_todo");
    expect(result.dispatched[0]?.prompt).toContain("Which sync files matter?");
    expect(dispatched?.status).toBe("dispatched");
    expect(fs.existsSync(dispatchPath)).toBe(true);
    expect(dispatchPendingMessages(mesh).dispatched).toHaveLength(0);
  });

  it("records a thread reply back to the original sender", () => {
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
      subject: "Bridge smoke test",
      body: "Can you answer?",
      expectedOutput: "Short ACK.",
      requiresReply: true,
    });
    dispatchPendingMessages(mesh);

    const reply = recordThreadReply(mesh, {
      messageId: message.id,
      body: "ACK from agency thread.",
      sourceTurnId: "turn_123",
    });

    const senderInbox = getInboxMessages(mesh, "agent-system");
    const recipientInbox = getInboxMessages(mesh, "agente-vlmkt");

    expect(reply.type).toBe("reply");
    expect(reply.from).toBe("agente-vlmkt");
    expect(reply.to).toBe("agent-system");
    expect(reply.replyTo).toBe(message.id);
    expect(senderInbox.find((item) => item.id === reply.id)?.body).toContain("ACK from agency");
    expect(recipientInbox.find((item) => item.id === message.id)?.status).toBe("replied");
  });
});
