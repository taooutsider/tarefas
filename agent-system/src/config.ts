import dotenv from "dotenv";

dotenv.config();

export interface Config {
  nodeEnv: "development" | "production";
  logLevel: "debug" | "info" | "warn" | "error";
  port: number;
  openaiApiKey: string | undefined;
  openaiModel: string;
  openaiOrchestratorModel: string;
  openaiBuilderModel: string;
  openaiResearcherModel: string;
  openaiOperatorModel: string;
  openaiSafetyModel: string;
  openaiAccountManagerModel: string;
  openaiFinanceModel: string;
  openaiCampaignStrategistModel: string;
  openaiCreativeProducerModel: string;
  openaiContentStrategistModel: string;
  openaiEditorialReviewerModel: string;
  openaiLayoutDesignerModel: string;
  openaiDataAnalystModel: string;
  openaiAutomationEngineerModel: string;
  openaiReportingModel: string;
  openaiLandingPageModel: string;
  telegramBotToken: string | undefined;
  telegramAllowedUserIds: number[];
  webAccessToken: string | undefined;
  databasePath: string;
  databaseUrl: string | undefined;
  codexMeshRoot: string;
  models: Record<string, string>;
}

// Aliases for backwards compatibility
export type AppConfig = Config;

export function loadConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || "development") as "development" | "production";
  const logLevel = (process.env.LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error";
  const port = Number(process.env.PORT ?? 4173);
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const webAccessToken = process.env.WEB_ACCESS_TOKEN?.trim();
  const databasePath = process.env.DATABASE_PATH || "./data/agent.sqlite";
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const codexMeshRoot = process.env.CODEX_MESH_ROOT || "./data/codex-mesh";

  const telegramAllowedUserIdsRaw = process.env.TELEGRAM_ALLOWED_USER_IDS || "";
  const telegramAllowedUserIds = telegramAllowedUserIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => Number.parseInt(id, 10));

  const config: Config = {
    nodeEnv,
    logLevel,
    port,
    openaiApiKey,
    openaiModel: process.env.OPENAI_MODEL || "gpt-5.5",
    openaiOrchestratorModel: process.env.OPENAI_ORCHESTRATOR_MODEL || "gpt-5.5",
    openaiBuilderModel: process.env.OPENAI_BUILDER_MODEL || "gpt-5.3-codex",
    openaiResearcherModel: process.env.OPENAI_RESEARCHER_MODEL || "gpt-5.5",
    openaiOperatorModel: process.env.OPENAI_OPERATOR_MODEL || "gpt-5.4-mini",
    openaiSafetyModel: process.env.OPENAI_SAFETY_MODEL || "gpt-5.5",
    openaiAccountManagerModel: process.env.OPENAI_ACCOUNT_MANAGER_MODEL || "gpt-5.4-mini",
    openaiFinanceModel: process.env.OPENAI_FINANCE_MODEL || "gpt-5.5",
    openaiCampaignStrategistModel: process.env.OPENAI_CAMPAIGN_STRATEGIST_MODEL || "gpt-5.5",
    openaiCreativeProducerModel: process.env.OPENAI_CREATIVE_PRODUCER_MODEL || "gpt-5.4-mini",
    openaiContentStrategistModel: process.env.OPENAI_CONTENT_STRATEGIST_MODEL || "gpt-5.4-mini",
    openaiEditorialReviewerModel: process.env.OPENAI_EDITORIAL_REVIEWER_MODEL || "gpt-5.5",
    openaiLayoutDesignerModel: process.env.OPENAI_LAYOUT_DESIGNER_MODEL || "gpt-5.3-codex",
    openaiDataAnalystModel: process.env.OPENAI_DATA_ANALYST_MODEL || "gpt-5.5",
    openaiAutomationEngineerModel: process.env.OPENAI_AUTOMATION_ENGINEER_MODEL || "gpt-5.3-codex",
    openaiReportingModel: process.env.OPENAI_REPORTING_MODEL || "gpt-5.5",
    openaiLandingPageModel: process.env.OPENAI_LANDING_PAGE_MODEL || "gpt-5.3-codex",
    telegramBotToken,
    telegramAllowedUserIds,
    webAccessToken,
    databasePath,
    databaseUrl,
    codexMeshRoot,
    models: {
      OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5.5",
      OPENAI_ORCHESTRATOR_MODEL: process.env.OPENAI_ORCHESTRATOR_MODEL || "gpt-5.5",
      OPENAI_BUILDER_MODEL: process.env.OPENAI_BUILDER_MODEL || "gpt-5.3-codex",
      OPENAI_RESEARCHER_MODEL: process.env.OPENAI_RESEARCHER_MODEL || "gpt-5.5",
      OPENAI_OPERATOR_MODEL: process.env.OPENAI_OPERATOR_MODEL || "gpt-5.4-mini",
      OPENAI_SAFETY_MODEL: process.env.OPENAI_SAFETY_MODEL || "gpt-5.5",
      OPENAI_ACCOUNT_MANAGER_MODEL: process.env.OPENAI_ACCOUNT_MANAGER_MODEL || "gpt-5.4-mini",
      OPENAI_FINANCE_MODEL: process.env.OPENAI_FINANCE_MODEL || "gpt-5.5",
      OPENAI_CAMPAIGN_STRATEGIST_MODEL: process.env.OPENAI_CAMPAIGN_STRATEGIST_MODEL || "gpt-5.5",
      OPENAI_CREATIVE_PRODUCER_MODEL: process.env.OPENAI_CREATIVE_PRODUCER_MODEL || "gpt-5.4-mini",
      OPENAI_CONTENT_STRATEGIST_MODEL: process.env.OPENAI_CONTENT_STRATEGIST_MODEL || "gpt-5.4-mini",
      OPENAI_EDITORIAL_REVIEWER_MODEL: process.env.OPENAI_EDITORIAL_REVIEWER_MODEL || "gpt-5.5",
      OPENAI_LAYOUT_DESIGNER_MODEL: process.env.OPENAI_LAYOUT_DESIGNER_MODEL || "gpt-5.3-codex",
      OPENAI_DATA_ANALYST_MODEL: process.env.OPENAI_DATA_ANALYST_MODEL || "gpt-5.5",
      OPENAI_AUTOMATION_ENGINEER_MODEL: process.env.OPENAI_AUTOMATION_ENGINEER_MODEL || "gpt-5.3-codex",
      OPENAI_REPORTING_MODEL: process.env.OPENAI_REPORTING_MODEL || "gpt-5.5",
      OPENAI_LANDING_PAGE_MODEL: process.env.OPENAI_LANDING_PAGE_MODEL || "gpt-5.3-codex",
    },
  };

  return config;
}

// Assertion functions for backwards compatibility
export function assertOpenAIConfig(config: Config): void {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
}

export function assertRuntimeConfig(config: Config): asserts config is Config & { databasePath: string } {
  if (!config.databasePath) {
    throw new Error("DATABASE_PATH is required or default to ./data/agent.sqlite");
  }
  if (!config.webAccessToken) {
    console.warn("WEB_ACCESS_TOKEN not set - using 'dev-token' for development");
  }
}

export function isTelegramUserAllowed(config: Config, userId: number): boolean {
  if (config.telegramAllowedUserIds.length === 0) {
    return false;
  }
  return config.telegramAllowedUserIds.includes(userId);
}
