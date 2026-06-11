import fs from "node:fs";
import path from "node:path";
import type { AgencyStore } from "./store.js";
import { parseCsv, stringifyCsv, type CsvRow } from "./csv.js";
import type {
  AssetStatus,
  CampaignStatus,
  FinancialItemType,
  FinancialStatus,
  Priority,
  ReportStatus,
  WorkItemStatus,
  WorkItemType,
} from "./types.js";

export const DATA_FILE_NAMES = [
  "clients.csv",
  "work_items.csv",
  "financial_items.csv",
  "campaigns.csv",
  "creative_assets.csv",
  "reports.csv",
] as const;

export type DataFileName = (typeof DATA_FILE_NAMES)[number];

export interface DataExchangeSummary {
  files: string[];
  imported?: Record<DataFileName, number>;
  exported?: Record<DataFileName, number>;
}

const TEMPLATES: Record<DataFileName, { headers: string[]; rows: CsvRow[] }> = {
  "clients.csv": {
    headers: ["id", "name", "niche", "status", "owner", "monthlyRetainer", "currency", "notes"],
    rows: [
      {
        id: "",
        name: "Cliente Exemplo",
        niche: "ecommerce",
        status: "active",
        owner: "victor",
        monthlyRetainer: "7000",
        currency: "BRL",
        notes: "Contexto, combinados e riscos principais.",
      },
    ],
  },
  "work_items.csv": {
    headers: ["title", "clientId", "type", "status", "priority", "owner", "dueDate", "channel", "description"],
    rows: [
      {
        title: "Criar campanha Meta",
        clientId: "",
        type: "campaign",
        status: "planned",
        priority: "high",
        owner: "growth",
        dueDate: "2026-06-10",
        channel: "Meta Ads",
        description: "Objetivo, entregavel, contexto e aprovacao necessaria.",
      },
    ],
  },
  "financial_items.csv": {
    headers: ["type", "amount", "description", "clientId", "status", "currency", "dueDate", "recurrence"],
    rows: [
      {
        type: "receivable",
        amount: "7000",
        description: "Retainer mensal",
        clientId: "",
        status: "open",
        currency: "BRL",
        dueDate: "2026-06-05",
        recurrence: "monthly",
      },
    ],
  },
  "campaigns.csv": {
    headers: ["clientId", "name", "objective", "status", "budget", "currency", "channels", "kpisJson", "startDate", "endDate", "notes"],
    rows: [
      {
        clientId: "",
        name: "Oferta principal",
        objective: "Gerar leads qualificados",
        status: "planned",
        budget: "12000",
        currency: "BRL",
        channels: "Meta Ads;Google Ads",
        kpisJson: "{\"cpl_target\":50}",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        notes: "Hipoteses, publico, oferta e riscos.",
      },
    ],
  },
  "creative_assets.csv": {
    headers: ["clientId", "campaignId", "type", "status", "channel", "format", "brief", "dueDate"],
    rows: [
      {
        clientId: "",
        campaignId: "",
        type: "static_ad",
        status: "briefed",
        channel: "Meta Ads",
        format: "1:1",
        brief: "Angulo, promessa, prova, visual, texto e CTA.",
        dueDate: "2026-06-07",
      },
    ],
  },
  "reports.csv": {
    headers: ["clientId", "periodStart", "periodEnd", "status", "summary", "nextSteps", "metricsJson"],
    rows: [
      {
        clientId: "",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-07",
        status: "draft",
        summary: "Resumo do periodo.",
        nextSteps: "Proximas acoes.",
        metricsJson: "{\"spend\":0}",
      },
    ],
  },
};

export function writeDataTemplates(outputDir: string): DataExchangeSummary {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = DATA_FILE_NAMES.map((fileName) => {
    const template = TEMPLATES[fileName];
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, `${stringifyCsv(template.rows, template.headers)}\n`, "utf8");
    return filePath;
  });

  return { files };
}

export function importAgencyCsvDirectory(agency: AgencyStore, inputDir: string): DataExchangeSummary {
  const imported = emptyCounts();
  const clientIdsByReference = new Map<string, string>();

  for (const row of readRows(inputDir, "clients.csv")) {
    const client = agency.createClient({
      name: requireCell(row, "name", "clients.csv"),
      niche: nullableCell(row, "niche"),
      status: enumCell(row, "status", "active") as never,
      owner: nullableCell(row, "owner"),
      monthlyRetainer: numberCell(row, "monthlyRetainer"),
      currency: row.currency || "BRL",
      notes: nullableCell(row, "notes"),
    });
    const explicitId = nullableCell(row, "id");
    if (explicitId) {
      clientIdsByReference.set(explicitId, client.id);
    }
    clientIdsByReference.set(client.name, client.id);
    imported["clients.csv"] += 1;
  }

  for (const row of readRows(inputDir, "work_items.csv")) {
    agency.createWorkItem({
      title: requireCell(row, "title", "work_items.csv"),
      clientId: resolveClientReference(nullableCell(row, "clientId"), clientIdsByReference),
      type: enumCell(row, "type", "client_request") as WorkItemType,
      status: enumCell(row, "status", "backlog") as WorkItemStatus,
      priority: enumCell(row, "priority", "medium") as Priority,
      owner: nullableCell(row, "owner"),
      dueDate: nullableCell(row, "dueDate"),
      channel: nullableCell(row, "channel"),
      description: nullableCell(row, "description"),
    });
    imported["work_items.csv"] += 1;
  }

  for (const row of readRows(inputDir, "financial_items.csv")) {
    agency.createFinancialItem({
      type: enumCell(row, "type", "receivable") as FinancialItemType,
      amount: numberCell(row, "amount") ?? 0,
      description: requireCell(row, "description", "financial_items.csv"),
      clientId: resolveClientReference(nullableCell(row, "clientId"), clientIdsByReference),
      status: enumCell(row, "status", "open") as FinancialStatus,
      currency: row.currency || "BRL",
      dueDate: nullableCell(row, "dueDate"),
      recurrence: nullableCell(row, "recurrence"),
    });
    imported["financial_items.csv"] += 1;
  }

  for (const row of readRows(inputDir, "campaigns.csv")) {
    agency.createCampaign({
      clientId: resolveRequiredClientReference(row, "clientId", "campaigns.csv", clientIdsByReference),
      name: requireCell(row, "name", "campaigns.csv"),
      objective: requireCell(row, "objective", "campaigns.csv"),
      status: enumCell(row, "status", "planned") as CampaignStatus,
      budget: numberCell(row, "budget"),
      currency: row.currency || "BRL",
      channels: splitSemicolon(row.channels),
      kpis: parseJsonObject(row.kpisJson),
      startDate: nullableCell(row, "startDate"),
      endDate: nullableCell(row, "endDate"),
      notes: nullableCell(row, "notes"),
    });
    imported["campaigns.csv"] += 1;
  }

  for (const row of readRows(inputDir, "creative_assets.csv")) {
    agency.createCreativeAsset({
      clientId: resolveRequiredClientReference(row, "clientId", "creative_assets.csv", clientIdsByReference),
      campaignId: nullableCell(row, "campaignId"),
      type: requireCell(row, "type", "creative_assets.csv"),
      status: enumCell(row, "status", "briefed") as AssetStatus,
      channel: nullableCell(row, "channel"),
      format: nullableCell(row, "format"),
      brief: requireCell(row, "brief", "creative_assets.csv"),
      dueDate: nullableCell(row, "dueDate"),
    });
    imported["creative_assets.csv"] += 1;
  }

  for (const row of readRows(inputDir, "reports.csv")) {
    agency.createReport({
      clientId: resolveRequiredClientReference(row, "clientId", "reports.csv", clientIdsByReference),
      periodStart: requireCell(row, "periodStart", "reports.csv"),
      periodEnd: requireCell(row, "periodEnd", "reports.csv"),
      status: enumCell(row, "status", "draft") as ReportStatus,
      summary: nullableCell(row, "summary"),
      nextSteps: nullableCell(row, "nextSteps"),
      metrics: parseJsonObject(row.metricsJson),
    });
    imported["reports.csv"] += 1;
  }

  return {
    files: DATA_FILE_NAMES.map((fileName) => path.join(inputDir, fileName)),
    imported,
  };
}

export function exportAgencyCsvDirectory(agency: AgencyStore, outputDir: string): DataExchangeSummary {
  fs.mkdirSync(outputDir, { recursive: true });
  const exported = emptyCounts();

  writeCsv(outputDir, "clients.csv", TEMPLATES["clients.csv"].headers, agency.listClients({ limit: 1000 }).map((client) => ({
    id: client.id,
    name: client.name,
    niche: client.niche ?? "",
    status: client.status,
    owner: client.owner ?? "",
    monthlyRetainer: String(client.monthlyRetainer ?? ""),
    currency: client.currency,
    notes: client.notes ?? "",
  })));
  exported["clients.csv"] = agency.listClients({ limit: 1000 }).length;

  writeCsv(outputDir, "work_items.csv", TEMPLATES["work_items.csv"].headers, agency.listWorkItems({ limit: 1000 }).map((item) => ({
    title: item.title,
    clientId: item.clientId ?? "",
    type: item.type,
    status: item.status,
    priority: item.priority,
    owner: item.owner ?? "",
    dueDate: item.dueDate ?? "",
    channel: item.channel ?? "",
    description: item.description ?? "",
  })));
  exported["work_items.csv"] = agency.listWorkItems({ limit: 1000 }).length;

  writeCsv(outputDir, "financial_items.csv", TEMPLATES["financial_items.csv"].headers, agency.listFinancialItems({ limit: 1000 }).map((item) => ({
    type: item.type,
    amount: String(item.amount),
    description: item.description,
    clientId: item.clientId ?? "",
    status: item.status,
    currency: item.currency,
    dueDate: item.dueDate ?? "",
    recurrence: item.recurrence ?? "",
  })));
  exported["financial_items.csv"] = agency.listFinancialItems({ limit: 1000 }).length;

  writeCsv(outputDir, "campaigns.csv", TEMPLATES["campaigns.csv"].headers, agency.listCampaigns({ limit: 1000 }).map((campaign) => ({
    clientId: campaign.clientId,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status,
    budget: String(campaign.budget ?? ""),
    currency: campaign.currency,
    channels: parseJsonArray(campaign.channelsJson).join(";"),
    kpisJson: campaign.kpisJson,
    startDate: campaign.startDate ?? "",
    endDate: campaign.endDate ?? "",
    notes: campaign.notes ?? "",
  })));
  exported["campaigns.csv"] = agency.listCampaigns({ limit: 1000 }).length;

  writeCsv(outputDir, "creative_assets.csv", TEMPLATES["creative_assets.csv"].headers, agency.listCreativeAssets({ limit: 1000 }).map((asset) => ({
    clientId: asset.clientId,
    campaignId: asset.campaignId ?? "",
    type: asset.type,
    status: asset.status,
    channel: asset.channel ?? "",
    format: asset.format ?? "",
    brief: asset.brief,
    dueDate: asset.dueDate ?? "",
  })));
  exported["creative_assets.csv"] = agency.listCreativeAssets({ limit: 1000 }).length;

  writeCsv(outputDir, "reports.csv", TEMPLATES["reports.csv"].headers, agency.listReports({ limit: 1000 }).map((report) => ({
    clientId: report.clientId,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    status: report.status,
    summary: report.summary ?? "",
    nextSteps: report.nextSteps ?? "",
    metricsJson: report.metricsJson,
  })));
  exported["reports.csv"] = agency.listReports({ limit: 1000 }).length;

  return {
    files: DATA_FILE_NAMES.map((fileName) => path.join(outputDir, fileName)),
    exported,
  };
}

function writeCsv(outputDir: string, fileName: DataFileName, headers: string[], rows: CsvRow[]): void {
  fs.writeFileSync(path.join(outputDir, fileName), `${stringifyCsv(rows, headers)}\n`, "utf8");
}

function readRows(inputDir: string, fileName: DataFileName): CsvRow[] {
  const filePath = path.join(inputDir, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function requireCell(row: CsvRow, key: string, fileName: DataFileName): string {
  const value = row[key]?.trim();
  if (!value) {
    throw new Error(`Missing required column ${key} in ${fileName}`);
  }

  return value;
}

function nullableCell(row: CsvRow, key: string): string | null {
  const value = row[key]?.trim();
  return value ? value : null;
}

function resolveClientReference(value: string | null, clientsByReference: Map<string, string>): string | null {
  if (!value) {
    return null;
  }

  return clientsByReference.get(value) ?? value;
}

function resolveRequiredClientReference(
  row: CsvRow,
  key: string,
  fileName: DataFileName,
  clientsByReference: Map<string, string>,
): string {
  return resolveClientReference(requireCell(row, key, fileName), clientsByReference) as string;
}

function numberCell(row: CsvRow, key: string): number | null {
  const value = row[key]?.trim();
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number in ${key}: ${value}`);
  }

  return parsed;
}

function enumCell(row: CsvRow, key: string, fallback: string): string {
  return row[key]?.trim() || fallback;
}

function splitSemicolon(value: string | undefined): string[] {
  return (value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonObject(value: string | undefined): Record<string, unknown> {
  if (!value?.trim()) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  throw new Error("Expected JSON object.");
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function emptyCounts(): Record<DataFileName, number> {
  return {
    "clients.csv": 0,
    "work_items.csv": 0,
    "financial_items.csv": 0,
    "campaigns.csv": 0,
    "creative_assets.csv": 0,
    "reports.csv": 0,
  };
}
