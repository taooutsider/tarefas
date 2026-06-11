import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMesh, initMesh, registerProject } from "./mesh.js";
import {
  canRunRoomAction,
  claimRoomTask,
  runAutonomousRoomEngine,
  createRoomTask,
  getAgentRoomsState,
  runAgentAudit,
  releaseRoomTask,
  suggestRoomTask,
} from "./rooms.js";

interface HeartbeatFixture {
  current_task: string;
  current_task_id?: string;
  last_seen: string;
  observed_at: string;
  open_dispatches: number;
  projectId: string;
  source: "registry" | "message" | "dispatch";
  status: "online" | "working" | "backend" | "paused";
  thread: string | null;
  workspace: string | null;
  inbox_count: number;
  outbox_count: number;
  name: string;
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-rooms-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});

describe("agent rooms control plane", () => {
  it("creates persistent rooms, agents, tasks, claims, and tomorrow plan", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    registerProject(mesh, {
      id: "agent-system",
      name: "Agent System",
      scope: "Agent orchestration",
      threadId: "thread_agent",
      workspaceRoot: "/work/agent-system",
      allowedPeers: ["*"],
    });

    const state = getAgentRoomsState(mesh, []);
    const controlRoot = path.join(tmpDir, "control");

    expect(state.rooms.map((room) => room.id)).toEqual([
      "build-room",
      "research-intel-room",
      "content-growth-room",
    ]);
    expect(state.agents.length).toBeGreaterThanOrEqual(20);
    expect(state.tasks.some((task) => task.id === "task_rooms_control_plane")).toBe(true);
    expect(state.tomorrow).toHaveLength(6);
    expect(fs.existsSync(path.join(controlRoot, "rooms.json"))).toBe(true);
    expect(fs.existsSync(path.join(controlRoot, "agents.json"))).toBe(true);
    expect(fs.existsSync(path.join(controlRoot, "tasks.json"))).toBe(true);
    expect(fs.existsSync(path.join(controlRoot, "claims.json"))).toBe(true);
    expect(fs.existsSync(path.join(controlRoot, "tomorrow.json"))).toBe(true);
  });

  it("syncs mesh project thread/workspace signals into room agents", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const project = registerProject(mesh, {
      id: "tiger-2-0",
      name: "Tiger 2.0",
      scope: "Research and audit",
      threadId: "thread_tiger",
      workspaceRoot: "/work/tiger",
      allowedPeers: ["*"],
    });

    const state = getAgentRoomsState(mesh, [project]);
    const researchLead = state.agents.find((agent) => agent.id === "research-room-lead");

    expect(researchLead?.status).toBe("live-thread");
    expect(researchLead?.threadId).toBe("thread_tiger");
    expect(researchLead?.workspaceRoot).toBe("/work/tiger");
  });

  it("creates, claims, and releases room tasks with active locks", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    getAgentRoomsState(mesh, []);

    const created = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Validate room actions",
      objective: "Prove task mutation endpoints can drive the Office tomorrow.",
      assignedAgentId: "qa-verifier",
    });
    const task = created.tasks.find((item) => item.title === "Validate room actions");
    expect(task?.status).toBe("queued");

    const claimed = claimRoomTask(mesh, task?.id ?? "", {
      agentId: "qa-verifier",
      reason: "QA owns this validation lock.",
    });
    const claimedTask = claimed.tasks.find((item) => item.id === task?.id);
    const activeClaim = claimed.claims.find((claim) => claim.taskId === task?.id && claim.status === "active");
    expect(claimedTask?.status).toBe("claimed");
    expect(claimedTask?.claimId).toBe(activeClaim?.id);

    const released = releaseRoomTask(mesh, task?.id ?? "", "Validation finished.");
    const releasedTask = released.tasks.find((item) => item.id === task?.id);
    expect(releasedTask?.status).toBe("queued");
    expect(released.claims.find((claim) => claim.id === activeClaim?.id)?.status).toBe("released");
  });

  it("loads rooms even when rooms.json is wrapped in legacy control object", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const state = getAgentRoomsState(mesh, []);
    const controlPath = path.join(mesh.root, "control", "rooms.json");
    writeJsonFile(controlPath, { ...state, rooms: state.rooms, version: 1 });

    const wrappedState = getAgentRoomsState(mesh, []);
    const project = wrappedState.rooms.find((room) => room.id === "build-room");
    expect(project).toBeTruthy();
    expect(wrappedState.agents.length).toBeGreaterThan(0);
  });

  it("denies claim when task autonomy is below required action minimum", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    getAgentRoomsState(mesh, []);

    const state = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Observe-only execution gate",
      objective: "Validate claim policy refuses observe-mode tasks.",
      autonomyLevel: "observe",
      assignedAgentId: "build-room-lead",
    });

    const claimable = state.tasks.find((item) => item.title === "Observe-only execution gate");
    expect(claimable?.autonomyLevel).toBe("observe");
    expect(claimable?.roomId).toBe("build-room");

    const claim = () => claimRoomTask(mesh, claimable?.id ?? "", { agentId: "build-room-lead" });
    expect(claim).toThrowError(/Task claim blocked by room policy/);
  });

  it("denies claim when room parallel capacity is exhausted", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const state = getAgentRoomsState(mesh, []);
    const controlPath = path.join(mesh.root, "control", "rooms.json");
    const adjustedRooms = state.rooms.map((room) =>
      room.id === "build-room"
        ? {
            ...room,
            capacity: {
              ...room.capacity,
              maxParallelClaims: 0,
            },
          }
        : room,
    );
    fs.writeFileSync(controlPath, `${JSON.stringify({ ...state, rooms: adjustedRooms }, null, 2)}\n`);

    const prepared = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Parallel cap test",
      objective: "Validate parallel cap blocks claim execution.",
      assignedAgentId: "build-room-lead",
    });

    const task = prepared.tasks.find((item) => item.title === "Parallel cap test");
    const claim = () => claimRoomTask(mesh, task?.id ?? "", { agentId: "build-room-lead" });
    expect(claim).toThrowError(/Task claim blocked by room policy/);
  });

  it("applies room-level risk ceiling for claim actions", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const state = getAgentRoomsState(mesh, []);
    const controlPath = path.join(mesh.root, "control", "rooms.json");
    const adjustedRooms = state.rooms.map((room) =>
      room.id === "build-room"
        ? {
            ...room,
            actionPolicy: {
              ...room.actionPolicy,
              "task.claim": {
                ...(room.actionPolicy?.["task.claim"] ?? {}),
                maxTaskRiskLevel: "low",
              },
            },
          }
        : room,
    );
    fs.writeFileSync(controlPath, `${JSON.stringify({ ...state, rooms: adjustedRooms }, null, 2)}\n`);

    const created = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Publish release playbook",
      objective: "Publish a release note with rollout instructions and distribution path.",
      autonomyLevel: "execute",
      assignedAgentId: "build-room-lead",
    });

    const task = created.tasks.find((item) => item.title === "Publish release playbook");
    const claim = () => claimRoomTask(mesh, task?.id ?? "", { agentId: "build-room-lead" });

    expect(task?.riskLevel).toBe("medium");
    expect(claim).toThrowError(/Room policy for task.claim blocks risk level MEDIUM/);
  });

  it("denies claim when room daily autonomous cap is exhausted", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const state = getAgentRoomsState(mesh, []);
    const controlPath = path.join(mesh.root, "control", "rooms.json");
    const adjustedRooms = state.rooms.map((room) =>
      room.id === "build-room"
        ? {
            ...room,
            capacity: {
              ...room.capacity,
              maxDailyAutonomousRuns: 0,
            },
          }
        : room,
    );
    fs.writeFileSync(controlPath, `${JSON.stringify({ ...state, rooms: adjustedRooms }, null, 2)}\n`);

    const prepared = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Daily cap test",
      objective: "Validate daily cap blocks claim execution.",
      assignedAgentId: "build-room-lead",
    });

    const task = prepared.tasks.find((item) => item.title === "Daily cap test");
    const claim = () => claimRoomTask(mesh, task?.id ?? "", { agentId: "build-room-lead" });
    expect(claim).toThrowError(/Task claim blocked by room policy/);
  });

  it("returns clear gate reason when claim action is under autonomy floor", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const state = getAgentRoomsState(mesh, []);
    const room = state.rooms.find((item) => item.id === "build-room");
    const result = canRunRoomAction(room!, "task.claim", {
      task: {
        id: "t",
        autonomyLevel: "observe",
      },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason.toLowerCase()).toContain("acao task.claim exige");
  });

  it("allows suggestion across rooms and preserves source-task linkage", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const state = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Cross-room coordination test",
      objective: "Draft one execution plan and ask research to validate constraints.",
      assignedAgentId: "build-room-lead",
    });

    const sourceTask = state.tasks.find((task) => task.title === "Cross-room coordination test");
    expect(sourceTask?.id).toBeTruthy();

    const afterSuggest = suggestRoomTask(mesh, {
      sourceTaskId: sourceTask?.id ?? "",
      targetRoomId: "research-intel-room",
      title: "Review constraints for build execution plan",
      objective: "Validate protocol constraints and suggest safer execution gates.",
    });

    const suggestedTask = afterSuggest.tasks.find(
      (task) => task.roomId === "research-intel-room" && task.linkedTaskId === sourceTask?.id,
    );
    expect(suggestedTask?.status).toBe("queued");
    expect(suggestedTask?.sourceRoomId).toBe("build-room");
    expect(suggestedTask?.dependencies).toContain(sourceTask?.id ?? "missing-source-task");
    expect(suggestedTask?.requestedBy).toContain("Suggestion from");
  });

  it("blocks suggestion when source room cannot execute suggest action", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const state = getAgentRoomsState(mesh, []);
    const controlPath = path.join(mesh.root, "control", "rooms.json");
    const adjustedRooms = state.rooms.map((room) =>
      room.id === "content-growth-room"
        ? {
            ...room,
            autonomyMode: "observe",
          }
        : room,
    );
    fs.writeFileSync(controlPath, `${JSON.stringify({ ...state, rooms: adjustedRooms }, null, 2)}\n`);

    const source = createRoomTask(mesh, {
      roomId: "content-growth-room",
      title: "Observe mode suggestion test",
      objective: "Check if suggestion can be raised from observe room.",
      autonomyLevel: "observe",
      assignedAgentId: "tao-outsider-editor",
    });
    const sourceTask = source.tasks.find((task) => task.title === "Observe mode suggestion test");
    const blocked = () =>
      suggestRoomTask(mesh, {
        sourceTaskId: sourceTask?.id ?? "",
        targetRoomId: "build-room",
        title: "This must fail by autonomy",
        objective: "Suggestion from observe room should be blocked.",
      });

    expect(blocked).toThrowError(/Task suggest blocked by room policy/);
  });

  it("blocks claim for high-risk tasks that require review", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    getAgentRoomsState(mesh, []);

    const created = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Unsafe treasury transfer drill",
      objective: "Move wallet funds from one treasury account to another for protocol sync.",
      assignedAgentId: "qa-verifier",
    });
    const riskyTask = created.tasks.find((item) => item.title === "Unsafe treasury transfer drill");
    const claim = () => claimRoomTask(mesh, riskyTask?.id ?? "", { agentId: "qa-verifier" });

    expect(riskyTask?.riskLevel).toBe("high");
    expect(riskyTask?.executionMode).toBe("human-review");
    expect(riskyTask?.requiresHumanReview).toBe(true);
    expect(claim).toThrowError(/Task claim blocked by room policy/);
  });

  it("runs audit and classifies stale thread projects as repair-needed", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    const project = registerProject(mesh, {
      id: "agente-vlmkt",
      name: "Agente VLMKT",
      scope: "Prototype execution",
      threadId: "thread_demo",
      workspaceRoot: "/work/vlmkt",
      allowedPeers: ["*"],
    });

    const staleMinutes = 600;
    const staleDate = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();
    const heartbeat: HeartbeatFixture = {
      projectId: project.id,
      name: project.name,
      status: "online",
      last_seen: staleDate,
      observed_at: staleDate,
      current_task: "stale check",
      workspace: "/work/vlmkt",
      thread: "thread_demo",
      source: "dispatch",
      open_dispatches: 0,
      inbox_count: 0,
      outbox_count: 0,
    };
    fs.mkdirSync(path.join(tmpDir, "projects", project.id), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "projects", project.id, "heartbeat.json"), `${JSON.stringify(heartbeat)}\n`);

    const report = runAgentAudit(mesh, { projects: [project], roomAgents: [] });
    expect(report.summary.totalProjects).toBe(1);
    expect(report.summary.repairNeeded).toBe(1);
    expect(report.items[0]?.status).toBe("repair-needed");
    expect(report.items[0]?.reason).toContain("stale");
  });

  it("creates learning initiatives for blocked high-risk tasks", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    getAgentRoomsState(mesh, []);

    const prepared = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Safe autonomy blocker study",
      objective: "Move wallet funds from treasury A to treasury B only after manual policy confirmation.",
      autonomyLevel: "execute",
      assignedAgentId: "build-room-lead",
    });
    const task = prepared.tasks.find((item) => item.title === "Safe autonomy blocker study");
    expect(task?.id).toBeTruthy();

    const controlTasksPath = path.join(mesh.root, "control", "tasks.json");
    writeJsonFile(controlTasksPath, [task]);

    const result = runAutonomousRoomEngine(mesh, {
      allowLearningInitiatives: true,
      maxTasksPerRoom: 10,
      maxTasksTotal: 10,
      targetRoomId: "build-room",
      now: "2026-06-09T12:00:00.000Z",
    });
    expect(result.run.skipped).toHaveLength(1);
    expect(result.run.skipped[0]?.taskId).toBe(task?.id);
    expect(result.run.initiativesCreated).toBe(1);
    expect(result.run.initiatives).toHaveLength(1);
    expect(task?.riskLevel).toBe("high");
    const refreshed = getAgentRoomsState(mesh, []);
    const initiativeId = result.run.initiatives[0];
    const initiative = refreshed.tasks.find((item) => item.id === initiativeId);
    expect(initiative).toBeTruthy();
    expect(initiative?.riskLevel).toBe("low");
    expect(initiative?.autonomyLevel).toBe("suggest");
    expect(initiative?.executionMode).toBe("auto");
  });

  it("prevents duplicate learning initiatives within cooldown window", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    getAgentRoomsState(mesh, []);

    const prepared = createRoomTask(mesh, {
      roomId: "build-room",
      title: "Learning initiative repeat guard",
      objective: "Move wallet funds from one hot-wallet to another with emergency fallback steps.",
      autonomyLevel: "execute",
      assignedAgentId: "build-room-lead",
    });
    const task = prepared.tasks.find((item) => item.title === "Learning initiative repeat guard");
    expect(task?.id).toBeTruthy();

    const controlTasksPath = path.join(mesh.root, "control", "tasks.json");
    writeJsonFile(controlTasksPath, [task]);

    runAutonomousRoomEngine(mesh, {
      allowLearningInitiatives: true,
      maxTasksPerRoom: 10,
      maxTasksTotal: 10,
      targetRoomId: "build-room",
      now: "2026-06-09T12:00:00.000Z",
    });

    const controlStateAfterFirst = getAgentRoomsState(mesh, []);
    const initiativesForSourceTask = controlStateAfterFirst.tasks.filter(
      (item) => item.sourceRoomId === "build-room" && item.linkedTaskId === task?.id,
    );
    expect(initiativesForSourceTask).toHaveLength(1);

    const secondRun = runAutonomousRoomEngine(mesh, {
      allowLearningInitiatives: true,
      maxTasksPerRoom: 10,
      maxTasksTotal: 10,
      targetRoomId: "build-room",
      now: "2026-06-09T12:30:00.000Z",
    });
    expect(secondRun.run.initiativesCreated).toBe(0);

    const controlStateAfterSecond = getAgentRoomsState(mesh, []);
    const initiativesForSourceTaskAfterSecond = controlStateAfterSecond.tasks.filter(
      (item) => item.sourceRoomId === "build-room" && item.linkedTaskId === task?.id,
    );
    expect(initiativesForSourceTaskAfterSecond).toHaveLength(1);
  });

  it("skips learning initiatives when disabled", () => {
    const mesh = createMesh(tmpDir);
    initMesh(mesh);
    getAgentRoomsState(mesh, []);

    const prepared = createRoomTask(mesh, {
      roomId: "build-room",
      title: "No-learning requirement",
      objective: "Move funds between internal treasuries with dual control.",
      autonomyLevel: "execute",
      assignedAgentId: "build-room-lead",
    });
    const task = prepared.tasks.find((item) => item.title === "No-learning requirement");
    expect(task?.id).toBeTruthy();

    const controlTasksPath = path.join(mesh.root, "control", "tasks.json");
    writeJsonFile(controlTasksPath, [task]);

    const result = runAutonomousRoomEngine(mesh, {
      allowLearningInitiatives: false,
      maxTasksPerRoom: 10,
      maxTasksTotal: 10,
      targetRoomId: "build-room",
      now: "2026-06-09T12:00:00.000Z",
    });
    expect(result.run.initiativesCreated).toBe(0);
    expect(result.run.initiatives).toHaveLength(0);
  });
});

function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
