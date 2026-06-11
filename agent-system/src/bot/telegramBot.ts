import { Bot, type Context } from "grammy";
import type { AppConfig } from "../config.js";
import { isTelegramUserAllowed } from "../config.js";
import type { Logger } from "../logger.js";
import type { AgentRuntime } from "../runtime/AgentRuntime.js";
import type { AgentStore } from "../state/store.js";
import type { Approval, Job, JobEvent } from "../state/types.js";

export function createTelegramBot(
  config: AppConfig,
  store: AgentStore,
  runtime: AgentRuntime,
  logger: Logger,
): Bot {
  if (!config.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required.");
  }

  const bot = new Bot(config.telegramBotToken);

  bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const allowed = userId !== undefined && isTelegramUserAllowed(config, userId);

    await ctx.reply(
      [
        "Agente Telegram pronto.",
        userId ? `Seu Telegram user id: ${userId}` : "Nao consegui identificar seu user id.",
        allowed
          ? "Voce esta autorizado. Use /task objetivo para criar uma tarefa."
          : "Adicione esse id em TELEGRAM_ALLOWED_USER_IDS para liberar o acesso.",
        "",
        commandSummary(),
      ].join("\n"),
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(commandSummary());
  });

  bot.command("task", async (ctx) => {
    if (!(await requireAuthorized(ctx, config))) {
      return;
    }

    const goal = getCommandText(ctx);
    if (!goal) {
      await ctx.reply("Use: /task descreva o objetivo");
      return;
    }

    await createAndRunJob(ctx, goal, store, runtime, logger);
  });

  bot.command("status", async (ctx) => {
    if (!(await requireAuthorized(ctx, config))) {
      return;
    }

    const chatId = requireChatId(ctx);
    const jobId = getCommandText(ctx);

    if (jobId) {
      const job = store.getJob(jobId);
      if (!job || job.chatId !== chatId) {
        await ctx.reply(`Job nao encontrado neste chat: ${jobId}`);
        return;
      }

      await ctx.reply(truncate(formatJob(job, store.listJobEvents(job.id, 10))));
      return;
    }

    const jobs = store.listRecentJobs(chatId, 10);
    await ctx.reply(truncate(formatJobList(jobs)));
  });

  bot.command("pending", async (ctx) => {
    if (!(await requireAuthorized(ctx, config))) {
      return;
    }

    const approvals = store.listPendingApprovals(requireChatId(ctx), 10);
    await ctx.reply(truncate(formatApprovals(approvals)));
  });

  bot.command("approve", async (ctx) => {
    if (!(await requireAuthorized(ctx, config))) {
      return;
    }

    await resolveApprovalCommand(ctx, "approved", runtime, logger);
  });

  bot.command("deny", async (ctx) => {
    if (!(await requireAuthorized(ctx, config))) {
      return;
    }

    await resolveApprovalCommand(ctx, "denied", runtime, logger);
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) {
      return;
    }

    if (!(await requireAuthorized(ctx, config))) {
      return;
    }

    await createAndRunJob(ctx, ctx.message.text.trim(), store, runtime, logger);
  });

  bot.catch((error) => {
    logger.error("Telegram bot error", {
      error: error.error instanceof Error ? error.error.message : String(error.error),
    });
  });

  return bot;
}

async function createAndRunJob(
  ctx: Context,
  goal: string,
  store: AgentStore,
  runtime: AgentRuntime,
  logger: Logger,
): Promise<void> {
  const chatId = requireChatId(ctx);
  const userId = requireUserId(ctx);
  const job = store.createJob({ chatId, userId, goal });

  await ctx.reply(`Job criado: ${job.id}\nStatus: queued`);

  void runtime
    .runJob(job.id)
    .then((outcome) => ctx.api.sendMessage(chatId, truncate(outcome.message)))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Background job failed", { jobId: job.id, error: message });
      return ctx.api.sendMessage(chatId, truncate(`Job ${job.id} falhou.\n\n${message}`));
    });
}

async function resolveApprovalCommand(
  ctx: Context,
  decision: "approved" | "denied",
  runtime: AgentRuntime,
  logger: Logger,
): Promise<void> {
  const [approvalId, ...noteParts] = getCommandText(ctx).split(/\s+/).filter(Boolean);
  if (!approvalId) {
    await ctx.reply(decision === "approved" ? "Use: /approve app_id" : "Use: /deny app_id motivo");
    return;
  }

  await ctx.reply(`${decision === "approved" ? "Aprovando" : "Negando"} ${approvalId}...`);

  try {
    const outcome = await runtime.resolveApproval(
      approvalId,
      decision,
      requireUserId(ctx),
      noteParts.join(" ") || null,
    );
    await ctx.reply(truncate(outcome.message));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Approval resolution failed", { approvalId, decision, error: message });
    await ctx.reply(truncate(`Nao consegui resolver a aprovacao.\n\n${message}`));
  }
}

async function requireAuthorized(ctx: Context, config: AppConfig): Promise<boolean> {
  const userId = ctx.from?.id;
  if (userId !== undefined && isTelegramUserAllowed(config, userId)) {
    return true;
  }

  await ctx.reply(
    [
      "Acesso nao autorizado.",
      userId ? `Seu Telegram user id: ${userId}` : "Nao consegui identificar seu user id.",
      "Inclua esse id em TELEGRAM_ALLOWED_USER_IDS e reinicie o bot.",
    ].join("\n"),
  );
  return false;
}

function getCommandText(ctx: Context): string {
  const match = ctx.match;
  if (typeof match === "string") {
    return match.trim();
  }

  return "";
}

function requireChatId(ctx: Context): string {
  if (!ctx.chat?.id) {
    throw new Error("Telegram chat id is missing.");
  }

  return String(ctx.chat.id);
}

function requireUserId(ctx: Context): string {
  if (!ctx.from?.id) {
    throw new Error("Telegram user id is missing.");
  }

  return String(ctx.from.id);
}

function commandSummary(): string {
  return [
    "Comandos:",
    "/task objetivo - cria uma tarefa para o agente",
    "/status - lista jobs recentes",
    "/status job_id - mostra detalhes de um job",
    "/pending - lista aprovacoes pendentes",
    "/approve app_id - aprova uma acao sensivel",
    "/deny app_id motivo - nega uma acao sensivel",
  ].join("\n");
}

function formatJobList(jobs: Job[]): string {
  if (jobs.length === 0) {
    return "Nenhum job ainda.";
  }

  return jobs
    .map((job) => `${job.id} | ${job.status} | ${job.goal.slice(0, 90)}`)
    .join("\n");
}

function formatJob(job: Job, events: JobEvent[]): string {
  const lines = [
    `Job: ${job.id}`,
    `Status: ${job.status}`,
    `Objetivo: ${job.goal}`,
    job.result ? `Resultado: ${job.result}` : null,
    job.error ? `Erro: ${job.error}` : null,
    "",
    "Eventos recentes:",
    ...events.map((event) => `${event.createdAt} | ${event.type} | ${event.message}`),
  ];

  return lines.filter(Boolean).join("\n");
}

function formatApprovals(approvals: Approval[]): string {
  if (approvals.length === 0) {
    return "Nenhuma aprovacao pendente.";
  }

  return approvals
    .map((approval) =>
      [
        `Aprovacao: ${approval.id}`,
        `Job: ${approval.jobId}`,
        `Agente: ${approval.agentName}`,
        `Ferramenta: ${approval.toolName}`,
        `Argumentos: ${approval.argumentsJson}`,
        `Comandos: /approve ${approval.id} | /deny ${approval.id} motivo`,
      ].join("\n"),
    )
    .join("\n\n");
}

function truncate(message: string, maxLength = 3900): string {
  if (message.length <= maxLength) {
    return message;
  }

  return `${message.slice(0, maxLength - 40)}\n\n[Mensagem truncada pelo limite do Telegram]`;
}
