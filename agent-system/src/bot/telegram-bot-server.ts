#!/usr/bin/env node
/**
 * Telegram Bot Server
 *
 * Standalone Telegram bot service.
 * Connects to Orchestrator API for job execution.
 */

import { Bot, type Context } from "grammy";
import type { Logger } from "../logger.js";
import { createLogger } from "../logger.js";
import { loadConfig } from "../config.js";

const config = loadConfig();
const logger = createLogger(config);
const apiUrl = process.env.API_URL ?? "http://api:3000";

if (!config.telegramBotToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Bot(config.telegramBotToken);

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  await ctx.reply(
    [
      "Agente Telegram pronto.",
      userId ? `Seu Telegram user id: ${userId}` : "Nao consegui identificar seu user id.",
      "Use /task objetivo para criar uma tarefa.",
    ].join("\n"),
  );
});

bot.command("task", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const goal = text.replace(/^\/task\s*/, "").trim();

  if (!goal) {
    await ctx.reply("Use: /task descreva o objetivo");
    return;
  }

  await ctx.reply(`Job criado para: ${goal}`);

  try {
    const response = await fetch(`${apiUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });

    const data = await response.json();
    await ctx.reply(JSON.stringify(data, null, 2).slice(0, 3900));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Job creation failed", { error: message });
    await ctx.reply(`Erro: ${message}`);
  }
});

bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    return;
  }

  await ctx.reply(`Recebido: ${ctx.message.text}`);
});

bot.catch((error) => {
  logger.error("Telegram bot error", {
    error: error.error instanceof Error ? error.error.message : String(error.error),
  });
});

logger.info("Telegram bot starting", { token: config.telegramBotToken?.slice(0, 10) + "..." });
bot.start().catch((error) => {
  logger.error("Telegram bot failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
