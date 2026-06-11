#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const stateDir = path.join(root, ".office");
const logDir = path.join(stateDir, "logs");
const serverPidPath = path.join(stateDir, "server.pid");
const tunnelPidPath = path.join(stateDir, "tunnel.pid");

const fileEnv = loadEnvFile(path.join(stateDir, "env"));
const env = {
  ...fileEnv,
  ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)),
};

const publicUrl = stripTrailingSlash(env.OFFICE_PUBLIC_URL ?? "https://office.taooutsider.com");
const port = Number(env.PORT ?? "4174");
const localUrl = `http://localhost:${port}`;
const accessToken = env.WEB_ACCESS_TOKEN ?? "";
const tunnelConfig = expandHome(env.OFFICE_TUNNEL_CONFIG ?? "~/.cloudflared/agent-office.yml");
const tunnelName = env.OFFICE_TUNNEL_NAME ?? "agent-office";

const command = process.argv[2] ?? "doctor";

fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(logDir, { recursive: true });

try {
  if (command === "doctor") {
    await doctor();
  } else if (command === "up") {
    await up();
  } else if (command === "restart") {
    await restart();
  } else if (command === "stop") {
    await stop();
  } else {
    throw new Error(`Unknown office command: ${command}. Use doctor, up, restart, or stop.`);
  }
} catch (error) {
  console.error(`office:${command} failed`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function up() {
  ensureAccessToken();
  ensureBuild();
  await ensureServer();
  await ensureTunnel();
  await doctor();
}

async function restart() {
  await stop();
  await delay(1000);
  await up();
}

async function stop() {
  stopPidFile(serverPidPath, "server");
  stopPidFile(tunnelPidPath, "tunnel");
  stopMatchingProcesses(["node dist/web/server.js"], "server");
  stopMatchingProcesses([`cloudflared tunnel --config ${tunnelConfig}`, "cloudflared tunnel --config", `run ${tunnelName}`], "tunnel");
}

async function doctor() {
  const checks = [];
  checks.push(checkFile("server build", path.join(root, "dist/web/server.js")));
  checks.push(checkFile("web build", path.join(root, "web/dist/index.html")));
  checks.push(checkFile("tunnel config", tunnelConfig));
  checks.push({
    ok: Boolean(accessToken),
    label: "access code configured",
    detail: accessToken ? "present" : "missing WEB_ACCESS_TOKEN",
  });
  checks.push(checkProcess("server process", ["node dist/web/server.js"]));
  checks.push(checkProcess("tunnel process", [`cloudflared tunnel --config ${tunnelConfig}`, "cloudflared tunnel --config"]));

  const health = await httpCheck(`${localUrl}/api/health`);
  checks.push({
    ok: health.status === 200 && health.body.includes('"ok": true'),
    label: "local health",
    detail: `${health.status} ${localUrl}/api/health`,
  });

  const localBlocked = await httpCheck(`${localUrl}/api/bootstrap`);
  checks.push({
    ok: accessToken ? localBlocked.status === 401 : localBlocked.status === 200,
    label: "local api blocked without code",
    detail: String(localBlocked.status),
  });

  if (accessToken) {
    const localAuthorized = await httpCheck(`${localUrl}/api/bootstrap`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    checks.push({
      ok: localAuthorized.status === 200 && localAuthorized.body.includes('"projects"'),
      label: "local api with code",
      detail: String(localAuthorized.status),
    });
  }

  const publicGate = await httpCheck(`${publicUrl}/#office`);
  checks.push({
    ok:
      publicGate.status === 200 &&
      publicGate.body.includes("Access code") &&
      !publicGate.body.includes('script type="module"'),
    label: "public server-side gate",
    detail: `${publicGate.status} ${publicUrl}/#office`,
  });

  const assetPath = firstBuildAssetPath();
  const assetGate = await httpCheck(`${publicUrl}${assetPath}`);
  checks.push({
    ok: assetGate.status === 200 && assetGate.body.includes("Access code") && !assetGate.body.includes("createRoot"),
    label: "public assets gated",
    detail: `${assetGate.status} ${assetPath}`,
  });

  const publicBlocked = await httpCheck(`${publicUrl}/api/bootstrap`);
  checks.push({
    ok: publicBlocked.status === 401,
    label: "public api blocked without code",
    detail: String(publicBlocked.status),
  });

  if (accessToken) {
    const publicAuthorized = await httpCheck(`${publicUrl}/api/bootstrap`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    checks.push({
      ok: publicAuthorized.status === 200 && publicAuthorized.body.includes('"projects"'),
      label: "public api with code",
      detail: String(publicAuthorized.status),
    });
  }

  printChecks(checks);
  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

function ensureBuild() {
  if (fs.existsSync(path.join(root, "dist/web/server.js")) && fs.existsSync(path.join(root, "web/dist/index.html"))) {
    return;
  }
  console.log("Build missing. Running npm run build...");
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
}

async function ensureServer() {
  const health = await httpCheck(`${localUrl}/api/health`, { timeoutMs: 1500 });
  if (health.status === 200) {
    console.log(`Server already up: ${localUrl}`);
    return;
  }

  console.log(`Starting server on ${localUrl}`);
  const serverEnv = {
    ...process.env,
    ...fileEnv,
    ...env,
    CODEX_MESH_ROOT: env.CODEX_MESH_ROOT ?? "../codex-mesh",
    PORT: String(port),
  };
  const child = spawn("node", ["dist/web/server.js"], {
    cwd: root,
    detached: true,
    env: serverEnv,
    stdio: logFiles("server"),
  });
  fs.writeFileSync(serverPidPath, `${child.pid}\n`);
  child.unref();
  await waitFor(() => httpCheck(`${localUrl}/api/health`).then((result) => result.status === 200), 15000, "server health");
}

async function ensureTunnel() {
  const publicGate = await httpCheck(`${publicUrl}/#office`, { timeoutMs: 2500 });
  if (publicGate.status === 200) {
    console.log(`Tunnel already routes: ${publicUrl}`);
    return;
  }

  console.log(`Starting tunnel ${tunnelName}`);
  const child = spawn("cloudflared", ["tunnel", "--config", tunnelConfig, "run", tunnelName], {
    cwd: root,
    detached: true,
    env: { ...process.env, ...fileEnv, ...env },
    stdio: logFiles("tunnel"),
  });
  fs.writeFileSync(tunnelPidPath, `${child.pid}\n`);
  child.unref();
  await waitFor(() => httpCheck(`${publicUrl}/#office`).then((result) => result.status === 200), 30000, "public tunnel");
}

function logFiles(name) {
  const out = fs.openSync(path.join(logDir, `${name}.log`), "a");
  const err = fs.openSync(path.join(logDir, `${name}.err.log`), "a");
  return ["ignore", out, err];
}

function stopPidFile(pidPath, label) {
  const pid = readPid(pidPath);
  if (!pid) return;
  if (isPidAlive(pid)) {
    process.kill(pid, "SIGTERM");
    console.log(`Stopped ${label} pid ${pid}`);
  }
  fs.rmSync(pidPath, { force: true });
}

function stopMatchingProcesses(patterns, label) {
  for (const processInfo of listProcesses()) {
    if (processInfo.pid === process.pid) continue;
    if (patterns.every((pattern) => processInfo.command.includes(pattern))) {
      try {
        process.kill(processInfo.pid, "SIGTERM");
        console.log(`Stopped ${label} pid ${processInfo.pid}`);
      } catch {
        // Already gone.
      }
    }
  }
}

function readPid(pidPath) {
  if (!fs.existsSync(pidPath)) return null;
  const value = Number(fs.readFileSync(pidPath, "utf8").trim());
  return Number.isInteger(value) && value > 0 ? value : null;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listProcesses() {
  const raw = execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" });
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      return match ? { command: match[2], pid: Number(match[1]) } : null;
    })
    .filter(Boolean);
}

function checkFile(label, filePath) {
  return {
    ok: fs.existsSync(filePath),
    label,
    detail: filePath,
  };
}

function checkProcess(label, patterns) {
  const match = listProcesses().find((processInfo) => patterns.every((pattern) => processInfo.command.includes(pattern)));
  return {
    ok: Boolean(match),
    label,
    detail: match ? `pid ${match.pid}` : "not running",
  };
}

function firstBuildAssetPath() {
  const indexPath = path.join(root, "web/dist/index.html");
  if (!fs.existsSync(indexPath)) return "/assets/index.js";

  const html = fs.readFileSync(indexPath, "utf8");
  const scriptMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (scriptMatch) return scriptMatch[1];

  const styleMatch = html.match(/href="(\/assets\/[^"]+\.css)"/);
  if (styleMatch) return styleMatch[1];

  return "/assets/index.js";
}

async function httpCheck(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 7000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: options.headers,
      method: options.method ?? "GET",
      redirect: options.redirect ?? "follow",
      signal: controller.signal,
    });
    return {
      body: await response.text(),
      headers: response.headers,
      status: response.status,
    };
  } catch (error) {
    return {
      body: error instanceof Error ? error.message : String(error),
      headers: new Headers(),
      status: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitFor(fn, timeoutMs, label) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await fn()) return;
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return values;
}

function expandHome(value) {
  return value.startsWith("~/") ? path.join(process.env.HOME ?? "", value.slice(2)) : value;
}

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function ensureAccessToken() {
  if (!accessToken) {
    throw new Error("WEB_ACCESS_TOKEN is required. Set it in .office/env or the environment.");
  }
}

function printChecks(checks) {
  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.label}: ${check.detail}`);
  }
}
