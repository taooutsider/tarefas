import type { AgentRoom, AgentRoomsState, BootstrapPayload, RoomAutonomyMode } from "./types";
import type { RoomAutonomyRunEvent } from "./types";

const TOKEN_KEY = "agency-command-token";

export interface MeshEventStreamHandlers {
  onError: () => void;
  onAutonomyEvent?: (events: RoomAutonomyRunEvent[]) => void;
  onHeartbeat: (generatedAt: string) => void;
  onOpen: () => void;
  onSnapshot: (payload: BootstrapPayload, generatedAt: string) => void;
}

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setStoredToken(token: string): void {
  if (token.trim()) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function loadBootstrap(token: string): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/bootstrap", { token });
}

export async function seedDemo(token: string): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/demo/seed", { method: "POST", token });
}

export async function createJob(token: string, goal: string): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/jobs", {
    body: JSON.stringify({ goal }),
    method: "POST",
    token,
  });
}

export async function runMeshDispatch(token: string): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/mesh/dispatch", {
    method: "POST",
    token,
  });
}

export type MeshMessageScope = "project" | "room" | "all";

export async function sendMeshConversation(
  token: string,
  input: {
    message: string;
    scope?: MeshMessageScope;
    projectId?: string;
    roomId?: string;
    subject?: string;
    expectedOutput?: string;
    priority?: "low" | "normal" | "high";
    requiresReply?: boolean;
  },
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/mesh/message", {
    body: JSON.stringify(input),
    method: "POST",
    token,
  });
}

export async function sendMeshHelp(
  token: string,
  input: {
    expectedOutput?: string;
    message: string;
    subject?: string;
    to: string;
  },
): Promise<BootstrapPayload> {
  return sendMeshConversation(token, {
    message: input.message,
    projectId: input.to,
    scope: "project",
    subject: input.subject,
    expectedOutput: input.expectedOutput,
    requiresReply: true,
  });
}

export async function loadRooms(token: string): Promise<AgentRoomsState> {
  const payload = await api<{ rooms: AgentRoomsState }>("/api/rooms", { token });
  return payload.rooms;
}

export async function runRoomAutonomy(
  token: string,
  input?: {
    allowSuggestions?: boolean;
    allowLearningInitiatives?: boolean;
    maxTasksPerRoom?: number;
    maxTasksTotal?: number;
    targetRoomId?: string;
  },
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/rooms/autonomy/run", {
    body: JSON.stringify(input ?? {}),
    method: "POST",
    token,
  });
}

export async function runRoomAutonomySimulation(
  token: string,
  input?: {
    allowSuggestions?: boolean;
    allowLearningInitiatives?: boolean;
    maxTasksPerRoom?: number;
    maxTasksTotal?: number;
    targetRoomId?: string;
  },
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/rooms/autonomy/simulate", {
    body: JSON.stringify(input ?? {}),
    method: "POST",
    token,
  });
}

export async function updateRoomPolicy(
  token: string,
  roomId: string,
  input: {
    autonomyMode?: RoomAutonomyMode;
    learningInitiativesEnabled?: boolean;
    capacity?: {
      maxDailyAutonomousRuns?: number;
      maxParallelClaims?: number;
    };
    actionPolicy?: NonNullable<AgentRoom["actionPolicy"]>;
  },
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>(`/api/rooms/${encodeURIComponent(roomId)}/policy`, {
    body: JSON.stringify(input),
    method: "PATCH",
    token,
  });
}

export async function createRoomTask(
  token: string,
  input: {
    acceptanceCriteria?: string[];
    assignedAgentId?: string | null;
    autonomyLevel?: RoomAutonomyMode;
    dependencies?: string[];
    dueDate?: string | null;
    executionMode?: "auto" | "human-review";
    objective: string;
    priority?: "urgent" | "high" | "normal" | "low";
    riskLevel?: "low" | "medium" | "high";
    requiresHumanReview?: boolean;
    riskSignals?: string[];
    requestedBy?: string;
    sourceRoomId?: string;
    roomId: string;
    target?: string;
    title: string;
  },
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/rooms/tasks", {
    body: JSON.stringify(input),
    method: "POST",
    token,
  });
}

export async function suggestRoomTask(
  token: string,
  input: {
    autonomyLevel?: RoomAutonomyMode;
    dueDate?: string | null;
    objective: string;
    priority?: "urgent" | "high" | "normal" | "low";
    sourceTaskId: string;
    targetRoomId: string;
    title: string;
  },
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>(`/api/rooms/tasks/${encodeURIComponent(input.sourceTaskId)}/suggest`, {
    body: JSON.stringify(input),
    method: "POST",
    token,
  });
}

export async function claimRoomTask(
  token: string,
  taskId: string,
  input: { agentId: string; leaseMinutes?: number; reason?: string; target?: string },
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>(`/api/rooms/tasks/${encodeURIComponent(taskId)}/claim`, {
    body: JSON.stringify(input),
    method: "POST",
    token,
  });
}

export async function runRoomAudit(token: string): Promise<BootstrapPayload> {
  return api<BootstrapPayload>("/api/rooms/audit", {
    method: "POST",
    token,
  });
}

export async function releaseRoomTask(
  token: string,
  taskId: string,
  reason?: string,
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>(`/api/rooms/tasks/${encodeURIComponent(taskId)}/release`, {
    body: JSON.stringify({ reason }),
    method: "POST",
    token,
  });
}

export async function resolveApproval(
  token: string,
  approvalId: string,
  decision: "approve" | "deny",
): Promise<BootstrapPayload> {
  return api<BootstrapPayload>(`/api/approvals/${approvalId}/${decision}`, {
    body: JSON.stringify({ note: decision === "deny" ? "Denied from Agency Command web." : "" }),
    method: "POST",
    token,
  });
}

export function subscribeToMeshEvents(token: string, handlers: MeshEventStreamHandlers): () => void {
  const trimmedToken = token.trim();
  const source = new EventSource(trimmedToken ? `/api/events?token=${encodeURIComponent(trimmedToken)}` : "/api/events");

  source.onopen = handlers.onOpen;
  source.onerror = handlers.onError;
  source.addEventListener("snapshot", (event) => {
    try {
      const payload = JSON.parse(event.data) as {
        generatedAt: string;
        payload: BootstrapPayload;
      };
      handlers.onSnapshot(payload.payload, payload.generatedAt);
    } catch {
      handlers.onError();
    }
  });
  source.addEventListener("heartbeat", (event) => {
    try {
      const payload = JSON.parse(event.data) as { generatedAt: string };
      handlers.onHeartbeat(payload.generatedAt);
    } catch {
      handlers.onError();
    }
  });

  source.addEventListener("autonomy", (event) => {
    if (!handlers.onAutonomyEvent) {
      return;
    }

    try {
      const payload = JSON.parse(event.data) as { events: RoomAutonomyRunEvent[] };
      const events = payload.events;
      if (Array.isArray(events) && events.length) {
        handlers.onAutonomyEvent(events);
      }
    } catch {
      handlers.onError();
    }
  });

  return () => source.close();
}

async function api<T>(
  path: string,
  options: RequestInit & { token: string },
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(String(payload.error ?? response.statusText));
  }

  return response.json() as Promise<T>;
}
