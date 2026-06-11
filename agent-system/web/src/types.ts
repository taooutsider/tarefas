export interface Client {
  id: string;
  name: string;
  niche: string | null;
  status: string;
  owner: string | null;
  monthlyRetainer: number | null;
  currency: string;
}

export interface FinancialItem {
  id: string;
  clientId: string | null;
  type: string;
  status: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  description: string;
}

export interface WorkItem {
  id: string;
  clientId: string | null;
  title: string;
  type: string;
  status: string;
  priority: string;
  owner: string | null;
  dueDate: string | null;
}

export interface CommandCenterItem {
  source: "admin" | "client_delivery";
  id: string;
  title: string;
  reason: string;
  priority: string;
  dueDate: string | null;
  clientId: string | null;
  owner: string | null;
}

export interface Approval {
  id: string;
  jobId: string;
  agentName: string;
  toolName: string;
  argumentsJson: string;
  requestedAt: string;
}

export interface Job {
  id: string;
  goal: string;
  status: string;
  result: string | null;
  error: string | null;
  updatedAt: string;
}

export interface MeshMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body?: string;
  status: string;
  createdAt: string;
}

export interface MeshEvent {
  id: string;
  kind: "dispatch" | "message" | "reply";
  messageId: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  createdAt: string;
  open: boolean;
}

export interface MeshHeartbeat {
  projectId: string;
  name: string;
  status: "online" | "working" | "paused" | "backend";
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

export interface MeshProject {
  id: string;
  name: string;
  scope: string;
  status: string;
  threadId: string | null;
  workspaceRoot?: string | null;
}

export interface MeshDispatch {
  id: string;
  messageId: string;
  from: string;
  to: string;
  threadId: string;
  status: string;
  createdAt: string;
}

export type RoomAutonomyMode = "observe" | "suggest" | "execute";
export type RoomAgentStatus = "live-thread" | "backend-only" | "virtual" | "paused";
export type RoomTaskStatus = "queued" | "claimed" | "running" | "review" | "blocked" | "done";

export interface AgentRoom {
  id: string;
  name: string;
  mission: string;
  leadAgentId: string;
  autonomyMode: RoomAutonomyMode;
  learningInitiativesEnabled: boolean;
  capacity: {
    maxParallelClaims: number;
    maxDailyAutonomousRuns: number;
  };
  color: string;
  policy: string;
  acceptanceGates: string[];
  actionPolicy?: {
    "mesh.help"?: {
      minAutonomy?: RoomAutonomyMode;
      maxTaskRiskLevel?: "low" | "medium" | "high";
      disabled?: boolean;
    };
    "room.audit"?: {
      minAutonomy?: RoomAutonomyMode;
      maxTaskRiskLevel?: "low" | "medium" | "high";
      disabled?: boolean;
    };
    "task.create"?: {
      minAutonomy?: RoomAutonomyMode;
      maxTaskRiskLevel?: "low" | "medium" | "high";
      disabled?: boolean;
    };
    "task.release"?: {
      minAutonomy?: RoomAutonomyMode;
      maxTaskRiskLevel?: "low" | "medium" | "high";
      disabled?: boolean;
    };
    "task.claim"?: {
      minAutonomy?: RoomAutonomyMode;
      maxTaskRiskLevel?: "low" | "medium" | "high";
      disabled?: boolean;
    };
    "task.suggest"?: {
      minAutonomy?: RoomAutonomyMode;
      maxTaskRiskLevel?: "low" | "medium" | "high";
      disabled?: boolean;
    };
    "mesh.dispatch"?: {
      minAutonomy?: RoomAutonomyMode;
      maxTaskRiskLevel?: "low" | "medium" | "high";
      disabled?: boolean;
    };
  };
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
  priority: "urgent" | "high" | "normal" | "low";
  autonomyLevel: RoomAutonomyMode;
  assignedAgentId: string | null;
  claimId: string | null;
  target: string;
  dependencies: string[];
  acceptanceCriteria: string[];
  riskLevel: "low" | "medium" | "high";
  executionMode: "auto" | "human-review";
  requiresHumanReview: boolean;
  riskSignals: string[];
  requestedBy: string | null;
  sourceRoomId: string | null;
  linkedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}

export interface RoomClaim {
  id: string;
  roomId: string;
  taskId: string;
  agentId: string;
  target: string;
  status: "active" | "released" | "expired";
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
  status: "live-thread" | "backend-only" | "paused" | "repair-needed";
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

export interface RoomAgentAuditReport {
  generatedAt: string;
  summary: {
    totalProjects: number;
    liveThread: number;
    backendOnly: number;
    paused: number;
    repairNeeded: number;
  };
  items: RoomAgentAuditItem[];
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
  mode: "execute" | "simulate";
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
  mode: "execute" | "simulate";
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

export interface BootstrapPayload {
  agency: {
    admin: {
      openReceivables: FinancialItem[];
      openPayables: FinancialItem[];
      overdueFinancialItems: FinancialItem[];
      internalWork: WorkItem[];
      clientsAtFinancialRisk: Client[];
    };
    delivery: {
      clientWork: WorkItem[];
      activeCampaigns: Array<{ id: string; name: string; status: string; clientId: string }>;
      creativeAssetsInProduction: Array<{ id: string; type: string; status: string; channel: string | null; dueDate: string | null }>;
      reportsInProgress: Array<{ id: string; clientId: string; status: string; periodStart: string; periodEnd: string }>;
      blockedApprovals: WorkItem[];
    };
    commandCenter: {
      generatedAt: string;
      executiveQueue: CommandCenterItem[];
    };
    clients: Client[];
  };
  approvals: Approval[];
  jobs: Job[];
  mesh: {
    root: string;
    projects: MeshProject[];
    dispatches: MeshDispatch[];
    inbox: MeshMessage[];
    outbox: MeshMessage[];
    events: MeshEvent[];
    heartbeats: MeshHeartbeat[];
    error?: string;
  };
  rooms: AgentRoomsState;
  roomsAutonomyRun?: RoomAutonomyRunResult | null;
  runtime: {
    openaiConfigured: boolean;
    telegramConfigured: boolean;
  };
}
