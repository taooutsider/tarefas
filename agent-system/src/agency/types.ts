export const CLIENT_STATUSES = ["lead", "onboarding", "active", "paused", "churned"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const WORK_ITEM_TYPES = [
  "strategy",
  "creative",
  "campaign",
  "landing_page",
  "report",
  "automation",
  "client_request",
  "finance",
] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const WORK_ITEM_STATUSES = [
  "backlog",
  "planned",
  "in_progress",
  "waiting_client",
  "waiting_approval",
  "done",
  "cancelled",
] as const;
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const FINANCIAL_ITEM_TYPES = ["receivable", "payable"] as const;
export type FinancialItemType = (typeof FINANCIAL_ITEM_TYPES)[number];

export const FINANCIAL_STATUSES = ["draft", "open", "overdue", "paid", "cancelled"] as const;
export type FinancialStatus = (typeof FINANCIAL_STATUSES)[number];

export const CAMPAIGN_STATUSES = ["idea", "planned", "live", "paused", "completed", "cancelled"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const ASSET_STATUSES = ["briefed", "draft", "review", "approved", "published", "archived"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const REPORT_STATUSES = ["draft", "review", "sent", "approved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface Client {
  id: string;
  name: string;
  niche: string | null;
  status: ClientStatus;
  owner: string | null;
  monthlyRetainer: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItem {
  id: string;
  clientId: string | null;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: Priority;
  owner: string | null;
  dueDate: string | null;
  channel: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialItem {
  id: string;
  clientId: string | null;
  type: FinancialItemType;
  status: FinancialStatus;
  amount: number;
  currency: string;
  dueDate: string | null;
  description: string;
  recurrence: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  budget: number | null;
  currency: string;
  channelsJson: string;
  kpisJson: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeAsset {
  id: string;
  clientId: string;
  campaignId: string | null;
  type: string;
  status: AssetStatus;
  channel: string | null;
  format: string | null;
  brief: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  summary: string | null;
  nextSteps: string | null;
  metricsJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgencySnapshot {
  clients: Client[];
  activeWork: WorkItem[];
  openFinancialItems: FinancialItem[];
  activeCampaigns: Campaign[];
  reportsInReview: Report[];
  generatedAt: string;
}

export interface AdminSnapshot {
  generatedAt: string;
  openReceivables: FinancialItem[];
  openPayables: FinancialItem[];
  overdueFinancialItems: FinancialItem[];
  internalWork: WorkItem[];
  financeWork: WorkItem[];
  clientsAtFinancialRisk: Client[];
}

export interface DeliverySnapshot {
  generatedAt: string;
  clients: Client[];
  clientWork: WorkItem[];
  activeCampaigns: Campaign[];
  creativeAssetsInProduction: CreativeAsset[];
  reportsInProgress: Report[];
  blockedApprovals: WorkItem[];
}

export type CommandCenterSource = "admin" | "client_delivery";

export interface CommandCenterItem {
  source: CommandCenterSource;
  id: string;
  title: string;
  reason: string;
  priority: Priority;
  dueDate: string | null;
  clientId: string | null;
  owner: string | null;
}

export interface CommandCenterSnapshot {
  generatedAt: string;
  admin: AdminSnapshot;
  delivery: DeliverySnapshot;
  executiveQueue: CommandCenterItem[];
}

export type ConnectorStatus = "planned" | "connected" | "needs_auth" | "blocked";
export type ConnectorAccessMode = "local_only" | "read_only" | "draft_only" | "approval_gated_write";

export interface ConnectorPlan {
  id: string;
  name: string;
  status: ConnectorStatus;
  accessMode: ConnectorAccessMode;
  priority: number;
  useFor: string[];
  approvalRequiredFor: string[];
  notes: string;
}
