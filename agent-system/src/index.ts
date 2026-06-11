import { setDefaultOpenAIKey } from "@openai/agents";
import { assertRuntimeConfig, loadConfig } from "./config.js";
import { AgencyStore } from "./agency/store.js";
import { createLogger } from "./logger.js";
import { createTelegramBot } from "./bot/telegramBot.js";
import { AgentRuntime } from "./runtime/AgentRuntime.js";
import { openDatabase } from "./state/db.js";
import { AgentStore } from "./state/store.js";

async function main() {
  const config = loadConfig();
  assertRuntimeConfig(config);
  // @ts-expect-error openaiApiKey guaranteed by config
  setDefaultOpenAIKey(config.openaiApiKey);

  const logger = createLogger(config);
  const db = openDatabase((config.databasePath ?? "./data/agent.sqlite") as string);
  const store = new AgentStore(db);
  const agency = new AgencyStore(db);
  const runtime = new AgentRuntime(config, store, agency, logger);
  const bot = createTelegramBot(config, store, runtime, logger);

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  logger.info("Starting Telegram agent bot", {
    databasePath: config.databasePath,
    models: config.models,
  });

  await bot.start({
    onStart: (botInfo) => {
      logger.info("Telegram bot started", { username: botInfo.username });
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
