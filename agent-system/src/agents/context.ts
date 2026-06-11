import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import type { AgencyStore } from "../agency/store.js";
import type { AgentStore } from "../state/store.js";

export interface AgentRunContext {
  chatId: string;
  config: AppConfig;
  agency: AgencyStore;
  jobId: string;
  logger: Logger;
  store: AgentStore;
  userId: string;
}
