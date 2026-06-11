import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type MeshMessagePriority = "low" | "normal" | "high";
export type MeshMessageStatus = "sent" | "dispatched" | "read" | "replied" | "closed";
export type DispatchEnvelopeStatus = "pending" | "sent" | "replied" | "failed";

export interface Mesh {
  root: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  scope: string;
  status: "active" | "paused" | "archived";
  threadId: string | null;
  workspaceRoot: string | null;
  allowedPeers: string[];
  manifestPath: string;
  publicSummaryPath: string;
  inboxPath: string;
  outboxPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeshRegistry {
  version: 1;
  createdAt: string;
  updatedAt: string;
  projects: ProjectRecord[];
}

export interface RegisterProjectInput {
  id: string;
  name: string;
  scope: string;
  threadId?: string | null;
  workspaceRoot?: string | null;
  allowedPeers?: string[];
}

export interface SendProjectMessageInput {
  from: string;
  to: string;
  type: string;
  priority: MeshMessagePriority;
  subject: string;
  body: string;
  expectedOutput: string;
  requiresReply: boolean;
  dedupeKey?: string;
}

export interface ProjectMessage extends SendProjectMessageInput {
  id: string;
  status: MeshMessageStatus;
  createdAt: string;
  dispatchedAt?: string;
  dispatchThreadId?: string;
  replyTo?: string;
}

export interface BroadcastIntroductionsResult {
  sent: ProjectMessage[];
  skipped: Array<{ from: string; to: string; reason: string }>;
}

export interface PublishDiscoveryInput {
  from: string;
  subject: string;
  body: string;
  priority?: MeshMessagePriority;
}

export interface PublishDiscoveryResult {
  sent: ProjectMessage[];
  skipped: Array<{ from: string; to: string; reason: string }>;
}

export interface DispatchEnvelope {
  id: string;
  messageId: string;
  from: string;
  to: string;
  threadId: string;
  prompt: string;
  createdAt: string;
  status: DispatchEnvelopeStatus;
  sentAt?: string;
  sentTurnId?: string;
  failedAt?: string;
  failureReason?: string;
  repliedAt?: string;
  replyId?: string;
}

export interface DispatchPendingResult {
  dispatched: DispatchEnvelope[];
  skipped: Array<{ messageId: string; projectId: string; reason: string }>;
}

export interface RecordThreadReplyInput {
  messageId: string;
  body: string;
  sourceTurnId?: string;
}

export interface ListDispatchEnvelopesOptions {
  status?: DispatchEnvelopeStatus | "open";
}

export interface MarkDispatchSentInput {
  messageId: string;
  sentTurnId?: string;
}

export interface MarkDispatchFailedInput {
  messageId: string;
  reason: string;
}

export function createMesh(root: string): Mesh {
  return { root: path.resolve(root) };
}

export function initMesh(mesh: Mesh): MeshRegistry {
  fs.mkdirSync(mesh.root, { recursive: true });
  fs.mkdirSync(path.join(mesh.root, "projects"), { recursive: true });

  if (fs.existsSync(registryPath(mesh))) {
    return readRegistry(mesh);
  }

  const now = nowIso();
  const registry: MeshRegistry = {
    version: 1,
    createdAt: now,
    updatedAt: now,
    projects: [],
  };

  writeRegistry(mesh, registry);
  writeIfMissing(path.join(mesh.root, "README.md"), renderMeshReadme());
  return registry;
}

export function listProjects(mesh: Mesh): ProjectRecord[] {
  return readRegistry(mesh).projects.sort((a, b) => a.id.localeCompare(b.id));
}

export function getProject(mesh: Mesh, projectId: string): ProjectRecord | null {
  return readRegistry(mesh).projects.find((project) => project.id === projectId) ?? null;
}

export function registerProject(mesh: Mesh, input: RegisterProjectInput): ProjectRecord {
  validateProjectId(input.id);
  const registry = ensureRegistry(mesh);
  const now = nowIso();
  const projectDir = path.join(mesh.root, "projects", input.id);
  const inboxPath = path.join(projectDir, "inbox");
  const outboxPath = path.join(projectDir, "outbox");

  fs.mkdirSync(inboxPath, { recursive: true });
  fs.mkdirSync(outboxPath, { recursive: true });

  const existing = registry.projects.find((project) => project.id === input.id);
  const project: ProjectRecord = {
    id: input.id,
    name: input.name,
    scope: input.scope,
    status: existing?.status ?? "active",
    threadId: input.threadId ?? existing?.threadId ?? null,
    workspaceRoot: input.workspaceRoot ?? existing?.workspaceRoot ?? null,
    allowedPeers: normalizeAllowedPeers(input.allowedPeers ?? existing?.allowedPeers ?? ["*"]),
    manifestPath: path.relative(mesh.root, path.join(projectDir, "manifest.md")),
    publicSummaryPath: path.relative(mesh.root, path.join(projectDir, "public-summary.md")),
    inboxPath: path.relative(mesh.root, inboxPath),
    outboxPath: path.relative(mesh.root, outboxPath),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    registry.projects = registry.projects.map((item) => (item.id === input.id ? project : item));
  } else {
    registry.projects.push(project);
  }

  registry.updatedAt = now;
  writeRegistry(mesh, registry);
  writeProjectMemoryFiles(mesh, project);

  return project;
}

export function sendProjectMessage(mesh: Mesh, input: SendProjectMessageInput): ProjectMessage {
  const registry = ensureRegistry(mesh);
  const sender = registry.projects.find((project) => project.id === input.from);
  const recipient = registry.projects.find((project) => project.id === input.to);

  if (!sender) {
    throw new Error(`Sender project not found: ${input.from}`);
  }

  if (!recipient) {
    throw new Error(`Recipient project not found: ${input.to}`);
  }

  if (!isPeerAllowed(sender, recipient.id)) {
    throw new Error(`Project ${sender.id} is not allowed to message ${recipient.id}`);
  }

  const message: ProjectMessage = {
    ...input,
    id: makeId("msg"),
    status: "sent",
    createdAt: nowIso(),
  };

  writeMessage(mesh, sender, "outbox", message);
  writeMessage(mesh, recipient, "inbox", message);

  return message;
}

export function getInboxMessages(mesh: Mesh, projectId: string): ProjectMessage[] {
  return readBoxMessages(mesh, projectId, "inbox");
}

export function getOutboxMessages(mesh: Mesh, projectId: string): ProjectMessage[] {
  return readBoxMessages(mesh, projectId, "outbox");
}

export function broadcastIntroductions(mesh: Mesh): BroadcastIntroductionsResult {
  const projects = listProjects(mesh).filter((project) => project.status === "active");
  const sent: ProjectMessage[] = [];
  const skipped: BroadcastIntroductionsResult["skipped"] = [];

  for (const sender of projects) {
    for (const recipient of projects) {
      if (sender.id === recipient.id) {
        continue;
      }

      if (!isPeerAllowed(sender, recipient.id)) {
        skipped.push({
          from: sender.id,
          to: recipient.id,
          reason: "recipient outside sender allowlist",
        });
        continue;
      }

      const dedupeKey = `introduction:${sender.id}:${recipient.id}`;
      if (findExistingMessage(mesh, sender, {
        from: sender.id,
        to: recipient.id,
        type: "introduction",
        subject: `Ola, eu existo: ${sender.name}`,
        dedupeKey,
      })) {
        skipped.push({
          from: sender.id,
          to: recipient.id,
          reason: "introduction already exists",
        });
        continue;
      }

      sent.push(
        sendProjectMessage(mesh, {
          from: sender.id,
          to: recipient.id,
          type: "introduction",
          priority: "normal",
          subject: `Ola, eu existo: ${sender.name}`,
          body: renderIntroductionMessage(mesh, sender),
          expectedOutput:
            "Acknowledge awareness. Use this project only when its scope is relevant, and reciprocate with useful backend discoveries.",
          requiresReply: false,
          dedupeKey,
        }),
      );
    }
  }

  return { sent, skipped };
}

export function publishDiscovery(mesh: Mesh, input: PublishDiscoveryInput): PublishDiscoveryResult {
  const registry = ensureRegistry(mesh);
  const sender = registry.projects.find((project) => project.id === input.from);
  if (!sender) {
    throw new Error(`Sender project not found: ${input.from}`);
  }

  const sent: ProjectMessage[] = [];
  const skipped: PublishDiscoveryResult["skipped"] = [];

  for (const recipient of registry.projects.filter((project) => project.status === "active")) {
    if (recipient.id === sender.id) {
      continue;
    }

    if (!isPeerAllowed(sender, recipient.id)) {
      skipped.push({
        from: sender.id,
        to: recipient.id,
        reason: "recipient outside sender allowlist",
      });
      continue;
    }

    sent.push(
      sendProjectMessage(mesh, {
        from: sender.id,
        to: recipient.id,
        type: "discovery",
        priority: input.priority ?? "normal",
        subject: input.subject,
        body: [
          "Backend discovery.",
          "",
          input.body,
          "",
          `Source project: ${sender.name} (${sender.id})`,
          `Source context: ${sender.scope}`,
        ].join("\n"),
        expectedOutput: "Read when relevant. No reply required unless this changes your project decisions.",
        requiresReply: false,
      }),
    );
  }

  return { sent, skipped };
}

export function dispatchPendingMessages(mesh: Mesh): DispatchPendingResult {
  const projects = listProjects(mesh);
  const dispatched: DispatchEnvelope[] = [];
  const skipped: DispatchPendingResult["skipped"] = [];

  fs.mkdirSync(dispatchPath(mesh), { recursive: true });

  for (const project of projects) {
    const inbox = getInboxMessages(mesh, project.id);
    for (const message of inbox) {
      if (message.status !== "sent" || !message.requiresReply) {
        continue;
      }

      if (!project.threadId) {
        skipped.push({
          messageId: message.id,
          projectId: project.id,
          reason: "recipient has no threadId",
        });
        continue;
      }

      const envelope: DispatchEnvelope = {
        id: makeId("dispatch"),
        messageId: message.id,
        from: message.from,
        to: message.to,
        threadId: project.threadId,
        prompt: renderDispatchPrompt(mesh, message),
        createdAt: nowIso(),
        status: "pending",
      };

      writeJson(path.join(dispatchPath(mesh), `${message.id}.json`), envelope);
      updateMessageCopies(mesh, message.id, {
        status: "dispatched",
        dispatchedAt: envelope.createdAt,
        dispatchThreadId: project.threadId,
      });
      dispatched.push(envelope);
    }
  }

  return { dispatched, skipped };
}

export function getDispatchEnvelopes(
  mesh: Mesh,
  options: ListDispatchEnvelopesOptions = {},
): DispatchEnvelope[] {
  const directory = dispatchPath(mesh);
  if (!fs.existsSync(directory)) {
    return [];
  }

  const envelopes = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readDispatchEnvelopeFile(path.join(directory, file)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!options.status) {
    return envelopes;
  }

  if (options.status === "open") {
    return envelopes.filter((envelope) => envelope.status === "pending" || envelope.status === "sent");
  }

  return envelopes.filter((envelope) => envelope.status === options.status);
}

export function markDispatchSent(mesh: Mesh, input: MarkDispatchSentInput): DispatchEnvelope {
  const envelope = readDispatchEnvelope(mesh, input.messageId);
  if (!envelope) {
    throw new Error(`Dispatch envelope not found: ${input.messageId}`);
  }

  const updated: DispatchEnvelope = {
    ...envelope,
    status: "sent",
    sentAt: nowIso(),
    sentTurnId: input.sentTurnId ?? envelope.sentTurnId,
    failedAt: undefined,
    failureReason: undefined,
  };
  writeDispatchEnvelope(mesh, updated);
  return updated;
}

export function markDispatchFailed(mesh: Mesh, input: MarkDispatchFailedInput): DispatchEnvelope {
  const envelope = readDispatchEnvelope(mesh, input.messageId);
  if (!envelope) {
    throw new Error(`Dispatch envelope not found: ${input.messageId}`);
  }

  const updated: DispatchEnvelope = {
    ...envelope,
    status: "failed",
    failedAt: nowIso(),
    failureReason: input.reason,
  };
  writeDispatchEnvelope(mesh, updated);
  return updated;
}

export function recordThreadReply(mesh: Mesh, input: RecordThreadReplyInput): ProjectMessage {
  const original = findMessageById(mesh, input.messageId);
  if (!original) {
    throw new Error(`Message not found: ${input.messageId}`);
  }

  const reply: ProjectMessage = {
    from: original.to,
    to: original.from,
    type: "reply",
    priority: original.priority,
    subject: `Re: ${original.subject}`,
    body: input.sourceTurnId
      ? [`Thread reply from ${original.to}.`, `Source turn: ${input.sourceTurnId}`, "", input.body].join(
          "\n",
        )
      : [`Thread reply from ${original.to}.`, "", input.body].join("\n"),
    expectedOutput: "Read and continue if needed.",
    requiresReply: false,
    replyTo: original.id,
    id: makeId("msg"),
    status: "sent",
    createdAt: nowIso(),
  };

  const sender = getProject(mesh, reply.from);
  const recipient = getProject(mesh, reply.to);
  if (!sender || !recipient) {
    throw new Error(`Cannot record reply for missing project: ${reply.from} -> ${reply.to}`);
  }

  writeMessage(mesh, sender, "outbox", reply);
  writeMessage(mesh, recipient, "inbox", reply);
  updateMessageCopies(mesh, original.id, { status: "replied", replyTo: reply.id });
  markDispatchEnvelopeReplied(mesh, original.id, reply.id);

  return reply;
}

function ensureRegistry(mesh: Mesh): MeshRegistry {
  if (!fs.existsSync(registryPath(mesh))) {
    return initMesh(mesh);
  }

  return readRegistry(mesh);
}

function readRegistry(mesh: Mesh): MeshRegistry {
  return readJson<MeshRegistry>(registryPath(mesh));
}

function writeRegistry(mesh: Mesh, registry: MeshRegistry): void {
  writeJson(registryPath(mesh), registry);
}

function registryPath(mesh: Mesh): string {
  return path.join(mesh.root, "registry.json");
}

function dispatchPath(mesh: Mesh): string {
  return path.join(mesh.root, "dispatch");
}

function writeProjectMemoryFiles(mesh: Mesh, project: ProjectRecord): void {
  const projectDir = path.join(mesh.root, "projects", project.id);
  writeIfMissing(path.join(projectDir, "manifest.md"), renderManifest(project));
  writeIfMissing(path.join(projectDir, "public-summary.md"), renderPublicSummary(project));
  writeIfMissing(path.join(projectDir, "decisions.md"), `# Decisions\n\n`);
  writeIfMissing(path.join(projectDir, "open-questions.md"), `# Open Questions\n\n`);
  writeIfMissing(path.join(projectDir, "interfaces.md"), `# Interfaces\n\n`);
}

function writeMessage(
  mesh: Mesh,
  project: ProjectRecord,
  box: "inbox" | "outbox",
  message: ProjectMessage,
): void {
  const boxPath = path.join(mesh.root, box === "inbox" ? project.inboxPath : project.outboxPath);
  fs.mkdirSync(boxPath, { recursive: true });
  writeJson(path.join(boxPath, `${message.id}.json`), message);
}

function updateMessageCopies(
  mesh: Mesh,
  messageId: string,
  patch: Partial<Pick<ProjectMessage, "status" | "dispatchedAt" | "dispatchThreadId" | "replyTo">>,
): void {
  for (const project of listProjects(mesh)) {
    for (const box of ["inbox", "outbox"] as const) {
      const boxPath = path.join(mesh.root, box === "inbox" ? project.inboxPath : project.outboxPath);
      const filePath = path.join(boxPath, `${messageId}.json`);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const message = readJson<ProjectMessage>(filePath);
      writeJson(filePath, { ...message, ...patch });
    }
  }
}

function markDispatchEnvelopeReplied(mesh: Mesh, messageId: string, replyId: string): void {
  const filePath = path.join(dispatchPath(mesh), `${messageId}.json`);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envelope = readDispatchEnvelopeFile(filePath);
  writeJson(filePath, {
    ...envelope,
    status: "replied",
    repliedAt: nowIso(),
    replyId,
  });
}

function readDispatchEnvelope(mesh: Mesh, messageId: string): DispatchEnvelope | null {
  const filePath = path.join(dispatchPath(mesh), `${messageId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readDispatchEnvelopeFile(filePath);
}

function readDispatchEnvelopeFile(filePath: string): DispatchEnvelope {
  const envelope = readJson<DispatchEnvelope & { status?: DispatchEnvelopeStatus }>(filePath);
  return {
    ...envelope,
    status: envelope.status ?? "pending",
  };
}

function writeDispatchEnvelope(mesh: Mesh, envelope: DispatchEnvelope): void {
  writeJson(path.join(dispatchPath(mesh), `${envelope.messageId}.json`), envelope);
}

function readBoxMessages(mesh: Mesh, projectId: string, box: "inbox" | "outbox"): ProjectMessage[] {
  const project = getProject(mesh, projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const boxPath = path.join(mesh.root, box === "inbox" ? project.inboxPath : project.outboxPath);
  if (!fs.existsSync(boxPath)) {
    return [];
  }

  return fs
    .readdirSync(boxPath)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson<ProjectMessage>(path.join(boxPath, file)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function findMessageById(mesh: Mesh, messageId: string): ProjectMessage | null {
  for (const project of listProjects(mesh)) {
    for (const message of [...getInboxMessages(mesh, project.id), ...getOutboxMessages(mesh, project.id)]) {
      if (message.id === messageId) {
        return message;
      }
    }
  }

  return null;
}

function validateProjectId(id: string): void {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(id)) {
    throw new Error(
      "Project id must be 2-63 chars and contain only lowercase letters, numbers, and hyphens.",
    );
  }
}

function normalizeAllowedPeers(peers: string[]): string[] {
  const normalized = peers.map((peer) => peer.trim()).filter(Boolean);
  return normalized.length > 0 ? Array.from(new Set(normalized)).sort() : ["*"];
}

function isPeerAllowed(sender: ProjectRecord, recipientId: string): boolean {
  return sender.allowedPeers.includes("*") || sender.allowedPeers.includes(recipientId);
}

function findExistingMessage(
  mesh: Mesh,
  sender: ProjectRecord,
  needle: { from: string; to: string; type: string; subject: string; dedupeKey?: string },
): ProjectMessage | null {
  const outbox = getOutboxMessages(mesh, sender.id);
  return (
    outbox.find((message) => {
      if (needle.dedupeKey && message.dedupeKey === needle.dedupeKey) {
        return true;
      }

      return (
        message.from === needle.from &&
        message.to === needle.to &&
        message.type === needle.type &&
        message.subject === needle.subject
      );
    }) ?? null
  );
}

function renderIntroductionMessage(mesh: Mesh, project: ProjectRecord): string {
  const manifestPath = path.join(mesh.root, project.manifestPath);
  const publicSummaryPath = path.join(mesh.root, project.publicSummaryPath);
  const projectRoot = path.join(mesh.root, "projects", project.id);
  const protocolPath = path.join(mesh.root, "AGENT_PROTOCOL.md");

  return [
    "Ola, eu existo.",
    `Meu nome e: ${project.name}.`,
    `Meu id no mesh e: ${project.id}.`,
    `Meu workspace e: ${project.workspaceRoot ?? "nao informado"}.`,
    `Minha thread Codex e: ${project.threadId ?? "nao vinculada"}.`,
    "",
    `Meus arquivos, instrucoes e memoria publica estao disponiveis em: ${projectRoot}`,
    `Protocolo de agentes autonomos: ${protocolPath}`,
    `Manifesto: ${manifestPath}`,
    `Resumo publico: ${publicSummaryPath}`,
    `Decisoes: ${path.join(mesh.root, "projects", project.id, "decisions.md")}`,
    `Interfaces: ${path.join(mesh.root, "projects", project.id, "interfaces.md")}`,
    `Inbox: ${path.join(mesh.root, project.inboxPath)}`,
    "",
    `Voce pode me usar sempre que precisar de algo relacionado a: ${project.scope}.`,
    "Eu vou adorar se voce fizer o mesmo por mim.",
    "Sempre que eu descobrir algo novo, vou te contar em backend.",
  ].join("\n");
}

function renderDispatchPrompt(mesh: Mesh, message: ProjectMessage): string {
  const recipient = getProject(mesh, message.to);
  const sender = getProject(mesh, message.from);
  const recipientRoot = recipient ? path.join(mesh.root, "projects", recipient.id) : null;

  return [
    "Codex Mesh message dispatched from backend.",
    "",
    "You are an autonomous project agent registered in the Codex Mesh.",
    `Your mesh identity: ${recipient?.name ?? message.to} (${message.to})`,
    `Your scope: ${recipient?.scope ?? "unknown"}`,
    `Your workspace: ${recipient?.workspaceRoot ?? "unknown"}`,
    `Your public memory: ${recipientRoot ?? "unknown"}`,
    `Mesh protocol: ${path.join(mesh.root, "AGENT_PROTOCOL.md")}`,
    "",
    `Message ID: ${message.id}`,
    `From: ${sender?.name ?? message.from} (${message.from})`,
    `To: ${recipient?.name ?? message.to} (${message.to})`,
    `Type: ${message.type}`,
    `Priority: ${message.priority}`,
    `Subject: ${message.subject}`,
    "",
    "Body:",
    message.body,
    "",
    "Expected output:",
    message.expectedOutput,
    "",
    "Protocol:",
    "- Recognize yourself as the autonomous mesh agent named above.",
    "- Preserve your project scope.",
    "- Share only concise public context, decisions, interfaces, risks, and useful next steps.",
    "- Do not edit files unless explicitly requested.",
    "- If the answer should be shared back, keep it compact enough to write into the mesh backend.",
  ].join("\n");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function renderManifest(project: ProjectRecord): string {
  return [
    "# Project Manifest",
    "",
    `Name: ${project.name}`,
    `Project ID: ${project.id}`,
    `Status: ${project.status}`,
    `Thread ID: ${project.threadId ?? "unset"}`,
    `Workspace Root: ${project.workspaceRoot ?? "unset"}`,
    "",
    "## Objective",
    project.scope,
    "",
    "## Scope",
    "- Keep this project focused on its stated objective.",
    "- Use mesh messages to ask other projects for context, reviews, or contract decisions.",
    "",
    "## Out Of Scope",
    "- Do not rewrite another project's files through mesh messages.",
    "- Do not import another project's full private history unless explicitly approved.",
    "",
    "## Sharing Policy",
    `Allowed peers: ${project.allowedPeers.join(", ")}`,
    "- Share public summaries, decisions, interfaces, and specific requested context.",
    "- Do not share secrets, tokens, wallet data, personal data, or production credentials.",
    "",
    "## Approval Policy",
    "- Cross-project writes require explicit human approval.",
    "- Sensitive actions require explicit human approval.",
    "",
  ].join("\n");
}

function renderPublicSummary(project: ProjectRecord): string {
  return [
    "# Public Summary",
    "",
    `Project: ${project.name}`,
    `Scope: ${project.scope}`,
    "",
    "## Current State",
    "- Freshly registered in the Codex mesh.",
    "",
    "## Decisions",
    "- None recorded yet.",
    "",
    "## Interfaces",
    "- None recorded yet.",
    "",
    "## How To Ask For Help",
    `Send a mesh message to ${project.id} with a clear subject, context, and expected output.`,
    "",
  ].join("\n");
}

function renderMeshReadme(): string {
  return [
    "# Codex Mesh",
    "",
    "Local coordination layer for Codex project threads.",
    "",
    "Each project keeps its own scope and private context. Other projects should consume the public summary and send explicit inbox messages instead of reading full private history by default.",
    "",
    "Important files:",
    "",
    "- `registry.json`: project index.",
    "- `projects/<id>/manifest.md`: project identity, scope, and sharing policy.",
    "- `projects/<id>/public-summary.md`: exportable summary for peers.",
    "- `projects/<id>/inbox/`: incoming project messages.",
    "- `projects/<id>/outbox/`: outgoing project messages.",
    "",
  ].join("\n");
}
