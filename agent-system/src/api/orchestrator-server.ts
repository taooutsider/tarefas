#!/usr/bin/env node
/**
 * Orchestrator API Server
 *
 * Runs the central AgentRuntime and agency business logic.
 * Shared by web, Telegram, and CLI via HTTP API.
 */

import { setDefaultOpenAIKey } from "@openai/agents";
import http from "node:http";
import { readJsonBody } from "../http/helpers.js";
import { AgencyStore } from "../agency/store.js";
import { loadConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { AgentRuntime } from "../runtime/AgentRuntime.js";
import { openDatabase } from "../state/db.js";
import { AgentStore } from "../state/store.js";

const config = loadConfig();
const logger = createLogger(config);

// Determine database type: PostgreSQL or SQLite
let db: any;
if (config.databaseUrl) {
  // PostgreSQL
  logger.info("Using PostgreSQL", { url: config.databaseUrl.split("@")[1] });
  // TODO: Import and use pg-based database adapter
  throw new Error("PostgreSQL adapter not yet implemented. Use SQLite for now.");
} else {
  // SQLite (local development)
  db = openDatabase(config.databasePath);
  logger.info("Using SQLite", { path: config.databasePath });
}

const store = new AgentStore(db);
const agency = new AgencyStore(db);
const runtime = new AgentRuntime(config, store, agency, logger);

if (config.openaiApiKey) {
  setDefaultOpenAIKey(config.openaiApiKey);
}

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }));
      return;
    }

    if (url.pathname === "/api/jobs" && req.method === "POST") {
      const body = await readJsonBody<{ goal?: string }>(req);
      const goal = body.goal?.trim();
      if (!goal) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing goal" }));
        return;
      }

      const job = store.createJob({ chatId: "api", userId: "orchestrator", goal });

      if (!config.openaiApiKey) {
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ job, message: "Job created. Configure OPENAI_API_KEY to run." }));
        return;
      }

      try {
        const outcome = await runtime.runJob(job.id);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(outcome));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (url.pathname === "/api/snapshot" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(agency.getSnapshot()));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Request failed", { error: message });
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(port, "0.0.0.0", () => {
  logger.info("Orchestrator API listening", { port });
  console.log(`Orchestrator API: http://localhost:${port}`);
});
