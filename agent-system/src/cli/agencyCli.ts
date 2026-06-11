import { setDefaultOpenAIKey } from "@openai/agents";
import { AgencyStore } from "../agency/store.js";
import {
  exportAgencyCsvDirectory,
  importAgencyCsvDirectory,
  writeDataTemplates,
} from "../agency/dataExchange.js";
import { writeCommandCenterMarkdown } from "../agency/commandCenterReport.js";
import { CONNECTOR_PLANS, formatConnectorPlans } from "../agency/connectors.js";
import { writeOnboardingManifest } from "../agency/onboardingManifest.js";
import { formatReadinessChecklist } from "../agency/readiness.js";
import type {
  AdminSnapshot,
  AgencySnapshot,
  Client,
  CommandCenterSnapshot,
  DeliverySnapshot,
  FinancialItem,
  WorkItem,
} from "../agency/types.js";
import { assertOpenAIConfig, assertRuntimeConfig, loadConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { getModelRoutingPolicy } from "../modelPolicy.js";
import { AgentRuntime } from "../runtime/AgentRuntime.js";
import { openDatabase } from "../state/db.js";
import { AgentStore } from "../state/store.js";

type Flags = Record<string, string | boolean>;

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const config = loadConfig();
  assertRuntimeConfig(config);
  const logger = createLogger(config);
  const db = openDatabase((config.databasePath ?? "./data/agent.sqlite") as string);
  const store = new AgentStore(db);
  const agency = new AgencyStore(db);

  switch (command) {
    case "seed":
      printJson(seedDemoAgency(agency));
      break;
    case "snapshot":
      printSnapshot(agency.getSnapshot());
      break;
    case "admin:snapshot":
      printAdminSnapshot(agency.getAdminSnapshot());
      break;
    case "delivery:snapshot":
      printDeliverySnapshot(agency.getDeliverySnapshot());
      break;
    case "command:center":
      printCommandCenter(agency.getCommandCenterSnapshot());
      break;
    case "command:report":
      printJson({
        file: writeCommandCenterMarkdown(
          agency.getCommandCenterSnapshot(),
          optionalString(parseFlags(rest).flags, "out") ?? "./data/reports/command-center.md",
        ),
      });
      break;
    case "clients":
      printJson(agency.listClients({ limit: 100 }));
      break;
    case "models":
      printJson(getModelRoutingPolicy(config.models));
      break;
    case "readiness":
      console.log(formatReadinessChecklist());
      break;
    case "connectors":
      console.log(formatConnectorPlans());
      break;
    case "connectors:json":
      printJson(CONNECTOR_PLANS);
      break;
    case "onboarding:manifest":
      printJson({
        file: writeOnboardingManifest(optionalString(parseFlags(rest).flags, "out") ?? "./data/onboarding-manifest.md"),
      });
      break;
    case "data:templates":
      printJson(writeDataTemplates(optionalString(parseFlags(rest).flags, "dir") ?? "./data/import-template"));
      break;
    case "data:import":
      printJson(importAgencyCsvDirectory(agency, requireString(parseFlags(rest).flags, "dir")));
      break;
    case "data:export":
      printJson(exportAgencyCsvDirectory(agency, optionalString(parseFlags(rest).flags, "dir") ?? "./data/export"));
      break;
    case "client:add":
      printJson(addClient(agency, parseFlags(rest).flags));
      break;
    case "work:add":
      printJson(addWorkItem(agency, parseFlags(rest).flags));
      break;
    case "finance:add":
      printJson(addFinancialItem(agency, parseFlags(rest).flags));
      break;
    case "campaign:add":
      printJson(addCampaign(agency, parseFlags(rest).flags));
      break;
    case "ask":
      await askAgent(rest, config, store, agency, logger);
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}. Run: npm run agency -- help`);
  }
}

function seedDemoAgency(agency: AgencyStore) {
  const clinic = agency.createClient({
    name: "Clinica Demo",
    niche: "healthcare",
    owner: "ops",
    monthlyRetainer: 4500,
    notes: "Demo client for healthcare lead generation.",
  });
  const ecommerce = agency.createClient({
    name: "Loja Demo",
    niche: "ecommerce",
    owner: "growth",
    monthlyRetainer: 7000,
    notes: "Demo client for paid media and retention.",
  });
  const b2b = agency.createClient({
    name: "SaaS Demo",
    niche: "b2b saas",
    owner: "strategy",
    monthlyRetainer: 9000,
    notes: "Demo client for LinkedIn, Google Search, and landing pages.",
  });

  const work = [
    agency.createWorkItem({
      clientId: clinic.id,
      title: "Revisar funil de agendamento",
      type: "campaign",
      priority: "high",
      dueDate: "2026-06-10",
    }),
    agency.createWorkItem({
      clientId: ecommerce.id,
      title: "Criar 5 variacoes de criativos para Meta",
      type: "creative",
      priority: "medium",
      dueDate: "2026-06-07",
    }),
    agency.createWorkItem({
      clientId: b2b.id,
      title: "Wireframe de landing page para demo",
      type: "landing_page",
      priority: "high",
      dueDate: "2026-06-12",
    }),
    agency.createWorkItem({
      title: "Revisar renovacao da ferramenta de automacao",
      type: "automation",
      priority: "medium",
      dueDate: "2026-06-08",
      owner: "ops",
    }),
    agency.createWorkItem({
      clientId: ecommerce.id,
      title: "Aprovar nova linha visual da campanha",
      type: "creative",
      status: "waiting_approval",
      priority: "high",
      dueDate: "2026-06-06",
      owner: "creative",
    }),
  ];

  const financial = [
    agency.createFinancialItem({
      clientId: clinic.id,
      type: "receivable",
      amount: 4500,
      description: "Retainer mensal - Clinica Demo",
      dueDate: "2026-06-05",
    }),
    agency.createFinancialItem({
      type: "payable",
      amount: 1200,
      description: "Ferramenta de automacao",
      dueDate: "2026-06-08",
    }),
    agency.createFinancialItem({
      clientId: ecommerce.id,
      type: "receivable",
      status: "overdue",
      amount: 7000,
      description: "Retainer mensal em atraso - Loja Demo",
      dueDate: "2026-05-30",
    }),
  ];

  const campaigns = [
    agency.createCampaign({
      clientId: ecommerce.id,
      name: "Oferta Dia dos Namorados",
      objective: "Aumentar receita via Meta Ads com criativos de oferta e remarketing.",
      channels: ["Meta Ads", "Email", "WhatsApp"],
      budget: 12000,
      startDate: "2026-06-01",
      endDate: "2026-06-14",
      status: "live",
      kpis: { target_roas: 2.5, primary_metric: "purchase_value" },
    }),
  ];

  const assets = [
    agency.createCreativeAsset({
      clientId: ecommerce.id,
      campaignId: campaigns[0].id,
      type: "static_ad",
      status: "review",
      channel: "Meta Ads",
      format: "1:1",
      brief: "Criativo de oferta com produto, preco, prova e CTA para remarketing.",
      dueDate: "2026-06-06",
    }),
  ];

  const reports = [
    agency.createReport({
      clientId: clinic.id,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-07",
      status: "review",
      summary: "Relatorio semanal aguardando revisao final.",
      nextSteps: "Validar leads qualificados e taxa de agendamento.",
    }),
  ];

  return { clients: [clinic, ecommerce, b2b], work, financial, campaigns, assets, reports };
}

function addClient(agency: AgencyStore, flags: Flags): Client {
  return agency.createClient({
    name: requireString(flags, "name"),
    niche: optionalString(flags, "niche"),
    owner: optionalString(flags, "owner"),
    monthlyRetainer: optionalNumber(flags, "retainer"),
    currency: optionalString(flags, "currency") ?? "BRL",
    notes: optionalString(flags, "notes"),
  });
}

function addWorkItem(agency: AgencyStore, flags: Flags): WorkItem {
  return agency.createWorkItem({
    title: requireString(flags, "title"),
    clientId: optionalString(flags, "client"),
    type: optionalString(flags, "type") as never,
    priority: (optionalString(flags, "priority") as never) ?? "medium",
    dueDate: optionalString(flags, "due"),
    owner: optionalString(flags, "owner"),
    channel: optionalString(flags, "channel"),
    description: optionalString(flags, "description"),
  });
}

function addFinancialItem(agency: AgencyStore, flags: Flags): FinancialItem {
  return agency.createFinancialItem({
    type: requireString(flags, "type") as never,
    amount: requireNumber(flags, "amount"),
    description: requireString(flags, "description"),
    clientId: optionalString(flags, "client"),
    status: (optionalString(flags, "status") as never) ?? "open",
    currency: optionalString(flags, "currency") ?? "BRL",
    dueDate: optionalString(flags, "due"),
    recurrence: optionalString(flags, "recurrence"),
  });
}

function addCampaign(agency: AgencyStore, flags: Flags) {
  return agency.createCampaign({
    clientId: requireString(flags, "client"),
    name: requireString(flags, "name"),
    objective: requireString(flags, "objective"),
    budget: optionalNumber(flags, "budget"),
    currency: optionalString(flags, "currency") ?? "BRL",
    channels: splitList(optionalString(flags, "channels")),
    startDate: optionalString(flags, "start"),
    endDate: optionalString(flags, "end"),
    notes: optionalString(flags, "notes"),
  });
}

async function askAgent(
  args: string[],
  config: ReturnType<typeof loadConfig>,
  store: AgentStore,
  agency: AgencyStore,
  logger: ReturnType<typeof createLogger>,
): Promise<void> {
  const goal = args.join(" ").trim();
  if (!goal) {
    throw new Error("Usage: npm run agency -- ask <goal>");
  }

  assertOpenAIConfig(config);
  // @ts-expect-error openaiApiKey guaranteed by assertOpenAIConfig
  setDefaultOpenAIKey(config.openaiApiKey);

  const runtime = new AgentRuntime(config, store, agency, logger);
  const job = store.createJob({
    chatId: "codex-cli",
    userId: "codex-operator",
    goal,
  });
  const outcome = await runtime.runJob(job.id);
  console.log(outcome.message);
}

function parseFlags(args: string[]): { flags: Flags; positional: string[] } {
  const flags: Flags = {};
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const trimmed = arg.slice(2);
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex >= 0) {
      flags[trimmed.slice(0, equalsIndex)] = trimmed.slice(equalsIndex + 1);
      continue;
    }

    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[trimmed] = true;
      continue;
    }

    flags[trimmed] = next;
    index += 1;
  }

  return { flags, positional };
}

function requireString(flags: Flags, key: string): string {
  const value = flags[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required flag: --${key}`);
  }

  return value.trim();
}

function optionalString(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireNumber(flags: Flags, key: string): number {
  const value = Number(requireString(flags, key));
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid number for --${key}`);
  }

  return value;
}

function optionalNumber(flags: Flags, key: string): number | null {
  const value = optionalString(flags, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for --${key}`);
  }

  return parsed;
}

function splitList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function printSnapshot(snapshot: AgencySnapshot): void {
  console.log(`Generated: ${snapshot.generatedAt}`);
  console.log(`Clients: ${snapshot.clients.length}`);
  console.log(`Active work: ${snapshot.activeWork.length}`);
  console.log(`Open financial items: ${snapshot.openFinancialItems.length}`);
  console.log(`Active campaigns: ${snapshot.activeCampaigns.length}`);
  console.log(`Reports in review: ${snapshot.reportsInReview.length}`);
  console.log("");
  console.log("Top work:");
  for (const item of snapshot.activeWork.slice(0, 10)) {
    console.log(`- ${item.id} | ${item.priority} | ${item.status} | ${item.dueDate ?? "no due"} | ${item.title}`);
  }
  console.log("");
  console.log("Finance:");
  for (const item of snapshot.openFinancialItems.slice(0, 10)) {
    console.log(`- ${item.id} | ${item.type} | ${item.status} | ${item.currency} ${item.amount} | ${item.dueDate ?? "no due"} | ${item.description}`);
  }
}

function printAdminSnapshot(snapshot: AdminSnapshot): void {
  console.log(`Admin OS: ${snapshot.generatedAt}`);
  console.log(`Open receivables: ${snapshot.openReceivables.length}`);
  console.log(`Open payables: ${snapshot.openPayables.length}`);
  console.log(`Overdue financial items: ${snapshot.overdueFinancialItems.length}`);
  console.log(`Internal work: ${snapshot.internalWork.length}`);
  console.log(`Finance work: ${snapshot.financeWork.length}`);
  console.log(`Clients at financial risk: ${snapshot.clientsAtFinancialRisk.length}`);
  console.log("");
  console.log("Receivables:");
  for (const item of snapshot.openReceivables.slice(0, 10)) {
    console.log(`- ${item.id} | ${item.status} | ${item.currency} ${item.amount} | ${item.dueDate ?? "no due"} | ${item.description}`);
  }
  console.log("");
  console.log("Payables:");
  for (const item of snapshot.openPayables.slice(0, 10)) {
    console.log(`- ${item.id} | ${item.status} | ${item.currency} ${item.amount} | ${item.dueDate ?? "no due"} | ${item.description}`);
  }
  console.log("");
  console.log("Internal queue:");
  for (const item of snapshot.internalWork.slice(0, 10)) {
    console.log(`- ${item.id} | ${item.priority} | ${item.status} | ${item.dueDate ?? "no due"} | ${item.title}`);
  }
}

function printDeliverySnapshot(snapshot: DeliverySnapshot): void {
  console.log(`Client Delivery OS: ${snapshot.generatedAt}`);
  console.log(`Clients: ${snapshot.clients.length}`);
  console.log(`Client work: ${snapshot.clientWork.length}`);
  console.log(`Active campaigns: ${snapshot.activeCampaigns.length}`);
  console.log(`Creative assets in production: ${snapshot.creativeAssetsInProduction.length}`);
  console.log(`Reports in progress: ${snapshot.reportsInProgress.length}`);
  console.log(`Blocked approvals: ${snapshot.blockedApprovals.length}`);
  console.log("");
  console.log("Client work:");
  for (const item of snapshot.clientWork.slice(0, 10)) {
    console.log(`- ${item.id} | client=${item.clientId ?? "none"} | ${item.priority} | ${item.status} | ${item.dueDate ?? "no due"} | ${item.title}`);
  }
  console.log("");
  console.log("Campaigns:");
  for (const campaign of snapshot.activeCampaigns.slice(0, 10)) {
    console.log(`- ${campaign.id} | client=${campaign.clientId} | ${campaign.status} | ${campaign.name}`);
  }
  console.log("");
  console.log("Creative assets:");
  for (const asset of snapshot.creativeAssetsInProduction.slice(0, 10)) {
    console.log(`- ${asset.id} | client=${asset.clientId} | ${asset.status} | ${asset.dueDate ?? "no due"} | ${asset.type}`);
  }
}

function printCommandCenter(snapshot: CommandCenterSnapshot): void {
  console.log(`Command Center: ${snapshot.generatedAt}`);
  console.log(`Admin: ${snapshot.admin.openReceivables.length} receivables, ${snapshot.admin.openPayables.length} payables, ${snapshot.admin.internalWork.length} internal work`);
  console.log(`Delivery: ${snapshot.delivery.clientWork.length} work items, ${snapshot.delivery.activeCampaigns.length} campaigns, ${snapshot.delivery.creativeAssetsInProduction.length} assets, ${snapshot.delivery.reportsInProgress.length} reports`);
  console.log("");
  console.log("Executive queue:");
  for (const item of snapshot.executiveQueue) {
    console.log(`- ${item.source} | ${item.priority} | ${item.dueDate ?? "no due"} | client=${item.clientId ?? "none"} | ${item.title} (${item.reason})`);
  }
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp(): void {
  console.log(
    [
      "Agency CLI",
      "",
      "Commands:",
      "  npm run agency -- snapshot",
      "  npm run agency -- admin:snapshot",
      "  npm run agency -- delivery:snapshot",
      "  npm run agency -- command:center",
      "  npm run agency -- command:report --out ./data/reports/command-center.md",
      "  npm run agency -- seed",
      "  npm run agency -- models",
      "  npm run agency -- readiness",
      "  npm run agency -- connectors",
      "  npm run agency -- connectors:json",
      "  npm run agency -- onboarding:manifest --out ./data/onboarding-manifest.md",
      "  npm run agency -- data:templates --dir ./data/import-template",
      "  npm run agency -- data:import --dir ./data/import-template",
      "  npm run agency -- data:export --dir ./data/export",
      "  npm run agency -- clients",
      "  npm run agency -- client:add --name \"Cliente\" --niche ecommerce --retainer 5000",
      "  npm run agency -- work:add --client cli_x --title \"Criar campanha\" --type campaign --priority high --due 2026-06-10",
      "  npm run agency -- finance:add --type receivable --amount 5000 --description \"Retainer\" --client cli_x --due 2026-06-05",
      "  npm run agency -- campaign:add --client cli_x --name \"Campanha\" --objective \"Gerar leads\" --channels Meta,Google",
      "  npm run agency -- ask \"Monte o plano semanal da agencia\"",
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
