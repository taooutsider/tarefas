import type { Config } from "./config.js";

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export function createLogger(config: Config): Logger {
  const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  const currentLevel = levels[config.logLevel];

  return {
    debug(message: string, context?: Record<string, unknown>) {
      if (levels.debug >= currentLevel) {
        console.log(`[DEBUG] ${message}`, context ? JSON.stringify(context) : "");
      }
    },

    info(message: string, context?: Record<string, unknown>) {
      if (levels.info >= currentLevel) {
        console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : "");
      }
    },

    warn(message: string, context?: Record<string, unknown>) {
      if (levels.warn >= currentLevel) {
        console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : "");
      }
    },

    error(message: string, context?: Record<string, unknown>) {
      if (levels.error >= currentLevel) {
        console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : "");
      }
    },
  };
}
