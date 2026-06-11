import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FolderOpen,
  Gauge,
  Inbox,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquareText,
  Network,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Save,
  Zap,
} from "lucide-react";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createJob,
  getStoredToken,
  loadBootstrap,
  resolveApproval,
  claimRoomTask,
  runMeshDispatch,
  runRoomAutonomy,
  runRoomAutonomySimulation,
  seedDemo,
  updateRoomPolicy,
  releaseRoomTask,
  sendMeshConversation,
  suggestRoomTask,
  setStoredToken,
  subscribeToMeshEvents,
  runRoomAudit,
} from "./api";
import type { MeshMessageScope } from "./api";
import type {
  AgentRoom,
  Approval,
  BootstrapPayload,
  CommandCenterItem,
  Job,
  MeshEvent,
  MeshHeartbeat,
  MeshMessage,
  MeshProject,
  RoomAgent,
  RoomClaim,
  RoomAutonomyRunEvent,
  RoomAutonomyRunResult,
  RoomAutonomyMode,
  RoomTask,
  TomorrowPlanItem,
} from "./types";

type RoomAction = "mesh.help" | "room.audit" | "task.create" | "task.release" | "task.claim" | "task.suggest" | "mesh.dispatch";

type RoomRiskLevel = "low" | "medium" | "high";

type RoomActionPolicyDraft = {
  disabled?: boolean;
  maxTaskRiskLevel?: RoomRiskLevel;
  minAutonomy?: RoomAutonomyMode;
};

type RoomActionPolicyFormValue = {
  disabled: boolean;
  maxTaskRiskLevel: RoomRiskLevel | "";
  minAutonomy: RoomAutonomyMode | "";
};

type RoomActionPolicyForm = Partial<Record<RoomAction, RoomActionPolicyFormValue>>;

type RoomActionPolicyDrafts = Partial<Record<RoomAction, RoomActionPolicyDraft>>;

type RoomPolicyForm = {
  autonomyMode: RoomAutonomyMode | "";
  learningInitiativesEnabled: boolean;
  capacity: {
    maxDailyAutonomousRuns: string;
    maxParallelClaims: string;
  };
  actionPolicy: RoomActionPolicyForm;
};

type RoomPolicyPayload = {
  autonomyMode?: RoomAutonomyMode;
  learningInitiativesEnabled?: boolean;
  capacity?: {
    maxDailyAutonomousRuns?: number;
    maxParallelClaims?: number;
  };
  actionPolicy?: RoomActionPolicyDrafts;
};

const roomActionRows: Array<{
  action: RoomAction;
  label: string;
  hint: string;
}> = [
  { action: "task.create", label: "task.create", hint: "Allow room to create new tasks." },
  { action: "task.release", label: "task.release", hint: "Allow releasing claims/requeues." },
  { action: "task.claim", label: "task.claim", hint: "Allow manual/automatic claiming work." },
  { action: "task.suggest", label: "task.suggest", hint: "Allow generating cross-room suggestions." },
  { action: "mesh.help", label: "mesh.help", hint: "Allow context requests from other rooms." },
  { action: "room.audit", label: "room.audit", hint: "Allow periodic audit cycles." },
  { action: "mesh.dispatch", label: "mesh.dispatch", hint: "Allow dispatching context messages." },
];

function buildRoomPolicyForm(room: AgentRoom): RoomPolicyForm {
  return roomActionRows.reduce(
    (acc, { action }) => {
      const actionPolicy = room.actionPolicy?.[action];
      acc.actionPolicy[action] = {
        disabled: Boolean(actionPolicy?.disabled),
        maxTaskRiskLevel: actionPolicy?.maxTaskRiskLevel ?? "",
        minAutonomy: actionPolicy?.minAutonomy ?? "",
      };
      return acc;
    },
    {
      autonomyMode: room.autonomyMode,
      learningInitiativesEnabled: room.learningInitiativesEnabled,
      capacity: {
        maxDailyAutonomousRuns: String(room.capacity.maxDailyAutonomousRuns),
        maxParallelClaims: String(room.capacity.maxParallelClaims),
      },
      actionPolicy: {} as RoomActionPolicyForm,
    },
  );
}

function normalizePolicyPayload(form: RoomPolicyForm): RoomPolicyPayload {
  const normalizedAutonomyMode = form.autonomyMode || undefined;
  const normalizedCapacity: RoomPolicyPayload["capacity"] = {};

  const maxDailyAutonomousRuns = Number.parseInt(form.capacity.maxDailyAutonomousRuns, 10);
  if (Number.isFinite(maxDailyAutonomousRuns)) {
    normalizedCapacity.maxDailyAutonomousRuns = Math.max(0, maxDailyAutonomousRuns);
  }

  const maxParallelClaims = Number.parseInt(form.capacity.maxParallelClaims, 10);
  if (Number.isFinite(maxParallelClaims)) {
    normalizedCapacity.maxParallelClaims = Math.max(0, maxParallelClaims);
  }

  const payload: RoomPolicyPayload = {
    autonomyMode: normalizedAutonomyMode,
    learningInitiativesEnabled: form.learningInitiativesEnabled,
  };

  if (normalizedCapacity.maxDailyAutonomousRuns !== undefined || normalizedCapacity.maxParallelClaims !== undefined) {
    payload.capacity = normalizedCapacity;
  }

  const actionPolicyEntries = Object.entries(form.actionPolicy).flatMap(([action, policy]) => {
    if (!policy) {
      return [];
    }

    const normalizedPolicy: RoomActionPolicyDraft = { disabled: policy.disabled };

    if (policy.minAutonomy) {
      normalizedPolicy.minAutonomy = policy.minAutonomy;
    }

    if (policy.maxTaskRiskLevel) {
      normalizedPolicy.maxTaskRiskLevel = policy.maxTaskRiskLevel;
    }

    return Object.keys(normalizedPolicy).length ? [[action as RoomAction, normalizedPolicy]] : [];
  });

  if (actionPolicyEntries.length) {
    payload.actionPolicy = Object.fromEntries(actionPolicyEntries);
  }

  return payload;
}

type ViewKey = "command" | "office" | "clients" | "delivery" | "finance" | "approvals" | "mesh" | "agent";
type LiveMeshStatus = "connecting" | "live" | "reconnecting" | "offline";
type MeshPanelMode = "mailbox" | "history";
type OfficeRouteSignalFeed = MeshEvent | RoomAutonomyRunEvent;

const navItems: Array<{ icon: typeof LayoutDashboard; key: ViewKey; label: string }> = [
  { icon: LayoutDashboard, key: "command", label: "Command" },
  { icon: Building2, key: "office", label: "Office" },
  { icon: Users, key: "clients", label: "Clients" },
  { icon: BriefcaseBusiness, key: "delivery", label: "Delivery" },
  { icon: CircleDollarSign, key: "finance", label: "Finance" },
  { icon: ShieldCheck, key: "approvals", label: "Approvals" },
  { icon: Network, key: "mesh", label: "Mesh" },
  { icon: Bot, key: "agent", label: "Agent" },
];

const mobileNavItems = navItems.filter((item) =>
  ["command", "office", "approvals", "mesh", "agent"].includes(item.key),
);

export function App() {
  const [activeView, setActiveView] = useState<ViewKey>(() => viewFromHash());
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(getStoredToken());
  const [tokenDraft, setTokenDraft] = useState(getStoredToken());
  const [taskDraft, setTaskDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveMeshStatus>("connecting");
  const [lastLiveAt, setLastLiveAt] = useState<string | null>(null);
  const [meshProjectFilterId, setMeshProjectFilterId] = useState<string | null>(null);
  const [meshProjectFilterMode, setMeshProjectFilterMode] = useState<MeshPanelMode>("mailbox");
  const [meshComposerProjectId, setMeshComposerProjectId] = useState<string>("");
  const [meshComposerScope, setMeshComposerScope] = useState<MeshMessageScope>("project");
  const [meshComposerRoomId, setMeshComposerRoomId] = useState<string>("");
  const [meshComposerSubject, setMeshComposerSubject] = useState("");
  const [meshComposerMessage, setMeshComposerMessage] = useState("");
  const [officeRouteSignals, setOfficeRouteSignals] = useState<Array<OfficeRouteSignalFeed>>([]);

  const ROUTE_SIGNAL_TTL_MS = 22_000;
  const ROUTE_SIGNAL_MAX_ITEMS = 45;

  function pruneRouteSignals(signals: Array<OfficeRouteSignalFeed>): Array<OfficeRouteSignalFeed> {
    const now = Date.now();
    return signals
      .filter((signal) => {
        const signalDate = Date.parse(signal.createdAt);
        return Number.isFinite(signalDate) ? now - signalDate <= ROUTE_SIGNAL_TTL_MS : false;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, ROUTE_SIGNAL_MAX_ITEMS);
  }

  function normalizeSignalQueue(
    current: Array<OfficeRouteSignalFeed>,
    incoming: Array<OfficeRouteSignalFeed>,
  ): Array<OfficeRouteSignalFeed> {
    const seen = new Map<string, OfficeRouteSignalFeed>();
    const now = Date.now();

    for (const signal of pruneRouteSignals(current)) {
      const parsed = Date.parse(signal.createdAt);
      if (Number.isFinite(parsed) && now - parsed <= ROUTE_SIGNAL_TTL_MS) {
        seen.set(signal.id, signal);
      }
    }

    for (const signal of incoming) {
      const parsed = Date.parse(signal.createdAt);
      if (Number.isFinite(parsed) && now - parsed <= ROUTE_SIGNAL_TTL_MS) {
        seen.set(signal.id, signal);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, ROUTE_SIGNAL_MAX_ITEMS);
  }

  function applyBootstrapPayload(next: BootstrapPayload) {
    const autonomySignals = next.roomsAutonomyRun?.events ?? [];
    setBootstrap(next);
    setOfficeRouteSignals((current) => normalizeSignalQueue(current, [...next.mesh.events, ...autonomySignals]));
  }

  async function refresh(nextToken = token) {
    setLoading(true);
    setError(null);
    try {
      const payload = await loadBootstrap(nextToken);
      applyBootstrapPayload(payload);
      setStoredToken(nextToken);
      setToken(nextToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLiveStatus("connecting");
    const unsubscribe = subscribeToMeshEvents(token, {
      onError: () => setLiveStatus("reconnecting"),
      onHeartbeat: (generatedAt) => {
        setLastLiveAt(generatedAt);
        setLiveStatus("live");
      },
      onOpen: () => setLiveStatus("live"),
      onSnapshot: (payload, generatedAt) => {
        applyBootstrapPayload(payload);
        setLastLiveAt(generatedAt);
        setLoading(false);
        setError(null);
        setLiveStatus("live");
      },
      onAutonomyEvent: (events) => {
        setOfficeRouteSignals((current) => normalizeSignalQueue(current, events));
      },
    });

    return () => {
      unsubscribe();
      setLiveStatus("offline");
    };
  }, [token]);

  useEffect(() => {
    function handleHashChange() {
      setActiveView(viewFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function goToView(view: ViewKey) {
    if (view !== "mesh") {
      setMeshProjectFilterId(null);
      setMeshProjectFilterMode("mailbox");
    }
    setActiveView(view);
    window.history.replaceState(null, "", `#${view}`);
  }

  function openMesh(
    projectId?: string | null,
    mode: MeshPanelMode = "mailbox",
    messageHint?: string,
    scope: MeshMessageScope = projectId ? "project" : "all",
  ) {
    const targetProjectId = projectId ?? null;
    setMeshProjectFilterId(targetProjectId);
    setMeshProjectFilterMode(mode);
    const targetProject = targetProjectId ? bootstrap?.mesh.projects.find((project) => project.id === targetProjectId) : null;
    const projectSubject = targetProject ? `Office request for ${targetProject.name}` : "Office message";
    const projectMessage = messageHint
      ? messageHint
      : targetProject
        ? defaultMeshHelpDraft(targetProject)
        : "";
    setMeshComposerScope(scope);
    setMeshComposerProjectId(targetProjectId ?? "");
    setMeshComposerRoomId("");
    setMeshComposerSubject(projectSubject);
    setMeshComposerMessage(projectMessage);
    goToView("mesh");
  }

  const metrics = useMemo(() => {
    const admin = bootstrap?.agency.admin;
    const delivery = bootstrap?.agency.delivery;
    return [
      {
        accent: "teal",
        icon: Gauge,
        label: "Executive queue",
        value: bootstrap?.agency.commandCenter.executiveQueue.length ?? 0,
      },
      {
        accent: "red",
        icon: AlertTriangle,
        label: "Overdue receivables",
        value: admin?.overdueFinancialItems.length ?? 0,
      },
      {
        accent: "amber",
        icon: ShieldCheck,
        label: "Blocked approvals",
        value: delivery?.blockedApprovals.length ?? 0,
      },
      {
        accent: "blue",
        icon: ClipboardList,
        label: "Active campaigns",
        value: delivery?.activeCampaigns.length ?? 0,
      },
    ];
  }, [bootstrap]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await refresh(tokenDraft);
  }

  async function handleSeed() {
    setSubmitting(true);
    try {
      applyBootstrapPayload(await seedDemo(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTask(event: FormEvent) {
    event.preventDefault();
    const goal = taskDraft.trim();
    if (!goal) return;

    setSubmitting(true);
    try {
      const payload = await createJob(token, goal);
      applyBootstrapPayload(payload);
      setTaskDraft("");
      goToView("agent");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproval(approvalId: string, decision: "approve" | "deny") {
    setSubmitting(true);
    try {
      applyBootstrapPayload(await resolveApproval(token, approvalId, decision));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRunBridge() {
    setSubmitting(true);
    try {
      applyBootstrapPayload(await runMeshDispatch(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRunRoomAudit() {
    setSubmitting(true);
    try {
      applyBootstrapPayload(await runRoomAudit(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRunRoomAutonomy(
    targetRoomId?: string | null,
    options: { allowLearningInitiatives?: boolean } = {},
  ) {
    setSubmitting(true);
    try {
      const payload = await runRoomAutonomy(
        token,
        targetRoomId?.trim()
          ? {
              targetRoomId,
              allowLearningInitiatives: options.allowLearningInitiatives,
            }
              : {
                  allowLearningInitiatives: options.allowLearningInitiatives,
                },
      );
      applyBootstrapPayload(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRunRoomAutonomySimulation(
    targetRoomId?: string | null,
    options: { allowLearningInitiatives?: boolean } = {},
  ) {
    setSubmitting(true);
    try {
      const payload = await runRoomAutonomySimulation(
        token,
        targetRoomId?.trim()
          ? {
              targetRoomId,
              allowLearningInitiatives: options.allowLearningInitiatives,
            }
          : {
              allowLearningInitiatives: options.allowLearningInitiatives,
            },
      );
      applyBootstrapPayload(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRoomPolicy(roomId: string, input: RoomPolicyPayload) {
    setSubmitting(true);
    try {
      applyBootstrapPayload(await updateRoomPolicy(token, roomId, input));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMeshHelp(project: MeshProject, message: string) {
    await handleMeshConversation({
      message,
      projectId: project.id,
      scope: "project",
      subject: `Agent Office request for ${project.name}`,
      requiresReply: true,
    });
  }

  async function handleMeshConversation(input: {
    message: string;
    subject: string;
    scope: MeshMessageScope;
    projectId?: string;
    roomId?: string;
    requiresReply?: boolean;
  }) {
    setSubmitting(true);
    try {
      const bootstrapPayload = await sendMeshConversation(token, {
        message: input.message,
        scope: input.scope,
        projectId: input.projectId,
        roomId: input.roomId,
        subject: input.subject,
        requiresReply: input.requiresReply,
      });
      applyBootstrapPayload(bootstrapPayload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTaskClaim(taskId: string, agentId: string) {
    setSubmitting(true);
    try {
      applyBootstrapPayload(
        await claimRoomTask(token, taskId, {
          agentId,
          reason: `Manual claim from Office mission queue.`,
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTaskRelease(taskId: string) {
    setSubmitting(true);
    try {
      applyBootstrapPayload(await releaseRoomTask(token, taskId, "Release from Office mission queue."));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTaskSuggest(taskId: string, targetRoomId: string, title: string, objective: string) {
    setSubmitting(true);
    try {
      applyBootstrapPayload(
        await suggestRoomTask(token, {
          sourceTaskId: taskId,
          targetRoomId,
          title,
          objective,
          priority: "normal",
          autonomyLevel: "suggest",
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!bootstrap && error === "Unauthorized") {
    return (
      <main className="login-screen">
        <form className="login-panel" onSubmit={handleLogin}>
          <ShieldCheck size={34} />
          <h1>Agency Command</h1>
          <p>Enter the access code to open the private Office.</p>
          <input
            autoFocus
            placeholder="Access code"
            type="password"
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
          />
          <button type="submit">Enter</button>
        </form>
      </main>
    );
  }

  return (
    <div className={activeView === "office" ? "app-shell office-shell" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">AC</span>
          <div>
            <strong>Agency Command</strong>
            <small>AI operating system</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={activeView === item.key ? "active" : ""}
              key={item.key}
              onClick={() => goToView(item.key)}
              type="button"
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>{titleFor(activeView)}</h1>
            <p>Online operation for desktop and iPhone</p>
          </div>
          <div className="topbar-actions">
            <StatusDot label={bootstrap?.runtime.openaiConfigured ? "OpenAI active" : "OpenAI pending"} ok={Boolean(bootstrap?.runtime.openaiConfigured)} />
            <StatusDot label={bootstrap?.runtime.telegramConfigured ? "Telegram active" : "Telegram optional"} ok={Boolean(bootstrap?.runtime.telegramConfigured)} />
            <StatusDot label={liveStatusLabel(liveStatus, lastLiveAt)} ok={liveStatus === "live"} />
            <button className="icon-button" onClick={() => refresh()} type="button" title="Refresh">
              {loading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            </button>
          </div>
        </header>

        {error && error !== "Unauthorized" ? <div className="error-bar">{error}</div> : null}

        <main className={activeView === "office" ? "content-grid office-mode" : "content-grid"}>
          <section className="primary-surface">
            {activeView === "command" && bootstrap ? (
              <CommandView data={bootstrap} metrics={metrics} onSeed={handleSeed} submitting={submitting} />
            ) : null}
            {activeView === "office" && bootstrap ? (
              <OfficeView
                data={bootstrap}
                liveStatus={liveStatus}
                lastLiveAt={lastLiveAt}
                routeSignals={officeRouteSignals}
                onAsk={handleMeshHelp}
                onOpenMesh={openMesh}
                onClaimTask={handleTaskClaim}
                onReleaseTask={handleTaskRelease}
                onSuggestTask={handleTaskSuggest}
                onRunBridge={handleRunBridge}
                onRunAutonomy={handleRunRoomAutonomy}
                onRunAutonomySimulation={handleRunRoomAutonomySimulation}
                onRunAudit={handleRunRoomAudit}
                onUpdateRoomPolicy={handleUpdateRoomPolicy}
                roomsAutonomyRun={bootstrap.roomsAutonomyRun ?? null}
                onHelpError={setError}
                submitting={submitting}
              />
            ) : null}
            {activeView === "clients" && bootstrap ? <ClientsView data={bootstrap} /> : null}
            {activeView === "delivery" && bootstrap ? <DeliveryView data={bootstrap} /> : null}
            {activeView === "finance" && bootstrap ? <FinanceView data={bootstrap} /> : null}
            {activeView === "approvals" && bootstrap ? (
              <ApprovalsView approvals={bootstrap.approvals} onResolve={handleApproval} submitting={submitting} />
            ) : null}
            {activeView === "mesh" && bootstrap ? (
              <MeshView
                data={bootstrap}
                projectFilterId={meshProjectFilterId}
                projectFilterMode={meshProjectFilterMode}
                composerProjectId={meshComposerProjectId}
                composerScope={meshComposerScope}
                composerRoomId={meshComposerRoomId}
                composerSubject={meshComposerSubject}
                composerMessage={meshComposerMessage}
                onComposerProjectId={setMeshComposerProjectId}
                onComposerSubject={setMeshComposerSubject}
                onComposerMessage={setMeshComposerMessage}
                onComposerRoomId={setMeshComposerRoomId}
                onComposerScope={setMeshComposerScope}
                onAsk={handleMeshConversation}
                rooms={bootstrap.rooms.rooms}
                canSubmitMessage={Boolean(!submitting)}
              />
            ) : null}
            {activeView === "agent" && bootstrap ? <AgentView jobs={bootstrap.jobs} /> : null}
            {!bootstrap && loading ? <LoadingState /> : null}
          </section>

          {activeView !== "office" ? (
            <aside className="agent-rail">
              <form className="task-composer" onSubmit={handleTask}>
                <div className="section-title">
                  <MessageSquareText size={18} />
                  <span>New task</span>
                </div>
                <textarea
                  placeholder="Example: Build the weekly plan from the Command Center"
                  value={taskDraft}
                  onChange={(event) => setTaskDraft(event.target.value)}
                />
                <button disabled={submitting || !taskDraft.trim()} type="submit">
                  {submitting ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                  Send to agent
                </button>
              </form>

              <div className="rail-section">
                <div className="section-title">
                  <ShieldCheck size={18} />
                  <span>Approvals</span>
                </div>
                {bootstrap?.approvals.length ? (
                  bootstrap.approvals.slice(0, 3).map((approval) => (
                    <ApprovalMini key={approval.id} approval={approval} onResolve={handleApproval} />
                  ))
                ) : (
                  <p className="muted">No pending approvals.</p>
                )}
              </div>

              <div className="rail-section">
                <div className="section-title">
                  <Network size={18} />
                  <span>Mesh</span>
                </div>
                <p className="muted">
                  {bootstrap?.mesh.projects.length ?? 0} projects, {bootstrap?.mesh.inbox.length ?? 0} recent messages.
                </p>
              </div>
            </aside>
          ) : null}
        </main>
      </div>

      <nav className="mobile-nav">
        {mobileNavItems.map((item) => (
          <button className={activeView === item.key ? "active" : ""} key={item.key} onClick={() => goToView(item.key)} type="button">
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

type OfficeAgentStatus = "active" | "working" | "backend" | "paused";

type OfficeAgent = MeshProject & {
  heartbeat: MeshHeartbeat | null;
  officeStatus: OfficeAgentStatus;
  role: string;
  roomAgent: RoomAgent | null;
  roomId: string | null;
  tone: string;
  x: number;
  y: number;
  shortName: string;
};

type OfficeRoute = {
  createdAt: string;
  d: string;
  from: string;
  id: string;
  kind: MeshEvent["kind"] | RoomAutonomyRunEvent["kind"];
  messageId: string;
  midX: number;
  midY: number;
  open: boolean;
  motionSeconds: number;
  status: string;
  subject: string;
  to: string;
  sourceLabel: string;
};

type OfficeRouteSignalMap = {
  [roomId: string]: string;
};

const officeLayout: Record<string, { x: number; y: number }> = {
  "agent-system": { x: 38, y: 34 },
  "agente-vlmkt": { x: 22, y: 40 },
  "blog-outsider": { x: 68, y: 38 },
  "infinite-todo-app": { x: 15, y: 68 },
  "pesquisa-voos": { x: 28, y: 74 },
  "taoswap-engine": { x: 49, y: 58 },
  "tiger-2-0": { x: 27, y: 52 },
  "tiger-bot-dtao": { x: 83, y: 34 },
  "tiger-miner": { x: 60, y: 74 },
  "tiger-movie": { x: 78, y: 61 },
};

const officeRoles: Record<string, string> = {
  "agent-system": "Orchestration and Governance",
  "agente-vlmkt": "Agent Architecture",
  "blog-outsider": "Content and Cloudflare",
  "infinite-todo-app": "PWA local-first",
  "pesquisa-voos": "Flight Research",
  "taoswap-engine": "TaoSwap Content",
  "tiger-2-0": "Research and Audit",
  "tiger-bot-dtao": "dTAO Planning",
  "tiger-miner": "Mining and Wallet Safety",
  "tiger-movie": "Video and Creative",
};

const officeTones = ["mint", "blue", "amber", "green", "red", "violet", "cyan", "slate"];

const statusUi: Record<OfficeAgentStatus, { detail: string; label: string }> = {
  active: { detail: "Responsive", label: "ACTIVE" },
  backend: { detail: "No active thread", label: "BACKEND-ONLY" },
  paused: { detail: "Needs intervention", label: "PAUSED / ERROR" },
  working: { detail: "Running", label: "WORKING" },
};

  function OfficeView({
  data,
  routeSignals,
  liveStatus,
  lastLiveAt,
  onAsk,
  onOpenMesh,
  onClaimTask,
  onReleaseTask,
  onSuggestTask,
  onRunBridge,
  onRunAudit,
  onRunAutonomy,
  onRunAutonomySimulation,
  onUpdateRoomPolicy,
  roomsAutonomyRun,
  submitting,
  onHelpError,
}: {
  data: BootstrapPayload;
  routeSignals: Array<OfficeRouteSignalFeed>;
  liveStatus: LiveMeshStatus;
  lastLiveAt: string | null;
  onAsk: (project: MeshProject, message: string) => Promise<void>;
  onOpenMesh: (
    projectId?: string | null,
    mode?: "mailbox" | "history",
    messageHint?: string,
    scope?: MeshMessageScope,
  ) => void;
  onClaimTask: (taskId: string, agentId: string) => Promise<void>;
  onReleaseTask: (taskId: string) => Promise<void>;
  onSuggestTask: (taskId: string, targetRoomId: string, title: string, objective: string) => Promise<void>;
  onRunBridge: () => Promise<void>;
  onRunAudit: () => Promise<void>;
  onRunAutonomy: (targetRoomId?: string | null, options?: { allowLearningInitiatives?: boolean }) => Promise<void>;
  onRunAutonomySimulation: (targetRoomId?: string | null, options?: { allowLearningInitiatives?: boolean }) => Promise<void>;
  onUpdateRoomPolicy: (roomId: string, input: RoomPolicyPayload) => Promise<void>;
  roomsAutonomyRun: RoomAutonomyRunResult | null;
  onHelpError: (message: string) => void;
  submitting: boolean;
}) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(data.rooms.rooms[0]?.id ?? null);
  const activeRoomId = selectedRoomId && data.rooms.rooms.some((room) => room.id === selectedRoomId)
    ? selectedRoomId
    : data.rooms.rooms[0]?.id ?? null;
  const agents = useMemo(() => buildOfficeAgents(data), [data]);
  const [selectedId, setSelectedId] = useState("agent-system");
  const [helpDraft, setHelpDraft] = useState("");
  const selected = agents.find((agent) => agent.id === selectedId) ?? agents[0];
  const routes = useMemo(() => buildOfficeRoutes(data, agents, routeSignals), [agents, data, routeSignals]);
  const activityItems = useMemo(() => officeActivityItems(data, routeSignals), [data, routeSignals]);
  const visibleEvents = useMemo(() => data.mesh.events.slice(0, 10), [data]);
  const meshProjectsById = useMemo(() => new Map(data.mesh.projects.map((project) => [project.id, project])), [data.mesh.projects]);

  function openProjectWorkspace(project: OfficeAgent) {
    const messageHint = `Open workspace context for ${project.name}. Workspace root: ${project.workspaceRoot ?? "not informed yet"}.
What is the latest workspace state, current focus, and open dependencies?`;
    onOpenMesh(project.id, "mailbox", messageHint, "project");
  }

  function openProjectThread(project: OfficeAgent) {
    const messageHint = `Open thread context for ${project.name}. Thread ID: ${project.threadId ?? "not linked"}.
Share thread decisions, last tasks, and constraints for coordination.`;
    onOpenMesh(project.id, "mailbox", messageHint, "project");
  }

  function openProjectMemory(project: OfficeAgent) {
    const memoryLink = data.mesh.root ? `${data.mesh.root}/projects/${project.id}` : "";
    const messageHint = `Open public memory for ${project.name}: ${memoryLink}.
Review recent decisions, risks, and current commitments.`;
    onOpenMesh(project.id, "mailbox", messageHint, "project");
  }

  const statusCounts = useMemo(
    () =>
      agents.reduce<Record<OfficeAgentStatus, number>>(
        (counts, agent) => ({ ...counts, [agent.officeStatus]: counts[agent.officeStatus] + 1 }),
        { active: 0, backend: 0, paused: 0, working: 0 },
      ),
    [agents],
  );

  useEffect(() => {
    if (selected) {
      setHelpDraft(defaultMeshHelpDraft(selected));
    }
  }, [selected?.id]);

  if (!agents.length) {
    return <EmptyState icon={Building2} title="Empty Office" body="The Mesh has not returned projects to draw the office yet." />;
  }

  const threadedAgents = agents.filter((agent) => agent.threadId && agent.officeStatus !== "paused").length;
  const meshHealthy = !data.mesh.error && agents.length > 0;
  const helpDisabled =
    submitting ||
    !selected ||
    !helpDraft.trim() ||
    selected.id === "agent-system" ||
    selected.officeStatus === "backend" ||
    selected.officeStatus === "paused";

  async function handleSpecialistHelp(agent: RoomAgent, message: string) {
    const targetProject = agent.meshProjectId ? meshProjectsById.get(agent.meshProjectId) : null;
    if (!targetProject) {
      onHelpError(`Specialist ${agent.displayName} is not connected to a Mesh project yet.`);
      return;
    }
    await onAsk(targetProject, message);
  }

  return (
    <div className="office-view live-office">
      <div className="office-command-strip" aria-label="Agent Office status">
        <OfficeMetric
          icon={Activity}
          label="Active agents"
          tone="green"
          value={`${threadedAgents} / ${agents.length}`}
        />
        <OfficeMetric icon={ArrowRight} label="Open dispatches" tone="blue" value={data.mesh.dispatches.length} />
        <OfficeMetric icon={Inbox} label="Inbox messages" tone="amber" value={data.mesh.inbox.length} />
        <OfficeMetric
          icon={Zap}
          label="Mesh health"
          tone={meshHealthy ? "green" : "red"}
          value={meshHealthy ? "HEALTHY" : "ATTENTION"}
          waveform
        />
        <OfficeMetric
          icon={Activity}
          label="Live Mesh"
          tone={liveStatus === "live" ? "green" : "amber"}
          value={liveStatus === "live" ? "LIVE" : "SYNCING"}
        />
        <button className="office-refresh-button" disabled={submitting} onClick={onRunBridge} type="button">
          {submitting ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      <RoomOpsPanel
        activeRoomId={activeRoomId}
        rooms={data.rooms.rooms}
        agents={data.rooms.agents}
        tasks={data.rooms.tasks}
        claims={data.rooms.claims}
        tomorrow={data.rooms.tomorrow}
        audit={data.rooms.audit}
        meshRoot={data.mesh.root}
        meshInbox={data.mesh.inbox}
        meshOutbox={data.mesh.outbox}
        meshEvents={data.mesh.events}
        onRunAudit={onRunAudit}
        onRunAutonomy={onRunAutonomy}
        onRunAutonomySimulation={onRunAutonomySimulation}
        onUpdateRoomPolicy={onUpdateRoomPolicy}
        roomsAutonomyRun={roomsAutonomyRun}
        submitting={submitting}
        onSelectRoom={setSelectedRoomId}
        onAskSpecialist={handleSpecialistHelp}
        onClaimTask={onClaimTask}
        onReleaseTask={onReleaseTask}
        onSuggestTask={onSuggestTask}
        onOpenMesh={onOpenMesh}
      />

      <div className="office-layout live-office-layout">
        <section className="office-scene" aria-label="Live agent office">
          <div className="office-room" aria-hidden="true">
            <div className="office-back-wall">
              <div className="office-sign">
                <strong>AGENT OFFICE</strong>
                <span>AUTONOMOUS AGENT OFFICE</span>
              </div>
              <div className="office-protocol-board">
                <strong>MESH PROTOCOL</strong>
                <span>1. ANNOUNCE</span>
                <span>2. SHARE</span>
                <span>3. COLLABORATE</span>
                <span>4. EVOLVE</span>
              </div>
              <div className="office-clock">
                <Clock3 size={15} />
              </div>
              <div className="office-wall-status">
                {agents.slice(0, 10).map((agent) => (
                  <span className={`wall-dot ${agent.officeStatus}`} key={agent.id} title={agent.name}>
                    {agent.shortName.slice(0, 1)}
                  </span>
                ))}
              </div>
            </div>
            <div className="office-floor" />
            <div className="office-rug" />
            <div className="glass-room">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="office-couch" />
            <div className="office-shelf shelf-left" />
            <div className="office-shelf shelf-right" />
            <div className="office-printer" />
            <div className="office-water" />
            <span className="office-plant plant-a" />
            <span className="office-plant plant-b" />
            <span className="office-plant plant-c" />
            <span className="office-plant plant-d" />
          </div>

          <svg className="office-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {routes.map((route, index) => (
              <g key={route.id}>
                <path id={`office-route-${sanitizeDomId(route.id)}`} d={route.d} className={route.open ? "open" : ""} />
                <circle
                  className={route.open ? "route-packet open" : "route-packet"}
                  r={route.open ? 1.25 : 0.95}
                >
                  {route.open ? (
                    <animateMotion dur={`${route.motionSeconds.toFixed(1)}s`} begin={`${index * 0.2}s`} fill="freeze">
                      <mpath href={`#office-route-${sanitizeDomId(route.id)}`} />
                    </animateMotion>
                  ) : null}
                </circle>
              </g>
            ))}
          </svg>

          <div className="message-layer" aria-hidden="true">
            {routes.slice(0, 5).map((route, index) => (
              <MessageChip index={index} key={`${route.id}-chip`} route={route} />
            ))}
          </div>

          {agents.map((agent) => (
            <AgentDesk
              agent={agent}
              dimmed={Boolean(activeRoomId && agent.roomId && agent.roomId !== activeRoomId)}
              key={agent.id}
              selected={selected?.id === agent.id}
              onSelect={() => setSelectedId(agent.id)}
            />
          ))}

          <OfficeLegend counts={statusCounts} />
        </section>

        {selected ? (
          <aside className="office-details live-inspector">
            <div className="office-agent-header">
              <div className={`agent-avatar ${selected.officeStatus}`}>
                <span className="robot-head">
                  <span />
                </span>
              </div>
              <div>
                <span className={`inspector-status ${selected.officeStatus}`}>
                  <span />
                  {statusUi[selected.officeStatus].label}
                </span>
                <h2>{selected.name}</h2>
                <small>{selected.role}</small>
              </div>
            </div>

            <div className="inspector-section">
              <h3>Overview</h3>
              <dl className="agent-facts">
                <div>
                  <dt>Current task</dt>
                  <dd>{selected.heartbeat?.current_task ?? "Watching Mesh"}</dd>
                </div>
                <div>
                  <dt>Last seen</dt>
                  <dd>{formatClock(selected.heartbeat?.last_seen ?? null)} · {selected.heartbeat?.source ?? "registry"}</dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>{selected.scope}</dd>
                </div>
                <div>
                  <dt>Virtual room</dt>
                  <dd>{roomNameFor(data.rooms.rooms, selected.roomId)}</dd>
                </div>
                <div>
                  <dt>Autonomy</dt>
                  <dd>{roomAutonomyFor(data.rooms.rooms, selected.roomId)}</dd>
                </div>
                <div>
                  <dt>Workspace</dt>
                  <dd>{selected.workspaceRoot ?? "-"}</dd>
                </div>
                <div>
                  <dt>Thread ID</dt>
                  <dd>{selected.threadId ?? "no linked thread"}</dd>
                </div>
                <div>
                  <dt>Thread status</dt>
                  <dd>{selected.heartbeat?.status.toUpperCase() ?? (selected.threadId ? "ONLINE" : "BACKEND")}</dd>
                </div>
                <div>
                  <dt>Public memory</dt>
                  <dd>{`${data.mesh.root}/projects/${selected.id}`}</dd>
                </div>
                <div>
                  <dt>Inbox / Outbox</dt>
                  <dd>{selected.heartbeat?.inbox_count ?? 0} / {selected.heartbeat?.outbox_count ?? 0}</dd>
                </div>
              </dl>
            </div>

            <div className="inspector-section autonomy-focus">
              <div>
                <strong>Cockpit focus</strong>
                <span>Autonomy</span>
              </div>
              <p>Live events, scoped context requests, and human-gated sensitive actions.</p>
              <small>Last stream signal: {lastLiveAt ? formatClock(lastLiveAt) : liveStatus}</small>
            </div>

            <div className="inspector-section">
              <div className="inspector-heading">
                <h3>Related messages</h3>
                <span>{visibleEvents.filter((event) => event.from === selected.id || event.to === selected.id).length}</span>
              </div>
              <div className="inspector-messages">
                {visibleEvents
                  .filter((event) => event.from === selected.id || event.to === selected.id)
                  .slice(0, 3)
                  .map((event) => (
                    <div className="inspector-message" key={event.id}>
                      <Mail size={15} />
                      <div>
                        <strong>{event.subject}</strong>
                        <span>{event.from} {"->"} {event.to} · {event.kind}</span>
                      </div>
                      <small>{formatClock(event.createdAt)}</small>
                    </div>
                  ))}
                {visibleEvents.every((event) => event.from !== selected.id && event.to !== selected.id) ? (
                  <p className="muted">No recent messages linked to this agent.</p>
                ) : null}
              </div>
            </div>

            <form
              className="office-help-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (helpDisabled || !selected) return;
                await onAsk(selected, helpDraft.trim());
              }}
            >
              <label htmlFor="office-help">Mesh request</label>
              <textarea
                id="office-help"
                value={helpDraft}
                onChange={(event) => setHelpDraft(event.target.value)}
              />
              <button disabled={helpDisabled} type="submit">
                {submitting ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                Send message
              </button>
            </form>

            <div className="inspector-actions">
              <button
                type="button"
                onClick={() => void onAsk(selected, defaultMeshHelpDraft(selected))}
                disabled={submitting}
              >
                <MessageSquareText size={15} />
                Ask context
              </button>
                <button
                  type="button"
                  onClick={() => onOpenMesh(selected.id, "mailbox")}
                >
                  <Inbox size={15} />
                  View inbox/outbox
                </button>
                <button
                  type="button"
                  onClick={() => onOpenMesh(selected.id, "history")}
                >
                  <Clock3 size={15} />
                  View history
                </button>
                <button
                  type="button"
                  onClick={() => openProjectWorkspace(selected)}
                  disabled={!selected.workspaceRoot}
                >
                  <FolderOpen size={15} />
                  Open workspace
                </button>
                <button
                  type="button"
                  onClick={() => openProjectThread(selected)}
                  disabled={!selected.threadId}
                >
                  <ExternalLink size={15} />
                  Open thread
                </button>
                <button
                  type="button"
                  onClick={() => openProjectMemory(selected)}
                >
                  <FolderOpen size={15} />
                  Open memory
                </button>
              </div>
            </aside>
          ) : null}
      </div>

      <div className="office-activity-ticker">
        <span>Recent Mesh activity</span>
        <div>
          {activityItems.slice(0, 5).map((item) => (
            <strong key={item.id}>
              <span />
              {formatClock(item.date)} {item.title}
              <small>{item.meta}</small>
            </strong>
          ))}
        </div>
        <button type="button" onClick={() => onOpenMesh(undefined, "history", "Office full mesh history", "all")}>
          View all
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function OfficeMetric({
  icon: Icon,
  label,
  tone,
  value,
  waveform,
}: {
  icon: typeof Activity;
  label: string;
  tone: string;
  value: number | string;
  waveform?: boolean;
}) {
  return (
    <div className={`office-stat ${tone}`}>
      <span className="metric-dot" />
      <div>
        <Icon size={15} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {waveform ? <span className="health-wave" /> : null}
    </div>
  );
}

function RoomOpsPanel({
  activeRoomId,
  agents,
  claims,
  audit,
  meshEvents,
  meshInbox,
  meshOutbox,
  meshRoot,
  onRunAudit,
  onAskSpecialist,
  onClaimTask,
  onReleaseTask,
  onSuggestTask,
  onSelectRoom,
  rooms,
  tasks,
  onOpenMesh,
  onRunAutonomy,
  onRunAutonomySimulation,
  onUpdateRoomPolicy,
  roomsAutonomyRun,
  submitting,
  tomorrow,
}: {
  activeRoomId: string | null;
  agents: RoomAgent[];
  claims: RoomClaim[];
  audit: BootstrapPayload["rooms"]["audit"];
  meshEvents: MeshEvent[];
  meshInbox: MeshMessage[];
  meshOutbox: MeshMessage[];
  meshRoot: string;
  onRunAudit: () => Promise<void>;
  onAskSpecialist: (agent: RoomAgent, message: string) => Promise<void>;
  onClaimTask: (taskId: string, agentId: string) => Promise<void>;
  onReleaseTask: (taskId: string) => Promise<void>;
  onSuggestTask: (taskId: string, targetRoomId: string, title: string, objective: string) => Promise<void>;
  onSelectRoom: (roomId: string) => void;
  rooms: AgentRoom[];
  tasks: RoomTask[];
  onOpenMesh: (
    projectId?: string | null,
    mode?: "mailbox" | "history",
    messageHint?: string,
    scope?: MeshMessageScope,
  ) => void;
  onRunAutonomy: (targetRoomId?: string | null, options?: { allowLearningInitiatives?: boolean }) => Promise<void>;
  onRunAutonomySimulation: (targetRoomId?: string | null, options?: { allowLearningInitiatives?: boolean }) => Promise<void>;
  onUpdateRoomPolicy: (roomId: string, input: RoomPolicyPayload) => Promise<void>;
  roomsAutonomyRun: RoomAutonomyRunResult | null;
  submitting: boolean;
  tomorrow: TomorrowPlanItem[];
}) {
  const selectedRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  if (!selectedRoom) {
    return null;
  }

  const roomAgents = agents.filter((agent) => agent.roomId === selectedRoom.id);
  const roomClaims = claims.filter((claim) => claim.roomId === selectedRoom.id);
  const activeClaims = roomClaims.filter((claim) => claim.status === "active");
  const claimByTaskId = new Map(activeClaims.map((claim) => [claim.taskId, claim]));
  const roomTasks = tasks
    .filter((task) => task.roomId === selectedRoom.id && task.status !== "done")
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 4);
  const roomAuditItems = audit?.items.filter((item) => item.roomId === selectedRoom.id) ?? [];
  const roomAuditSummary = roomAuditItems.reduce(
    (acc, item) => {
      if (item.status === "live-thread") acc.liveThread += 1;
      if (item.status === "backend-only") acc.backendOnly += 1;
      if (item.status === "paused") acc.paused += 1;
      if (item.status === "repair-needed") acc.repairNeeded += 1;
      return acc;
    },
    { liveThread: 0, backendOnly: 0, paused: 0, repairNeeded: 0 },
  );
  const tomorrowItems = tomorrow
    .filter((item) => item.roomId === selectedRoom.id)
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, 3);
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const [selectedSpecialistId, setSelectedSpecialistId] = useState(roomAgents[0]?.id ?? null);
  const selectedSpecialist = roomAgents.find((agent) => agent.id === selectedSpecialistId) ?? roomAgents[0] ?? null;
  const [specialistDraft, setSpecialistDraft] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(roomTasks[0]?.id ?? null);
  const [suggestionRoomId, setSuggestionRoomId] = useState<string | null>(null);
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionObjective, setSuggestionObjective] = useState("");
  const [policyForm, setPolicyForm] = useState<RoomPolicyForm>(() => buildRoomPolicyForm(selectedRoom));
  const [policyDirty, setPolicyDirty] = useState(false);
  const autonomySummary = roomsAutonomyRun && (roomsAutonomyRun.targetRoomId === null || roomsAutonomyRun.targetRoomId === selectedRoom.id)
    ? roomsAutonomyRun
    : null;

  useEffect(() => {
    setPolicyForm(buildRoomPolicyForm(selectedRoom));
    setPolicyDirty(false);
  }, [selectedRoom.id]);

  useEffect(() => {
    if (!roomAgents.some((agent) => agent.id === selectedSpecialistId)) {
      setSelectedSpecialistId(roomAgents[0]?.id ?? null);
    }
  }, [roomAgents, selectedSpecialistId]);

  useEffect(() => {
    if (!roomTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(roomTasks[0]?.id ?? null);
    }
  }, [roomTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedSpecialist) {
      setSpecialistDraft("");
      return;
    }

    setSpecialistDraft(defaultSpecialistHelpDraft(selectedSpecialist, selectedRoom.name));
  }, [selectedRoom.name, selectedSpecialist]);

  const specialistProjectId = selectedSpecialist?.meshProjectId ?? null;
  const specialistHistory = specialistProjectId
    ? meshEvents
        .filter((event) => event.from === specialistProjectId || event.to === specialistProjectId)
        .slice(0, 4)
    : [];
  const specialistInbox = specialistProjectId
    ? meshInbox.filter((message) => message.to === specialistProjectId).slice(0, 4)
    : [];
  const specialistOutbox = specialistProjectId
    ? meshOutbox.filter((message) => message.from === specialistProjectId).slice(0, 4)
    : [];
  const specialistMailbox = [
    ...specialistInbox.map((message) => ({
      id: `inbox-${message.id}`,
      direction: "inbox",
      subject: message.subject,
      date: message.createdAt,
      from: message.from,
      to: message.to,
      status: message.status,
      kind: "",
    })),
    ...specialistOutbox.map((message) => ({
      id: `outbox-${message.id}`,
      direction: "outbox",
      subject: message.subject,
      date: message.createdAt,
      from: message.from,
      to: message.to,
      status: message.status,
      kind: "",
    })),
    ...specialistHistory.map((event) => ({
      id: `signal-${event.id}`,
      direction: "signal",
      subject: event.subject,
      date: event.createdAt,
      from: event.from,
      to: event.to,
      status: event.status,
      kind: event.kind,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const canMessageSpecialist = Boolean(selectedSpecialist?.meshProjectId && !submitting);
  const defaultSpecialistSubjectMessage = selectedSpecialist
    ? defaultSpecialistHelpDraft(selectedSpecialist, selectedRoom.name)
    : "";
  const availableSuggestionTargets = useMemo(
    () => rooms.filter((room) => room.id !== selectedRoom.id),
    [rooms, selectedRoom.id],
  );
  const canSuggestFromThisTask = availableSuggestionTargets.length > 0;
  const nowMs = Date.now();
  const roomDailyClaims = roomClaims.filter((claim) => {
    const claimedAt = Date.parse(claim.claimedAt);
    return Number.isNaN(claimedAt) ? false : claimedAt >= nowMs - 24 * 60 * 60 * 1000;
  });

  const selectedTask = selectedTaskId ? roomTasks.find((task) => task.id === selectedTaskId) ?? roomTasks[0] ?? null : null;
  useEffect(() => {
    if (!selectedTask) {
      setSuggestionTitle("");
      setSuggestionObjective("");
      return;
    }
    if (!suggestionRoomId || !availableSuggestionTargets.some((room) => room.id === suggestionRoomId)) {
      setSuggestionRoomId(availableSuggestionTargets[0]?.id ?? null);
    }

    setSuggestionTitle(`Follow-up from ${selectedRoom.name}: ${selectedTask.title}`);
    setSuggestionObjective(
      `Context objective from ${selectedTask.title} (Task ${selectedTask.id}):\n\n${selectedTask.objective}\n\nNext step suggested:`,
    );
  }, [availableSuggestionTargets, selectedRoom.id, selectedTask?.id, suggestionRoomId]);

  async function handleSendSpecialistMessage(message: string) {
    if (!selectedSpecialist || !canMessageSpecialist || !message.trim()) return;
    await onAskSpecialist(selectedSpecialist, message.trim());
    setSpecialistDraft(defaultSpecialistSubjectMessage);
  }

  async function handleClaimTask(task: RoomTask) {
    if (!selectedSpecialist) return;
    if (activeClaims.some((claim) => claim.taskId === task.id)) return;
    const gate = assessRoomTaskClaimGate(selectedRoom, task, roomClaims, roomDailyClaims, activeClaims);
    if (!gate.allowed) return;
    await onClaimTask(task.id, selectedSpecialist.id);
  }

  async function handleReleaseTask(task: RoomTask) {
    if (!claimByTaskId.has(task.id)) return;
    await onReleaseTask(task.id);
  }

  async function handleSuggestTaskFromSelection() {
    if (!selectedTask || !suggestionRoomId) return;

    const title = suggestionTitle.trim();
    const objective = suggestionObjective.trim();

    if (!title || !objective) return;
    await onSuggestTask(selectedTask.id, suggestionRoomId, title, objective);
    setSuggestionTitle("");
    setSuggestionObjective("");
  }

  function updatePolicyPatch(mutator: (input: RoomPolicyForm) => void) {
    setPolicyForm((current) => {
      const next = {
        ...current,
        actionPolicy: { ...current.actionPolicy },
      };
      mutator(next);
      return next;
    });
    setPolicyDirty(true);
  }

  function handlePolicyAutonomyMode(value: string) {
    if (value === "observe" || value === "suggest" || value === "execute" || value === "") {
      updatePolicyPatch((next) => {
        next.autonomyMode = value;
      });
    }
  }

  function handlePolicyCapacityField(key: "maxDailyAutonomousRuns" | "maxParallelClaims", value: string) {
    updatePolicyPatch((next) => {
      next.capacity[key] = value.trim();
    });
  }

  function handlePolicyActionField(
    action: RoomAction,
    key: keyof Omit<RoomActionPolicyFormValue, "disabled"> | "disabled",
    value: boolean | RoomRiskLevel | RoomAutonomyMode | "",
  ) {
    updatePolicyPatch((next) => {
      const currentAction = next.actionPolicy[action] ?? { disabled: false, maxTaskRiskLevel: "", minAutonomy: "" };
      if (key === "disabled") {
        currentAction.disabled = Boolean(value);
      } else {
        if (key === "maxTaskRiskLevel") {
          if (value === "" || value === "low" || value === "medium" || value === "high") {
            currentAction.maxTaskRiskLevel = value;
          }
        } else if (key === "minAutonomy") {
          if (value === "" || value === "observe" || value === "suggest" || value === "execute") {
            currentAction.minAutonomy = value;
          }
        }
      }
      next.actionPolicy[action] = currentAction;
    });
  }

  async function handleSavePolicy() {
    const payload = normalizePolicyPayload(policyForm);
    await onUpdateRoomPolicy(selectedRoom.id, payload);
    setPolicyDirty(false);
  }

  async function handleRunAutonomyForRoom() {
    await onRunAutonomy(selectedRoom.id);
  }

  async function handleRunAutonomySimulationForRoom() {
    await onRunAutonomySimulation(selectedRoom.id, { allowLearningInitiatives: true });
  }

  function openSpecialistWorkspace(agent: RoomAgent) {
    if (!agent.meshProjectId) {
      return;
    }
    onOpenMesh(agent.meshProjectId, "mailbox", `Open workspace context for ${agent.displayName}. Workspace root: ${agent.workspaceRoot ?? "not informed yet"}.
Share latest workspace status, files being edited, and constraints before the next task.`, "project");
  }

  function openSpecialistThread(agent: RoomAgent) {
    if (!agent.meshProjectId || !agent.threadId) {
      return;
    }
    onOpenMesh(agent.meshProjectId, "mailbox", `Open thread context for ${agent.displayName}. Thread ID: ${agent.threadId}.
Share thread decisions, recent replies, and immediate risks before routing this request.`, "project");
  }

  function openSpecialistMemory(agent: RoomAgent) {
    if (!agent.meshProjectId || !meshRoot) {
      return;
    }
    const memoryPath = `${meshRoot}/projects/${agent.meshProjectId}`;
    onOpenMesh(agent.meshProjectId, "mailbox", `Open public memory workspace for ${agent.displayName}: ${memoryPath}
Review recent decisions and keep project context in sync.`, "project");
  }

  return (
    <section className="room-ops-panel" aria-label="Agent Rooms OS">
      <div className="room-tabs" role="tablist" aria-label="Virtual rooms">
        {rooms.map((room) => {
          const count = agents.filter((agent) => agent.roomId === room.id).length;
          const openTasks = tasks.filter((task) => task.roomId === room.id && task.status !== "done").length;
          return (
            <button
              className={room.id === selectedRoom.id ? "active" : ""}
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              style={{ "--room-accent": room.color } as CSSProperties}
              type="button"
            >
              <strong>{room.name}</strong>
              <span>{room.autonomyMode} · {count} agents · {openTasks} tasks</span>
            </button>
          );
        })}
      </div>

      <div className="room-audit-strip">
        <div>
          <h3>Audit</h3>
          <p>
            {audit
              ? `${roomAuditSummary.liveThread} live · ${roomAuditSummary.repairNeeded} repair · ${roomAuditSummary.backendOnly} backend-only · ${roomAuditSummary.paused} paused`
              : "No audit yet"}
          </p>
          <small>Last run: {formatClock(audit?.generatedAt ?? null)}</small>
        </div>
        <button type="button" onClick={() => void onRunAudit()} disabled={submitting}>
          {submitting ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
          Run live audit
        </button>
      </div>

      <div className="room-ops-body" style={{ "--room-accent": selectedRoom.color } as CSSProperties}>
        <div className="room-mission">
          <span>Mission</span>
          <strong>{selectedRoom.mission}</strong>
          <p>{selectedRoom.policy}</p>
        </div>

        <div className="room-kpi-grid">
          <RoomKpi label="Autonomy" value={selectedRoom.autonomyMode.toUpperCase()} />
          <RoomKpi label="Capacity" value={`${activeClaims.length}/${selectedRoom.capacity.maxParallelClaims}`} />
          <RoomKpi label="Daily runs" value={selectedRoom.capacity.maxDailyAutonomousRuns} />
          <div className="room-governance">
            <h4>Room control</h4>
            <label htmlFor={`room-autonomy-${selectedRoom.id}`}>Autonomy mode</label>
            <select
              id={`room-autonomy-${selectedRoom.id}`}
              value={policyForm.autonomyMode}
              disabled={submitting}
              onChange={(event) => handlePolicyAutonomyMode(event.target.value)}
            >
              <option value="">Keep current</option>
              <option value="observe">Observe</option>
              <option value="suggest">Suggest</option>
              <option value="execute">Execute</option>
            </select>

            <label htmlFor={`room-daily-${selectedRoom.id}`}>Max daily autonomous runs</label>
            <input
              id={`room-daily-${selectedRoom.id}`}
              value={policyForm.capacity.maxDailyAutonomousRuns}
              onChange={(event) => handlePolicyCapacityField("maxDailyAutonomousRuns", event.target.value)}
              disabled={submitting}
              type="number"
              min={0}
              inputMode="numeric"
            />
            <label htmlFor={`room-parallel-${selectedRoom.id}`}>Max parallel claims</label>
            <input
              id={`room-parallel-${selectedRoom.id}`}
              value={policyForm.capacity.maxParallelClaims}
              onChange={(event) => handlePolicyCapacityField("maxParallelClaims", event.target.value)}
              disabled={submitting}
              type="number"
              min={0}
              inputMode="numeric"
            />

            <div className="room-governance-actions">
              <label className="room-autonomy-toggle">
                <input
                  checked={policyForm.learningInitiativesEnabled}
                  disabled={submitting}
                  onChange={(event) =>
                    updatePolicyPatch((next) => {
                      next.learningInitiativesEnabled = event.target.checked;
                    })
                  }
                  type="checkbox"
                />
                Allow learning initiatives
              </label>
              <button type="button" onClick={() => void handleRunAutonomyForRoom()} disabled={submitting}>
                {submitting ? <Loader2 className="spin" size={14} /> : <Zap size={14} />}
                Run room autonomy
              </button>
              <button type="button" onClick={() => void handleRunAutonomySimulationForRoom()} disabled={submitting}>
                {submitting ? <Loader2 className="spin" size={14} /> : <ClipboardList size={14} />}
                Simulate room autonomy
              </button>
              <button type="button" onClick={() => void handleSavePolicy()} disabled={!policyDirty || submitting}>
                {submitting ? <Loader2 className="spin" size={14} /> : <Save size={14} />}
                Save governance
              </button>
              <button
                type="button"
                onClick={() => {
                  setPolicyForm(buildRoomPolicyForm(selectedRoom));
                  setPolicyDirty(false);
                }}
                disabled={!policyDirty || submitting}
                title="Revert changes to the last saved policy"
              >
                Revert
              </button>
            </div>

            <small className="room-autonomy-summary">
              {autonomySummary
                ? `Last run ${formatClock(autonomySummary.triggeredAt)} · executed ${autonomySummary.executed.length} · skipped ${autonomySummary.skipped.length} · suggestions ${autonomySummary.suggestionsCreated} · learning ${autonomySummary.initiativesCreated}`
                : "No run for this room yet"}
            </small>

            {roomActionRows.map(({ action, label, hint }) => {
              const actionPolicy = policyForm.actionPolicy[action] ?? {
                disabled: false,
                maxTaskRiskLevel: "",
                minAutonomy: "",
              };

              return (
                <div className="room-action-policy" key={action}>
                  <div className="room-action-policy-head">
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </div>
                  <div className="room-action-policy-inputs">
                    <label>
                      <input
                        checked={Boolean(actionPolicy.disabled)}
                        onChange={(event) => handlePolicyActionField(action, "disabled", event.target.checked)}
                        type="checkbox"
                        disabled={submitting}
                      />
                      Disable action
                    </label>
                    <label>
                      Min autonomy
                      <select
                        value={actionPolicy.minAutonomy}
                        disabled={submitting}
                        onChange={(event) =>
                          handlePolicyActionField(action, "minAutonomy", event.target.value as RoomAutonomyMode | "")
                        }
                      >
                        <option value="">inherit</option>
                        <option value="observe">Observe</option>
                        <option value="suggest">Suggest</option>
                        <option value="execute">Execute</option>
                      </select>
                    </label>
                    <label>
                      Max risk
                      <select
                        value={actionPolicy.maxTaskRiskLevel}
                        disabled={submitting}
                        onChange={(event) =>
                          handlePolicyActionField(action, "maxTaskRiskLevel", event.target.value as RoomRiskLevel | "")
                        }
                      >
                        <option value="">inherit</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="room-column">
          <h3>Specialists</h3>
          <div className="room-agent-stack">
            {roomAgents.map((agent) => (
              <button
                className={`room-agent-pill ${agent.status} ${agent.id === selectedSpecialist?.id ? "active" : ""}`}
                key={agent.id}
                onClick={() => setSelectedSpecialistId(agent.id)}
                type="button"
              >
                <strong>{agent.displayName}</strong>
                <small>{agent.role}</small>
              </button>
            ))}
          </div>
          {selectedSpecialist ? (
            <div className="specialist-ops">
              <h4>{selectedSpecialist.displayName}</h4>
              <small>
                {selectedSpecialist.scope}
              </small>
              <div className="specialist-actions">
                <button
                  type="button"
                  disabled={!selectedSpecialist.meshProjectId || submitting}
                  onClick={() => void handleSendSpecialistMessage(defaultSpecialistSubjectMessage)}
                >
                  <MessageSquareText size={14} />
                  Ask context
                </button>
                <button
                  type="button"
                  disabled={!selectedSpecialist.workspaceRoot}
                  onClick={() => openSpecialistWorkspace(selectedSpecialist)}
                >
                  <FolderOpen size={14} />
                  Open workspace
                </button>
                <button
                  type="button"
                  disabled={!selectedSpecialist.threadId}
                  onClick={() => openSpecialistThread(selectedSpecialist)}
                >
                  <ExternalLink size={14} />
                  Open thread
                </button>
                <button
                  type="button"
                  disabled={!specialistProjectId}
                  onClick={() => openSpecialistMemory(selectedSpecialist)}
                >
                  <FolderOpen size={14} />
                  Open memory
                </button>
                <button
                  type="button"
                  disabled={!specialistProjectId}
                  onClick={() => onOpenMesh(specialistProjectId ?? undefined, "mailbox")}
                >
                  <Inbox size={14} />
                  Open inbox/outbox
                </button>
                <button
                  type="button"
                  disabled={!specialistProjectId}
                  onClick={() => onOpenMesh(specialistProjectId ?? undefined, "history")}
                >
                  <Clock3 size={14} />
                  Open history
                </button>
              </div>
              <form
                className="specialist-message-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await handleSendSpecialistMessage(specialistDraft);
                }}
              >
                <label htmlFor={`specialist-message-${selectedSpecialist.id}`}>Message to specialist</label>
                <textarea
                  id={`specialist-message-${selectedSpecialist.id}`}
                  rows={3}
                  value={specialistDraft}
                  onChange={(event) => setSpecialistDraft(event.target.value)}
                />
                <button disabled={!canMessageSpecialist || !specialistDraft.trim()} type="submit">
                  {submitting ? <Loader2 className="spin" size={14} /> : <Send size={14} />}
                  Send message
                </button>
              </form>
            </div>
          ) : null}
        </div>

        <div className="room-column">
          <h3>Mission queue</h3>
          <div className="room-task-stack">
            {roomTasks.length ? roomTasks.map((task) => {
              const claim = claimByTaskId.get(task.id);
              const isCurrentTask = task.id === selectedTask?.id;
              const claimedByMe = claim?.agentId === selectedSpecialist?.id;
              const claimedByOther = Boolean(claim && !claimedByMe);
              const claimGate = assessRoomTaskClaimGate(selectedRoom, task, roomClaims, roomDailyClaims, activeClaims);
              const canClaimSelected = Boolean(
                selectedSpecialist &&
                  !claim &&
                  claimGate.allowed &&
                  !submitting,
              );
              const claimLabel = claim
                ? `Claimed by ${agentById.get(claim.agentId)?.displayName ?? claim.agentId}`
                : "Unclaimed";
              const claimPolicyHint = claim
                ? null
                : claimGate.allowed
                  ? null
                  : claimGate.reason;

              return (
                <div
                  className={`room-task ${task.priority} ${isCurrentTask ? "active" : ""}`}
                  key={task.id}
                >
                  <span>{task.status}</span>
                  <strong>{task.title}</strong>
                  <small>{agentById.get(task.assignedAgentId ?? "")?.displayName ?? "unassigned"} · {task.target}</small>
                  <small>{claimLabel}</small>
                  {claimPolicyHint ? <small className="room-task-policy">Blocked: {claimPolicyHint}</small> : null}
                  <div className="room-task-actions">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <ArrowRight size={12} />
                      {isCurrentTask ? "Selected" : "Select"}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedSpecialist || submitting || (!claimedByMe && !canClaimSelected)}
                      onClick={() => {
                        if (claimedByMe) {
                          void handleReleaseTask(task);
                          return;
                        }

                        if (canClaimSelected) {
                          void handleClaimTask(task);
                        }
                      }}
                    >
                      {submitting ? <Loader2 className="spin" size={12} /> : claimedByMe ? <RefreshCw size={12} /> : <Send size={12} />}
                      {claimedByMe ? "Release" : claimedByOther ? "Claimed" : "Claim"}
                    </button>
                  </div>
                </div>
              );
            }) : <p className="muted">No active tasks for this room.</p>}
          </div>
      {selectedTask ? (
        <div className="specialist-ops">
          <div className="room-task-meta">
            <span className={`room-task-risk ${selectedTask.riskLevel}`}>Risk: {selectedTask.riskLevel}</span>
            <span className={`room-task-risk ${selectedTask.executionMode}`}>Mode: {selectedTask.executionMode}</span>
            {selectedTask.requiresHumanReview ? <span className="room-task-risk review">requires human review</span> : null}
          </div>
          <div className="specialist-activity">
            <small>
              <strong>Selected task:</strong> {selectedTask.objective}
            </small>
            <small>
              {selectedTask.dueDate ? `Due ${formatDate(selectedTask.dueDate)} · ` : null}
              Dependencies: {selectedTask.dependencies.length}
            </small>
            <small>Workspace source: {selectedTask.sourceRoomId ?? "local"} · Linked task: {selectedTask.linkedTaskId ?? "-"}</small>
          </div>
          <div className="specialist-activity">
            <small>
              <strong>Suggest a handoff task</strong>
            </small>
            <label htmlFor={`suggest-target-${selectedRoom.id}`}>Target room</label>
            <select
              id={`suggest-target-${selectedRoom.id}`}
              disabled={!canSuggestFromThisTask || submitting}
              value={suggestionRoomId ?? ""}
              onChange={(event) => setSuggestionRoomId(event.target.value || null)}
            >
              {availableSuggestionTargets.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <label htmlFor={`suggest-title-${selectedRoom.id}`}>Task title</label>
            <input
              id={`suggest-title-${selectedRoom.id}`}
              value={suggestionTitle}
              disabled={!canSuggestFromThisTask || submitting}
              onChange={(event) => setSuggestionTitle(event.target.value)}
            />
            <label htmlFor={`suggest-objective-${selectedRoom.id}`}>Task objective</label>
            <textarea
              id={`suggest-objective-${selectedRoom.id}`}
              value={suggestionObjective}
              rows={3}
              disabled={!canSuggestFromThisTask || submitting}
              onChange={(event) => setSuggestionObjective(event.target.value)}
            />
            <button
              type="button"
              disabled={
                !canSuggestFromThisTask || !suggestionTitle.trim() || !suggestionObjective.trim() || !suggestionRoomId || submitting
              }
              onClick={() => void handleSuggestTaskFromSelection()}
            >
              {submitting ? <Loader2 className="spin" size={14} /> : <Send size={14} />}
              Suggest to room
            </button>
          </div>
        </div>
          ) : null}
        </div>

        <div className="room-column">
          <h3>Tomorrow</h3>
          <div className="tomorrow-stack">
            {tomorrowItems.slice(0, 2).map((item) => (
              <div className={`tomorrow-item ${item.risk}`} key={item.id}>
                <span>{item.sequence}</span>
                <strong>{item.title}</strong>
                <small>{item.outcome}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="room-column">
          <h3>Specialist activity</h3>
            <div className="specialist-activity">
              <p className="muted">
                Inbox: {specialistInbox.length} | Outbox: {specialistOutbox.length} | Signals: {specialistHistory.length}
              </p>
            {specialistMailbox.length ? (
              specialistMailbox.map((message) => (
                <div className="tomorrow-item" key={message.id}>
                  <strong>{message.subject}</strong>
                  <small>
                    {message.direction}
                    {" · "}
                    {message.status}
                    {" · "}
                    {message.from} {"->"} {message.to}
                    {message.direction === "signal" ? ` · ${message.kind}` : null}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">No recent messages for this specialist.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function assessRoomTaskClaimGate(
  room: AgentRoom,
  task: RoomTask,
  roomClaims: RoomClaim[],
  roomDailyClaims: RoomClaim[],
  activeClaims: RoomClaim[],
): { allowed: boolean; reason: string; blockers: string[] } {
  const blockers: string[] = [];
  const autonomyOrder: Record<RoomAutonomyMode, number> = {
    observe: 0,
    suggest: 1,
    execute: 2,
  };
  const requiredMode: RoomAutonomyMode = "suggest";
  const effectiveMode = ((): RoomAutonomyMode => {
    if (autonomyOrder[task.autonomyLevel] >= autonomyOrder[room.autonomyMode]) {
      return room.autonomyMode;
    }
    return task.autonomyLevel;
  })();
  const statusBlockers: Record<RoomTask["status"], string | null> = {
    blocked: "Task is already blocked.",
    claimed: null,
    done: "Task already completed.",
    queued: null,
    review: "Task is under review.",
    running: "Task already running.",
  };
  const statusBlocker = statusBlockers[task.status];

  if (statusBlocker) {
    blockers.push(statusBlocker);
  }
  if (task.riskLevel === "high" || task.executionMode === "human-review" || task.requiresHumanReview) {
    blockers.push("High-risk or human-review tasks require explicit review before autonomous claim.");
  }

  if (autonomyOrder[task.autonomyLevel] > autonomyOrder[room.autonomyMode]) {
    blockers.push(`Task mode ${task.autonomyLevel.toUpperCase()} exceeds room mode ${room.autonomyMode.toUpperCase()}.`);
  }
  if (autonomyOrder[effectiveMode] < autonomyOrder[requiredMode]) {
    blockers.push(`Task claim requires ${requiredMode.toUpperCase()} mode.`);
  }
  if (activeClaims.length >= room.capacity.maxParallelClaims) {
    blockers.push(`Parallel claims limit reached: ${room.capacity.maxParallelClaims}.`);
  }
  if (effectiveMode === "execute" && roomDailyClaims.length >= room.capacity.maxDailyAutonomousRuns) {
    blockers.push(`Daily autonomous run limit reached: ${room.capacity.maxDailyAutonomousRuns}.`);
  }

  return {
    allowed: blockers.length === 0,
    reason: blockers.length ? blockers.join(" ") : "Allowed by room governance.",
    blockers,
  };
}

function RoomKpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="room-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MessageChip({ index, route }: { index: number; route: OfficeRoute }) {
  const sourceLabel = route.sourceLabel;
  return (
    <div
      className={route.open ? "message-chip open" : "message-chip"}
      style={{
        "--chip-delay": `${index * 0.45}s`,
        "--chip-x": `${route.midX}%`,
        "--chip-y": `${route.midY}%`,
      } as CSSProperties}
    >
      <Mail size={15} />
      <div>
        <strong>{sourceLabel} · {route.messageId.slice(0, 8)}</strong>
        <span>{route.subject}</span>
      </div>
    </div>
  );
}

function AgentDesk({
  agent,
  dimmed,
  onSelect,
  selected,
}: {
  agent: OfficeAgent;
  dimmed: boolean;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={`agent-desk ${agent.officeStatus} ${selected ? "selected" : ""} ${dimmed ? "dimmed" : ""}`}
      style={{
        "--agent-accent": agentAccent(agent),
        "--agent-delay": `${Math.abs(hashCode(agent.id) % 9) * -0.23}s`,
        "--agent-x": `${agent.x}%`,
        "--agent-y": `${agent.y}%`,
      } as CSSProperties}
      onClick={onSelect}
      type="button"
      title={agent.name}
    >
      <span className="agent-selection" />
      <span className="desk-shadow" />
      <span className="desk-model">
        <span className="desk-surface" />
        <span className="desk-leg leg-a" />
        <span className="desk-leg leg-b" />
        <span className="desk-monitor">
          <span />
        </span>
        <span className="desk-keyboard" />
        <span className="desk-plant" />
      </span>
      <span className={`desk-person ${agent.officeStatus}`}>
        <span className="person-head">
          <span />
        </span>
        <span className="person-body" />
        <span className="person-arm arm-a" />
        <span className="person-arm arm-b" />
      </span>
      <span className="agent-nameplate">
        <strong>{agent.shortName}</strong>
        <span className={`agent-status-light ${agent.officeStatus}`} />
        <em>{deskStatusLabel(agent.officeStatus)}</em>
      </span>
    </button>
  );
}

function OfficeLegend({ counts }: { counts: Record<OfficeAgentStatus, number> }) {
  return (
    <div className="office-legend">
      {(["active", "working", "backend", "paused"] as OfficeAgentStatus[]).map((status) => (
        <span key={status}>
          <i className={status} />
          <strong>{statusUi[status].label}</strong>
          <small>{counts[status]} · {statusUi[status].detail}</small>
        </span>
      ))}
    </div>
  );
}

function buildOfficeAgents(data: BootstrapPayload): OfficeAgent[] {
  const heartbeatByProject = new Map(data.mesh.heartbeats.map((heartbeat) => [heartbeat.projectId, heartbeat]));

  return data.mesh.projects.map((project, index) => {
    const layout = officeLayout[project.id] ?? fallbackDeskPosition(index);
    const heartbeat = heartbeatByProject.get(project.id) ?? null;
    const officeStatus = heartbeat ? heartbeatToOfficeStatus(heartbeat.status) : fallbackOfficeStatus(project);
    const roomAgent = primaryRoomAgentForProject(data.rooms.agents, project.id);

    return {
      ...project,
      ...layout,
      heartbeat,
      officeStatus,
      role: roomAgent?.role ?? officeRoles[project.id] ?? project.scope,
      roomAgent,
      roomId: roomAgent?.roomId ?? null,
      shortName: shortNameFor(project.name),
      tone: officeTones[index % officeTones.length],
    };
  });
}

function buildOfficeRoutes(data: BootstrapPayload, agents: OfficeAgent[], signals: Array<OfficeRouteSignalFeed>) {
  if (!signals.length) {
    return [];
  }

  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const agentsByRoom = new Map<string, OfficeAgent>();
  for (const agent of agents) {
    if (!agent.roomId || agentsByRoom.has(agent.roomId)) {
      continue;
    }

    agentsByRoom.set(agent.roomId, agent);
  }

  const routeSignals = signals.length ? signals : data.mesh.events;
  return routeSignals
    .slice(0, 16)
    .map((event, index) => routeFromEvent(event, agentById, agentsByRoom, index))
    .filter((route): route is NonNullable<typeof route> => Boolean(route));
}

function routeFromEvent(
  event: OfficeRouteSignalFeed,
  agentById: Map<string, OfficeAgent>,
  agentsByRoom: Map<string, OfficeAgent>,
  index: number,
): OfficeRoute | null {
  const now = Date.now();
  if (isMeshSignal(event)) {
    const from = agentById.get(event.from);
    const to = agentById.get(event.to);
    if (!from || !to || from.id === to.id) {
      return null;
    }

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const eventAge = Date.parse(event.createdAt);
    const isRecent = Number.isFinite(eventAge) ? now - eventAge <= 16000 : false;

    return {
      createdAt: event.createdAt,
      d: routePath(from.x, from.y, to.x, to.y, index),
      from: from.id,
      id: event.id,
      kind: event.kind,
      messageId: event.messageId,
      midX,
      midY,
      open: event.open || isRecent,
      motionSeconds: isRecent ? 2.2 : 4.1,
      status: event.status,
      subject: compactSubject(event.subject),
      sourceLabel: `Mesh`,
      to: to.id,
    };
  }

  const from = agentsByRoom.get(event.roomId);
  const toRoomId = event.targetRoomId ?? event.roomId;
  const matchedTo = agentsByRoom.get(toRoomId) ?? from;

  if (!from || !matchedTo) {
    return null;
  }

  const eventAge = Date.parse(event.createdAt);
  const isRecent = Number.isFinite(eventAge) ? now - eventAge <= 14000 : false;
  const to = from.id === matchedTo.id
    ? {
        ...matchedTo,
        x: matchedTo.x + 2.4,
        y: matchedTo.y + 2.6,
      }
    : matchedTo;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return {
    createdAt: event.createdAt,
    d: routePath(from.x, from.y, to.x, to.y, index),
    from: from.id,
    id: event.id,
    kind: event.kind,
    messageId: event.taskId,
    midX,
    midY,
    open: isRecent,
    motionSeconds: isRecent ? 2.4 : 4.8,
    status: event.status,
    subject: officeRouteSubjectSummary(event),
    sourceLabel: `Autonomy (${event.mode})`,
    to: to.id,
  };
}

function isMeshSignal(signal: OfficeRouteSignalFeed): signal is MeshEvent {
  return signal.kind === "dispatch" || signal.kind === "message" || signal.kind === "reply";
}

function officeActivityItems(data: BootstrapPayload, signals: Array<OfficeRouteSignalFeed>) {
  const meshItems = data.mesh.events.slice(0, 8).map((event) => ({
    id: event.id,
    title: `${event.from} -> ${event.to}`,
    meta: `${event.kind} · ${event.status} · ${event.messageId}`,
    date: event.createdAt,
  }));

  const autonomyItems = signals
    .filter((event): event is RoomAutonomyRunEvent => !isMeshSignal(event))
    .map((event) => ({
      id: event.id,
      title: event.targetRoomId ? `${event.roomId} -> ${event.targetRoomId}` : event.roomId,
      meta: `${event.kind} · ${event.status} · ${event.taskId}`,
      date: event.createdAt,
    }));

  return [...meshItems, ...autonomyItems].slice(0, 12).sort((a, b) => b.date.localeCompare(a.date));
}

function officeRouteSubjectSummary(event: RoomAutonomyRunEvent): string {
  if (event.kind === "task.executed") {
    return `Task executed (${event.taskId}) ${event.reason ? `· ${event.reason}` : ""}`;
  }

  if (event.kind === "task.skipped") {
    return `Task skipped (${event.taskId}) ${event.reason ? `· ${event.reason}` : ""}`;
  }

  if (event.kind === "task.suggested") {
    return `Task suggested (${event.taskId}) ${event.reason ? `· ${event.reason}` : ""}`;
  }

  if (event.kind === "initiative.created") {
    return `Learning initiative (${event.taskId}) ${event.reason ? `· ${event.reason}` : ""}`;
  }

  return `Cycle completed ${event.reason ? `· ${event.reason}` : ""}`;
}

function CommandView({
  data,
  metrics,
  onSeed,
  submitting,
}: {
  data: BootstrapPayload;
  metrics: Array<{ accent: string; icon: typeof Gauge; label: string; value: number }>;
  onSeed: () => void;
  submitting: boolean;
}) {
  return (
    <>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <div className={`metric ${metric.accent}`} key={metric.label}>
            <metric.icon size={20} />
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      {data.agency.clients.length === 0 ? (
        <div className="empty-action">
          <h2>No data yet</h2>
          <p>Create demo data to validate the interface before connecting real spreadsheets.</p>
          <button onClick={onSeed} disabled={submitting} type="button">Create demo</button>
        </div>
      ) : (
        <QueueList items={data.agency.commandCenter.executiveQueue} />
      )}
    </>
  );
}

function QueueList({ items }: { items: CommandCenterItem[] }) {
  return (
    <div className="list-panel">
      <div className="panel-heading">
        <h2>Executive queue</h2>
        <span>{items.length} items</span>
      </div>
      {items.map((item) => (
        <div className="queue-row" key={`${item.source}-${item.id}`}>
          <div>
            <StatusPill value={item.priority} />
            <h3>{item.title}</h3>
            <p>{item.reason}</p>
          </div>
          <div className="row-meta">
            <span>{item.source === "admin" ? "Admin" : "Delivery"}</span>
            <strong>{formatDate(item.dueDate)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientsView({ data }: { data: BootstrapPayload }) {
  return (
    <div className="table-panel">
      <div className="panel-heading">
        <h2>Clients</h2>
        <span>{data.agency.clients.length} records</span>
      </div>
      {data.agency.clients.map((client) => (
        <div className="table-row" key={client.id}>
          <div>
            <strong>{client.name}</strong>
            <span>{client.niche ?? "no niche"} · {client.owner ?? "no owner"}</span>
          </div>
          <StatusPill value={client.status} />
          <strong>{client.monthlyRetainer ? formatMoney(client.monthlyRetainer, client.currency) : "-"}</strong>
        </div>
      ))}
    </div>
  );
}

function DeliveryView({ data }: { data: BootstrapPayload }) {
  return (
    <div className="split-panels">
      <SimpleList title="Requests" items={data.agency.delivery.clientWork.map((item) => ({ id: item.id, title: item.title, meta: `${item.type} · ${item.status}`, date: item.dueDate }))} />
      <SimpleList title="Creatives and reports" items={[
        ...data.agency.delivery.creativeAssetsInProduction.map((item) => ({ id: item.id, title: `${item.type} ${item.channel ?? ""}`, meta: item.status, date: item.dueDate })),
        ...data.agency.delivery.reportsInProgress.map((item) => ({ id: item.id, title: `Report ${item.periodStart} - ${item.periodEnd}`, meta: item.status, date: null })),
      ]} />
    </div>
  );
}

function FinanceView({ data }: { data: BootstrapPayload }) {
  return (
    <div className="split-panels">
      <SimpleList title="Receivables" items={data.agency.admin.openReceivables.map((item) => ({ id: item.id, title: item.description, meta: `${item.status} · ${formatMoney(item.amount, item.currency)}`, date: item.dueDate }))} />
      <SimpleList title="Payables" items={data.agency.admin.openPayables.map((item) => ({ id: item.id, title: item.description, meta: `${item.status} · ${formatMoney(item.amount, item.currency)}`, date: item.dueDate }))} />
    </div>
  );
}

function ApprovalsView({
  approvals,
  onResolve,
  submitting,
}: {
  approvals: Approval[];
  onResolve: (approvalId: string, decision: "approve" | "deny") => void;
  submitting: boolean;
}) {
  if (!approvals.length) {
    return <EmptyState icon={CheckCircle2} title="Nothing pending" body="When a sensitive tool asks for permission, it will appear here." />;
  }

  return (
    <div className="list-panel">
      <div className="panel-heading">
        <h2>Pending approvals</h2>
        <span>{approvals.length} items</span>
      </div>
      {approvals.map((approval) => (
        <div className="approval-row" key={approval.id}>
          <div>
            <h3>{approval.toolName}</h3>
            <p>{approval.agentName} · job {approval.jobId}</p>
            <code>{approval.argumentsJson}</code>
          </div>
          <div className="approval-actions">
            <button disabled={submitting} onClick={() => onResolve(approval.id, "approve")} type="button">Approve</button>
            <button className="secondary" disabled={submitting} onClick={() => onResolve(approval.id, "deny")} type="button">Deny</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeshView({
  data,
  projectFilterId,
  projectFilterMode = "mailbox",
  composerProjectId,
  composerScope,
  composerRoomId,
  composerSubject,
  composerMessage,
  onComposerProjectId,
  onComposerRoomId,
  onComposerScope,
  onComposerSubject,
  onComposerMessage,
  onAsk,
  rooms,
  canSubmitMessage,
}: {
  data: BootstrapPayload;
  projectFilterId: string | null;
  projectFilterMode: MeshPanelMode;
  composerProjectId: string;
  composerScope: MeshMessageScope;
  composerRoomId: string;
  composerSubject: string;
  composerMessage: string;
  onComposerProjectId: (projectId: string) => void;
  onComposerRoomId: (roomId: string) => void;
  onComposerScope: (scope: MeshMessageScope) => void;
  onComposerSubject: (subject: string) => void;
  onComposerMessage: (message: string) => void;
  onAsk: (input: {
    message: string;
    scope: MeshMessageScope;
    subject: string;
    projectId?: string;
    roomId?: string;
    requiresReply?: boolean;
  }) => Promise<void>;
  rooms: AgentRoom[];
  canSubmitMessage: boolean;
}) {
  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const filteredProject = projectFilterId
    ? data.mesh.projects.find((project) => project.id === projectFilterId)
    : null;
  const effectiveProjectId = projectFilterId
    ? projectFilterId
    : composerScope === "project"
      ? composerProjectId
      : null;
  const effectiveProject = effectiveProjectId
    ? data.mesh.projects.find((project) => project.id === effectiveProjectId)
    : filteredProject ?? null;
  const selectedRoom = roomById.get(composerRoomId);
  const composerProject = data.mesh.projects.find((project) => project.id === composerProjectId) ?? effectiveProject ?? null;
  const roomProjectIds = new Set(
    data.mesh.projects.filter((project) => projectRoomId(project.id) === selectedRoom?.id).map((project) => project.id),
  );
  const filteredInbox = effectiveProjectId
    ? data.mesh.inbox.filter((message) => message.to === effectiveProjectId)
    : data.mesh.inbox;
  const filteredOutbox = effectiveProjectId
    ? data.mesh.outbox.filter((message) => message.from === effectiveProjectId)
    : data.mesh.outbox;
  const filteredHistory = effectiveProjectId
    ? data.mesh.events.filter((event) => event.from === effectiveProjectId || event.to === effectiveProjectId)
    : data.mesh.events;
  const visibleMailbox = effectiveProjectId
    ? filteredInbox
    : composerScope === "room"
      ? data.mesh.inbox.filter((message) => roomProjectIds.has(message.to) && message.to !== "agent-system")
      : data.mesh.inbox;
  const visibleOutbox = effectiveProjectId
    ? filteredOutbox
    : composerScope === "room"
      ? data.mesh.outbox.filter((message) => roomProjectIds.has(message.from) && message.from !== "agent-system")
      : data.mesh.outbox;
  const visibleHistory = effectiveProjectId
    ? filteredHistory
    : data.mesh.events.filter((event) => composerScope === "all" || !composerScope || roomProjectIds.size === 0
      ? true
      : roomProjectIds.has(event.from) || roomProjectIds.has(event.to));
  const titleHint =
    effectiveProject?.name
      ?? (composerScope === "room"
        ? (selectedRoom?.name ?? "all rooms")
        : composerScope === "project"
          ? "selected project"
          : "all projects");

  async function sendDirectMessage(event: FormEvent) {
    event.preventDefault();
    const text = composerMessage.trim();
    if (!text || !canSubmitMessage) {
      return;
    }

    if (composerScope === "project" && !data.mesh.projects.some((project) => project.id === composerProjectId)) {
      return;
    }

    if (composerScope === "room" && !composerRoomId) {
      return;
    }

    await onAsk({
      message: text,
      scope: composerScope,
      subject: composerSubject.trim() || `Office request ${composerScope}`,
      projectId: composerScope === "project" ? composerProjectId : undefined,
      roomId: composerScope === "room" ? composerRoomId : undefined,
      requiresReply: composerScope === "project",
    });
    onComposerMessage("");
  }

  function handleComposerScope(nextScope: MeshMessageScope) {
    onComposerScope(nextScope);

    if (nextScope === "project") {
      const defaultProject = data.mesh.projects[0];
      if (defaultProject) {
        onComposerProjectId(defaultProject.id);
        onComposerSubject(`Office request for ${defaultProject.name}`);
      }
      return;
    }

    if (nextScope === "room") {
      const defaultRoom = rooms[0];
      if (defaultRoom) {
        onComposerRoomId(defaultRoom.id);
        onComposerSubject(`Room message for ${defaultRoom.name}`);
      }
      return;
    }

    onComposerSubject("Office broadcast");
  }

  return (
    <div className="split-panels">
      <SimpleList title="Projects" items={data.mesh.projects.map((project) => ({ id: project.id, title: project.name, meta: project.scope, date: project.threadId ? "active thread" : "no thread" }))} />
      <div className="list-panel">
        <div className="panel-heading">
          <h2>
            {projectFilterId
              ? projectFilterMode === "history"
                ? `History · ${titleHint}`
                : `Mailbox · ${titleHint}`
              : `Mailbox · ${titleHint}`}
          </h2>
          <span>
            {projectFilterId
              ? projectFilterMode === "history"
                ? `${visibleHistory.length} signals`
                : `${visibleMailbox.length}/${visibleOutbox.length} mailbox`
              : `${visibleMailbox.length}/${visibleOutbox.length}`}
          </span>
        </div>
        {projectFilterMode === "history" ? (
          <div className="specialist-activity">
            {visibleHistory.length ? (
              visibleHistory.map((event) => (
                <div className="tomorrow-item" key={event.id}>
                  <strong>{event.subject}</strong>
                  <small>
                    {event.kind}
                    {" · "}
                    {event.status}
                    {" · "}
                    {event.from} {"->"} {event.to}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">
                {projectFilterId ? "No message history yet for this project." : "No message history yet."}
              </p>
            )}
          </div>
        ) : visibleMailbox.length ? (
          visibleMailbox.map((message) => (
            <div className="compact-row" key={message.id}>
              <div>
                <strong>{message.subject}</strong>
                <span>{message.from} {"->"} {message.to} · {message.status}</span>
              </div>
              <small>{formatDate(message.createdAt)}</small>
            </div>
          ))
        ) : (
          <p className="muted">{projectFilterId ? "No mailbox entries for this project." : "No inbox messages."}</p>
        )}
        <form className="mesh-composer" onSubmit={sendDirectMessage}>
          <div className="mesh-composer-grid">
            <label htmlFor="mesh-direct-scope">Message scope</label>
            <select
              id="mesh-direct-scope"
              value={composerScope}
              onChange={(event) => handleComposerScope(event.target.value as MeshMessageScope)}
            >
              <option value="project">Project</option>
              <option value="room">Room</option>
              <option value="all">All projects</option>
            </select>
            {composerScope === "project" ? (
              <>
                <label htmlFor="mesh-direct-to">Message project</label>
                <select
                  id="mesh-direct-to"
                  value={composerProjectId}
                  onChange={(event) => {
                    const nextProjectId = event.target.value;
                    onComposerProjectId(nextProjectId);
                    const nextProject = data.mesh.projects.find((project) => project.id === nextProjectId);
                    if (nextProject) {
                      onComposerSubject(`Office request for ${nextProject.name}`);
                      if (!composerMessage.trim()) {
                        onComposerMessage(defaultMeshHelpDraft(nextProject));
                      }
                    }
                  }}
                >
                  <option value="">Select project</option>
                  {data.mesh.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {composerScope === "room" ? (
              <>
                <label htmlFor="mesh-direct-room">Message room</label>
                <select
                  id="mesh-direct-room"
                  value={composerRoomId}
                  onChange={(event) => {
                    const nextRoomId = event.target.value;
                    onComposerRoomId(nextRoomId);
                    const nextRoom = rooms.find((room) => room.id === nextRoomId);
                    if (nextRoom) {
                      onComposerSubject(`Room message for ${nextRoom.name}`);
                    }
                  }}
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <label htmlFor="mesh-direct-subject">Subject</label>
            <input
              id="mesh-direct-subject"
              value={composerSubject}
              onChange={(event) => onComposerSubject(event.target.value)}
            />
            <label htmlFor="mesh-direct-body">Message</label>
            <textarea
              id="mesh-direct-body"
              rows={4}
              value={composerMessage}
              onChange={(event) => onComposerMessage(event.target.value)}
            />
          </div>
          <button
            disabled={
              !composerMessage.trim() || !canSubmitMessage ||
              (composerScope === "project" && !composerProjectId) ||
              (composerScope === "room" && !composerRoomId)
            }
            type="submit"
          >
            <Send size={14} />
            Send message
          </button>
        </form>
        <p className="muted">
          {projectFilterId && filteredProject
            ? `Direct route: ${projectFilterMode === "history" ? "history" : "mailbox"} for ${filteredProject.name}`
            : composerScope === "project" && composerProject
              ? `Direct route: ${projectFilterMode === "history" ? "history" : "mailbox"} for ${composerProject.name}`
              : composerScope === "room" && selectedRoom
                ? `Direct route: room ${selectedRoom.name}`
                : "Broadcast route: all projects."}
        </p>
      </div>
      <SimpleList
        title={projectFilterMode === "history" ? "Related messages" : "Recent outbox"}
        items={projectFilterMode === "history"
          ? visibleHistory.map((event) => ({
            id: event.id,
            title: event.subject,
            meta: `${event.from} -> ${event.to} · ${event.kind} · ${event.status}`,
            date: event.createdAt,
          }))
          : visibleOutbox.map(meshMessageToItem)}
      />
    </div>
  );
}

function AgentView({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) {
    return <EmptyState icon={Bot} title="No web tasks yet" body="Send a task from the side composer to run the agent here." />;
  }

  return (
    <div className="list-panel">
      <div className="panel-heading">
        <h2>Agent history</h2>
        <span>{jobs.length} jobs</span>
      </div>
      {jobs.map((job) => (
        <div className="job-row" key={job.id}>
          <div>
            <StatusPill value={job.status} />
            <h3>{job.goal}</h3>
            <p>{job.result ?? job.error ?? "Waiting for execution."}</p>
          </div>
          <span>{formatDate(job.updatedAt)}</span>
        </div>
      ))}
    </div>
  );
}

function SimpleList({ title, items }: { title: string; items: Array<{ id: string; title: string; meta: string; date: string | null }> }) {
  return (
    <div className="list-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        <span>{items.length} items</span>
      </div>
      {items.length ? items.map((item) => (
        <div className="compact-row" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
          <small>{formatDate(item.date)}</small>
        </div>
      )) : <p className="muted">No items.</p>}
    </div>
  );
}

function ApprovalMini({ approval, onResolve }: { approval: Approval; onResolve: (id: string, decision: "approve" | "deny") => void }) {
  return (
    <div className="mini-approval">
      <strong>{approval.toolName}</strong>
      <span>{approval.agentName}</span>
      <div>
        <button onClick={() => onResolve(approval.id, "approve")} type="button">OK</button>
        <button onClick={() => onResolve(approval.id, "deny")} type="button">Deny</button>
      </div>
    </div>
  );
}

function EmptyState({ body, icon: Icon, title }: { body: string; icon: typeof Bot; title: string }) {
  return (
    <div className="empty-action">
      <Icon size={30} />
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <Loader2 className="spin" size={28} />
      Loading operation...
    </div>
  );
}

function StatusDot({ label, ok }: { label: string; ok: boolean }) {
  return <span className={ok ? "status-dot ok" : "status-dot"}>{label}</span>;
}

function liveStatusLabel(status: LiveMeshStatus, lastLiveAt: string | null) {
  if (status === "live") {
    return `Live Mesh ${lastLiveAt ? formatClock(lastLiveAt) : "active"}`;
  }

  if (status === "reconnecting") {
    return "Live Mesh reconnecting";
  }

  if (status === "offline") {
    return "Live Mesh offline";
  }

  return "Live Mesh connecting";
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill ${value}`}>{value.replaceAll("_", " ")}</span>;
}

function meshMessageToItem(message: MeshMessage) {
  return {
    id: message.id,
    title: message.subject,
    meta: `${message.from} -> ${message.to} · ${message.status}`,
    date: message.createdAt,
  };
}

function projectRoomId(projectId: string) {
  if (projectId.includes("tiger") || projectId.includes("voos")) {
    return "research-intel-room";
  }

  if (projectId.includes("blog") || projectId.includes("taoswap") || projectId.includes("movie")) {
    return "content-growth-room";
  }

  return "build-room";
}

function titleFor(view: ViewKey): string {
  return {
    agent: "Agent",
    approvals: "Approvals",
    clients: "Clients",
    command: "Command Center",
    delivery: "Delivery OS",
    finance: "Admin OS",
    mesh: "Codex Mesh",
    office: "Agent Office",
  }[view];
}

function viewFromHash(): ViewKey {
  const key = window.location.hash.replace("#", "");
  return isViewKey(key) ? key : "command";
}

function isViewKey(value: string): value is ViewKey {
  return navItems.some((item) => item.key === value);
}

function heartbeatToOfficeStatus(status: MeshHeartbeat["status"]): OfficeAgentStatus {
  switch (status) {
    case "backend":
      return "backend";
    case "paused":
      return "paused";
    case "working":
      return "working";
    case "online":
    default:
      return "active";
  }
}

function primaryRoomAgentForProject(agents: RoomAgent[], projectId: string): RoomAgent | null {
  const candidates = agents.filter((agent) => agent.meshProjectId === projectId);
  return (
    candidates.find((agent) => agent.id.includes("lead")) ??
    candidates.find((agent) => agent.activation === "active") ??
    candidates[0] ??
    null
  );
}

function roomNameFor(rooms: AgentRoom[], roomId: string | null) {
  return rooms.find((room) => room.id === roomId)?.name ?? "Unassigned";
}

function roomAutonomyFor(rooms: AgentRoom[], roomId: string | null) {
  return rooms.find((room) => room.id === roomId)?.autonomyMode.toUpperCase() ?? "UNSET";
}

function priorityRank(priority: RoomTask["priority"]) {
  return {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  }[priority];
}

function fallbackOfficeStatus(project: MeshProject): OfficeAgentStatus {
  if (project.status !== "active") {
    return "paused";
  }

  return project.threadId ? "active" : "backend";
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { currency, maximumFractionDigits: 0, style: "currency" }).format(value);
}

function formatClock(value: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function routePath(x1: number, y1: number, x2: number, y2: number, index: number) {
  const lift = index % 2 === 0 ? -9 : 9;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + lift;
  return `M ${x1} ${y1} C ${midX} ${midY}, ${midX} ${midY}, ${x2} ${y2}`;
}

function compactSubject(subject: string) {
  const trimmed = subject.replace(/^Ola, eu existo:\s*/i, "Hello, I exist: ").replace(/^Re:\s*/i, "").trim();
  return trimmed.length > 34 ? `${trimmed.slice(0, 31)}...` : trimmed;
}

function sanitizeDomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function agentAccent(agent: OfficeAgent) {
  if (agent.officeStatus === "working") return "#f2aa2f";
  if (agent.officeStatus === "backend") return "#9aa6b2";
  if (agent.officeStatus === "paused") return "#ef4b45";
  return {
    amber: "#f2aa2f",
    blue: "#2f8cff",
    cyan: "#19bdd2",
    green: "#35c776",
    mint: "#20c997",
    red: "#ef4b45",
    slate: "#8ea0ad",
    violet: "#8b5cf6",
  }[agent.tone] ?? "#20c997";
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function fallbackDeskPosition(index: number) {
  const columns = [18, 34, 50, 66, 82];
  const rows = [24, 48, 72];
  return {
    x: columns[index % columns.length],
    y: rows[Math.floor(index / columns.length) % rows.length],
  };
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function shortNameFor(name: string) {
  return name
    .replace("Agente VLMKT", "VLMKT")
    .replace("Pesquisa de Voos", "Voos")
    .replace("TaoSwap Engine", "TaoSwap")
    .replace("Blog Outsider", "Outsider")
    .replace("Agent System", "System")
    .replace("Tiger Movie", "Movie")
    .replace("Tiger Miner", "Miner")
    .replace("Tiger Bot dTAO", "dTAO")
    .replace("Infinite Todo App", "Todo");
}

function defaultMeshHelpDraft(project: MeshProject) {
  return `I need public context about ${project.scope}. Share files, decisions, risks, and the next step the Agent Office should record now.`;
}

function defaultSpecialistHelpDraft(agent: RoomAgent, roomName: string) {
  return `Context request for ${agent.displayName} in ${roomName}. Please share latest workspace state, recent decisions, open risks, and your recommended next action.`;
}

function deskStatusLabel(status: OfficeAgentStatus) {
  return {
    active: "ACTIVE",
    backend: "BACKEND",
    paused: "PAUSED",
    working: "WORKING",
  }[status];
}
