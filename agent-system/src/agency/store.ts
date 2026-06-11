import crypto from "node:crypto";
import type Database from "better-sqlite3";
import type {
  AdminSnapshot,
  AgencySnapshot,
  AssetStatus,
  Campaign,
  CampaignStatus,
  Client,
  CommandCenterItem,
  CommandCenterSnapshot,
  ClientStatus,
  CreativeAsset,
  DeliverySnapshot,
  FinancialItem,
  FinancialItemType,
  FinancialStatus,
  Priority,
  Report,
  ReportStatus,
  WorkItem,
  WorkItemStatus,
  WorkItemType,
} from "./types.js";

type ClientRow = {
  id: string;
  name: string;
  niche: string | null;
  status: ClientStatus;
  owner: string | null;
  monthly_retainer: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WorkItemRow = {
  id: string;
  client_id: string | null;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: Priority;
  owner: string | null;
  due_date: string | null;
  channel: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type FinancialItemRow = {
  id: string;
  client_id: string | null;
  type: FinancialItemType;
  status: FinancialStatus;
  amount: number;
  currency: string;
  due_date: string | null;
  description: string;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignRow = {
  id: string;
  client_id: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  budget: number | null;
  currency: string;
  channels_json: string;
  kpis_json: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CreativeAssetRow = {
  id: string;
  client_id: string;
  campaign_id: string | null;
  type: string;
  status: AssetStatus;
  channel: string | null;
  format: string | null;
  brief: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type ReportRow = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  summary: string | null;
  next_steps: string | null;
  metrics_json: string;
  created_at: string;
  updated_at: string;
};

export class AgencyStore {
  constructor(private readonly db: Database.Database) {}

  createClient(input: {
    name: string;
    niche?: string | null;
    status?: ClientStatus;
    owner?: string | null;
    monthlyRetainer?: number | null;
    currency?: string;
    notes?: string | null;
  }): Client {
    const now = nowIso();
    const client: Client = {
      id: makeId("cli"),
      name: input.name,
      niche: input.niche ?? null,
      status: input.status ?? "active",
      owner: input.owner ?? null,
      monthlyRetainer: input.monthlyRetainer ?? null,
      currency: normalizeCurrency(input.currency),
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `insert into agency_clients (
          id, name, niche, status, owner, monthly_retainer, currency, notes, created_at, updated_at
        ) values (
          @id, @name, @niche, @status, @owner, @monthlyRetainer, @currency, @notes, @createdAt, @updatedAt
        )`,
      )
      .run(client);

    return client;
  }

  getClient(clientId: string): Client | null {
    const row = this.db
      .prepare("select * from agency_clients where id = ?")
      .get(clientId) as ClientRow | undefined;
    return row ? mapClient(row) : null;
  }

  listClients(input: { status?: ClientStatus; limit?: number } = {}): Client[] {
    const rows = input.status
      ? (this.db
          .prepare("select * from agency_clients where status = ? order by updated_at desc limit ?")
          .all(input.status, input.limit ?? 50) as ClientRow[])
      : (this.db
          .prepare("select * from agency_clients order by updated_at desc limit ?")
          .all(input.limit ?? 50) as ClientRow[]);

    return rows.map(mapClient);
  }

  createWorkItem(input: {
    title: string;
    clientId?: string | null;
    type?: WorkItemType;
    status?: WorkItemStatus;
    priority?: Priority;
    owner?: string | null;
    dueDate?: string | null;
    channel?: string | null;
    description?: string | null;
  }): WorkItem {
    const now = nowIso();
    const workItem: WorkItem = {
      id: makeId("wrk"),
      clientId: input.clientId ?? null,
      title: input.title,
      type: input.type ?? "client_request",
      status: input.status ?? "backlog",
      priority: input.priority ?? "medium",
      owner: input.owner ?? null,
      dueDate: input.dueDate ?? null,
      channel: input.channel ?? null,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `insert into agency_work_items (
          id, client_id, title, type, status, priority, owner, due_date, channel, description, created_at, updated_at
        ) values (
          @id, @clientId, @title, @type, @status, @priority, @owner, @dueDate, @channel, @description, @createdAt, @updatedAt
        )`,
      )
      .run(workItem);

    return workItem;
  }

  listWorkItems(input: { clientId?: string; status?: WorkItemStatus; limit?: number } = {}): WorkItem[] {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (input.clientId) {
      filters.push("client_id = ?");
      params.push(input.clientId);
    }

    if (input.status) {
      filters.push("status = ?");
      params.push(input.status);
    }

    params.push(input.limit ?? 50);
    const where = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
    const rows = this.db
      .prepare(`select * from agency_work_items ${where} order by due_date is null, due_date asc, updated_at desc limit ?`)
      .all(...params) as WorkItemRow[];

    return rows.map(mapWorkItem);
  }

  createFinancialItem(input: {
    type: FinancialItemType;
    amount: number;
    description: string;
    clientId?: string | null;
    status?: FinancialStatus;
    currency?: string;
    dueDate?: string | null;
    recurrence?: string | null;
  }): FinancialItem {
    const now = nowIso();
    const item: FinancialItem = {
      id: makeId("fin"),
      clientId: input.clientId ?? null,
      type: input.type,
      status: input.status ?? "open",
      amount: input.amount,
      currency: normalizeCurrency(input.currency),
      dueDate: input.dueDate ?? null,
      description: input.description,
      recurrence: input.recurrence ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `insert into agency_financial_items (
          id, client_id, type, status, amount, currency, due_date, description, recurrence, created_at, updated_at
        ) values (
          @id, @clientId, @type, @status, @amount, @currency, @dueDate, @description, @recurrence, @createdAt, @updatedAt
        )`,
      )
      .run(item);

    return item;
  }

  listFinancialItems(input: {
    clientId?: string;
    status?: FinancialStatus;
    type?: FinancialItemType;
    limit?: number;
  } = {}): FinancialItem[] {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (input.clientId) {
      filters.push("client_id = ?");
      params.push(input.clientId);
    }

    if (input.status) {
      filters.push("status = ?");
      params.push(input.status);
    }

    if (input.type) {
      filters.push("type = ?");
      params.push(input.type);
    }

    params.push(input.limit ?? 50);
    const where = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
    const rows = this.db
      .prepare(`select * from agency_financial_items ${where} order by due_date is null, due_date asc, updated_at desc limit ?`)
      .all(...params) as FinancialItemRow[];

    return rows.map(mapFinancialItem);
  }

  createCampaign(input: {
    clientId: string;
    name: string;
    objective: string;
    status?: CampaignStatus;
    budget?: number | null;
    currency?: string;
    channels?: string[];
    kpis?: Record<string, unknown>;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
  }): Campaign {
    const now = nowIso();
    const campaign: Campaign = {
      id: makeId("cmp"),
      clientId: input.clientId,
      name: input.name,
      objective: input.objective,
      status: input.status ?? "planned",
      budget: input.budget ?? null,
      currency: normalizeCurrency(input.currency),
      channelsJson: JSON.stringify(input.channels ?? []),
      kpisJson: JSON.stringify(input.kpis ?? {}),
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `insert into agency_campaigns (
          id, client_id, name, objective, status, budget, currency, channels_json,
          kpis_json, start_date, end_date, notes, created_at, updated_at
        ) values (
          @id, @clientId, @name, @objective, @status, @budget, @currency, @channelsJson,
          @kpisJson, @startDate, @endDate, @notes, @createdAt, @updatedAt
        )`,
      )
      .run(campaign);

    return campaign;
  }

  listCampaigns(input: { clientId?: string; status?: CampaignStatus; limit?: number } = {}): Campaign[] {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (input.clientId) {
      filters.push("client_id = ?");
      params.push(input.clientId);
    }

    if (input.status) {
      filters.push("status = ?");
      params.push(input.status);
    }

    params.push(input.limit ?? 50);
    const where = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
    const rows = this.db
      .prepare(`select * from agency_campaigns ${where} order by updated_at desc limit ?`)
      .all(...params) as CampaignRow[];

    return rows.map(mapCampaign);
  }

  createCreativeAsset(input: {
    clientId: string;
    brief: string;
    type: string;
    campaignId?: string | null;
    status?: AssetStatus;
    channel?: string | null;
    format?: string | null;
    dueDate?: string | null;
  }): CreativeAsset {
    const now = nowIso();
    const asset: CreativeAsset = {
      id: makeId("ast"),
      clientId: input.clientId,
      campaignId: input.campaignId ?? null,
      type: input.type,
      status: input.status ?? "briefed",
      channel: input.channel ?? null,
      format: input.format ?? null,
      brief: input.brief,
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `insert into agency_creative_assets (
          id, client_id, campaign_id, type, status, channel, format, brief, due_date, created_at, updated_at
        ) values (
          @id, @clientId, @campaignId, @type, @status, @channel, @format, @brief, @dueDate, @createdAt, @updatedAt
        )`,
      )
      .run(asset);

    return asset;
  }

  listCreativeAssets(input: {
    clientId?: string;
    campaignId?: string;
    status?: AssetStatus;
    limit?: number;
  } = {}): CreativeAsset[] {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (input.clientId) {
      filters.push("client_id = ?");
      params.push(input.clientId);
    }

    if (input.campaignId) {
      filters.push("campaign_id = ?");
      params.push(input.campaignId);
    }

    if (input.status) {
      filters.push("status = ?");
      params.push(input.status);
    }

    params.push(input.limit ?? 50);
    const where = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
    const rows = this.db
      .prepare(`select * from agency_creative_assets ${where} order by due_date is null, due_date asc, updated_at desc limit ?`)
      .all(...params) as CreativeAssetRow[];

    return rows.map(mapCreativeAsset);
  }

  createReport(input: {
    clientId: string;
    periodStart: string;
    periodEnd: string;
    status?: ReportStatus;
    summary?: string | null;
    nextSteps?: string | null;
    metrics?: Record<string, unknown>;
  }): Report {
    const now = nowIso();
    const report: Report = {
      id: makeId("rep"),
      clientId: input.clientId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: input.status ?? "draft",
      summary: input.summary ?? null,
      nextSteps: input.nextSteps ?? null,
      metricsJson: JSON.stringify(input.metrics ?? {}),
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `insert into agency_reports (
          id, client_id, period_start, period_end, status, summary, next_steps, metrics_json, created_at, updated_at
        ) values (
          @id, @clientId, @periodStart, @periodEnd, @status, @summary, @nextSteps, @metricsJson, @createdAt, @updatedAt
        )`,
      )
      .run(report);

    return report;
  }

  listReports(input: { clientId?: string; status?: ReportStatus; limit?: number } = {}): Report[] {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (input.clientId) {
      filters.push("client_id = ?");
      params.push(input.clientId);
    }

    if (input.status) {
      filters.push("status = ?");
      params.push(input.status);
    }

    params.push(input.limit ?? 50);
    const where = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
    const rows = this.db
      .prepare(`select * from agency_reports ${where} order by period_end desc, updated_at desc limit ?`)
      .all(...params) as ReportRow[];

    return rows.map(mapReport);
  }

  getSnapshot(): AgencySnapshot {
    return {
      clients: this.listClients({ limit: 100 }),
      activeWork: this.listWorkItems({ limit: 100 }).filter((item) => !["done", "cancelled"].includes(item.status)),
      openFinancialItems: this.listFinancialItems({ limit: 100 }).filter((item) => ["open", "overdue"].includes(item.status)),
      activeCampaigns: this.listCampaigns({ limit: 100 }).filter((campaign) => ["planned", "live", "paused"].includes(campaign.status)),
      reportsInReview: this.listReports({ limit: 100 }).filter((report) => ["draft", "review"].includes(report.status)),
      generatedAt: nowIso(),
    };
  }

  getAdminSnapshot(): AdminSnapshot {
    const openFinancialItems = this.listFinancialItems({ limit: 100 }).filter((item) =>
      ["open", "overdue"].includes(item.status),
    );
    const activeWork = this.listWorkItems({ limit: 100 }).filter((item) => !["done", "cancelled"].includes(item.status));
    const financialRiskClientIds = new Set(
      openFinancialItems
        .filter((item) => item.status === "overdue" && item.clientId)
        .map((item) => item.clientId as string),
    );

    return {
      generatedAt: nowIso(),
      openReceivables: openFinancialItems.filter((item) => item.type === "receivable"),
      openPayables: openFinancialItems.filter((item) => item.type === "payable"),
      overdueFinancialItems: openFinancialItems.filter((item) => item.status === "overdue"),
      internalWork: activeWork.filter((item) => item.clientId === null),
      financeWork: activeWork.filter((item) => item.type === "finance"),
      clientsAtFinancialRisk: this.listClients({ limit: 100 }).filter((client) => financialRiskClientIds.has(client.id)),
    };
  }

  getDeliverySnapshot(): DeliverySnapshot {
    const activeWork = this.listWorkItems({ limit: 100 }).filter((item) => !["done", "cancelled"].includes(item.status));
    const reports = this.listReports({ limit: 100 });
    const assets = this.listCreativeAssets({ limit: 100 });

    return {
      generatedAt: nowIso(),
      clients: this.listClients({ limit: 100 }).filter((client) => ["lead", "onboarding", "active", "paused"].includes(client.status)),
      clientWork: activeWork.filter((item) => item.clientId !== null && item.type !== "finance"),
      activeCampaigns: this.listCampaigns({ limit: 100 }).filter((campaign) => ["planned", "live", "paused"].includes(campaign.status)),
      creativeAssetsInProduction: assets.filter((asset) => ["briefed", "draft", "review"].includes(asset.status)),
      reportsInProgress: reports.filter((report) => ["draft", "review"].includes(report.status)),
      blockedApprovals: activeWork.filter((item) => item.status === "waiting_approval"),
    };
  }

  getCommandCenterSnapshot(): CommandCenterSnapshot {
    const admin = this.getAdminSnapshot();
    const delivery = this.getDeliverySnapshot();
    const executiveQueue = [
      ...buildAdminQueue(admin),
      ...buildDeliveryQueue(delivery),
    ]
      .sort(compareCommandCenterItems)
      .slice(0, 25);

    return {
      generatedAt: nowIso(),
      admin,
      delivery,
      executiveQueue,
    };
  }
}

function buildAdminQueue(snapshot: AdminSnapshot): CommandCenterItem[] {
  return [
    ...snapshot.overdueFinancialItems.map((item): CommandCenterItem => ({
      source: "admin",
      id: item.id,
      title: item.description,
      reason: `${item.type} ${item.status} (${item.currency} ${item.amount})`,
      priority: item.type === "receivable" ? "urgent" : "high",
      dueDate: item.dueDate,
      clientId: item.clientId,
      owner: null,
    })),
    ...snapshot.openReceivables.filter((item) => item.status === "open").map((item): CommandCenterItem => ({
      source: "admin",
      id: item.id,
      title: item.description,
      reason: `receivable open (${item.currency} ${item.amount})`,
      priority: "high",
      dueDate: item.dueDate,
      clientId: item.clientId,
      owner: null,
    })),
    ...snapshot.openPayables.filter((item) => item.status === "open").map((item): CommandCenterItem => ({
      source: "admin",
      id: item.id,
      title: item.description,
      reason: `payable open (${item.currency} ${item.amount})`,
      priority: "medium",
      dueDate: item.dueDate,
      clientId: item.clientId,
      owner: null,
    })),
    ...snapshot.internalWork.map((item): CommandCenterItem => ({
      source: "admin",
      id: item.id,
      title: item.title,
      reason: `internal work ${item.type}/${item.status}`,
      priority: item.priority,
      dueDate: item.dueDate,
      clientId: item.clientId,
      owner: item.owner,
    })),
  ];
}

function buildDeliveryQueue(snapshot: DeliverySnapshot): CommandCenterItem[] {
  return [
    ...snapshot.blockedApprovals.map((item): CommandCenterItem => ({
      source: "client_delivery",
      id: item.id,
      title: item.title,
      reason: `blocked approval ${item.type}/${item.status}`,
      priority: "urgent",
      dueDate: item.dueDate,
      clientId: item.clientId,
      owner: item.owner,
    })),
    ...snapshot.clientWork.filter((item) => item.status !== "waiting_approval").map((item): CommandCenterItem => ({
      source: "client_delivery",
      id: item.id,
      title: item.title,
      reason: `client work ${item.type}/${item.status}`,
      priority: item.priority,
      dueDate: item.dueDate,
      clientId: item.clientId,
      owner: item.owner,
    })),
    ...snapshot.creativeAssetsInProduction.map((asset): CommandCenterItem => ({
      source: "client_delivery",
      id: asset.id,
      title: `${asset.type}${asset.channel ? ` for ${asset.channel}` : ""}`,
      reason: `creative asset ${asset.status}`,
      priority: asset.status === "review" ? "high" : "medium",
      dueDate: asset.dueDate,
      clientId: asset.clientId,
      owner: null,
    })),
    ...snapshot.reportsInProgress.map((report): CommandCenterItem => ({
      source: "client_delivery",
      id: report.id,
      title: `Report ${report.periodStart} to ${report.periodEnd}`,
      reason: `report ${report.status}`,
      priority: report.status === "review" ? "high" : "medium",
      dueDate: report.periodEnd,
      clientId: report.clientId,
      owner: null,
    })),
  ];
}

function compareCommandCenterItems(left: CommandCenterItem, right: CommandCenterItem): number {
  const priorityDelta = priorityRank(right.priority) - priorityRank(left.priority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  if (left.dueDate && right.dueDate) {
    return left.dueDate.localeCompare(right.dueDate);
  }

  if (left.dueDate) {
    return -1;
  }

  if (right.dueDate) {
    return 1;
  }

  return left.title.localeCompare(right.title);
}

function priorityRank(priority: Priority): number {
  switch (priority) {
    case "urgent":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeCurrency(currency: string | undefined): string {
  return (currency ?? "BRL").trim().toUpperCase();
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    niche: row.niche,
    status: row.status,
    owner: row.owner,
    monthlyRetainer: row.monthly_retainer,
    currency: row.currency,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkItem(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    type: row.type,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    dueDate: row.due_date,
    channel: row.channel,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFinancialItem(row: FinancialItemRow): FinancialItem {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    dueDate: row.due_date,
    description: row.description,
    recurrence: row.recurrence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    objective: row.objective,
    status: row.status,
    budget: row.budget,
    currency: row.currency,
    channelsJson: row.channels_json,
    kpisJson: row.kpis_json,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCreativeAsset(row: CreativeAssetRow): CreativeAsset {
  return {
    id: row.id,
    clientId: row.client_id,
    campaignId: row.campaign_id,
    type: row.type,
    status: row.status,
    channel: row.channel,
    format: row.format,
    brief: row.brief,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReport(row: ReportRow): Report {
  return {
    id: row.id,
    clientId: row.client_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    summary: row.summary,
    nextSteps: row.next_steps,
    metricsJson: row.metrics_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
