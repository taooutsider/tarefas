import fs from "node:fs";
import path from "node:path";
import type { DispatchEnvelope, Mesh, ProjectRecord } from "./mesh.js";
import { getDispatchEnvelopes, listProjects } from "./mesh.js";

export type RoomAutonomyMode = "observe" | "suggest" | "execute";
export type RoomTaskRiskLevel = "low" | "medium" | "high";
export type RoomTaskExecutionMode = "auto" | "human-review";
export type RoomAction = "task.create" | "task.claim" | "task.release" | "task.suggest" | "mesh.help" | "mesh.dispatch" | "room.audit";
export type RoomTaskPriority = "urgent" | "high" | "normal" | "low";
export type RoomTaskStatus = "queued" | "claimed" | "running" | "review" | "blocked" | "done";
export type RoomAgentStatus = "live-thread" | "backend-only" | "virtual" | "paused";
export type ClaimStatus = "active" | "released" | "expired";
export type RoomAuditStatus = "live-thread" | "backend-only" | "paused" | "repair-needed";

const AUTONOMY_ORDER: Record<RoomAutonomyMode, number> = {
  observe: 0,
  suggest: 1,
  execute: 2,
};

const TASK_RISK_ORDER: Record<RoomTaskRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const TASK_PRIORITY_ORDER: Record<RoomTaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const ROOM_ACTIONS: RoomAction[] = [
  "mesh.help",
  "room.audit",
  "task.create",
  "task.release",
  "task.claim",
  "task.suggest",
  "mesh.dispatch",
];

const ROOM_DEFAULT_AUTONOMY_LIMITS = {
  maxParallelClaims: 3,
  maxDailyAutonomousRuns: 8,
};

const ACTION_MIN_AUTONOMY: Record<RoomAction, RoomAutonomyMode> = {
  "mesh.help": "observe",
  "room.audit": "suggest",
  "task.create": "observe",
  "task.release": "observe",
  "task.claim": "suggest",
  "task.suggest": "suggest",
  "mesh.dispatch": "execute",
};

const ROOM_DEFAULT_ACTION_POLICY: Record<string, RoomActionPolicyByAction> = {
  "build-room": {
    "task.create": { minAutonomy: "observe" },
    "task.claim": { minAutonomy: "execute" },
    "task.suggest": { minAutonomy: "suggest" },
    "mesh.dispatch": { minAutonomy: "execute" },
    "mesh.help": { minAutonomy: "observe" },
    "room.audit": { minAutonomy: "suggest" },
    "task.release": { minAutonomy: "observe" },
  },
  "research-intel-room": {
    "task.create": { minAutonomy: "observe" },
    "task.claim": { minAutonomy: "execute", maxTaskRiskLevel: "low" },
    "task.suggest": { minAutonomy: "suggest" },
    "mesh.dispatch": { minAutonomy: "suggest" },
    "mesh.help": { minAutonomy: "observe" },
    "room.audit": { minAutonomy: "suggest" },
    "task.release": { minAutonomy: "observe" },
  },
  "content-growth-room": {
    "task.create": { minAutonomy: "observe" },
    "task.claim": { minAutonomy: "execute", maxTaskRiskLevel: "low" },
    "task.suggest": { minAutonomy: "suggest" },
    "mesh.dispatch": { minAutonomy: "suggest" },
    "mesh.help": { minAutonomy: "observe" },
    "room.audit": { minAutonomy: "suggest" },
    "task.release": { minAutonomy: "observe" },
  },
};

const ROOM_ACTION_POLICY_FALLBACK: RoomActionPolicyByAction = {
  "task.create": { minAutonomy: ACTION_MIN_AUTONOMY["task.create"] },
  "task.claim": { minAutonomy: ACTION_MIN_AUTONOMY["task.claim"] },
  "task.release": { minAutonomy: ACTION_MIN_AUTONOMY["task.release"] },
  "task.suggest": { minAutonomy: ACTION_MIN_AUTONOMY["task.suggest"] },
  "mesh.help": { minAutonomy: ACTION_MIN_AUTONOMY["mesh.help"] },
  "mesh.dispatch": { minAutonomy: ACTION_MIN_AUTONOMY["mesh.dispatch"] },
  "room.audit": { minAutonomy: ACTION_MIN_AUTONOMY["room.audit"] },
};

export interface RoomActionPolicy {
  minAutonomy?: RoomAutonomyMode;
  maxTaskRiskLevel?: RoomTaskRiskLevel;
  disabled?: boolean;
}

export type RoomActionPolicyByAction = Partial<Record<RoomAction, RoomActionPolicy>>;

const ACTION_DESCRIPTION: Record<RoomAction, string> = {
  "mesh.help": "Enviar solicitações de contexto no Mesh sem acao de escrita.",
  "room.audit": "Rodar auditoria operacional e atualizar plano de reparo.",
  "task.create": "Registrar tarefas da fila (planejamento, revisao, contexto).",
  "task.release": "Liberar claim ou resetar trava de tarefa.",
  "task.claim": "Assumir tarefa do quarto e iniciar execucao planejada.",
  "task.suggest": "Sugerir tarefa para outra sala para especialização cruzada e evolução do time.",
  "mesh.dispatch": "Disparar mensagens da fila para threads ativas do Mesh.",
};

export interface AgentRoom {
  id: string;
  name: string;
  mission: string;
  leadAgentId: string;
  autonomyMode: RoomAutonomyMode;
  learningInitiativesEnabled?: boolean;
  capacity: {
    maxParallelClaims: number;
    maxDailyAutonomousRuns: number;
  };
  color: string;
  policy: string;
  acceptanceGates: string[];
  actionPolicy?: RoomActionPolicyByAction;
}

export interface RoomAgent {
  id: string;
  displayName: string;
  roomId: string;
  meshProjectId: string | null;
  role: string;
  scope: string;
  status: RoomAgentStatus;
  modelTier: "codex" | "frontier" | "mini" | "reviewer";
  skills: string[];
  allowedTools: string[];
  authority: string;
  activation: "active" | "standby" | "planned";
  autonomyScore: number;
  reliabilityScore: number;
  currentLoad: number;
  workspaceRoot: string | null;
  threadId: string | null;
}

export interface RoomTask {
  id: string;
  roomId: string;
  title: string;
  objective: string;
  status: RoomTaskStatus;
  priority: RoomTaskPriority;
  autonomyLevel: RoomAutonomyMode;
  assignedAgentId: string | null;
  claimId: string | null;
  target: string;
  dependencies: string[];
  acceptanceCriteria: string[];
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  riskLevel: RoomTaskRiskLevel;
  executionMode: RoomTaskExecutionMode;
  requiresHumanReview: boolean;
  riskSignals: string[];
  requestedBy: string | null;
  sourceRoomId: string | null;
  linkedTaskId: string | null;
}

export interface RoomClaim {
  id: string;
  roomId: string;
  taskId: string;
  agentId: string;
  target: string;
  status: ClaimStatus;
  reason: string;
  claimedAt: string;
  expiresAt: string;
  releasedAt?: string;
}

export interface RoomAgentAuditItem {
  projectId: string;
  roomId: string;
  roomName: string;
  agentId: string | null;
  displayName: string | null;
  status: RoomAuditStatus;
  threadId: string | null;
  workspaceRoot: string | null;
  reason: string;
  currentTask: string;
  lastSeen: string;
  observedAt: string | null;
  openDispatches: number;
  failedDispatches: number;
  recommendations: string[];
}

export interface RoomAuditSummary {
  totalProjects: number;
  liveThread: number;
  backendOnly: number;
  paused: number;
  repairNeeded: number;
}

export interface RoomAgentAuditReport {
  generatedAt: string;
  summary: RoomAuditSummary;
  items: RoomAgentAuditItem[];
}

export interface TomorrowPlanItem {
  id: string;
  sequence: number;
  roomId: string;
  ownerAgentId: string;
  title: string;
  outcome: string;
  risk: "low" | "medium" | "high";
  status: "ready" | "needs-input" | "blocked";
}

export interface AgentRoomsState {
  version: 1;
  generatedAt: string;
  controlRoot: string;
  rooms: AgentRoom[];
  agents: RoomAgent[];
  tasks: RoomTask[];
  claims: RoomClaim[];
  tomorrow: TomorrowPlanItem[];
  audit: RoomAgentAuditReport | null;
}

export interface CreateRoomTaskInput {
  roomId: string;
  title: string;
  objective: string;
  priority?: RoomTaskPriority;
  autonomyLevel?: RoomAutonomyMode;
  requestedBy?: string | null;
  riskLevel?: RoomTaskRiskLevel;
  executionMode?: RoomTaskExecutionMode;
  requiresHumanReview?: boolean;
  riskSignals?: string[];
  sourceRoomId?: string | null;
  linkedTaskId?: string | null;
  assignedAgentId?: string | null;
  target?: string;
  dependencies?: string[];
  acceptanceCriteria?: string[];
  dueDate?: string | null;
}

export interface SuggestRoomTaskInput {
  sourceTaskId: string;
  targetRoomId: string;
  title: string;
  objective: string;
  priority?: RoomTaskPriority;
  autonomyLevel?: RoomAutonomyMode;
  dueDate?: string | null;
}

export interface RoomActionGateResult {
  action: RoomAction;
  roomId: string;
  roomName: string;
  actionDescription: string;
  requestedMode: RoomAutonomyMode;
  effectiveMode: RoomAutonomyMode;
  taskId?: string;
  allowed: boolean;
  reason: string;
  blockers: string[];
}

export interface UpdateRoomAutonomyInput {
  roomId: string;
  autonomyMode?: RoomAutonomyMode;
  learningInitiativesEnabled?: boolean;
  capacity?: Partial<AgentRoom["capacity"]>;
  actionPolicy?: Partial<Record<RoomAction, RoomActionPolicy>>;
}

interface RoomTaskRiskProfile {
  riskLevel: RoomTaskRiskLevel;
  executionMode: RoomTaskExecutionMode;
  requiresHumanReview: boolean;
  riskSignals: string[];
}

export interface ClaimRoomTaskInput {
  agentId: string;
  target?: string;
  reason?: string;
  leaseMinutes?: number;
}

export interface RoomAutonomyRunInput {
  targetRoomId?: string | null;
  maxTasksPerRoom?: number;
  maxTasksTotal?: number;
  allowSuggestions?: boolean;
  allowLearningInitiatives?: boolean;
  now?: string | Date;
  dryRun?: boolean;
}

export interface RoomAutonomyRunRecord {
  taskId: string;
  roomId: string;
  status: "executed" | "skipped";
  reason?: string;
  agentId?: string;
}

export interface RoomAutonomyRunEvent {
  id: string;
  kind:
    | "task.executed"
    | "task.skipped"
    | "task.suggested"
    | "initiative.created"
    | "cycle.completed";
  roomId: string;
  targetRoomId?: string;
  taskId: string;
  status: string;
  reason?: string;
  agentId?: string;
  createdAt: string;
  mode: RoomAutonomyRunMode;
}

export interface RoomAutonomyRunResult {
  triggeredAt: string;
  targetRoomId: string | null;
  executed: RoomAutonomyRunRecord[];
  skipped: RoomAutonomyRunRecord[];
  suggestionsCreated: number;
  suggestions: string[];
  initiativesCreated: number;
  initiatives: string[];
  events: RoomAutonomyRunEvent[];
  mode: RoomAutonomyRunMode;
}

export type RoomAutonomyRunMode = "execute" | "simulate";

export interface RoomAutonomyRunOutput {
  state: AgentRoomsState;
  run: RoomAutonomyRunResult;
}

type RoomTaskGateContext = Pick<RoomTask, "id" | "autonomyLevel"> &
  Partial<Pick<RoomTask, "riskLevel" | "executionMode" | "requiresHumanReview" | "status">>;

const CONTROL_DIR = "control";
const ROOMS_FILE = "rooms.json";
const AGENTS_FILE = "agents.json";
const TASKS_FILE = "tasks.json";
const CLAIMS_FILE = "claims.json";
const TOMORROW_FILE = "tomorrow.json";
const AUDIT_FILE = "audits/latest.json";
const HEARTBEAT_STALE_MS = 8 * 60 * 60 * 1000;
const AUTONOMY_DEFAULT_TASKS_PER_ROOM = 2;
const AUTONOMY_DEFAULT_TOTAL_TASKS = 8;
const AUTONOMY_LEARNING_INITIATIVE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const HIGH_RISK_PATTERNS: RegExp[] = [
  /\btransfer\b/i,
  /\bwallet\b/i,
  /\btrade\b/i,
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bswap\b/i,
  /\bstake\b/i,
  /\bstaking\b/i,
  /\bregister\b/i,
  /\bderegister\b/i,
  /\bwithdraw\b/i,
  /\bdeposit\b/i,
  /\bfunds\b/i,
  /\bpayment\b/i,
  /\bbilling\b/i,
  /\bprivate key\b/i,
  /\bapi\s*key\b/i,
  /\bdeploy\b/i,
  /\bdelete\b/i,
  /\bremove\b/i,
  /\buninstall\b/i,
];

const MEDIUM_RISK_PATTERNS: RegExp[] = [
  /\bpublish\b/i,
  /\bdistribute\b/i,
  /\bannounce\b/i,
  /\bexternal\b/i,
  /\brelease\b/i,
  /\bpost\b/i,
];

interface RoomsAuditHeartbeat {
  projectId: string;
  status: string;
  last_seen: string;
  observed_at: string;
  current_task: string;
  open_dispatches: number;
}

type AgentRoomsFile = {
  rooms?: unknown;
};

export function canRunRoomAction(
  room: AgentRoom,
  action: RoomAction,
  options: {
    task?: RoomTaskGateContext;
    activeClaims?: number;
    dailyClaims?: number;
  } = {},
): RoomActionGateResult {
  const policy = room.actionPolicy?.[action];
  const requiredMode = policy?.minAutonomy ?? ACTION_MIN_AUTONOMY[action];
  const taskMode = options.task?.autonomyLevel;
  const effectiveMode = chooseActionMode(room.autonomyMode, taskMode);
  const requiresHumanReview = Boolean(
    options.task?.requiresHumanReview || options.task?.executionMode === "human-review",
  );
  const taskRiskLevel = options.task?.riskLevel ?? "low";
  const taskStatus = options.task?.status;

  const blockers: string[] = [];

  if (policy?.disabled) {
    blockers.push(`Action ${action} is disabled for room ${room.name}.`);
  }

  if (taskMode && AUTONOMY_ORDER[taskMode] > AUTONOMY_ORDER[room.autonomyMode]) {
    blockers.push(
      `Task autonomy (${taskMode.toUpperCase()}) cannot exceed room autonomy (${room.autonomyMode.toUpperCase()}).`,
    );
  }

  const hasMinAutonomy = AUTONOMY_ORDER[effectiveMode] >= AUTONOMY_ORDER[requiredMode];

  if (!hasMinAutonomy) {
    blockers.push(
      `Acao ${action} exige modo ${requiredMode.toUpperCase()} mas a tarefa/sala esta em ${effectiveMode.toUpperCase()}.`,
    );
  }

  if (action === "task.claim") {
    if (
      policy?.maxTaskRiskLevel &&
      TASK_RISK_ORDER[taskRiskLevel] > TASK_RISK_ORDER[policy.maxTaskRiskLevel]
    ) {
      blockers.push(
        `Room policy for task.claim blocks risk level ${taskRiskLevel.toUpperCase()} (max allowed: ${policy.maxTaskRiskLevel.toUpperCase()}).`,
      );
    }

    if (taskStatus && ["running", "review", "blocked", "done"].includes(taskStatus)) {
      blockers.push(`Task claim not allowed for status ${taskStatus.toUpperCase()}.`);
    }
    if (taskRiskLevel === "high") {
      blockers.push("High-risk tasks require human review before execution.");
    }
    if (requiresHumanReview) {
      blockers.push("Task requires human review and cannot be claimed for autonomous execution.");
    }

    const activeClaims = options.activeClaims ?? 0;
    if (activeClaims >= room.capacity.maxParallelClaims) {
      blockers.push(`Trava de paralelismo: limite de ${room.capacity.maxParallelClaims} claims ativos atingido.`);
    }

    const dailyClaims = options.dailyClaims ?? 0;
    if (effectiveMode === "execute" && dailyClaims >= room.capacity.maxDailyAutonomousRuns) {
      blockers.push(`Limite diario da sala atingido (${room.capacity.maxDailyAutonomousRuns} claims).`);
    }
  }

  if (action === "task.suggest") {
    if (
      policy?.maxTaskRiskLevel &&
      TASK_RISK_ORDER[taskRiskLevel] > TASK_RISK_ORDER[policy.maxTaskRiskLevel]
    ) {
      blockers.push(
        `Room policy for task.suggest blocks risk level ${taskRiskLevel.toUpperCase()} (max allowed: ${policy.maxTaskRiskLevel.toUpperCase()}).`,
      );
    }
  }

  return {
    action,
    roomId: room.id,
    roomName: room.name,
    actionDescription: ACTION_DESCRIPTION[action],
    requestedMode: requiredMode,
    effectiveMode,
    taskId: options.task?.id,
    allowed: blockers.length === 0,
    reason: blockers.length ? blockers.join(" ") : "Acao permitida pela governanca da sala.",
    blockers,
  };
}

export function runAutonomousRoomEngine(mesh: Mesh, input: RoomAutonomyRunInput = {}): RoomAutonomyRunOutput {
  return runAutonomousRoomEngineInternal(mesh, input, {
    dryRun: input.dryRun === true ? true : false,
    mode: input.dryRun ? "simulate" : "execute",
    persist: input.dryRun !== true,
  });
}

export function runAutonomousRoomEngineSimulation(
  mesh: Mesh,
  input: RoomAutonomyRunInput = {},
): RoomAutonomyRunOutput {
  return runAutonomousRoomEngineInternal(mesh, { ...input, dryRun: true }, {
    dryRun: true,
    mode: "simulate",
    persist: false,
  });
}

function runAutonomousRoomEngineInternal(
  mesh: Mesh,
  input: RoomAutonomyRunInput,
  options: { dryRun: boolean; mode: RoomAutonomyRunMode; persist: boolean },
): RoomAutonomyRunOutput {
  const now = input.now ? new Date(input.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error(`Invalid run timestamp: ${input.now}`);
  }

  const state = options.persist ? getAgentRoomsState(mesh) : structuredClone(getAgentRoomsState(mesh));
  const targetRoomId = input.targetRoomId?.trim() || null;
  const maxTasksPerRoom = Math.max(1, input.maxTasksPerRoom ?? AUTONOMY_DEFAULT_TASKS_PER_ROOM);
  const maxTasksTotal = Math.max(1, input.maxTasksTotal ?? AUTONOMY_DEFAULT_TOTAL_TASKS);
  const allowSuggestions = input.allowSuggestions !== false;
  const allowLearningInitiatives = input.allowLearningInitiatives !== false;
  const mode = options.mode;

  const nextTasks = [...state.tasks];
  const nextClaims = [...state.claims];
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  const events: RoomAutonomyRunEvent[] = [];
  const createAutonomyEvent = (event: Omit<RoomAutonomyRunEvent, "createdAt" | "mode" | "id">): void => {
    events.push({
      ...event,
      createdAt: nowIso,
      mode,
      id: makeId("auto-run"),
    });
  };

  const taskIndex = new Map(nextTasks.map((task) => [task.id, task]));
  const activeClaimsByRoom = new Map(
    (state.rooms as Array<{id: string}>).map((room: {id: string}) => [room.id, countActiveClaimsForRoom(nextClaims, room.id)]),
  );
  const dailyClaimsByRoom = new Map(
    (state.rooms as Array<{id: string}>).map((room: {id: string}) => [room.id, countRecentClaimsForRoom(nextClaims, room.id, nowMs)]),
  );

  const roomAgentsById = new Map(
    (state.rooms as Array<{id: string}>).map((room: {id: string}) => [
      room.id,
      state.agents
        .filter((agent) => agent.roomId === room.id && agent.status !== "paused")
        .sort(
          (a, b) =>
            b.reliabilityScore - a.reliabilityScore ||
            b.autonomyScore - a.autonomyScore ||
            a.displayName.localeCompare(b.displayName),
        ),
    ]),
  );

  const executed: RoomAutonomyRunRecord[] = [];
  const skipped: RoomAutonomyRunRecord[] = [];
  const suggestionIds: string[] = [];
  const initiativeIds: string[] = [];
  let executedCount = 0;

  const createLearningInitiative = (task: RoomTask, sourceRoom: AgentRoom, reason: string) => {
    if (!allowLearningInitiatives || sourceRoom.learningInitiativesEnabled === false) {
      return;
    }

    const initiative = createAutonomyLearningInitiative(
      task,
      sourceRoom,
      nextTasks,
      state.rooms,
      state.agents,
      reason,
      nowMs,
    );
      if (initiative) {
        nextTasks.push(initiative);
        initiativeIds.push(initiative.id);
        taskIndex.set(initiative.id, initiative);
        createAutonomyEvent({
          kind: "initiative.created",
          roomId: sourceRoom.id,
          targetRoomId: initiative.roomId,
          taskId: initiative.id,
          status: "created",
          reason: `Learning initiative created from ${sourceRoom.name}: ${initiative.title}`,
        });
      }
  };

  const createSuggestion = (task: RoomTask, sourceRoom: AgentRoom) => {
    if (!allowSuggestions) {
      return;
    }

    const suggestion = createAutonomyInitiativeSuggestion(task, sourceRoom, nextTasks, state.rooms, state.agents, nowMs);
      if (suggestion) {
        nextTasks.push(suggestion);
        suggestionIds.push(suggestion.id);
        taskIndex.set(suggestion.id, suggestion);
        createAutonomyEvent({
          kind: "task.suggested",
          roomId: sourceRoom.id,
          targetRoomId: suggestion.roomId,
          taskId: suggestion.id,
          status: "created",
          reason: `Cross-room initiative suggestion for ${suggestion.title}`,
        });
      }
  };

  const roomsToRun = state.rooms
    .filter((room) => room.autonomyMode === "execute")
    .filter((room) => !targetRoomId || room.id === targetRoomId);

  for (const room of roomsToRun) {
    const roomTasks = roomQueuedTasks(nextTasks, room.id);
    const availableAgents = (roomAgentsById.get(room.id) ?? []) as Array<any>;
    const roomGate = canRunRoomAction(room, "task.claim");

    const initialActiveClaims = (activeClaimsByRoom.get(room.id) ?? 0) as number;
    const initialDailyClaims = (dailyClaimsByRoom.get(room.id) ?? 0) as number;
    const maxParallelSlots = Math.max(0, room.capacity.maxParallelClaims - initialActiveClaims);

    let claimedThisCycle = 0;
    let executedThisRoom = 0;
    let activeSlots = maxParallelSlots;

    if (!roomGate.allowed) {
      for (const task of roomTasks.slice(0, maxTasksPerRoom)) {
        const reason = roomGate.reason;
        skipped.push({ taskId: task.id, roomId: room.id, status: "skipped", reason });
        createAutonomyEvent({
          kind: "task.skipped",
          roomId: room.id,
          taskId: task.id,
          status: "skipped",
          reason,
        });
        createLearningInitiative(task, room, `Room gate blocked: ${roomGate.reason}`);
      }

      continue;
    }

    let roomRunCount = 0;

    for (const task of roomTasks) {
      if (executedCount >= maxTasksTotal) {
        break;
      }

      if (roomRunCount >= maxTasksPerRoom) {
        break;
      }

      const gateInput = {
        task,
        activeClaims: initialActiveClaims + claimedThisCycle,
        dailyClaims: initialDailyClaims + claimedThisCycle,
      };

      const claimGate = canRunRoomAction(room, "task.claim", gateInput);
      const dependencyCheck = unmetDependencies(task, taskIndex);

      if (dependencyCheck.length > 0) {
        const reason = `Dependencies not met: ${dependencyCheck.join(", ")}`;
        skipped.push({
          taskId: task.id,
          roomId: room.id,
          status: "skipped",
          reason,
        });
        createAutonomyEvent({
          kind: "task.skipped",
          roomId: room.id,
          taskId: task.id,
          status: "skipped",
          reason,
        });
        createLearningInitiative(task, room, reason);
        continue;
      }

      if (!claimGate.allowed) {
        const reason = claimGate.reason;
        skipped.push({ taskId: task.id, roomId: room.id, status: "skipped", reason });
        createAutonomyEvent({
          kind: "task.skipped",
          roomId: room.id,
          taskId: task.id,
          status: "skipped",
          reason,
        });
        createLearningInitiative(task, room, `Claim gate blocked: ${reason}`);
        continue;
      }

      if (task.executionMode === "human-review" || task.requiresHumanReview || task.riskLevel === "high") {
        const reason = "Risk policy requires human review.";
        skipped.push({ taskId: task.id, roomId: room.id, status: "skipped", reason });
        createAutonomyEvent({
          kind: "task.skipped",
          roomId: room.id,
          taskId: task.id,
          status: "skipped",
          reason,
        });
        createLearningInitiative(task, room, `Risk block: ${reason}`);
        continue;
      }

      if (activeSlots <= 0 || executedThisRoom >= maxTasksPerRoom || (initialDailyClaims + claimedThisCycle) >= room.capacity.maxDailyAutonomousRuns) {
        const reason = "Room autonomous limits reached for this cycle.";
        skipped.push({
          taskId: task.id,
          roomId: room.id,
          status: "skipped",
          reason,
        });
        createAutonomyEvent({
          kind: "task.skipped",
          roomId: room.id,
          taskId: task.id,
          status: "skipped",
          reason,
        });
        createLearningInitiative(task, room, reason);
        continue;
      }

      if (!availableAgents.length) {
        const reason = "No available agent in room.";
        skipped.push({ taskId: task.id, roomId: room.id, status: "skipped", reason });
        createAutonomyEvent({
          kind: "task.skipped",
          roomId: room.id,
          taskId: task.id,
          status: "skipped",
          reason,
        });
        createLearningInitiative(task, room, `Resource block: ${reason}`);
        continue;
      }

      const agent = availableAgents[0];
      const claim: RoomClaim = {
        id: makeId("claim"),
        roomId: room.id,
        taskId: task.id,
        agentId: agent.id,
        target: task.target,
        status: "active",
        reason: `Autonomous claim for ${task.title}`,
        claimedAt: nowIso,
        expiresAt: new Date(nowMs + 90 * 60_000).toISOString(),
      };

      const running = {
        ...task,
        status: "running" as const,
        assignedAgentId: agent.id,
        claimId: claim.id,
        updatedAt: nowIso,
      };

      const done = {
        ...running,
        status: "done" as const,
        updatedAt: nowIso,
      };
      const releasedClaim: RoomClaim = {
        ...claim,
        status: "released",
        reason: `Completed autonomously by ${agent.displayName}.`,
        releasedAt: nowIso,
      };

      const taskPosition = nextTasks.findIndex((item) => item.id === task.id);
      if (taskPosition === -1) {
        const reason = "Task vanished during run.";
        skipped.push({ taskId: task.id, roomId: room.id, status: "skipped", reason });
        createAutonomyEvent({
          kind: "task.skipped",
          roomId: room.id,
          taskId: task.id,
          status: "skipped",
          reason,
        });
        createLearningInitiative(task, room, reason);
        continue;
      }

      nextClaims.push(releasedClaim);
      nextTasks[taskPosition] = {
        ...done,
        assignedAgentId: agent.id,
        claimId: null,
      };
      taskIndex.set(task.id, nextTasks[taskPosition]);
      dailyClaimsByRoom.set(room.id, (dailyClaimsByRoom.get(room.id) ?? 0) + 1);

      executed.push({
        taskId: task.id,
        roomId: room.id,
        status: "executed",
        agentId: agent.id,
      });
      createAutonomyEvent({
        kind: "task.executed",
        roomId: room.id,
        taskId: task.id,
        status: "executed",
        agentId: agent.id,
        reason: `Task completed by ${agent.displayName}`,
      });

      executedCount += 1;
      roomRunCount += 1;
      claimedThisCycle += 1;
      executedThisRoom += 1;
      activeSlots = Math.max(0, activeSlots - 1);

      createSuggestion(task, room);
    }
  }

  const cycleTaskId = makeId("cycle");
  createAutonomyEvent({
    kind: "cycle.completed",
    roomId: targetRoomId ?? "global",
    taskId: cycleTaskId,
    status: "completed",
    reason: `Autonomy cycle completed: executed ${executed.length}, skipped ${skipped.length}.`,
  });

  if (options.persist) {
    writeJsonFile(controlPath(mesh, CLAIMS_FILE), nextClaims);
    writeJsonFile(controlPath(mesh, TASKS_FILE), nextTasks);
    appendRunLog(mesh, {
      type: "autonomous_room_cycle",
      triggeredAt: nowIso,
      targetRoomId,
      mode,
      executedCount,
      skippedCount: skipped.length,
      suggestionsCreated: suggestionIds.length,
      initiativesCreated: initiativeIds.length,
      initiatives: initiativeIds,
    });
  }

  const refreshedState = options.persist ? getAgentRoomsState(mesh) : state;
  return {
    state: refreshedState,
    run: {
      triggeredAt: nowIso,
      targetRoomId,
      executed,
      skipped,
      suggestionsCreated: suggestionIds.length,
      suggestions: suggestionIds,
      initiativesCreated: initiativeIds.length,
      initiatives: initiativeIds,
      events,
      mode,
    },
  };
}

function roomQueuedTasks(tasks: RoomTask[], roomId: string): RoomTask[] {
  return tasks
    .filter((task) => task.roomId === roomId && task.status === "queued")
    .sort((a, b) => {
      const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
      if (byPriority !== 0) {
        return byPriority;
      }

      const dueA = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
      const dueB = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
      if (dueA !== dueB) {
        return dueA - dueB;
      }

      return a.createdAt.localeCompare(b.createdAt);
    });
}

function priorityRank(priority: RoomTask["priority"]) {
  return {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  }[priority];
}

function unmetDependencies(task: RoomTask, taskById: Map<string, RoomTask>): string[] {
  const duplicates = new Set<string>();

  return [...new Set(task.dependencies)]
    .filter((dependencyId) => dependencyId.trim().length > 0)
    .filter((dependencyId) => {
      if (duplicates.has(dependencyId)) {
        return false;
      }

      duplicates.add(dependencyId);
      const dependency = taskById.get(dependencyId);
      return !dependency || dependency.status !== "done";
    });
}

function createAutonomyInitiativeSuggestion(
  sourceTask: RoomTask,
  sourceRoom: AgentRoom,
  tasks: RoomTask[],
  rooms: AgentRoom[],
  agents: RoomAgent[],
  nowMs: number,
): RoomTask | null {
  if (sourceTask.riskLevel === "high" || sourceTask.executionMode === "human-review" || sourceTask.requiresHumanReview) {
    return null;
  }

  const targetRoom = chooseTargetRoomForInitiative(sourceRoom.id, rooms);
  if (!targetRoom) {
    return null;
  }

  const hasRecentInitiative = hasRecentRelatedTask(tasks, {
    sourceTaskId: sourceTask.id,
    sourceRoomId: sourceRoom.id,
    targetRoomId: targetRoom.id,
    nowMs,
  });
  if (hasRecentInitiative) {
    return null;
  }

  const lead = agents
    .filter((agent) => agent.roomId === targetRoom.id && agent.status !== "paused")
    .sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0] ?? null;

  return normalizeRoomTask({
    id: makeId("suggestion"),
    roomId: targetRoom.id,
    title: `Cross-room follow-up from ${sourceRoom.name}`,
    objective:
      `Cross-room follow-up for ${sourceTask.title} (${sourceTask.id}).\n\n` +
      `${sourceRoom.name} completed this task autonomously. Validate assumptions and report one practical recommendation ` +
      `for execution risk, blockers, and next action.`,
    status: "queued",
    priority: "normal",
    autonomyLevel: "suggest",
    assignedAgentId: lead?.id ?? null,
    target: `Follow-up for ${sourceTask.id}`,
    dependencies: [sourceTask.id],
    acceptanceCriteria: [
      `Validate result assumptions from ${sourceRoom.name}`,
      "Identify blockers and mitigation risks",
      "Add one actionable next step with owner",
    ],
    executionMode: "auto",
    requiresHumanReview: false,
    riskLevel: "low",
    riskSignals: ["cross-room", sourceTask.id, "autonomy-initiative"],
    requestedBy: `Autonomy initiative from ${sourceTask.id}`,
    sourceRoomId: sourceRoom.id,
    linkedTaskId: sourceTask.id,
  });
}

function createAutonomyLearningInitiative(
  sourceTask: RoomTask,
  sourceRoom: AgentRoom,
  tasks: RoomTask[],
  rooms: AgentRoom[],
  agents: RoomAgent[],
  reason: string,
  nowMs: number,
): RoomTask | null {
  const targetRoom = chooseTargetRoomForInitiative(sourceRoom.id, rooms);
  if (!targetRoom) {
    return null;
  }

  const hasRecentInitiative = hasRecentRelatedTask(tasks, {
    sourceTaskId: sourceTask.id,
    sourceRoomId: sourceRoom.id,
    targetRoomId: targetRoom.id,
    nowMs,
  });
  if (hasRecentInitiative) {
    return null;
  }

  const lead = agents
    .filter((agent) => agent.roomId === targetRoom.id && agent.status !== "paused")
    .sort((a, b) => b.reliabilityScore - a.autonomyScore || a.displayName.localeCompare(b.displayName))[0] ?? null;

  return normalizeRoomTask({
    id: makeId("initiative"),
    roomId: targetRoom.id,
    title: `Learning initiative from ${sourceRoom.name}`,
    objective:
      `Safe learning initiative for ${sourceTask.title} (${sourceTask.id}).\n\n` +
      `Task is currently blocked because: ${reason.trim().toLowerCase().replace(/[.!]$/, "")}.\n\n` +
      `Investigate source task assumptions, gather the minimum-safe alternatives, and return one concrete recommendation ` +
      `that can be executed with autonomous authority only if risk remains low.`,
    status: "queued",
    priority: "normal",
    autonomyLevel: "suggest",
    assignedAgentId: lead?.id ?? null,
    target: `Learning for ${sourceTask.id}`,
    dependencies: [sourceTask.id],
    acceptanceCriteria: [
      `Map the exact blocker reason from ${sourceTask.id}`,
      "Propose one safe mitigation with evidence or source reference",
      "Define if any manual/finance approval is required before execution",
    ],
    executionMode: "auto",
    requiresHumanReview: false,
    riskLevel: "low",
    riskSignals: ["learning", sourceTask.id, "autonomy-learning-initiative"],
    requestedBy: `Autonomy learning initiative from ${sourceTask.id}`,
    sourceRoomId: sourceRoom.id,
    linkedTaskId: sourceTask.id,
  });
}

function chooseTargetRoomForInitiative(sourceRoomId: string, rooms: AgentRoom[]): AgentRoom | null {
  return (
    rooms.find((room) => room.id !== sourceRoomId && room.autonomyMode !== "observe") ??
    rooms.find((room) => room.id !== sourceRoomId) ??
    rooms.find((room) => room.id === sourceRoomId) ??
    null
  );
}

function hasRecentRelatedTask(
  tasks: RoomTask[],
  input: {
    sourceTaskId: string;
    sourceRoomId: string;
    targetRoomId: string;
    nowMs: number;
  },
): boolean {
  const threshold = input.nowMs - AUTONOMY_LEARNING_INITIATIVE_COOLDOWN_MS;
  return tasks.some((task) => {
    if (
      task.sourceRoomId !== input.sourceRoomId ||
      task.linkedTaskId !== input.sourceTaskId ||
      task.roomId !== input.targetRoomId
    ) {
      return false;
    }

    const createdAt = Date.parse(task.createdAt);
    return Number.isFinite(createdAt) && createdAt >= threshold;
  });
}

function chooseTaskAutonomy(input: {
  roomAutonomy: RoomAutonomyMode;
  requestedAutonomy?: RoomAutonomyMode;
  requestedRiskLevel: RoomTaskRiskLevel;
  requestedRequiresHumanReview: boolean;
  requestedExecutionMode: RoomTaskExecutionMode;
}): RoomAutonomyMode {
  if (
    input.requestedExecutionMode === "human-review" ||
    input.requestedRequiresHumanReview ||
    input.requestedRiskLevel === "high"
  ) {
    return input.requestedAutonomy && input.requestedAutonomy !== "execute" ? input.requestedAutonomy : "suggest";
  }

  return input.requestedAutonomy ?? input.roomAutonomy;
}

function classifyRoomTaskRisk(input: {
  title: string;
  objective: string;
  target?: string;
  acceptanceCriteria?: string[];
  riskSignals?: string[];
}): RoomTaskRiskProfile {
  const text = normalizeText([input.title, input.objective, input.target, ...(input.acceptanceCriteria ?? []), ...(input.riskSignals ?? [])]);
  const highSignals = collectSignals(text, HIGH_RISK_PATTERNS);
  const mediumSignals = collectSignals(text, MEDIUM_RISK_PATTERNS);

  if (highSignals.length) {
    return {
      riskLevel: "high",
      requiresHumanReview: true,
      executionMode: "human-review",
      riskSignals: highSignals,
    };
  }

  if (mediumSignals.length) {
    return {
      riskLevel: "medium",
      requiresHumanReview: false,
      executionMode: "auto",
      riskSignals: mediumSignals,
    };
  }

  return {
    riskLevel: "low",
    requiresHumanReview: false,
    executionMode: "auto",
    riskSignals: [],
  };
}

function collectSignals(text: string, patterns: RegExp[]): string[] {
  return patterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replace(/\\b/g, "").trim())
    .filter((signal, index, list) => list.indexOf(signal) === index);
}

function normalizeStrings(values?: string[]): string[] {
  return (values ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function normalizeRoomTask(input: Partial<RoomTask>): RoomTask {
  const now = new Date().toISOString();
  const textRiskProfile = classifyRoomTaskRisk({
    title: input.title ?? "",
    objective: input.objective ?? "",
    target: input.target,
    acceptanceCriteria: input.acceptanceCriteria,
    riskSignals: input.riskSignals,
  });

  const requestedRiskLevel = input.riskLevel ?? textRiskProfile.riskLevel;
  const requestedExecutionMode = input.executionMode
    ?? (input.requiresHumanReview ? "human-review" : textRiskProfile.executionMode);
  const requiresHumanReview = Boolean(
    input.requiresHumanReview ??
      (textRiskProfile.requiresHumanReview || requestedRiskLevel === "high"),
  );

  return {
    id: requiredText(input.id ?? "", "id"),
    roomId: requiredText(input.roomId ?? "", "roomId"),
    title: input.title ?? "Untitled task",
    objective: input.objective ?? "No objective",
    status: input.status ?? "queued",
    priority: input.priority ?? "normal",
    autonomyLevel: chooseTaskAutonomy({
      roomAutonomy: input.autonomyLevel ?? "observe",
      requestedAutonomy: input.autonomyLevel,
      requestedRiskLevel,
      requestedRequiresHumanReview: requiresHumanReview,
      requestedExecutionMode,
    }),
    assignedAgentId: input.assignedAgentId ?? null,
    claimId: input.claimId ?? null,
    target: input.target ?? "unscoped",
    dependencies: normalizeStrings(input.dependencies),
    acceptanceCriteria: normalizeStrings(input.acceptanceCriteria),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    dueDate: input.dueDate ?? null,
    riskLevel: requestedRiskLevel,
    executionMode: requestedExecutionMode,
    requiresHumanReview,
    riskSignals: normalizeStrings([...(textRiskProfile.riskSignals ?? []), ...(input.riskSignals ?? [])]),
    requestedBy: input.requestedBy ?? null,
    sourceRoomId: input.sourceRoomId ?? null,
    linkedTaskId: input.linkedTaskId ?? null,
  };
}

function normalizeText(values: Array<string | undefined>): string {
  return values
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim().toLowerCase())
    .join(" ")
    .replace(/\s+/g, " ");
}

function chooseActionMode(roomMode: RoomAutonomyMode, taskMode?: RoomAutonomyMode): RoomAutonomyMode {
  if (!taskMode) {
    return roomMode;
  }

  if (AUTONOMY_ORDER[taskMode] >= AUTONOMY_ORDER[roomMode]) {
    return roomMode;
  }

  return taskMode;
}

function countActiveClaimsForRoom(claims: RoomClaim[], roomId: string): number {
  return claims.filter((claim) => claim.roomId === roomId && claim.status === "active").length;
}

function countRecentClaimsForRoom(claims: RoomClaim[], roomId: string, nowMs = Date.now()): number {
  const dayAgo = nowMs - 24 * 60 * 60 * 1000;
  return claims.filter((claim) => {
    const claimedAt = Date.parse(claim.claimedAt);
    return claim.roomId === roomId && !Number.isNaN(claimedAt) && claimedAt >= dayAgo;
  }).length;
}

export function runAgentAudit(mesh: Mesh, options: { projects?: ProjectRecord[]; roomAgents?: RoomAgent[] } = {}): RoomAgentAuditReport {
  const projects = options.projects?.length ? options.projects : listProjects(mesh);
  const rawAgents = options.roomAgents ?? readJsonFile<RoomAgent[]>(controlPath(mesh, AGENTS_FILE), []);
  const agents = syncProjectSignals(mesh, rawAgents, projects);
  const projectAgents = agents.reduce<Map<string, RoomAgent>>((acc, agent) => {
    if (!agent.meshProjectId || acc.has(agent.meshProjectId)) {
      return acc;
    }

    acc.set(agent.meshProjectId, agent);
    return acc;
  }, new Map());

  const dispatches = getDispatchEnvelopes(mesh);
  const dispatchesByProject = indexDispatchesByProject(dispatches);
  const now = Date.now();
  const items = projects.map((project) => {
    const heartbeat = readHeartbeat(mesh, project.id);
    const byProjectDispatches = dispatchesByProject.get(project.id) ?? [];
    const openDispatches = byProjectDispatches.filter((dispatch) => dispatch.status === "pending" || dispatch.status === "sent");
    const failedDispatches = byProjectDispatches.filter((dispatch) => dispatch.status === "failed");
    const lastDispatch = latestDispatch(byProjectDispatches);
    const projectAgent = projectAgents.get(project.id) ?? null;
    const staleHeartbeat = !heartbeat || isStaleHeartbeat(heartbeat.last_seen, now);

    if (project.status !== "active") {
      return buildAuditItem(project, projectAgent, "paused", heartbeat, {
        openDispatches,
        failedDispatches,
        lastDispatch,
        reason: `Project marked ${project.status} in registry.`,
        staleHeartbeat,
      });
    }

    if (!project.threadId) {
      return buildAuditItem(project, projectAgent, "backend-only", heartbeat, {
        openDispatches,
        failedDispatches,
        lastDispatch,
        reason: "No threadId in registry. Can send/receive via control messages but has no Mesh thread yet.",
        staleHeartbeat,
      });
    }

    if (heartbeat && staleHeartbeat) {
      return buildAuditItem(project, projectAgent, "repair-needed", heartbeat, {
        openDispatches,
        failedDispatches,
        lastDispatch,
        reason: "Heartbeat is stale for a live-thread project.",
        staleHeartbeat,
      });
    }

    if (failedDispatches.length) {
      return buildAuditItem(project, projectAgent, "repair-needed", heartbeat, {
        openDispatches,
        failedDispatches,
        lastDispatch,
        reason: "Recent dispatch failures indicate routing instability.",
        staleHeartbeat,
      });
    }

    if (!heartbeat) {
      return buildAuditItem(project, projectAgent, "repair-needed", heartbeat, {
        openDispatches,
        failedDispatches,
        lastDispatch,
        reason: "Project is active and thread-linked but has no local heartbeat file yet.",
        staleHeartbeat,
      });
    }

    return buildAuditItem(project, projectAgent, "live-thread", heartbeat, {
      openDispatches,
      failedDispatches,
      lastDispatch,
      reason: project.threadId ? "Heartbeat is active and task flow is progressing." : "No live signal found.",
      staleHeartbeat,
    });
  });

  const summary = summarizeAudit(items);
  const report: RoomAgentAuditReport = {
    generatedAt: new Date().toISOString(),
    summary,
    items,
  };

  writeJsonFile(controlPath(mesh, AUDIT_FILE), report);
  appendRunLog(mesh, {
    type: "agent_audit",
    generatedAt: report.generatedAt,
    projectCount: summary.totalProjects,
    liveThread: summary.liveThread,
    repairNeeded: summary.repairNeeded,
  });

  return report;
}

export function getLatestAgentAudit(mesh: Mesh): RoomAgentAuditReport | null {
  return readJsonFileNullable<RoomAgentAuditReport>(controlPath(mesh, AUDIT_FILE), null);
}

export function getAgentRoomsState(mesh: Mesh, projects: ProjectRecord[] = []): AgentRoomsState {
  ensureControlFiles(mesh, projects);
  const rooms = normalizeRoomConfigFile(
    readJsonFile<AgentRoomsFile>(controlPath(mesh, ROOMS_FILE), { rooms: seedRooms() }),
  ).map((room) => normalizeRoomConfig(room));
  const agents = syncProjectSignals(mesh, readJsonFile<RoomAgent[]>(controlPath(mesh, AGENTS_FILE), []), projects);
  const claims = expireClaims(readJsonFile<RoomClaim[]>(controlPath(mesh, CLAIMS_FILE), []));
  const tasks = syncTaskClaimState(
    readJsonFile<RoomTask[]>(controlPath(mesh, TASKS_FILE), []).map(normalizeRoomTask),
    claims,
  );
  const tomorrow = readJsonFile<TomorrowPlanItem[]>(controlPath(mesh, TOMORROW_FILE), []);
  const audit = getLatestAgentAudit(mesh);

  writeJsonIfChanged(controlPath(mesh, ROOMS_FILE), rooms);
  writeJsonIfChanged(controlPath(mesh, AGENTS_FILE), agents);
  writeJsonIfChanged(controlPath(mesh, CLAIMS_FILE), claims);
  writeJsonIfChanged(controlPath(mesh, TASKS_FILE), tasks);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    controlRoot: controlPath(mesh),
    rooms,
    agents,
    tasks,
    claims,
    tomorrow,
    audit,
  };
}

function isStaleHeartbeat(lastSeen: string | null, nowMs: number): boolean {
  if (!lastSeen) {
    return true;
  }

  const signalAt = Date.parse(lastSeen);
  return Number.isNaN(signalAt) || nowMs - signalAt > HEARTBEAT_STALE_MS;
}

export function updateRoomAutonomyConfig(mesh: Mesh, input: UpdateRoomAutonomyInput): AgentRoomsState {
  if (!input.roomId?.trim()) {
    throw new Error("Room id is required.");
  }

  const rooms = normalizeRoomConfigFile(
    readJsonFile<AgentRoomsFile>(controlPath(mesh, ROOMS_FILE), { rooms: seedRooms() }),
  );
  const targetRoomId = input.roomId.trim();
  const room = rooms.find((item) => item.id === targetRoomId);
  if (!room) {
    throw new Error(`Room not found: ${input.roomId}`);
  }

  const normalizedPolicy = normalizeActionPolicyInput(input.actionPolicy ?? {});
  const nextRoom: AgentRoom = {
    ...room,
    autonomyMode: input.autonomyMode ? input.autonomyMode : room.autonomyMode,
    learningInitiativesEnabled:
      input.learningInitiativesEnabled === undefined ? room.learningInitiativesEnabled : input.learningInitiativesEnabled,
    capacity: normalizeRoomCapacity({
      ...room.capacity,
      ...input.capacity,
    }),
    actionPolicy:
      Object.keys(normalizedPolicy).length > 0
        ? {
            ...room.actionPolicy,
            ...normalizedPolicy,
          }
        : room.actionPolicy,
  };

  const nextRooms = rooms.map((item) => (item.id === targetRoomId ? nextRoom : item));
  writeJsonFile(controlPath(mesh, ROOMS_FILE), nextRooms.map((item) => normalizeRoomConfig(item)));

  appendRunLog(mesh, {
    type: "room_autonomy_updated",
    roomId: targetRoomId,
    roomAutonomyMode: nextRoom.autonomyMode,
    maxParallelClaims: nextRoom.capacity.maxParallelClaims,
    maxDailyAutonomousRuns: nextRoom.capacity.maxDailyAutonomousRuns,
  });

  return getAgentRoomsState(mesh);
}

function normalizeRoomConfig(room: AgentRoom): AgentRoom {
  return {
    ...room,
    learningInitiativesEnabled: room.learningInitiativesEnabled ?? true,
    capacity: normalizeRoomCapacity(room.capacity),
    actionPolicy: room.actionPolicy ? normalizeActionPolicy(room.id, room.actionPolicy) : buildDefaultActionPolicy(room.id),
  };
}

function normalizeRoomCapacity(capacity: Partial<AgentRoom["capacity"]> | undefined): AgentRoom["capacity"] {
  return {
    maxParallelClaims: normalizeNonNegativeInteger(capacity?.maxParallelClaims, ROOM_DEFAULT_AUTONOMY_LIMITS.maxParallelClaims),
    maxDailyAutonomousRuns: normalizeNonNegativeInteger(
      capacity?.maxDailyAutonomousRuns,
      ROOM_DEFAULT_AUTONOMY_LIMITS.maxDailyAutonomousRuns,
    ),
  };
}

function normalizeActionPolicy(roomId: string, policy?: Partial<Record<RoomAction, RoomActionPolicy>>): RoomActionPolicyByAction {
  const defaults = ROOM_DEFAULT_ACTION_POLICY[roomId] ?? ROOM_ACTION_POLICY_FALLBACK;
  const normalized: RoomActionPolicyByAction = {};
  for (const action of ROOM_ACTIONS) {
    const roomActionPolicy = policy?.[action];
    const defaultPolicy = defaults[action] ?? ROOM_ACTION_POLICY_FALLBACK[action];
    const configured = roomActionPolicy ?? {};
    const merged: RoomActionPolicy = {
      ...defaultPolicy,
      ...configured,
      minAutonomy: normalizeAutonomyMode(configured.minAutonomy) ?? defaultPolicy?.minAutonomy ?? ACTION_MIN_AUTONOMY[action],
      maxTaskRiskLevel: normalizeTaskRiskLevel(configured.maxTaskRiskLevel) ?? defaultPolicy?.maxTaskRiskLevel,
      disabled: configured.disabled ?? defaultPolicy?.disabled,
    };
    normalized[action] = merged;
  }

  return normalized;
}

function normalizeActionPolicyInput(policy: Partial<Record<RoomAction, RoomActionPolicy>>): RoomActionPolicyByAction {
  const normalized: RoomActionPolicyByAction = {};
  for (const action of ROOM_ACTIONS) {
    const update = policy[action];
    if (!update) {
      continue;
    }

    const entry: RoomActionPolicy = {};
    const minAutonomy = normalizeAutonomyMode(update.minAutonomy);
    const maxTaskRiskLevel = normalizeTaskRiskLevel(update.maxTaskRiskLevel);

    if (minAutonomy) {
      entry.minAutonomy = minAutonomy;
    }

    if (maxTaskRiskLevel) {
      entry.maxTaskRiskLevel = maxTaskRiskLevel;
    }

    if (typeof update.disabled === "boolean") {
      entry.disabled = update.disabled;
    }

    normalized[action] = entry;
  }

  return normalized;
}

function buildDefaultActionPolicy(roomId: string): RoomActionPolicyByAction {
  return normalizeActionPolicy(roomId);
}

function normalizeAutonomyMode(value?: RoomAutonomyMode | string | undefined): RoomAutonomyMode | null {
  if (value === "observe" || value === "suggest" || value === "execute") {
    return value;
  }

  return null;
}

function normalizeTaskRiskLevel(value?: RoomTaskRiskLevel | string | undefined): RoomTaskRiskLevel | null {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return null;
}

function normalizeNonNegativeInteger(value: number | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function latestDispatch(dispatches: DispatchEnvelope[]): DispatchEnvelope | null {
  return dispatches.reduce<DispatchEnvelope | null>((latest, dispatch) => {
    if (!latest) {
      return dispatch;
    }

    const latestDate = latest.repliedAt ?? latest.failedAt ?? latest.sentAt ?? latest.createdAt;
    const dispatchDate = dispatch.repliedAt ?? dispatch.failedAt ?? dispatch.sentAt ?? dispatch.createdAt;
    return dispatchDate.localeCompare(latestDate) > 0 ? dispatch : latest;
  }, null);
}

function indexDispatchesByProject(dispatches: DispatchEnvelope[]): Map<string, DispatchEnvelope[]> {
  const buckets = new Map<string, DispatchEnvelope[]>();

  for (const dispatch of dispatches) {
    if (dispatch.from) {
      const fromBucket = buckets.get(dispatch.from) ?? [];
      fromBucket.push(dispatch);
      buckets.set(dispatch.from, fromBucket);
    }

    if (dispatch.to) {
      const toBucket = buckets.get(dispatch.to) ?? [];
      toBucket.push(dispatch);
      buckets.set(dispatch.to, toBucket);
    }
  }

  return buckets;
}

function buildAuditItem(
  project: ProjectRecord,
  projectAgent: RoomAgent | null,
  status: RoomAuditStatus,
  heartbeat: RoomsAuditHeartbeat | null,
  input: {
    openDispatches: DispatchEnvelope[];
    failedDispatches: DispatchEnvelope[];
    lastDispatch: DispatchEnvelope | null;
    reason: string;
    staleHeartbeat: boolean;
  },
): RoomAgentAuditItem {
  const recommendations: string[] = [
    project.threadId ? `Use thread-aware channels and avoid backend-only assumptions for ${project.id}.` : `Create or attach a live thread to ${project.id}.`,
  ];

  if (status === "repair-needed") {
    if (input.failedDispatches.length) {
      recommendations.push("Recheck failed dispatches, then re-run bridge or request explicit room repair path.");
    }

    if (input.staleHeartbeat) {
      recommendations.push("Heartbeat stale: force a new context check and run dispatch bridge once.");
    }
  }

  if (!heartbeat && project.threadId && status !== "repair-needed") {
    recommendations.push("No heartbeat file yet; verify mesh/dispatch listener and allow heartbeat write cycle.");
  }

  const currentTask = heartbeat?.current_task ?? (input.lastDispatch ? "Open dispatch in progress" : project.scope);
  const lastSeen = heartbeat?.last_seen ?? project.updatedAt;

  return {
    projectId: project.id,
    roomId: roomIdForProject(project.id),
    roomName: roomNameForRoomId(roomIdForProject(project.id)),
    agentId: projectAgent?.id ?? null,
    displayName: projectAgent?.displayName ?? null,
    status,
    threadId: project.threadId,
    workspaceRoot: project.workspaceRoot,
    reason: input.reason,
    currentTask,
    lastSeen,
    observedAt: heartbeat?.observed_at ?? null,
    openDispatches: input.openDispatches.length,
    failedDispatches: input.failedDispatches.length,
    recommendations,
  };
}

function summarizeAudit(items: RoomAgentAuditItem[]): RoomAuditSummary {
  return items.reduce<RoomAuditSummary>(
    (acc, item) => {
      acc.totalProjects += 1;
      if (item.status === "live-thread") {
        acc.liveThread += 1;
      }

      if (item.status === "backend-only") {
        acc.backendOnly += 1;
      }

      if (item.status === "paused") {
        acc.paused += 1;
      }

      if (item.status === "repair-needed") {
        acc.repairNeeded += 1;
      }

      return acc;
    },
    {
      totalProjects: 0,
      liveThread: 0,
      backendOnly: 0,
      paused: 0,
      repairNeeded: 0,
    },
  );
}

function roomNameForRoomId(roomId: string): string {
  return {
    "build-room": "Build Room",
    "research-intel-room": "Research & Intelligence Room",
    "content-growth-room": "Content & Growth Room",
  }[roomId] ?? roomId;
}

function readHeartbeat(mesh: Mesh, projectId: string): RoomsAuditHeartbeat | null {
  const heartbeatPath = path.join(mesh.root, "projects", projectId, "heartbeat.json");
  try {
    return JSON.parse(fs.readFileSync(heartbeatPath, "utf8")) as RoomsAuditHeartbeat;
  } catch {
    return null;
  }
}

export function createRoomTask(mesh: Mesh, input: CreateRoomTaskInput): AgentRoomsState {
  const state = getAgentRoomsState(mesh);
  const room = state.rooms.find((item) => item.id === input.roomId);
  if (!room) {
    throw new Error(`Room not found: ${input.roomId}`);
  }

  const createTaskGate = canRunRoomAction(room, "task.create", {
    task: {
      id: "new",
      autonomyLevel: input.autonomyLevel ?? room.autonomyMode,
    },
  });
  if (!createTaskGate.allowed) {
    throw new Error(`Task creation blocked by room policy: ${createTaskGate.reason}`);
  }

  if (input.assignedAgentId && !state.agents.some((agent) => agent.id === input.assignedAgentId)) {
    throw new Error(`Agent not found: ${input.assignedAgentId}`);
  }

  const taskRisk = classifyRoomTaskRisk({
    title: input.title,
    objective: input.objective,
    target: input.target,
    acceptanceCriteria: input.acceptanceCriteria,
    riskSignals: input.riskSignals,
  });
  const requestedRiskLevel = input.riskLevel ?? taskRisk.riskLevel;
  const requestedExecutionMode = input.executionMode
    ?? (input.requiresHumanReview || taskRisk.requiresHumanReview ? "human-review" : taskRisk.executionMode);
  const requestedRequiresHumanReview = Boolean(
    input.requiresHumanReview ??
      (taskRisk.requiresHumanReview ||
        requestedRiskLevel === "high" ||
        requestedExecutionMode === "human-review"),
  );
  const requestedAutonomyLevel = chooseTaskAutonomy({
    roomAutonomy: room.autonomyMode,
    requestedAutonomy: input.autonomyLevel,
    requestedRiskLevel,
    requestedRequiresHumanReview,
    requestedExecutionMode,
  });

  const now = new Date().toISOString();
  const task: RoomTask = {
    id: makeId("task"),
    roomId: room.id,
    title: requiredText(input.title, "title"),
    objective: requiredText(input.objective, "objective"),
    status: "queued",
    priority: input.priority ?? "normal",
    executionMode: requestedExecutionMode,
    requiresHumanReview: requestedRequiresHumanReview,
    riskLevel: requestedRiskLevel,
    riskSignals: [...taskRisk.riskSignals, ...normalizeStrings(input.riskSignals)],
    requestedBy: input.requestedBy?.trim() ?? null,
    sourceRoomId: input.sourceRoomId ?? null,
    linkedTaskId: input.linkedTaskId ?? null,
    assignedAgentId: input.assignedAgentId ?? null,
    claimId: null,
    target: input.target?.trim() || room.name,
    dependencies: input.dependencies ?? [],
    acceptanceCriteria: input.acceptanceCriteria?.length ? input.acceptanceCriteria : room.acceptanceGates,
    createdAt: now,
    updatedAt: now,
    dueDate: input.dueDate ?? null,
    autonomyLevel: requestedAutonomyLevel,
  };

  writeJsonFile(controlPath(mesh, TASKS_FILE), [...state.tasks, task]);
  appendRunLog(mesh, {
    type: "task_created",
    taskId: task.id,
    roomId: task.roomId,
    title: task.title,
  });
  return getAgentRoomsState(mesh);
}

export function suggestRoomTask(mesh: Mesh, input: SuggestRoomTaskInput): AgentRoomsState {
  const state = getAgentRoomsState(mesh);
  const sourceTask = state.tasks.find((task) => task.id === input.sourceTaskId);
  if (!sourceTask) {
    throw new Error(`Source task not found: ${input.sourceTaskId}`);
  }

  const targetRoom = state.rooms.find((room) => room.id === input.targetRoomId);
  if (!targetRoom) {
    throw new Error(`Target room not found: ${input.targetRoomId}`);
  }

  const sourceRoom = state.rooms.find((room) => room.id === sourceTask.roomId);
  if (sourceRoom) {
    const suggestGate = canRunRoomAction(sourceRoom, "task.suggest", { task: sourceTask });
    if (!suggestGate.allowed) {
      throw new Error(`Task suggest blocked by room policy: ${suggestGate.reason}`);
    }
  }

  const suggestion: CreateRoomTaskInput = {
    roomId: targetRoom.id,
    title: requiredText(input.title, "title"),
    objective: requiredText(input.objective, "objective"),
    autonomyLevel: input.autonomyLevel ?? "suggest",
    assignedAgentId: sourceTask.assignedAgentId,
    acceptanceCriteria: sourceTask.acceptanceCriteria,
    dependencies: input.sourceTaskId ? [input.sourceTaskId] : sourceTask.dependencies,
    dueDate: input.dueDate,
    priority: input.priority ?? "normal",
    requestedBy: `Suggestion from ${sourceTask.id}`,
    sourceRoomId: sourceTask.roomId,
    linkedTaskId: sourceTask.id,
    riskSignals: sourceTask.riskSignals,
  };

  return createRoomTask(mesh, suggestion);
}

export function claimRoomTask(mesh: Mesh, taskId: string, input: ClaimRoomTaskInput): AgentRoomsState {
  const state = getAgentRoomsState(mesh);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const agent = state.agents.find((item) => item.id === input.agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${input.agentId}`);
  }

  if (agent.roomId !== task.roomId) {
    throw new Error(`Agent ${agent.id} does not belong to room ${task.roomId}`);
  }

  const room = state.rooms.find((item) => item.id === task.roomId);
  if (!room) {
    throw new Error(`Room ${task.roomId} not found in control plane.`);
  }

  const dependencyGap = unmetDependencies(task, new Map(state.tasks.map((item) => [item.id, item])));
  if (dependencyGap.length > 0) {
    throw new Error(`Task claim blocked by room policy: Dependency not met: ${dependencyGap.join(", ")}`);
  }

  const claimGate = canRunRoomAction(room, "task.claim", {
    task,
    activeClaims: countActiveClaimsForRoom(state.claims, room.id),
    dailyClaims: countRecentClaimsForRoom(state.claims, room.id),
  });

  if (!claimGate.allowed) {
    throw new Error(`Task claim blocked by room policy: ${claimGate.reason}`);
  }

  const existingClaim = state.claims.find((claim) => claim.taskId === task.id && claim.status === "active");
  if (existingClaim) {
    throw new Error(`Task already claimed by ${existingClaim.agentId}`);
  }

  const now = new Date();
  const leaseMinutes = Math.max(10, Math.min(input.leaseMinutes ?? 90, 480));
  const claim: RoomClaim = {
    id: makeId("claim"),
    roomId: task.roomId,
    taskId: task.id,
    agentId: agent.id,
    target: input.target?.trim() || task.target,
    status: "active",
    reason: input.reason?.trim() || `Claimed for ${task.title}`,
    claimedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + leaseMinutes * 60_000).toISOString(),
  };

  const updatedTasks = state.tasks.map((item) =>
    item.id === task.id
      ? {
          ...item,
          assignedAgentId: agent.id,
          claimId: claim.id,
          status: "claimed" as const,
          updatedAt: now.toISOString(),
        }
      : item,
  );

  writeJsonFile(controlPath(mesh, CLAIMS_FILE), [...state.claims, claim]);
  writeJsonFile(controlPath(mesh, TASKS_FILE), updatedTasks);
  appendRunLog(mesh, {
    type: "task_claimed",
    taskId: task.id,
    claimId: claim.id,
    agentId: agent.id,
    roomId: task.roomId,
  });
  return getAgentRoomsState(mesh);
}

export function releaseRoomTask(mesh: Mesh, taskId: string, reason = "Released from Agent Office."): AgentRoomsState {
  const state = getAgentRoomsState(mesh);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const room = state.rooms.find((item) => item.id === task.roomId);
  if (!room) {
    throw new Error(`Room ${task.roomId} not found in control plane.`);
  }

  const releaseGate = canRunRoomAction(room, "task.release", {
    task,
  });
  if (!releaseGate.allowed) {
    throw new Error(`Task release blocked by room policy: ${releaseGate.reason}`);
  }

  const now = new Date().toISOString();
  const updatedClaims = state.claims.map((claim) =>
    claim.taskId === task.id && claim.status === "active"
      ? { ...claim, status: "released" as const, releasedAt: now, reason }
      : claim,
  );
  const updatedTasks = state.tasks.map((item) =>
    item.id === task.id
      ? {
          ...item,
          assignedAgentId: null,
          claimId: null,
          status: "queued" as const,
          updatedAt: now,
        }
      : item,
  );

  writeJsonFile(controlPath(mesh, CLAIMS_FILE), updatedClaims);
  writeJsonFile(controlPath(mesh, TASKS_FILE), updatedTasks);
  appendRunLog(mesh, {
    type: "task_released",
    taskId: task.id,
    reason,
  });
  return getAgentRoomsState(mesh);
}

function ensureControlFiles(mesh: Mesh, projects: ProjectRecord[]): void {
  fs.mkdirSync(controlPath(mesh), { recursive: true });
  fs.mkdirSync(path.join(controlPath(mesh), "runs"), { recursive: true });
  writeJsonIfMissing(controlPath(mesh, ROOMS_FILE), seedRooms());
  writeJsonIfMissing(controlPath(mesh, AGENTS_FILE), seedAgents(projects));
  writeJsonIfMissing(controlPath(mesh, TASKS_FILE), seedTasks());
  writeJsonIfMissing(controlPath(mesh, CLAIMS_FILE), seedClaims());
  writeJsonIfMissing(controlPath(mesh, TOMORROW_FILE), seedTomorrowPlan());
}

function syncProjectSignals(mesh: Mesh, agents: RoomAgent[], projects: ProjectRecord[]): RoomAgent[] {
  if (!projects.length) {
    return agents;
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const synced = agents.map((agent) => {
    if (!agent.meshProjectId) {
      return agent;
    }

    const project = projectById.get(agent.meshProjectId);
    if (!project) {
      return agent;
    }

    return {
      ...agent,
      status: roomStatusFromProject(project),
      workspaceRoot: project.workspaceRoot,
      threadId: project.threadId,
    };
  });

  const existingProjectIds = new Set(synced.map((agent) => agent.meshProjectId).filter(Boolean));
  const missingProjectAgents = projects
    .filter((project) => !existingProjectIds.has(project.id))
    .map((project): RoomAgent => ({
      id: `mesh-${project.id}`,
      displayName: project.name,
      roomId: roomIdForProject(project.id),
      meshProjectId: project.id,
      role: "Mesh project specialist",
      scope: project.scope,
      status: roomStatusFromProject(project),
      modelTier: "codex",
      skills: ["mesh-context", "project-memory", "thread-bridge"],
      allowedTools: ["mesh-read", "context-request"],
      authority: "May answer scoped context requests; cross-project writes stay human-gated.",
      activation: project.threadId ? "active" : "standby",
      autonomyScore: project.threadId ? 62 : 38,
      reliabilityScore: project.status === "active" ? 70 : 35,
      currentLoad: 0,
      workspaceRoot: project.workspaceRoot,
      threadId: project.threadId,
    }));

  return [...synced, ...missingProjectAgents];
}

function syncTaskClaimState(tasks: RoomTask[], claims: RoomClaim[]): RoomTask[] {
  const activeClaimByTask = new Map(
    claims.filter((claim) => claim.status === "active").map((claim) => [claim.taskId, claim]),
  );

  return tasks.map((task) => {
    const activeClaim = activeClaimByTask.get(task.id);
    if (activeClaim && task.status === "queued") {
      return {
        ...task,
        assignedAgentId: activeClaim.agentId,
        claimId: activeClaim.id,
        status: "claimed",
      };
    }

    if (!activeClaim && task.claimId && task.status === "claimed") {
      return {
        ...task,
        assignedAgentId: null,
        claimId: null,
        status: "queued",
      };
    }

    return task;
  });
}

function expireClaims(claims: RoomClaim[]): RoomClaim[] {
  const now = Date.now();
  let changed = false;
  const next = claims.map((claim) => {
    if (claim.status === "active" && Date.parse(claim.expiresAt) <= now) {
      changed = true;
      return { ...claim, status: "expired" as const };
    }

    return claim;
  });

  return changed ? next : claims;
}

function seedRooms(): AgentRoom[] {
  return [
    {
      id: "build-room",
      name: "Build Room",
      mission: "Ship Agent Office, Mesh infrastructure, backend APIs, UI, tests, deployment, and operational tooling.",
      leadAgentId: "build-room-lead",
      autonomyMode: "execute",
      learningInitiativesEnabled: true,
      capacity: { maxParallelClaims: 5, maxDailyAutonomousRuns: 12 },
      color: "#2f8cff",
      policy: "May edit local code, run tests, restart local services, and update private control files. Production deploys require a green doctor check.",
      acceptanceGates: ["typecheck passes", "tests pass", "build passes", "office doctor passes"],
      actionPolicy: {
        "task.create": { minAutonomy: "observe" },
        "task.claim": { minAutonomy: "execute" },
        "task.suggest": { minAutonomy: "suggest" },
        "mesh.dispatch": { minAutonomy: "execute" },
        "mesh.help": { minAutonomy: "observe" },
        "room.audit": { minAutonomy: "suggest" },
        "task.release": { minAutonomy: "observe" },
      },
    },
    {
      id: "research-intel-room",
      name: "Research & Intelligence Room",
      mission: "Coordinate TAO/Bittensor research, mining viability, wallet safety, market intelligence, and evidence-backed reports.",
      leadAgentId: "research-room-lead",
      autonomyMode: "suggest",
      learningInitiativesEnabled: true,
      capacity: { maxParallelClaims: 6, maxDailyAutonomousRuns: 16 },
      color: "#35c776",
      policy: "Read-only by default. No trades, registrations, transfers, staking, swaps, or wallet-changing commands without explicit human authorization.",
      acceptanceGates: ["sources cited", "freshness checked", "risk stated", "no capital-risking action executed"],
      actionPolicy: {
        "task.create": { minAutonomy: "observe" },
        "task.claim": { minAutonomy: "execute", maxTaskRiskLevel: "low" },
        "task.suggest": { minAutonomy: "suggest" },
        "mesh.dispatch": { minAutonomy: "suggest" },
        "mesh.help": { minAutonomy: "observe" },
        "room.audit": { minAutonomy: "suggest" },
        "task.release": { minAutonomy: "observe" },
      },
    },
    {
      id: "content-growth-room",
      name: "Content & Growth Room",
      mission: "Produce Tao Outsider, TaoSwap, SEO, social, translation, creative, and publication workflows without losing brand voice.",
      leadAgentId: "content-room-lead",
      autonomyMode: "suggest",
      learningInitiativesEnabled: true,
      capacity: { maxParallelClaims: 5, maxDailyAutonomousRuns: 14 },
      color: "#f2aa2f",
      policy: "May draft and review content. Public publishing, brand-sensitive edits, and distribution campaigns require final review.",
      acceptanceGates: ["voice preserved", "facts verified", "publication target clear", "review status recorded"],
      actionPolicy: {
        "task.create": { minAutonomy: "observe" },
        "task.claim": { minAutonomy: "execute", maxTaskRiskLevel: "low" },
        "task.suggest": { minAutonomy: "suggest" },
        "mesh.dispatch": { minAutonomy: "suggest" },
        "mesh.help": { minAutonomy: "observe" },
        "room.audit": { minAutonomy: "suggest" },
        "task.release": { minAutonomy: "observe" },
      },
    },
  ];
}

function seedAgents(projects: ProjectRecord[]): RoomAgent[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const project = (id: string) => projectById.get(id) ?? null;

  return [
    seedAgent({
      id: "chief-orchestrator",
      displayName: "Chief Orchestrator",
      roomId: "build-room",
      meshProjectId: "agent-system",
      project: project("agent-system"),
      role: "Global command center and Mesh governance",
      scope: "Routes work, enforces autonomy policy, maintains cross-room state, and blocks unsafe actions.",
      modelTier: "frontier",
      skills: ["orchestration", "mesh-governance", "handoffs", "risk-routing"],
      allowedTools: ["mesh-read", "mesh-write", "code", "tests", "office-restart"],
      authority: "Can coordinate all rooms; cannot bypass project scope, approval gates, or capital-risk actions.",
      autonomyScore: 78,
      reliabilityScore: 82,
    }),
    seedAgent({
      id: "build-room-lead",
      displayName: "Build Room Lead",
      roomId: "build-room",
      meshProjectId: "agente-vlmkt",
      project: project("agente-vlmkt"),
      role: "Engineering room lead",
      scope: "Breaks product goals into implementation tasks and assigns builders, QA, and deploy reviewers.",
      modelTier: "codex",
      skills: ["system-design", "task-decomposition", "code-review"],
      allowedTools: ["code", "tests", "mesh-read"],
      authority: "Can propose and claim build tasks inside the Agent Office workspace.",
      autonomyScore: 72,
      reliabilityScore: 74,
    }),
    seedAgent({
      id: "frontend-architect",
      displayName: "Frontend Architect",
      roomId: "build-room",
      meshProjectId: null,
      project: null,
      role: "Agent Office UI and mobile experience",
      scope: "Maintains the office scene, responsive controls, inspector states, and live interaction model.",
      modelTier: "codex",
      skills: ["react", "vite", "css", "browser-qa"],
      allowedTools: ["code", "browser", "build"],
      authority: "Can edit local frontend and validate visually.",
      autonomyScore: 70,
      reliabilityScore: 76,
    }),
    seedAgent({
      id: "backend-mesh-engineer",
      displayName: "Backend Mesh Engineer",
      roomId: "build-room",
      meshProjectId: "agent-system",
      project: project("agent-system"),
      role: "Mesh APIs, events, locks, and state contracts",
      scope: "Owns SSE, room state, dispatch visibility, and persistent control-plane files.",
      modelTier: "codex",
      skills: ["node", "typescript", "sse", "file-state", "api-contracts"],
      allowedTools: ["code", "tests", "mesh-write"],
      authority: "Can edit backend control-plane code and private mesh files.",
      autonomyScore: 74,
      reliabilityScore: 78,
    }),
    seedAgent({
      id: "qa-verifier",
      displayName: "QA Verifier",
      roomId: "build-room",
      meshProjectId: null,
      project: null,
      role: "Verification and regression gate",
      scope: "Runs typecheck, tests, build, doctor, browser desktop and mobile checks.",
      modelTier: "reviewer",
      skills: ["test-planning", "browser-qa", "regression-audit"],
      allowedTools: ["tests", "build", "browser", "doctor"],
      authority: "Can block completion until validation evidence exists.",
      autonomyScore: 67,
      reliabilityScore: 84,
    }),
    seedAgent({
      id: "deployment-gatekeeper",
      displayName: "Deployment Gatekeeper",
      roomId: "build-room",
      meshProjectId: "blog-outsider",
      project: project("blog-outsider"),
      role: "Cloudflare and public access gate",
      scope: "Keeps office private, validates Cloudflare tunnel and deployment safety.",
      modelTier: "reviewer",
      skills: ["cloudflare", "wrangler", "access-control", "release-checks"],
      allowedTools: ["cloudflare-read", "doctor", "deploy-review"],
      authority: "Can prepare deploys; public changes require verified access controls.",
      autonomyScore: 58,
      reliabilityScore: 75,
    }),
    seedAgent({
      id: "security-guardrail",
      displayName: "Security Guardrail",
      roomId: "build-room",
      meshProjectId: null,
      project: null,
      role: "Secrets, permissions, and unsafe action guard",
      scope: "Audits secret exposure, cross-project writes, destructive commands, and private data boundaries.",
      modelTier: "reviewer",
      skills: ["security-review", "secret-handling", "approval-policy"],
      allowedTools: ["code-review", "logs", "mesh-read"],
      authority: "Can stop autonomous execution when a boundary is unclear.",
      autonomyScore: 55,
      reliabilityScore: 86,
    }),
    seedAgent({
      id: "codex-bridge-operator",
      displayName: "Codex Bridge Operator",
      roomId: "build-room",
      meshProjectId: "agent-system",
      project: project("agent-system"),
      role: "Live thread bridge and ACK auditor",
      scope: "Verifies which projects have real visible thread ACKs, dispatch delivery, replies, and paused-thread repair needs.",
      modelTier: "codex",
      skills: ["thread-bridge", "dispatch-audit", "ack-verification", "mesh-cli"],
      allowedTools: ["mesh-read", "mesh-write", "thread-tools"],
      authority: "Can inspect and route dispatches; cannot mark sent before actual thread delivery.",
      autonomyScore: 68,
      reliabilityScore: 80,
    }),
    seedAgent({
      id: "data-contract-engineer",
      displayName: "Data Contract Engineer",
      roomId: "build-room",
      meshProjectId: null,
      project: null,
      role: "Schemas, migrations, and contract drift",
      scope: "Maintains frontend/backend type contracts and persistent state compatibility.",
      modelTier: "codex",
      skills: ["typescript-types", "schema-design", "migration-safety"],
      allowedTools: ["code", "tests"],
      authority: "Can create schemas and tests for control-plane changes.",
      autonomyScore: 64,
      reliabilityScore: 77,
    }),
    seedAgent({
      id: "research-room-lead",
      displayName: "Research Room Lead",
      roomId: "research-intel-room",
      meshProjectId: "tiger-2-0",
      project: project("tiger-2-0"),
      role: "TAO/Bittensor research lead",
      scope: "Coordinates Tiger research, audits, ranked reports, and evidence standards.",
      modelTier: "frontier",
      skills: ["bittensor-research", "audit", "ranking", "source-triage"],
      allowedTools: ["web-read", "repo-read", "mesh-read"],
      authority: "Read-only by default; can request analysis and reviews.",
      autonomyScore: 69,
      reliabilityScore: 80,
    }),
    seedAgent({
      id: "subnet-scout",
      displayName: "Subnet Scout",
      roomId: "research-intel-room",
      meshProjectId: "tiger-miner",
      project: project("tiger-miner"),
      role: "Mining viability scout",
      scope: "Screens subnet miner fit, emissions, registration cost, infra needs, and go/no-go candidates.",
      modelTier: "frontier",
      skills: ["subnet-screening", "mining-viability", "cost-risk"],
      allowedTools: ["web-read", "repo-read", "chain-read"],
      authority: "May research and prepare; no capital-risk execution without approval.",
      autonomyScore: 66,
      reliabilityScore: 74,
    }),
    seedAgent({
      id: "wallet-safety-auditor",
      displayName: "Wallet Safety Auditor",
      roomId: "research-intel-room",
      meshProjectId: "tiger-bot-dtao",
      project: project("tiger-bot-dtao"),
      role: "Wallet and dTAO safety reviewer",
      scope: "Reviews wallet-sensitive plans, dTAO bot assumptions, and trade/transfer boundaries.",
      modelTier: "reviewer",
      skills: ["wallet-safety", "approval-gates", "read-only-research"],
      allowedTools: ["read-only", "mesh-read"],
      authority: "Blocks live wallet/capital actions without fresh explicit approval.",
      autonomyScore: 42,
      reliabilityScore: 68,
    }),
    seedAgent({
      id: "market-signal-analyst",
      displayName: "Market Signal Analyst",
      roomId: "research-intel-room",
      meshProjectId: null,
      project: null,
      role: "Market and catalyst monitor",
      scope: "Finds timely catalysts, liquidity shifts, subnet sentiment, and invalidation signals.",
      modelTier: "frontier",
      skills: ["market-research", "catalyst-tracking", "freshness-checks"],
      allowedTools: ["web-read", "market-data"],
      authority: "Can publish watch notes; cannot execute positions.",
      autonomyScore: 60,
      reliabilityScore: 70,
    }),
    seedAgent({
      id: "flight-research-agent",
      displayName: "Flight Research Agent",
      roomId: "research-intel-room",
      meshProjectId: "pesquisa-voos",
      project: project("pesquisa-voos"),
      role: "Travel research specialist",
      scope: "Handles fare search, itinerary tradeoffs, and travel research procedures.",
      modelTier: "mini",
      skills: ["flight-search", "fare-comparison", "travel-rules"],
      allowedTools: ["web-read", "browser"],
      authority: "Can research options; purchases require human action.",
      autonomyScore: 56,
      reliabilityScore: 72,
    }),
    seedAgent({
      id: "research-editor",
      displayName: "Research Editor",
      roomId: "research-intel-room",
      meshProjectId: null,
      project: null,
      role: "Evidence and report editor",
      scope: "Turns research into compact tables, objective verdicts, and cited decision reports.",
      modelTier: "reviewer",
      skills: ["reporting", "source-citation", "editorial-review"],
      allowedTools: ["repo-read", "web-read"],
      authority: "Can finalize internal reports after source checks pass.",
      autonomyScore: 61,
      reliabilityScore: 79,
    }),
    seedAgent({
      id: "content-room-lead",
      displayName: "Content Room Lead",
      roomId: "content-growth-room",
      meshProjectId: "blog-outsider",
      project: project("blog-outsider"),
      role: "Tao Outsider and growth lead",
      scope: "Coordinates blog, SEO, Cloudflare publication checks, and content production flow.",
      modelTier: "frontier",
      skills: ["seo", "editorial-strategy", "cloudflare-context"],
      allowedTools: ["web-read", "repo-read", "mesh-read"],
      authority: "Can prepare content and publication plans; public publishing needs review.",
      autonomyScore: 65,
      reliabilityScore: 78,
    }),
    seedAgent({
      id: "taoswap-content-strategist",
      displayName: "TaoSwap Content Strategist",
      roomId: "content-growth-room",
      meshProjectId: "taoswap-engine",
      project: project("taoswap-engine"),
      role: "TaoSwap content and positioning",
      scope: "Produces TaoSwap-native content without diluting identity into Tao Outsider or Tiger voice.",
      modelTier: "mini",
      skills: ["crypto-copy", "social-content", "brand-positioning"],
      allowedTools: ["repo-read", "web-read"],
      authority: "Can draft and revise; final publication remains review-gated.",
      autonomyScore: 62,
      reliabilityScore: 76,
    }),
    seedAgent({
      id: "tao-outsider-editor",
      displayName: "Tao Outsider Editor",
      roomId: "content-growth-room",
      meshProjectId: "blog-outsider",
      project: project("blog-outsider"),
      role: "Editorial voice and translation",
      scope: "Keeps copy direct, technically literate, crypto-native, and not hype-driven.",
      modelTier: "reviewer",
      skills: ["editorial-voice", "translation", "crypto-native-writing"],
      allowedTools: ["repo-read", "web-read"],
      authority: "Can approve internal drafts for tone; publication still gated.",
      autonomyScore: 58,
      reliabilityScore: 83,
    }),
    seedAgent({
      id: "video-creative-producer",
      displayName: "Video Creative Producer",
      roomId: "content-growth-room",
      meshProjectId: "tiger-movie",
      project: project("tiger-movie"),
      role: "Video, covers, layout, and creative media",
      scope: "Creates creative plans, captions, covers, and video production assets.",
      modelTier: "mini",
      skills: ["video", "covers", "captions", "creative-layout"],
      allowedTools: ["media-read", "creative-tools"],
      authority: "Can draft assets and briefs; final brand/export review required.",
      autonomyScore: 54,
      reliabilityScore: 72,
    }),
    seedAgent({
      id: "seo-distribution-operator",
      displayName: "SEO Distribution Operator",
      roomId: "content-growth-room",
      meshProjectId: null,
      project: null,
      role: "SEO and distribution checklist operator",
      scope: "Maintains publish checklist, internal links, metadata, snippets, and social distribution plan.",
      modelTier: "mini",
      skills: ["seo-checklist", "metadata", "distribution"],
      allowedTools: ["repo-read", "web-read"],
      authority: "Can prepare checklists and drafts; live publication is review-gated.",
      autonomyScore: 57,
      reliabilityScore: 75,
    }),
    seedAgent({
      id: "brand-voice-reviewer",
      displayName: "Brand Voice Reviewer",
      roomId: "content-growth-room",
      meshProjectId: null,
      project: null,
      role: "Final voice and consistency reviewer",
      scope: "Catches generic copy, identity drift, false claims, and weak crypto-native phrasing.",
      modelTier: "reviewer",
      skills: ["voice-review", "claim-check", "style-consistency"],
      allowedTools: ["repo-read", "web-read"],
      authority: "Can block publication until tone and factual checks pass.",
      autonomyScore: 52,
      reliabilityScore: 84,
    }),
  ];
}

function seedAgent(input: Omit<RoomAgent, "status" | "activation" | "currentLoad" | "workspaceRoot" | "threadId"> & { project: ProjectRecord | null }): RoomAgent {
  const { project, ...agent } = input;
  return {
    ...agent,
    status: project ? roomStatusFromProject(project) : "virtual",
    activation: project?.threadId ? "active" : "standby",
    currentLoad: 0,
    workspaceRoot: project?.workspaceRoot ?? null,
    threadId: project?.threadId ?? null,
  };
}

function seedTasks(): RoomTask[] {
  const now = "2026-06-09T12:00:00.000Z";
  const seeded: Pick<
    RoomTask,
    "riskLevel" | "executionMode" | "requiresHumanReview" | "riskSignals" | "requestedBy" | "sourceRoomId" | "linkedTaskId"
  > = {
    riskLevel: "low",
    executionMode: "auto",
    requiresHumanReview: false,
    riskSignals: [],
    requestedBy: "seeded task",
    sourceRoomId: null,
    linkedTaskId: null,
  };
  return [
    {
      id: "task_rooms_control_plane",
      roomId: "build-room",
      title: "Install Agent Rooms OS control plane",
      objective: "Create persistent rooms, agents, mission queue, claims, and tomorrow plan in the Mesh backend.",
      status: "running",
      priority: "urgent",
      autonomyLevel: "execute",
      assignedAgentId: "backend-mesh-engineer",
      claimId: "claim_rooms_control_plane",
      target: "agent-system + codex-mesh/control",
      dependencies: [],
      acceptanceCriteria: ["rooms payload exists", "control files persist", "SSE carries room state", "tests/build pass"],
      createdAt: now,
      updatedAt: now,
      dueDate: "2026-06-09",
      ...seeded,
    },
    {
      id: "task_office_room_ui",
      roomId: "build-room",
      title: "Show virtual rooms inside Agent Office",
      objective: "Add room tabs, mission queue, autonomy mode, locks, specialist roster, and tomorrow plan to the live Office.",
      status: "queued",
      priority: "urgent",
      autonomyLevel: "execute",
      assignedAgentId: "frontend-architect",
      claimId: null,
      target: "web/src/App.tsx + web/src/styles.css",
      dependencies: ["task_rooms_control_plane"],
      acceptanceCriteria: ["desktop usable", "mobile usable", "room filter visible", "no layout overlap"],
      createdAt: now,
      updatedAt: now,
      dueDate: "2026-06-09",
      ...seeded,
    },
    {
      id: "task_ack_audit",
      roomId: "build-room",
      title: "Audit live thread ACKs before scaling",
      objective: "Verify which mesh projects are true live agents, backend-only agents, or paused/broken threads before adding parallel work.",
      status: "queued",
      priority: "high",
      autonomyLevel: "suggest",
      assignedAgentId: "codex-bridge-operator",
      claimId: null,
      target: "codex-mesh/registry.json + dispatch state",
      dependencies: [],
      acceptanceCriteria: ["live agents listed", "backend-only agents listed", "paused agents listed", "repair actions written"],
      createdAt: now,
      updatedAt: now,
      dueDate: "2026-06-10",
      ...seeded,
    },
    {
      id: "task_autonomy_gates",
      roomId: "build-room",
      title: "Define autonomy gates per room",
      objective: "Turn observe/suggest/execute into explicit policies for tools, files, deploys, wallet-sensitive actions, and public publishing.",
      status: "queued",
      priority: "high",
      autonomyLevel: "suggest",
      assignedAgentId: "security-guardrail",
      claimId: null,
      target: "codex-mesh/control + docs",
      dependencies: ["task_ack_audit"],
      acceptanceCriteria: ["allowed actions", "blocked actions", "approval triggers", "room owners"],
      createdAt: now,
      updatedAt: now,
      dueDate: "2026-06-10",
      ...seeded,
      riskLevel: "medium",
      riskSignals: ["governance"],
    },
    {
      id: "task_research_first_parallel_run",
      roomId: "research-intel-room",
      title: "Prepare first Research Room parallel run",
      objective: "Split TAO/Bittensor research into subnet scout, wallet safety, market signal, and editor tasks with read-only boundaries.",
      status: "queued",
      priority: "high",
      autonomyLevel: "suggest",
      assignedAgentId: "research-room-lead",
      claimId: null,
      target: "Tiger research workflows",
      dependencies: ["task_ack_audit"],
      acceptanceCriteria: ["read-only scope", "source list", "output format", "handoff contract"],
      createdAt: now,
      updatedAt: now,
      dueDate: "2026-06-10",
      ...seeded,
    },
    {
      id: "task_content_first_parallel_run",
      roomId: "content-growth-room",
      title: "Prepare first Content Room parallel run",
      objective: "Split Tao Outsider/TaoSwap content work into strategy, draft, voice review, SEO, and creative production lanes.",
      status: "queued",
      priority: "normal",
      autonomyLevel: "suggest",
      assignedAgentId: "content-room-lead",
      claimId: null,
      target: "Tao Outsider + TaoSwap content workflow",
      dependencies: ["task_ack_audit"],
      acceptanceCriteria: ["brand identities preserved", "publication gate", "SEO checklist", "review owner"],
      createdAt: now,
      updatedAt: now,
      dueDate: "2026-06-10",
      ...seeded,
    },
  ];
}

function seedClaims(): RoomClaim[] {
  return [
    {
      id: "claim_rooms_control_plane",
      roomId: "build-room",
      taskId: "task_rooms_control_plane",
      agentId: "backend-mesh-engineer",
      target: "agent-system/src/mesh/rooms.ts",
      status: "active",
      reason: "Bootstrap the persistent control plane before scaling parallel autonomy.",
      claimedAt: "2026-06-09T12:00:00.000Z",
      expiresAt: "2026-06-10T03:00:00.000Z",
    },
  ];
}

function seedTomorrowPlan(): TomorrowPlanItem[] {
  return [
    {
      id: "tomorrow_ack_audit",
      sequence: 1,
      roomId: "build-room",
      ownerAgentId: "codex-bridge-operator",
      title: "Run true-live agent audit",
      outcome: "Every project classified as live-thread, backend-only, paused, or repair-needed.",
      risk: "medium",
      status: "ready",
    },
    {
      id: "tomorrow_first_room_drill",
      sequence: 2,
      roomId: "build-room",
      ownerAgentId: "chief-orchestrator",
      title: "First controlled room drill",
      outcome: "One task per room routed through queue, claim, Mesh request, reply, and review.",
      risk: "medium",
      status: "ready",
    },
    {
      id: "tomorrow_autonomy_policy",
      sequence: 3,
      roomId: "build-room",
      ownerAgentId: "security-guardrail",
      title: "Freeze autonomy gates",
      outcome: "Observe/suggest/execute permissions documented for code, content, deploys, wallet actions, and public publishing.",
      risk: "high",
      status: "ready",
    },
    {
      id: "tomorrow_research_parallel",
      sequence: 4,
      roomId: "research-intel-room",
      ownerAgentId: "research-room-lead",
      title: "Launch read-only Research Room split",
      outcome: "Subnet scout, wallet safety, market signal, and research editor run in separate lanes with one merged verdict.",
      risk: "medium",
      status: "ready",
    },
    {
      id: "tomorrow_content_parallel",
      sequence: 5,
      roomId: "content-growth-room",
      ownerAgentId: "content-room-lead",
      title: "Launch Content Room split",
      outcome: "Tao Outsider/TaoSwap work split into strategy, draft, SEO, creative, and voice review without identity drift.",
      risk: "low",
      status: "ready",
    },
    {
      id: "tomorrow_office_actions",
      sequence: 6,
      roomId: "build-room",
      ownerAgentId: "frontend-architect",
      title: "Make room actions interactive",
      outcome: "Create task, claim task, release lock, request context, and inspect run log directly from the Office.",
      risk: "low",
      status: "ready",
    },
  ];
}

function roomStatusFromProject(project: ProjectRecord): RoomAgentStatus {
  if (project.status !== "active") {
    return "paused";
  }

  return project.threadId ? "live-thread" : "backend-only";
}

export function roomIdForProject(projectId: string): string {
  if (projectId.includes("tiger") || projectId.includes("voos")) {
    return "research-intel-room";
  }

  if (projectId.includes("blog") || projectId.includes("taoswap") || projectId.includes("movie")) {
    return "content-growth-room";
  }

  return "build-room";
}

function appendRunLog(mesh: Mesh, payload: Record<string, unknown>): void {
  const logPath = path.join(controlPath(mesh), "runs", `${new Date().toISOString().slice(0, 10)}.jsonl`);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify({ at: new Date().toISOString(), ...payload })}\n`);
}

function controlPath(mesh: Mesh, fileName = ""): string {
  return path.join(mesh.root, CONTROL_DIR, fileName);
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function normalizeRoomConfigFile(value: AgentRoomsFile): AgentRoom[] {
  const base = value?.rooms;
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(base)) {
    return base as AgentRoom[];
  }

  return [];
}

function readJsonFileNullable<T>(filePath: string, fallback: T | null): T | null {
  return readJsonFile(filePath, fallback);
}

function writeJsonIfMissing(filePath: string, value: unknown): void {
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, value);
  }
}

function writeJsonIfChanged(filePath: string, value: unknown): void {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (previous !== next) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next);
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function requiredText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Missing ${field}.`);
  }

  return trimmed;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}
