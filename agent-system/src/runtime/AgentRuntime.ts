import { RunContext, RunState, run } from "@openai/agents";
import type { Agent } from "@openai/agents";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import type { AgencyStore } from "../agency/store.js";
import { createOrchestratorAgent } from "../agents/orchestrator.js";
import type { AgentRunContext } from "../agents/context.js";
import type { AgentStore } from "../state/store.js";
import type { Approval, Job } from "../state/types.js";

export interface RuntimeOutcome {
  approvals: Approval[];
  job: Job;
  message: string;
}

type ApprovalDecision = "approved" | "denied";

export class AgentRuntime {
  private readonly rootAgent: Agent<AgentRunContext, any>;

  constructor(
    private readonly config: AppConfig,
    private readonly store: AgentStore,
    private readonly agency: AgencyStore,
    private readonly logger: Logger,
  ) {
    this.rootAgent = createOrchestratorAgent(config);
  }

  async runJob(jobId: string): Promise<RuntimeOutcome> {
    const job = this.requireJob(jobId);
    const context = this.createRunContext(job);

    this.logger.info("Starting job", { jobId });
    this.store.updateJob(job.id, {
      status: "running",
      startedAt: job.startedAt ?? new Date().toISOString(),
      error: null,
    });
    this.store.appendJobEvent(job.id, "started", "Execucao iniciada.");

    try {
      const result = await run(this.rootAgent, buildJobPrompt(job), { context });
      return this.persistRunResult(job.id, result);
    } catch (error) {
      return this.persistRunError(job.id, error);
    }
  }

  async resolveApproval(
    approvalId: string,
    decision: ApprovalDecision,
    resolvedBy: string,
    note: string | null,
  ): Promise<RuntimeOutcome> {
    const approval = this.store.getApproval(approvalId);
    if (!approval) {
      throw new Error(`Aprovacao nao encontrada: ${approvalId}`);
    }

    if (approval.status !== "pending") {
      const job = this.requireJob(approval.jobId);
      return {
        approvals: [],
        job,
        message: `Essa aprovacao ja foi resolvida como ${approval.status}.`,
      };
    }

    const job = this.requireJob(approval.jobId);
    if (!job.runState) {
      throw new Error(`Job ${job.id} nao possui estado de execucao para retomar.`);
    }

    this.logger.info("Resolving approval", { approvalId, decision, jobId: job.id });
    const context = this.createRunContext(job);
    const state = await RunState.fromStringWithContext(
      this.rootAgent,
      job.runState,
      new RunContext(context),
      {
        contextStrategy: "replace",
      },
    );

    const pausedResult = await run(this.rootAgent, state);
    const interruptions = pausedResult.interruptions ?? [];
    const interruption = interruptions[approval.interruptionIndex];

    if (!interruption) {
      throw new Error(`Interrupcao ${approval.interruptionIndex} nao esta mais pendente.`);
    }

    if (decision === "approved") {
      pausedResult.state.approve(interruption);
    } else {
      pausedResult.state.reject(interruption, {
        message: note ?? "Rejeitado pelo operador via Telegram.",
      });
    }

    this.store.resolveApproval(approval.id, decision, resolvedBy, note);
    this.store.updateJob(job.id, { status: "running", error: null });

    try {
      const result = await run(this.rootAgent, pausedResult.state);
      return this.persistRunResult(job.id, result);
    } catch (error) {
      return this.persistRunError(job.id, error);
    }
  }

  private persistRunResult(jobId: string, result: any): RuntimeOutcome {
    const interruptions = result.interruptions ?? [];
    const runState = result.state?.toString?.() ?? JSON.stringify(result.state ?? {});

    if (interruptions.length > 0) {
      const job = this.requireJob(jobId);
      const approvals = interruptions.map((interruption: unknown, index: number) => {
        const summary = summarizeInterruption(interruption);
        return this.store.upsertApproval({
          jobId,
          chatId: job.chatId,
          userId: job.userId,
          interruptionIndex: index,
          agentName: summary.agentName,
          toolName: summary.toolName,
          argumentsJson: summary.argumentsJson,
        });
      });

      const updatedJob = this.store.updateJob(jobId, {
        status: "awaiting_approval",
        runState,
      });

      return {
        approvals,
        job: updatedJob,
        message: formatApprovalMessage(updatedJob, approvals),
      };
    }

    const finalOutput = String(result.finalOutput ?? "Concluido sem saida final.");
    this.store.appendJobEvent(jobId, "completed", "Execucao concluida.", { finalOutput });
    const updatedJob = this.store.updateJob(jobId, {
      status: "completed",
      result: finalOutput,
      runState,
      completedAt: new Date().toISOString(),
    });

    return {
      approvals: [],
      job: updatedJob,
      message: `Job ${updatedJob.id} concluido.\n\n${finalOutput}`,
    };
  }

  private persistRunError(jobId: string, error: unknown): RuntimeOutcome {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error("Job failed", { jobId, error: message });
    this.store.appendJobEvent(jobId, "failed", "Execucao falhou.", { error: message });
    const updatedJob = this.store.updateJob(jobId, {
      status: "failed",
      error: message,
      completedAt: new Date().toISOString(),
    });

    return {
      approvals: [],
      job: updatedJob,
      message: `Job ${updatedJob.id} falhou.\n\n${message}`,
    };
  }

  private createRunContext(job: Job): AgentRunContext {
    return {
      chatId: job.chatId,
      config: this.config,
      agency: this.agency,
      jobId: job.id,
      logger: this.logger,
      store: this.store,
      userId: job.userId,
    };
  }

  private requireJob(jobId: string): Job {
    const job = this.store.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return job;
  }
}

function buildJobPrompt(job: Job): string {
  return [
    `Operator ${job.userId} requested this goal from ${job.chatId}:`,
    job.goal,
    "",
    "Operate as the Codex-based marketing agency operating system, but only within currently connected tools.",
    "Select the right model by routing to the right specialist instead of answering every task from the orchestrator.",
    "Reuse workspace writing, storytelling, content, and layout craft only as neutral marketing technique; do not import unrelated niche references.",
    "For sensitive actions, request approval before execution.",
    "Return the most useful concise operational answer.",
  ].join("\n");
}

function summarizeInterruption(interruption: unknown): {
  agentName: string;
  argumentsJson: string;
  toolName: string;
} {
  const item = interruption as {
    agent?: { name?: string };
    arguments?: unknown;
    name?: string;
    rawItem?: unknown;
  };

  return {
    agentName: item.agent?.name ?? "unknown_agent",
    toolName: item.name ?? "unknown_tool",
    argumentsJson: safeJson(item.arguments ?? item.rawItem ?? {}),
  };
}

function safeJson(value: unknown): string {
  try {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatApprovalMessage(job: Job, approvals: Approval[]): string {
  const lines = approvals.map((approval) => {
    return [
      `Aprovacao: ${approval.id}`,
      `Agente: ${approval.agentName}`,
      `Ferramenta: ${approval.toolName}`,
      `Argumentos: ${approval.argumentsJson}`,
      `Para aprovar: /approve ${approval.id}`,
      `Para negar: /deny ${approval.id} motivo`,
    ].join("\n");
  });

  return [`Job ${job.id} aguardando aprovacao humana.`, "", ...lines].join("\n");
}
