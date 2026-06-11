import path from "node:path";
import process from "node:process";
import {
  broadcastIntroductions,
  createMesh,
  dispatchPendingMessages,
  getDispatchEnvelopes,
  getInboxMessages,
  getOutboxMessages,
  getProject,
  initMesh,
  listProjects,
  markDispatchFailed,
  markDispatchSent,
  publishDiscovery,
  recordThreadReply,
  registerProject,
  sendProjectMessage,
  type DispatchEnvelopeStatus,
  type MeshMessagePriority,
} from "./mesh.js";

type Args = Record<string, string | boolean>;

const DEFAULT_MESH_ROOT = path.resolve(process.cwd(), "../codex-mesh");

function main() {
  const [command, ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);
  const root = String(args.root ?? process.env.CODEX_MESH_ROOT ?? DEFAULT_MESH_ROOT);
  const mesh = createMesh(root);

  switch (command) {
    case "init": {
      initMesh(mesh);
      console.log(`Mesh initialized: ${mesh.root}`);
      break;
    }

    case "register": {
      const project = registerProject(mesh, {
        id: required(args, "id"),
        name: required(args, "name"),
        scope: required(args, "scope"),
        threadId: optional(args, "thread-id"),
        workspaceRoot: optional(args, "workspace-root"),
        allowedPeers: parseList(optional(args, "allow") ?? "*"),
      });
      console.log(JSON.stringify(project, null, 2));
      break;
    }

    case "list": {
      const projects = listProjects(mesh);
      for (const project of projects) {
        console.log(`${project.id}\t${project.status}\t${project.scope}`);
      }
      break;
    }

    case "show": {
      const project = getProject(mesh, required(args, "project"));
      if (!project) {
        throw new Error("Project not found.");
      }
      console.log(JSON.stringify(project, null, 2));
      break;
    }

    case "send": {
      const message = sendProjectMessage(mesh, {
        from: required(args, "from"),
        to: required(args, "to"),
        type: optional(args, "type") ?? "request_context",
        priority: parsePriority(optional(args, "priority") ?? "normal"),
        subject: required(args, "subject"),
        body: required(args, "body"),
        expectedOutput: optional(args, "expected-output") ?? "Concise answer with relevant files, decisions, and risks.",
        requiresReply: parseBoolean(optional(args, "requires-reply") ?? "true"),
      });
      console.log(JSON.stringify(message, null, 2));
      break;
    }

    case "broadcast-intros": {
      const result = broadcastIntroductions(mesh);
      console.log(`Sent introductions: ${result.sent.length}`);
      if (result.skipped.length > 0) {
        console.log(`Skipped introductions: ${result.skipped.length}`);
        for (const item of result.skipped) {
          console.log(`${item.from} -> ${item.to}: ${item.reason}`);
        }
      }
      break;
    }

    case "publish-discovery": {
      const result = publishDiscovery(mesh, {
        from: required(args, "from"),
        subject: required(args, "subject"),
        body: required(args, "body"),
        priority: parsePriority(optional(args, "priority") ?? "normal"),
      });
      console.log(`Sent discoveries: ${result.sent.length}`);
      if (result.skipped.length > 0) {
        console.log(`Skipped discoveries: ${result.skipped.length}`);
        for (const item of result.skipped) {
          console.log(`${item.from} -> ${item.to}: ${item.reason}`);
        }
      }
      break;
    }

    case "dispatch": {
      const result = dispatchPendingMessages(mesh);
      console.log(`Dispatched messages: ${result.dispatched.length}`);
      for (const item of result.dispatched) {
        console.log(`${item.messageId}\t${item.to}\t${item.threadId}`);
      }
      if (result.skipped.length > 0) {
        console.log(`Skipped messages: ${result.skipped.length}`);
        for (const item of result.skipped) {
          console.log(`${item.messageId}\t${item.projectId}\t${item.reason}`);
        }
      }
      break;
    }

    case "bridge-list": {
      const status = parseDispatchStatus(optional(args, "status"));
      const envelopes = getDispatchEnvelopes(mesh, status ? { status } : {});
      if (isFlagSet(args, "json")) {
        console.log(JSON.stringify(envelopes, null, 2));
      } else {
        printDispatchEnvelopes(envelopes);
      }
      break;
    }

    case "bridge-next": {
      const envelope = getDispatchEnvelopes(mesh, { status: "pending" })[0];
      if (!envelope) {
        console.log("No pending dispatch envelopes.");
        break;
      }

      if (isFlagSet(args, "json")) {
        console.log(JSON.stringify(envelope, null, 2));
      } else {
        console.log(`Message: ${envelope.messageId}`);
        console.log(`Thread: ${envelope.threadId}`);
        console.log("");
        console.log(envelope.prompt);
      }
      break;
    }

    case "bridge-mark-sent": {
      const envelope = markDispatchSent(mesh, {
        messageId: required(args, "message-id"),
        sentTurnId: optional(args, "sent-turn-id"),
      });
      console.log(JSON.stringify(envelope, null, 2));
      break;
    }

    case "bridge-mark-failed": {
      const envelope = markDispatchFailed(mesh, {
        messageId: required(args, "message-id"),
        reason: required(args, "reason"),
      });
      console.log(JSON.stringify(envelope, null, 2));
      break;
    }

    case "record-reply": {
      const reply = recordThreadReply(mesh, {
        messageId: required(args, "message-id"),
        body: required(args, "body"),
        sourceTurnId: optional(args, "source-turn-id"),
      });
      console.log(JSON.stringify(reply, null, 2));
      break;
    }

    case "inbox": {
      const messages = getInboxMessages(mesh, required(args, "project"));
      printMessages(messages);
      break;
    }

    case "outbox": {
      const messages = getOutboxMessages(mesh, required(args, "project"));
      printMessages(messages);
      break;
    }

    case "help":
    case undefined:
      printHelp();
      break;

    default:
      throw new Error(`Unknown mesh command: ${command}`);
  }
}

function parseArgs(rawArgs: string[]): Args {
  const args: Args = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg?.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function required(args: Args, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required argument: --${key}`);
  }

  return value;
}

function optional(args: Args, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string): boolean {
  return !["false", "0", "no"].includes(value.toLowerCase());
}

function parsePriority(value: string): MeshMessagePriority {
  if (value === "low" || value === "normal" || value === "high") {
    return value;
  }

  throw new Error("Priority must be low, normal, or high.");
}

function parseDispatchStatus(value: string | undefined): DispatchEnvelopeStatus | "open" | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "pending" || value === "sent" || value === "replied" || value === "failed" || value === "open") {
    return value;
  }

  throw new Error("Dispatch status must be pending, sent, replied, failed, or open.");
}

function isFlagSet(args: Args, key: string): boolean {
  const value = args[key];
  if (value === true) {
    return true;
  }

  return typeof value === "string" ? parseBoolean(value) : false;
}

function printMessages(messages: Array<{ id: string; from: string; to: string; subject: string }>) {
  if (messages.length === 0) {
    console.log("No messages.");
    return;
  }

  for (const message of messages) {
    console.log(`${message.id}\t${message.from} -> ${message.to}\t${message.subject}`);
  }
}

function printDispatchEnvelopes(
  envelopes: Array<{ messageId: string; from: string; to: string; threadId: string; status: string; createdAt: string }>,
) {
  if (envelopes.length === 0) {
    console.log("No dispatch envelopes.");
    return;
  }

  for (const envelope of envelopes) {
    console.log(
      `${envelope.messageId}\t${envelope.status}\t${envelope.from} -> ${envelope.to}\t${envelope.threadId}\t${envelope.createdAt}`,
    );
  }
}

function printHelp() {
  console.log(`Codex Mesh CLI

Commands:
  init --root ../codex-mesh
  register --id project-id --name "Project Name" --scope "Scope" [--thread-id id] [--workspace-root path] [--allow peer-a,peer-b]
  list
  show --project project-id
  send --from project-a --to project-b --subject "Question" --body "Context"
  broadcast-intros
  publish-discovery --from project-a --subject "Discovery" --body "What changed"
  dispatch
  bridge-list [--status pending|sent|replied|failed|open] [--json]
  bridge-next [--json]
  bridge-mark-sent --message-id msg_id [--sent-turn-id turn_id]
  bridge-mark-failed --message-id msg_id --reason "Reason"
  record-reply --message-id msg_id --body "Reply body" [--source-turn-id turn_id]
  inbox --project project-id
  outbox --project project-id

Default root: ${DEFAULT_MESH_ROOT}
`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
