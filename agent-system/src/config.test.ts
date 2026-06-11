import { describe, expect, it } from "vitest";
import { isTelegramUserAllowed, loadConfig } from "./config.js";

describe("config", () => {
  it("parses allowed Telegram users", () => {
    const config = loadConfig({
      TELEGRAM_ALLOWED_USER_IDS: "123, 456",
      DATABASE_PATH: "./tmp.sqlite",
    });

    expect(isTelegramUserAllowed(config, 123)).toBe(true);
    expect(isTelegramUserAllowed(config, "456")).toBe(true);
    expect(isTelegramUserAllowed(config, "789")).toBe(false);
  });

  it("loads specialized model defaults", () => {
    const config = loadConfig({
      DATABASE_PATH: "./tmp.sqlite",
    });

    expect(config.models.default).toBe("gpt-5.5");
    expect(config.models.orchestrator).toBe("gpt-5.5");
    expect(config.models.builder).toBe("gpt-5.3-codex");
    expect(config.models.researcher).toBe("gpt-5.5");
    expect(config.models.operator).toBe("gpt-5.4-mini");
    expect(config.models.safety).toBe("gpt-5.5");
    expect(config.models.accountManager).toBe("gpt-5.4-mini");
    expect(config.models.finance).toBe("gpt-5.5");
    expect(config.models.campaignStrategist).toBe("gpt-5.5");
    expect(config.models.creativeProducer).toBe("gpt-5.4-mini");
    expect(config.models.contentStrategist).toBe("gpt-5.4-mini");
    expect(config.models.editorialReviewer).toBe("gpt-5.5");
    expect(config.models.layoutDesigner).toBe("gpt-5.3-codex");
    expect(config.models.dataAnalyst).toBe("gpt-5.5");
    expect(config.models.automationEngineer).toBe("gpt-5.3-codex");
    expect(config.models.reporting).toBe("gpt-5.5");
    expect(config.models.landingPage).toBe("gpt-5.3-codex");
  });

  it("uses OPENAI_MODEL as global fallback for all roles", () => {
    const config = loadConfig({
      DATABASE_PATH: "./tmp.sqlite",
      OPENAI_MODEL: "custom-default",
    });

    expect(config.models.orchestrator).toBe("custom-default");
    expect(config.models.researcher).toBe("custom-default");
    expect(config.models.operator).toBe("custom-default");
    expect(config.models.builder).toBe("custom-default");
    expect(config.models.safety).toBe("custom-default");
    expect(config.models.finance).toBe("custom-default");
    expect(config.models.campaignStrategist).toBe("custom-default");
    expect(config.models.contentStrategist).toBe("custom-default");
    expect(config.models.editorialReviewer).toBe("custom-default");
    expect(config.models.layoutDesigner).toBe("custom-default");
    expect(config.models.dataAnalyst).toBe("custom-default");
    expect(config.models.automationEngineer).toBe("custom-default");
    expect(config.models.landingPage).toBe("custom-default");
  });

  it("lets per-agent model variables override the fallback", () => {
    const config = loadConfig({
      DATABASE_PATH: "./tmp.sqlite",
      OPENAI_MODEL: "custom-default",
      OPENAI_BUILDER_MODEL: "custom-codex",
      OPENAI_OPERATOR_MODEL: "custom-operator",
      OPENAI_FINANCE_MODEL: "custom-finance",
      OPENAI_EDITORIAL_REVIEWER_MODEL: "custom-editor",
    });

    expect(config.models.builder).toBe("custom-codex");
    expect(config.models.operator).toBe("custom-operator");
    expect(config.models.finance).toBe("custom-finance");
    expect(config.models.editorialReviewer).toBe("custom-editor");
    expect(config.models.researcher).toBe("custom-default");
  });
});
