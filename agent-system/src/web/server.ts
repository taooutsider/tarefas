import { setDefaultOpenAIKey } from "@openai/agents";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { AgencyStore } from "../agency/store.js";
import { loadConfig } from "../config.js";
import { createLogger } from "../logger.js";
import {
  createMesh,
  dispatchPendingMessages,
  getDispatchEnvelopes,
  getInboxMessages,
  getOutboxMessages,
  initMesh,
  listProjects,
  sendProjectMessage,
  type DispatchEnvelope,
  type ProjectMessage,
  type ProjectRecord,
} from "../mesh/mesh.js";
import {
  claimRoomTask,
  createRoomTask,
  canRunRoomAction,
  getAgentRoomsState,
  type RoomAutonomyRunResult,
  type UpdateRoomAutonomyInput,
  updateRoomAutonomyConfig,
  runAutonomousRoomEngineSimulation,
  runAutonomousRoomEngine,
  runAgentAudit,
  releaseRoomTask,
  suggestRoomTask,
  roomIdForProject,
} from "../mesh/rooms.js";
import type { Mesh } from "../mesh/mesh.js";
import { AgentRuntime } from "../runtime/AgentRuntime.js";
import { openDatabase } from "../state/db.js";
import { AgentStore } from "../state/store.js";

const WEB_CHAT_ID = "web";
const WEB_USER_ID = "web-operator";
const ACCESS_COOKIE_NAME = "agency_command_access";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const ROOM_AUTONOMY_ENABLED = process.env.ROOM_AUTONOMY_ENABLED === "1" || process.env.ROOM_AUTONOMY_ENABLED?.toLowerCase() === "true";
const ROOM_AUTONOMY_INTERVAL_MS = Number(process.env.ROOM_AUTONOMY_INTERVAL_MS ?? "120000");
const ROOM_AUTONOMY_INTERVAL_FALLBACK_MS = Number.isFinite(ROOM_AUTONOMY_INTERVAL_MS) ? ROOM_AUTONOMY_INTERVAL_MS : 120000;
const ROOM_AUTONOMY_MAX_TASKS_PER_ROOM = Number(process.env.ROOM_AUTONOMY_MAX_TASKS_PER_ROOM ?? "2");
const ROOM_AUTONOMY_MAX_TASKS_TOTAL = Number(process.env.ROOM_AUTONOMY_MAX_TOTAL_TASKS ?? "8");
const ROOM_AUTONOMY_ALLOW_LEARNING_INITIATIVES = process.env.ROOM_AUTONOMY_ALLOW_LEARNING_INITIATIVES?.toLowerCase() !== "false";
const ROOM_AUTONOMY_ALLOW_SUGGESTIONS = process.env.ROOM_AUTONOMY_ALLOW_SUGGESTIONS?.toLowerCase() !== "false";

type BroadcastAutonomyState = {
  roomsAutonomyRun: (RoomAutonomyRunResult & { mode: "execute" | "simulate" }) | null;
};

let latestAutonomyRunState: BroadcastAutonomyState["roomsAutonomyRun"] = null;

function normalizeAutonomyMode(value: unknown): "execute" | "simulate" {
  return value === "simulate" ? "simulate" : "execute";
}

function setLatestAutonomyState(run: NonNullable<BroadcastAutonomyState["roomsAutonomyRun"]>) {
  latestAutonomyRunState = {
    ...run,
    mode: normalizeAutonomyMode(run.mode),
  };
}

type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

const config = loadConfig();
const logger = createLogger(config);
const db = openDatabase(config.databasePath);
const store = new AgentStore(db);
const agency = new AgencyStore(db);
const runtime = new AgentRuntime(config, store, agency, logger);
const meshRoot = path.resolve(process.cwd(), process.env.CODEX_MESH_ROOT ?? "../codex-mesh");
const mesh = createMesh(meshRoot);
const accessToken = process.env.WEB_ACCESS_TOKEN?.trim();
const port = Number(process.env.PORT ?? process.env.WEB_PORT ?? "4173");
const staticDir = path.resolve(process.cwd(), process.env.WEB_STATIC_DIR ?? "web/dist");

if (config.openaiApiKey) {
  setDefaultOpenAIKey(config.openaiApiKey);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await routeApi(req, res, url);
      return;
    }

    if (accessToken && isRoute(req, url, "POST", "/auth/login")) {
      await handleAccessLogin(req, res);
      return;
    }

    if (accessToken && isRoute(req, url, "POST", "/auth/logout")) {
      sendRedirect(res, "/");
      return;
    }

    if (accessToken && !isAuthorized(req)) {
      serveAccessLogin(res, url.searchParams.get("error") === "1");
      return;
    }

    serveStatic(res, url.pathname);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Web request failed", { error: message });
    sendJson(res, 500, { error: message });
  }
});

server.listen(port, "0.0.0.0", () => {
  logger.info("Agency web server listening", {
    port,
    staticDir,
    auth: accessToken ? "enabled" : "disabled",
  });
  console.log(`Agency Command web server: http://localhost:${port}`);

  if (ROOM_AUTONOMY_ENABLED && Number.isFinite(ROOM_AUTONOMY_INTERVAL_FALLBACK_MS) && ROOM_AUTONOMY_INTERVAL_FALLBACK_MS > 0) {
    setInterval(() => {
      try {
        const result = runAutonomousRoomEngine(mesh, {
          maxTasksPerRoom: Number.isFinite(ROOM_AUTONOMY_MAX_TASKS_PER_ROOM)
            ? Math.max(1, ROOM_AUTONOMY_MAX_TASKS_PER_ROOM)
            : 2,
          maxTasksTotal: Number.isFinite(ROOM_AUTONOMY_MAX_TASKS_TOTAL) ? Math.max(1, ROOM_AUTONOMY_MAX_TASKS_TOTAL) : 8,
          allowSuggestions: ROOM_AUTONOMY_ALLOW_SUGGESTIONS,
          allowLearningInitiatives: ROOM_AUTONOMY_ALLOW_LEARNING_INITIATIVES,
        });
        setLatestAutonomyState(result.run);
      } catch (error) {
        logger.error("Autonomous room engine failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, ROOM_AUTONOMY_INTERVAL_FALLBACK_MS);
    logger.info(`Autonomous room engine scheduled: ${ROOM_AUTONOMY_INTERVAL_FALLBACK_MS}ms`);
  }

  // Auto-bridge: process pending mesh envelopes continuously
  const MESH_BRIDGE_INTERVAL_MS = Number(process.env.MESH_BRIDGE_INTERVAL_MS ?? "5000");
  const MESH_BRIDGE_ENABLED = process.env.MESH_BRIDGE_ENABLED !== "0" && process.env.MESH_BRIDGE_ENABLED?.toLowerCase() !== "false";
  
  if (MESH_BRIDGE_ENABLED && Number.isFinite(MESH_BRIDGE_INTERVAL_MS) && MESH_BRIDGE_INTERVAL_MS > 0) {
    let bridgeLastRun = Date.now();
    setInterval(() => {
      const now = Date.now();
      if (now - bridgeLastRun < 1000) {
        return;
      }
      bridgeLastRun = now;
      
      try {
        const result = dispatchPendingMessages(mesh);
        if (result && result.dispatched && result.dispatched.length > 0) {
          logger.info("Auto-bridge processed envelopes", {
            dispatched: result.dispatched.length,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error("Auto-bridge dispatch failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, MESH_BRIDGE_INTERVAL_MS);
    logger.info(`Mesh auto-bridge scheduled: ${MESH_BRIDGE_INTERVAL_MS}ms`);
  }
});

async function routeApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  if (url.pathname !== "/api/health" && !isAuthorized(req, url)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  if (isRoute(req, url, "GET", "/api/health")) {
    sendJson(res, 200, {
      ok: true,
      generatedAt: new Date().toISOString(),
      auth: accessToken ? "enabled" : "disabled",
    });
    return;
  }

  if (isRoute(req, url, "GET", "/api/bootstrap")) {
    sendJson(res, 200, getBootstrapPayload());
    return;
  }

  if (isRoute(req, url, "GET", "/api/events")) {
    streamEvents(req, res);
    return;
  }

  if (isRoute(req, url, "GET", "/api/rooms")) {
    sendJson(res, 200, { rooms: getRoomsPayload() });
    return;
  }

  if (isRoute(req, url, "POST", "/api/rooms/autonomy/run")) {
    const body = await readJsonBody<{
      allowSuggestions?: boolean;
      allowLearningInitiatives?: boolean;
      maxTasksPerRoom?: number;
      maxTasksTotal?: number;
      targetRoomId?: string;
    }>(req);

    try {
      const result = runAutonomousRoomEngine(mesh, {
        allowSuggestions: body.allowSuggestions,
        allowLearningInitiatives: body.allowLearningInitiatives,
        maxTasksPerRoom: body.maxTasksPerRoom,
        maxTasksTotal: body.maxTasksTotal,
        targetRoomId: body.targetRoomId?.trim(),
      });
      setLatestAutonomyState(result.run);
      sendJson(res, 200, { ...getBootstrapPayload(), roomsAutonomyRun: result.run });
      return;
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  if (isRoute(req, url, "POST", "/api/rooms/autonomy/simulate")) {
    const body = await readJsonBody<{
      allowSuggestions?: boolean;
      allowLearningInitiatives?: boolean;
      maxTasksPerRoom?: number;
      maxTasksTotal?: number;
      targetRoomId?: string;
    }>(req);

    try {
      const result = runAutonomousRoomEngineSimulation(mesh, {
        allowSuggestions: body.allowSuggestions,
        allowLearningInitiatives: body.allowLearningInitiatives,
        maxTasksPerRoom: body.maxTasksPerRoom,
        maxTasksTotal: body.maxTasksTotal,
        targetRoomId: body.targetRoomId?.trim(),
      });
      setLatestAutonomyState(result.run);
      sendJson(res, 200, { ...getBootstrapPayload(), roomsAutonomyRun: result.run });
      return;
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  const roomPolicyMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/policy$/);
  if (req.method === "PATCH" && roomPolicyMatch) {
    const roomId = roomPolicyMatch[1];
    const body = await readJsonBody<{
      actionPolicy?: Partial<
        Record<"mesh.help" | "room.audit" | "task.create" | "task.release" | "task.claim" | "task.suggest" | "mesh.dispatch", {
          disabled?: boolean;
          maxTaskRiskLevel?: "low" | "medium" | "high";
          minAutonomy?: "observe" | "suggest" | "execute";
        }>
      >;
      autonomyMode?: "observe" | "suggest" | "execute";
      learningInitiativesEnabled?: boolean;
      capacity?: {
        maxDailyAutonomousRuns?: number;
        maxParallelClaims?: number;
      };
    }>(req);

    try {
      const autonomyMode = normalizeRoomAutonomyMode(body.autonomyMode);
      if (body.autonomyMode && autonomyMode === null) {
        sendJson(res, 400, { error: "Invalid autonomyMode. Use observe, suggest, or execute." });
        return;
      }
      const normalizedCapacity = body.capacity
        ? {
            maxDailyAutonomousRuns:
              body.capacity.maxDailyAutonomousRuns === undefined
                ? undefined
                : normalizeRoomCapacityValue(body.capacity.maxDailyAutonomousRuns),
            maxParallelClaims:
              body.capacity.maxParallelClaims === undefined
                ? undefined
                : normalizeRoomCapacityValue(body.capacity.maxParallelClaims),
          }
        : undefined;

      const request: UpdateRoomAutonomyInput = {
        roomId,
        autonomyMode: autonomyMode ?? undefined,
        learningInitiativesEnabled: body.learningInitiativesEnabled,
        capacity: normalizedCapacity,
        actionPolicy: body.actionPolicy as UpdateRoomAutonomyInput["actionPolicy"],
      };

      updateRoomAutonomyConfig(mesh, request);
      sendJson(res, 200, { ...getBootstrapPayload(), roomsAutonomyRun: null });
      return;
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  if (isRoute(req, url, "POST", "/api/rooms/tasks")) {
    const body = await readJsonBody<{
      acceptanceCriteria?: string[];
      assignedAgentId?: string | null;
      autonomyLevel?: "observe" | "suggest" | "execute";
      dependencies?: string[];
      dueDate?: string | null;
      executionMode?: "auto" | "human-review";
      objective?: string;
      priority?: "urgent" | "high" | "normal" | "low";
      riskLevel?: "low" | "medium" | "high";
      requiresHumanReview?: boolean;
      riskSignals?: string[];
      requestedBy?: string;
      sourceRoomId?: string;
      targetRoomId?: string;
      roomId?: string;
      target?: string;
      title?: string;
    }>(req);
    const roomId = body.roomId?.trim();
    const title = body.title?.trim();
    const objective = body.objective?.trim();

    if (!roomId || !title || !objective) {
      sendJson(res, 400, { error: "Missing roomId, title, or objective." });
      return;
    }

    try {
      createRoomTask(mesh, {
        acceptanceCriteria: body.acceptanceCriteria,
        assignedAgentId: body.assignedAgentId,
        autonomyLevel: body.autonomyLevel,
        dueDate: body.dueDate,
        dependencies: body.dependencies,
        objective,
        executionMode: body.executionMode,
        priority: body.priority,
        requestedBy: body.requestedBy,
        requiresHumanReview: body.requiresHumanReview,
        riskLevel: body.riskLevel,
        riskSignals: body.riskSignals,
        sourceRoomId: body.sourceRoomId ?? null,
        roomId,
        target: body.target,
        title,
      });
      sendJson(res, 200, getBootstrapPayload());
      return;
    } catch (error) {
      if (isRoomGovernanceError(error)) {
        sendJson(res, 403, {
          error: error instanceof Error ? error.message : String(error),
          action: "task.create",
          reason: error instanceof Error ? error.message.replace(/^Task creation blocked by room policy:\s*/i, "") : String(error),
        });
        return;
      }

      throw error;
    }
  }

  const suggestRoomTaskMatch = url.pathname.match(/^\/api\/rooms\/tasks\/([^/]+)\/suggest$/);
  if (req.method === "POST" && suggestRoomTaskMatch) {
    const sourceTaskId = suggestRoomTaskMatch[1];
    const body = await readJsonBody<{
      autonomyLevel?: "observe" | "suggest" | "execute";
      dueDate?: string | null;
      objective?: string;
      priority?: "urgent" | "high" | "normal" | "low";
      targetRoomId?: string;
      title?: string;
    }>(req);

    const targetRoomId = body.targetRoomId?.trim();
    const title = body.title?.trim();
    const objective = body.objective?.trim();

    if (!targetRoomId || !title || !objective) {
      sendJson(res, 400, { error: "Missing targetRoomId, title, or objective." });
      return;
    }

    try {
      suggestRoomTask(mesh, {
        sourceTaskId,
        targetRoomId,
        autonomyLevel: body.autonomyLevel,
        dueDate: body.dueDate,
        objective,
        priority: body.priority,
        title,
      });
      sendJson(res, 200, getBootstrapPayload());
      return;
    } catch (error) {
      if (isRoomGovernanceError(error)) {
        sendJson(res, 403, {
          error: error instanceof Error ? error.message : String(error),
          action: "task.suggest",
          reason: error instanceof Error ? error.message.replace(/^Task .*blocked by room policy:\s*/i, "") : String(error),
        });
        return;
      }

      throw error;
    }
  }

  if (isRoute(req, url, "POST", "/api/rooms/audit")) {
    const meshPayload = getMeshPayload();
    const rooms = getRoomsPayload(meshPayload.projects);
    const auditRoom = rooms.rooms.find((room) => room.id === "build-room") ?? rooms.rooms[0];
    if (!auditRoom) {
      sendJson(res, 500, { error: "No room configured for governance audit." });
      return;
    }

    const auditGate = canRunRoomAction(auditRoom, "room.audit");
    if (!auditGate.allowed) {
      sendJson(res, 403, {
        error: "Room governance blocked room audit.",
        roomId: auditRoom.id,
        reason: auditGate.reason,
        blockers: auditGate.blockers,
      });
      return;
    }

    runAgentAudit(mesh, {
      projects: meshPayload.projects,
      roomAgents: getRoomsPayload(meshPayload.projects).agents,
    });
    sendJson(res, 200, getBootstrapPayload());
    return;
  }

  const roomTaskActionMatch = url.pathname.match(/^\/api\/rooms\/tasks\/([^/]+)\/(claim|release)$/);
  if (req.method === "POST" && roomTaskActionMatch) {
    const taskId = roomTaskActionMatch[1];
    const action = roomTaskActionMatch[2];
    const body = await readJsonBody<{
      agentId?: string;
      leaseMinutes?: number;
      reason?: string;
      target?: string;
    }>(req);

    if (action === "claim") {
      const agentId = body.agentId?.trim();
      if (!agentId) {
        sendJson(res, 400, { error: "Missing agentId." });
        return;
      }

      try {
        claimRoomTask(mesh, taskId, {
          agentId,
          leaseMinutes: body.leaseMinutes,
          reason: body.reason,
          target: body.target,
        });
        sendJson(res, 200, getBootstrapPayload());
        return;
      } catch (error) {
        if (isRoomGovernanceError(error)) {
          sendJson(res, 403, {
            error: error instanceof Error ? error.message : String(error),
            action: "task.claim",
            reason: error instanceof Error ? error.message.replace(/^Task claim blocked by room policy:\s*/i, "") : String(error),
          });
          return;
        }

        throw error;
      }
    }

    try {
      releaseRoomTask(mesh, taskId, body.reason);
      sendJson(res, 200, getBootstrapPayload());
      return;
    } catch (error) {
      if (isRoomGovernanceError(error)) {
        sendJson(res, 403, {
          error: error instanceof Error ? error.message : String(error),
          action: "task.release",
          reason: error instanceof Error ? error.message.replace(/^Task release blocked by room policy:\s*/i, "") : String(error),
        });
        return;
      }

      throw error;
    }
  }

  if (isRoute(req, url, "POST", "/api/demo/seed")) {
    const seeded = seedDemoAgencyIfEmpty();
    sendJson(res, 200, { seeded, ...getBootstrapPayload() });
    return;
  }

  if (isRoute(req, url, "POST", "/api/jobs")) {
    const body = await readJsonBody<{ goal?: string }>(req);
    const goal = body.goal?.trim();
    if (!goal) {
      sendJson(res, 400, { error: "Missing goal." });
      return;
    }

    const job = store.createJob({ chatId: WEB_CHAT_ID, userId: WEB_USER_ID, goal });
    if (!config.openaiApiKey) {
      store.appendJobEvent(job.id, "blocked", "OPENAI_API_KEY missing; job created but not executed.");
      sendJson(res, 202, {
        job,
        message: "Job created. Configure OPENAI_API_KEY to run the agent from the web.",
        ...getBootstrapPayload(),
      });
      return;
    }

    const outcome = await runtime.runJob(job.id);
    sendJson(res, 200, { outcome, ...getBootstrapPayload() });
    return;
  }

  if (isRoute(req, url, "GET", "/api/mesh/bridge")) {
    sendJson(res, 200, getBridgePayload());
    return;
  }

  if (isRoute(req, url, "POST", "/api/mesh/dispatch")) {
    const meshPayload = getMeshPayload();
    const roomsPayload = getRoomsPayload(meshPayload.projects);
    const dispatchGate = assessMeshDispatchGate(meshPayload, roomsPayload);
    if (!dispatchGate.allowed) {
      sendJson(res, 403, {
        error: "Room governance blocked mesh dispatch.",
        roomId: dispatchGate.roomId,
        reason: dispatchGate.reason,
        blockers: dispatchGate.blockers,
        actionDescription: dispatchGate.actionDescription,
      });
      return;
    }

    const result = dispatchPendingMessages(mesh);
    sendJson(res, 200, { bridge: { generatedAt: new Date().toISOString(), result }, ...getBootstrapPayload() });
    return;
  }

  if (isRoute(req, url, "POST", "/api/mesh/help")) {
    const body = await readJsonBody<{
      expectedOutput?: string;
      message?: string;
      priority?: string;
      subject?: string;
      to?: string;
    }>(req);
    const payload = composeMeshConversation(mesh, {
      scope: "project",
      message: body.message?.trim() ?? "",
      projectId: body.to?.trim(),
      subject: body.subject?.trim(),
      expectedOutput: body.expectedOutput?.trim(),
      priority: body.priority?.trim(),
      requiresReply: true,
    });

    if (!payload.ok) {
      sendJson(res, payload.status, payload.payload);
      return;
    }

    sendJson(res, 200, payload.payload);
    return;
  }

  if (isRoute(req, url, "POST", "/api/mesh/message")) {
    const body = await readJsonBody<{
      expectedOutput?: string;
      message?: string;
      priority?: string;
      projectId?: string;
      roomId?: string;
      requiresReply?: boolean;
      scope?: "project" | "room" | "all";
      subject?: string;
    }>(req);

    const payload = composeMeshConversation(mesh, {
      message: body.message?.trim() ?? "",
      expectedOutput: body.expectedOutput?.trim(),
      priority: body.priority?.trim(),
      projectId: body.projectId?.trim(),
      roomId: body.roomId?.trim(),
      requiresReply: body.requiresReply,
      scope: body.scope?.trim(),
      subject: body.subject?.trim(),
    });

    if (!payload.ok) {
      sendJson(res, payload.status, payload.payload);
      return;
    }

    sendJson(res, 200, payload.payload);
    return;
  }

  const approvalMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|deny)$/);
  if (req.method === "POST" && approvalMatch) {
    if (!config.openaiApiKey) {
      sendJson(res, 400, { error: "OPENAI_API_KEY is required to resume approval-gated runs." });
      return;
    }

    const body = await readJsonBody<{ note?: string }>(req);
    const outcome = await runtime.resolveApproval(
      approvalMatch[1],
      approvalMatch[2] === "approve" ? "approved" : "denied",
      WEB_USER_ID,
      body.note?.trim() || null,
    );
    sendJson(res, 200, { outcome, ...getBootstrapPayload() });
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

function assessMeshDispatchGate(
  meshPayload: ReturnType<typeof getMeshPayload>,
  roomsPayload: ReturnType<typeof getRoomsPayload>,
) {
  const seen = new Set<string>();
  const fallbackRoom = roomsPayload.rooms.find((room) => room.id === "build-room") ?? roomsPayload.rooms[0];
  if (!fallbackRoom) {
    return {
      allowed: false,
      roomId: "build-room",
      roomName: "Unconfigured room",
      action: "mesh.dispatch",
      actionDescription: "Dispatch envelopes to Mesh threads.",
      requestedMode: "execute",
      effectiveMode: "execute",
      reason: "No operational room found for governance.",
      blockers: ["Governance rooms are missing from room state."],
    };
  }

  for (const project of meshPayload.projects) {
    if (project.status !== "active" || !project.threadId) {
      continue;
    }

    for (const message of getInboxMessages(mesh, project.id)) {
      if (message.status !== "sent" || !message.requiresReply) {
        continue;
      }

      const projectIds = new Set([project.id, message.from, message.to]);
      for (const projectId of projectIds) {
        if (seen.has(projectId)) {
          continue;
        }

        const room = roomsPayload.rooms.find((item) => item.id === roomIdForProject(projectId));
        if (!room) {
          continue;
        }

        const gate = canRunRoomAction(room, "mesh.dispatch");
        if (!gate.allowed) {
          return gate;
        }
        seen.add(projectId);
      }
    }
  }

  const fallbackGate = canRunRoomAction(fallbackRoom, "mesh.dispatch");
  if (!fallbackGate.allowed) {
    return fallbackGate;
  }

  return {
    ...fallbackGate,
    reason: seen.size
      ? "Dispatched envelope queue is allowed by room governance."
      : "No pending reply-needed dispatches found; governance default is allowed.",
  };
}

type MeshConversationScope = "project" | "room" | "all";
type MeshConversationPayload = ReturnType<typeof getBootstrapPayload> & {
  bridge: {
    generatedAt: string;
    result: ReturnType<typeof dispatchPendingMessages>;
  };
  meshMessage?: ProjectMessage;
  meshMessages?: ProjectMessage[];
  meshSkipped?: Array<{ from: string; to: string; reason: string }>;
};

type MeshConversationResponse =
  | {
      ok: true;
      payload: MeshConversationPayload;
    }
  | {
      ok: false;
      status: 400 | 403 | 404 | 500;
      payload: Record<string, unknown>;
    };

function composeMeshConversation(
  mesh: Mesh,
  input: {
    message: string;
    scope?: string;
    projectId?: string;
    roomId?: string;
    subject?: string;
    expectedOutput?: string;
    priority?: string;
    requiresReply?: boolean;
  },
): MeshConversationResponse {
  const rawMessage = input.message?.trim() ?? "";
  if (!rawMessage) {
    return {
      ok: false,
      status: 400,
      payload: { error: "Missing mesh message." },
    };
  }

  const normalizedScope: MeshConversationScope =
    input.scope === "room" || input.scope === "all" || input.scope === "project"
      ? input.scope
      : input.projectId
        ? "project"
        : input.roomId
          ? "room"
          : "all";

  const roomsPayload = getRoomsPayload();
  const projects = listProjects(mesh);
  const targetProjects = new Map<string, ProjectRecord>();

  const ensureRoomForProject = (projectId: string) => {
    const room = roomsPayload.rooms.find((item) => item.id === roomIdForProject(projectId));
    if (!room) {
      return {
        allowed: false as const,
        error: {
          status: 500 as const,
          payload: { error: `No room found for project ${projectId}.` },
        },
      };
    }

    const gate = canRunRoomAction(room, "mesh.help");
    if (!gate.allowed) {
      return {
        allowed: false as const,
        error: {
          status: 403 as const,
          payload: {
            error: "Room governance blocked mesh message dispatch.",
            roomId: gate.roomId,
            roomName: gate.roomName,
            reason: gate.reason,
            blockers: gate.blockers,
          },
        },
      };
    }

    return { allowed: true as const, room };
  };

  const includeTarget = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    if (project.id === "agent-system") {
      return;
    }

    const roomCheck = ensureRoomForProject(project.id);
    if (!roomCheck.allowed) {
      return roomCheck.error;
    }

    targetProjects.set(project.id, project);
    return null;
  };

  if (normalizedScope === "project") {
    const targetProjectId = input.projectId?.trim();
    if (!targetProjectId) {
      return {
        ok: false,
        status: 400,
        payload: { error: "Missing recipient project id." },
      };
    }

    const target = projects.find((project) => project.id === targetProjectId);
    if (!target) {
      return {
        ok: false,
        status: 404,
        payload: { error: `Project not found: ${targetProjectId}` },
      };
    }

    const roomCheck = ensureRoomForProject(target.id);
    if (!roomCheck.allowed) {
      return { ok: false, status: roomCheck.error.status, payload: roomCheck.error.payload };
    }

    targetProjects.set(target.id, target);
  } else if (normalizedScope === "room") {
    const targetRoomId = input.roomId?.trim();
    if (!targetRoomId) {
      return {
        ok: false,
        status: 400,
        payload: { error: "Missing room id." },
      };
    }

    const targetRoom = roomsPayload.rooms.find((room) => room.id === targetRoomId);
    if (!targetRoom) {
      return {
        ok: false,
        status: 404,
        payload: { error: `Room not found: ${targetRoomId}` },
      };
    }

    for (const project of projects) {
      if (roomIdForProject(project.id) !== targetRoom.id || project.id === "agent-system") {
        continue;
      }

      const roomCheck = ensureRoomForProject(project.id);
      if (!roomCheck.allowed) {
        return { ok: false, status: roomCheck.error.status, payload: roomCheck.error.payload };
      }
      targetProjects.set(project.id, project);
    }

    if (!targetProjects.size) {
      return {
        ok: false,
        status: 404,
        payload: { error: `No projects found for room ${targetRoom.name} (${targetRoom.id}).` },
      };
    }
  } else {
    for (const project of projects) {
      if (project.id === "agent-system") {
        continue;
      }

      const include = includeTarget(project.id);
      if (include === undefined || include === null) {
        continue;
      }

      return {
        ok: false,
        status: include.status,
        payload: include.payload,
      };
    }

    if (!targetProjects.size) {
      return {
        ok: false,
        status: 400,
        payload: { error: "No target projects available for message dispatch." },
      };
    }
  }

  if (!targetProjects.size) {
    return {
      ok: false,
      status: 400,
      payload: { error: "No recipient targets were resolved for this request." },
    };
  }

  const normalizedSubject =
    input.subject || "Agent Office request";
  const normalizedExpectedOutput =
    input.expectedOutput ??
    "Reply with public context, relevant files, risks, and the recommended next step to register in the Mesh.";
  const normalizedPriority = normalizeMeshPriority(input.priority);
  const expectsReply = input.scope === "project" || input.requiresReply === true;
  const sent: ProjectMessage[] = [];
  const skipped: Array<{ from: string; to: string; reason: string }> = [];
  const sender = "agent-system";

  for (const target of targetProjects.values()) {
    try {
      const message = sendProjectMessage(mesh, {
        body: ["Request created by Agent Office.", "", rawMessage, "", `Operational source: ${WEB_USER_ID}`].join("\n"),
        expectedOutput: normalizedExpectedOutput,
        from: sender,
        priority: normalizedPriority,
        requiresReply: Boolean(expectsReply),
        subject: normalizedSubject,
        to: target.id,
        type: "request_context",
      });
      sent.push(message);
    } catch (error) {
      skipped.push({
        from: sender,
        to: target.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!sent.length && skipped.length) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "No mesh messages were sent due peer policy or registry constraints.",
        skipped,
      },
    };
  }

  const dispatch = dispatchPendingMessages(mesh);
  const payload = getBootstrapPayload();

  return {
    ok: true,
    payload: {
      bridge: { generatedAt: new Date().toISOString(), result: dispatch },
      meshMessage: sent.length === 1 ? sent[0] : undefined,
      meshMessages: sent,
      meshSkipped: skipped,
      ...payload,
    },
  };
}

function getBootstrapPayload() {
  const meshPayload = getMeshPayload();
  return {
    agency: {
      snapshot: agency.getSnapshot(),
      admin: agency.getAdminSnapshot(),
      delivery: agency.getDeliverySnapshot(),
      commandCenter: agency.getCommandCenterSnapshot(),
      clients: agency.listClients({ limit: 100 }),
    },
    jobs: store.listRecentJobs(WEB_CHAT_ID, 12),
    approvals: store.listPendingApprovals(WEB_CHAT_ID, 20),
    mesh: meshPayload,
    rooms: getRoomsPayload(meshPayload.projects),
    roomsAutonomyRun: latestAutonomyRunState,
    runtime: {
      openaiConfigured: Boolean(config.openaiApiKey),
      telegramConfigured: Boolean(config.telegramBotToken),
    },
  };
}

function getRoomsPayload(projects?: ProjectRecord[]) {
  initMesh(mesh);
  return getAgentRoomsState(mesh, projects ?? listProjects(mesh));
}

function getMeshPayload() {
  try {
    initMesh(mesh);
    const projects = listProjects(mesh);
    const allDispatches = getDispatchEnvelopes(mesh);
    const openDispatches = allDispatches.filter((dispatch) => dispatch.status === "pending" || dispatch.status === "sent");
    const inboxMessages = collectMeshMessages(projects, "inbox");
    const outboxMessages = collectMeshMessages(projects, "outbox");
    const messages = collectMeshMessages(projects);
    const recentMessages = messages.slice(0, 80);
    const events = buildMeshEvents(messages, openDispatches);
    const heartbeats = publishProjectHeartbeats(projects, messages, allDispatches);

    return {
      root: mesh.root,
      projects,
      dispatches: openDispatches,
      inbox: inboxMessages.slice(0, 80),
      outbox: outboxMessages.slice(0, 80),
      events,
      heartbeats,
    };
  } catch (error) {
    return {
      root: mesh.root,
      projects: [],
      dispatches: [],
      inbox: [],
      outbox: [],
      events: [],
      heartbeats: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getBridgePayload() {
  initMesh(mesh);
  const pending = getDispatchEnvelopes(mesh, { status: "pending" });
  const sent = getDispatchEnvelopes(mesh, { status: "sent" });
  const replied = getDispatchEnvelopes(mesh, { status: "replied" });
  const failed = getDispatchEnvelopes(mesh, { status: "failed" });

  return {
    generatedAt: new Date().toISOString(),
    root: mesh.root,
    open: [...pending, ...sent],
    pending,
    sent,
    replied,
    failed,
    summary: {
      failed: failed.length,
      open: pending.length + sent.length,
      pending: pending.length,
      replied: replied.length,
      sent: sent.length,
    },
  };
}

type MeshHeartbeatStatus = "online" | "working" | "paused" | "backend";
type MeshEventKind = "dispatch" | "message" | "reply";

interface MeshHeartbeat {
  projectId: string;
  name: string;
  status: MeshHeartbeatStatus;
  last_seen: string;
  observed_at: string;
  current_task: string;
  workspace: string | null;
  thread: string | null;
  source: "registry" | "message" | "dispatch";
  open_dispatches: number;
  inbox_count: number;
  outbox_count: number;
}

interface MeshEvent {
  id: string;
  kind: MeshEventKind;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  createdAt: string;
  open: boolean;
}

function collectMeshMessages(projects: ProjectRecord[], box?: "inbox" | "outbox"): ProjectMessage[] {
  const byId = new Map<string, ProjectMessage>();

  for (const project of projects) {
    const source = box === "inbox" ? getInboxMessages(mesh, project.id) : box === "outbox" ? getOutboxMessages(mesh, project.id) : [
      ...getInboxMessages(mesh, project.id),
      ...getOutboxMessages(mesh, project.id),
    ];
    for (const message of source) {
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 80);
}

function buildMeshEvents(messages: ProjectMessage[], openDispatches: DispatchEnvelope[]): MeshEvent[] {
  const messageById = new Map(messages.map((message) => [message.id, message]));
  const dispatchEvents = openDispatches.map((dispatch): MeshEvent => {
    const message = messageById.get(dispatch.messageId);
    return {
      id: dispatch.id,
      kind: "dispatch",
      messageId: dispatch.messageId,
      from: dispatch.from,
      to: dispatch.to,
      subject: message?.subject ?? "Open dispatch",
      status: dispatch.status,
      createdAt: dispatch.sentAt ?? dispatch.createdAt,
      open: true,
    };
  });

  const messageEvents = messages.map((message): MeshEvent => ({
    id: message.id,
    kind: message.type === "reply" ? "reply" : "message",
    messageId: message.id,
    from: message.from,
    to: message.to,
    subject: message.subject,
    status: message.status,
    createdAt: message.createdAt,
    open: false,
  }));

  return [...dispatchEvents, ...messageEvents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 36);
}

function publishProjectHeartbeats(
  projects: ProjectRecord[],
  messages: ProjectMessage[],
  dispatches: DispatchEnvelope[],
): MeshHeartbeat[] {
  const observedAt = new Date().toISOString();
  const heartbeats = projects.map((project) => {
    const projectMessages = messages.filter((message) => message.from === project.id || message.to === project.id);
    const projectDispatches = dispatches.filter((dispatch) => dispatch.from === project.id || dispatch.to === project.id);
    const openDispatches = projectDispatches.filter((dispatch) => dispatch.status === "pending" || dispatch.status === "sent");
    const latestOpenDispatch = latestByDate(openDispatches, (dispatch) => dispatch.sentAt ?? dispatch.createdAt);
    const latestDispatch = latestByDate(projectDispatches, (dispatch) =>
      dispatch.repliedAt ?? dispatch.failedAt ?? dispatch.sentAt ?? dispatch.createdAt,
    );
    const latestMessage = latestByDate(projectMessages, (message) =>
      message.dispatchedAt ?? message.createdAt,
    );
    const currentTask = latestOpenDispatch
      ? messages.find((message) => message.id === latestOpenDispatch.messageId)?.subject ?? "Open dispatch"
      : latestMessage?.subject ?? "Watching Mesh";
    const latestSignal = latestIso([
      project.updatedAt,
      latestMessage?.dispatchedAt,
      latestMessage?.createdAt,
      latestDispatch?.repliedAt,
      latestDispatch?.failedAt,
      latestDispatch?.sentAt,
      latestDispatch?.createdAt,
    ]) ?? project.updatedAt;
    const source: MeshHeartbeat["source"] = latestDispatch ? "dispatch" : latestMessage ? "message" : "registry";
    const status = heartbeatStatus(project, openDispatches);
    const heartbeat: MeshHeartbeat = {
      projectId: project.id,
      name: project.name,
      status,
      last_seen: latestSignal,
      observed_at: observedAt,
      current_task: currentTask,
      workspace: project.workspaceRoot,
      thread: project.threadId,
      source,
      open_dispatches: openDispatches.length,
      inbox_count: projectMessages.filter((message) => message.to === project.id).length,
      outbox_count: projectMessages.filter((message) => message.from === project.id).length,
    };

    writeHeartbeatFile(project, heartbeat);
    return heartbeat;
  });

  return heartbeats;
}

function heartbeatStatus(project: ProjectRecord, openDispatches: DispatchEnvelope[]): MeshHeartbeatStatus {
  if (project.status !== "active") {
    return "paused";
  }

  if (!project.threadId) {
    return "backend";
  }

  if (openDispatches.length > 0) {
    return "working";
  }

  return "online";
}

function writeHeartbeatFile(project: ProjectRecord, heartbeat: MeshHeartbeat): void {
  const heartbeatPath = path.join(mesh.root, "projects", project.id, "heartbeat.json");
  const previous = fs.existsSync(heartbeatPath) ? readHeartbeatFile(heartbeatPath) : null;
  const previousComparable = previous ? heartbeatComparable(previous) : null;
  const nextComparable = heartbeatComparable(heartbeat);
  const previousObservedAt = previous?.observed_at ? Date.parse(previous.observed_at) : 0;
  const stale = !previousObservedAt || Date.now() - previousObservedAt > 30_000;

  if (!previous || stale || JSON.stringify(previousComparable) !== JSON.stringify(nextComparable)) {
    fs.mkdirSync(path.dirname(heartbeatPath), { recursive: true });
    fs.writeFileSync(heartbeatPath, `${JSON.stringify(heartbeat, null, 2)}\n`);
  }
}

function readHeartbeatFile(filePath: string): MeshHeartbeat | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as MeshHeartbeat;
  } catch {
    return null;
  }
}

function heartbeatComparable(heartbeat: MeshHeartbeat): Omit<MeshHeartbeat, "observed_at"> {
  const { observed_at: _observedAt, ...stable } = heartbeat;
  return stable;
}

function latestByDate<T>(items: T[], getDate: (item: T) => string | undefined): T | null {
  return items.reduce<T | null>((latest, item) => {
    const itemDate = getDate(item);
    if (!itemDate) {
      return latest;
    }

    if (!latest) {
      return item;
    }

    const latestDate = getDate(latest);
    return !latestDate || itemDate.localeCompare(latestDate) > 0 ? item : latest;
  }, null);
}

function latestIso(values: Array<string | undefined>): string | null {
  return values.filter(Boolean).sort().at(-1) ?? null;
}

function streamEvents(req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });

  let sequence = 0;
  let lastSignature = "";
  let lastAutonomySignature = "";

  const sendCurrentState = () => {
    const payload = getBootstrapPayload();
    const signature = stablePayloadSignature(payload);
    const autonomySignature = latestAutonomyStateSignature(latestAutonomyRunState);

    if (signature !== lastSignature) {
      lastSignature = signature;
      sequence += 1;
      writeSse(res, "snapshot", {
        generatedAt: new Date().toISOString(),
        sequence,
        payload,
      });
    } else {
      writeSse(res, "heartbeat", {
        generatedAt: new Date().toISOString(),
        sequence,
      });
    }

    if (latestAutonomyRunState && autonomySignature && autonomySignature !== lastAutonomySignature) {
      writeSse(res, "autonomy", {
        generatedAt: new Date().toISOString(),
        events: latestAutonomyRunState.events,
      });
      lastAutonomySignature = autonomySignature;
    }
  };

  res.write(": connected\n\n");
  sendCurrentState();

  const interval = setInterval(sendCurrentState, 2500);
  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
}

function writeSse(res: http.ServerResponse, event: string, payload: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function latestAutonomyStateSignature(state: BroadcastAutonomyState["roomsAutonomyRun"]): string {
  if (!state) {
    return "";
  }

  return `${state.mode}:${state.triggeredAt}:${state.executed.length}:${state.skipped.length}:${state.events
    .map((event) => `${event.id}-${event.kind}-${event.taskId}`)
    .sort()
    .join("|")}`;
}

function stablePayloadSignature(payload: ReturnType<typeof getBootstrapPayload>): string {
  return JSON.stringify(stripVolatileFields(payload));
}

function stripVolatileFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripVolatileFields);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "generatedAt" && key !== "observed_at")
        .map(([key, item]) => [key, stripVolatileFields(item)]),
    );
  }

  return value;
}

function normalizeMeshPriority(value: string | undefined): "low" | "normal" | "high" {
  return value === "low" || value === "high" ? value : "normal";
}

function seedDemoAgencyIfEmpty() {
  const existing = agency.listClients({ limit: 1 });
  if (existing.length > 0) {
    return false;
  }

  const clinic = agency.createClient({
    name: "Demo Clinic",
    niche: "healthcare",
    owner: "ops",
    monthlyRetainer: 4500,
    notes: "Demo client for healthcare lead generation.",
  });
  const ecommerce = agency.createClient({
    name: "Demo Store",
    niche: "ecommerce",
    owner: "growth",
    monthlyRetainer: 7000,
    notes: "Demo client for paid media and retention.",
  });
  const b2b = agency.createClient({
    name: "SaaS Demo",
    niche: "b2b saas",
    owner: "strategy",
    monthlyRetainer: 9000,
    notes: "Demo client for LinkedIn, Google Search, and landing pages.",
  });

  agency.createWorkItem({
    clientId: clinic.id,
    title: "Review appointment funnel",
    type: "campaign",
    priority: "high",
    dueDate: "2026-06-10",
  });
  agency.createWorkItem({
    clientId: ecommerce.id,
    title: "Create 5 creative variations for Meta",
    type: "creative",
    priority: "medium",
    dueDate: "2026-06-07",
  });
  agency.createWorkItem({
    clientId: b2b.id,
    title: "Wireframe landing page for demo",
    type: "landing_page",
    priority: "high",
    dueDate: "2026-06-12",
  });
  agency.createWorkItem({
    clientId: ecommerce.id,
    title: "Approve new campaign visual direction",
    type: "creative",
    status: "waiting_approval",
    priority: "urgent",
    dueDate: "2026-06-06",
    owner: "creative",
  });
  agency.createFinancialItem({
    clientId: clinic.id,
    type: "receivable",
    amount: 4500,
    description: "Monthly retainer - Demo Clinic",
    dueDate: "2026-06-05",
  });
  agency.createFinancialItem({
    clientId: ecommerce.id,
    type: "receivable",
    status: "overdue",
    amount: 7000,
    description: "Overdue monthly retainer - Demo Store",
    dueDate: "2026-05-30",
  });
  agency.createFinancialItem({
    type: "payable",
    amount: 1200,
    description: "Automation tool",
    dueDate: "2026-06-08",
  });
  const campaign = agency.createCampaign({
    clientId: ecommerce.id,
    name: "Valentine's Day Offer",
    objective: "Increase revenue through Meta Ads with offer creatives and remarketing.",
    channels: ["Meta Ads", "Email", "WhatsApp"],
    budget: 12000,
    startDate: "2026-06-01",
    endDate: "2026-06-14",
    status: "live",
    kpis: { target_roas: 2.5, primary_metric: "purchase_value" },
  });
  agency.createCreativeAsset({
    clientId: ecommerce.id,
    campaignId: campaign.id,
    type: "static_ad",
    status: "review",
    channel: "Meta Ads",
    format: "1:1",
    brief: "Offer creative with product, price, proof, and CTA for remarketing.",
    dueDate: "2026-06-06",
  });
  agency.createReport({
    clientId: clinic.id,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-07",
    status: "review",
    summary: "Weekly report awaiting final review.",
    nextSteps: "Validate qualified leads and appointment rate.",
  });

  return true;
}

function isAuthorized(req: http.IncomingMessage, url?: URL): boolean {
  if (!accessToken) {
    return true;
  }

  const auth = req.headers.authorization ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const legacyToken = Array.isArray(req.headers["x-access-token"])
    ? req.headers["x-access-token"][0]
    : req.headers["x-access-token"];
  const headerToken = Array.isArray(req.headers["x-web-access-token"])
    ? req.headers["x-web-access-token"][0]
    : req.headers["x-web-access-token"];
  const cookieToken = parseCookies(req.headers.cookie)[ACCESS_COOKIE_NAME];
  const queryToken = url?.searchParams.get("token")?.trim();
  return (
    bearer === accessToken
    || headerToken === accessToken
    || legacyToken === accessToken
    || cookieToken === accessToken
    || queryToken === accessToken
  );
}

function normalizeRoomAutonomyMode(value: string | undefined): "observe" | "suggest" | "execute" | null {
  if (value === "observe" || value === "suggest" || value === "execute") {
    return value;
  }
  return null;
}

function normalizeRoomCapacityValue(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const parsed = Math.round(value);
  return Math.max(0, parsed);
}

function isRoute(req: http.IncomingMessage, url: URL, method: HttpMethod, pathname: string): boolean {
  return req.method === method && url.pathname === pathname;
}

async function readJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  const raw = (await readRawBody(req)).trim();
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

async function readRawBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function handleAccessLogin(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const raw = await readRawBody(req);
  const code = new URLSearchParams(raw).get("code")?.trim();
  if (code !== accessToken) {
    sendRedirect(res, "/?error=1");
    return;
  }

  sendRedirect(res, "/#office", [accessCookie(req)]);
}

function accessCookie(req: http.IncomingMessage): string {
  const secure = isHttpsRequest(req) ? "; Secure" : "";
  return [
    `${ACCESS_COOKIE_NAME}=${encodeURIComponent(accessToken ?? "")}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${ACCESS_COOKIE_MAX_AGE_SECONDS}`,
  ].join("; ") + secure;
}

function isHttpsRequest(req: http.IncomingMessage): boolean {
  const forwardedProto = Array.isArray(req.headers["x-forwarded-proto"])
    ? req.headers["x-forwarded-proto"][0]
    : req.headers["x-forwarded-proto"];
  return forwardedProto === "https";
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader?.split(";") ?? []) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) continue;
    cookies[name] = decodeURIComponent(valueParts.join("="));
  }
  return cookies;
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  res.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "authorization, content-type, x-web-access-token",
    "Access-Control-Allow-Methods": "DELETE, GET, OPTIONS, PATCH, POST, PUT",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  res.end(body);
}

function isRoomGovernanceError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /blocked by room policy/i.test(message);
}

function sendNoContent(res: http.ServerResponse): void {
  res.writeHead(204, {
    "Access-Control-Allow-Headers": "authorization, content-type, x-web-access-token",
    "Access-Control-Allow-Methods": "DELETE, GET, OPTIONS, PATCH, POST, PUT",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  res.end();
}

function sendRedirect(res: http.ServerResponse, location: string, cookies: string[] = []): void {
  res.writeHead(303, {
    "Cache-Control": "no-store",
    Location: location,
    ...(cookies.length ? { "Set-Cookie": cookies } : {}),
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  res.end();
}

function serveAccessLogin(res: http.ServerResponse, hasError: boolean): void {
  const error = hasError ? `<p class="error">Invalid code.</p>` : "";
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <title>Agent Office</title>
    <style>
      :root {
        color: #172022;
        background: #f8fafc;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        min-width: 320px;
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      main {
        width: min(420px, 100%);
        border: 1px solid #d9e1e6;
        border-radius: 8px;
        background: #fff;
        padding: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 25px;
        line-height: 1.15;
      }
      p {
        margin: 0 0 18px;
        color: #697780;
        font-size: 15px;
        line-height: 1.35;
      }
      input {
        width: 100%;
        border: 1px solid #d9e1e6;
        border-radius: 8px;
        padding: 12px;
        color: #172022;
        font: inherit;
      }
      button {
        width: 100%;
        border: 0;
        border-radius: 8px;
        background: #0f766e;
        color: white;
        padding: 12px;
        margin-top: 10px;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }
      .error {
        border: 1px solid #f2bbb5;
        border-radius: 8px;
        background: #fff0ee;
        color: #9b2f28;
        padding: 10px;
        margin-bottom: 12px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Agent Office</h1>
      <p>Enter the access code to open the private Office.</p>
      ${error}
      <form method="post" action="/auth/login">
        <input autofocus name="code" placeholder="Access code" type="password" />
        <button type="submit">Enter</button>
      </form>
    </main>
  </body>
</html>`;
  res.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  res.end(body);
}

function serveStatic(res: http.ServerResponse, pathname: string): void {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(staticDir, normalized);

  if (!filePath.startsWith(staticDir)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(staticDir, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    const serverPath = path.relative(process.cwd(), path.dirname(fileURLToPath(import.meta.url)));
    sendJson(res, 404, {
      error: "Web build not found. Run npm run build:web before web:start.",
      serverPath,
      staticDir,
    });
    return;
  }

  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": body.length,
    "Content-Type": mimeType(filePath),
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  res.end(body);
}

function mimeType(filePath: string): string {
  const ext = path.extname(filePath);
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}
