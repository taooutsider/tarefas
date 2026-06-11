import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
create table if not exists jobs (
  id text primary key,
  chat_id text not null,
  user_id text not null,
  goal text not null,
  status text not null check (status in ('queued', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled')),
  result text,
  error text,
  run_state text,
  created_at text not null,
  updated_at text not null,
  started_at text,
  completed_at text
);

create index if not exists idx_jobs_chat_updated on jobs(chat_id, updated_at desc);

create table if not exists job_events (
  id text primary key,
  job_id text not null references jobs(id) on delete cascade,
  type text not null,
  message text not null,
  metadata text,
  created_at text not null
);

create index if not exists idx_job_events_job_created on job_events(job_id, created_at asc);

create table if not exists approvals (
  id text primary key,
  job_id text not null references jobs(id) on delete cascade,
  chat_id text not null,
  user_id text not null,
  interruption_index integer not null,
  agent_name text not null,
  tool_name text not null,
  arguments_json text not null,
  status text not null check (status in ('pending', 'approved', 'denied')),
  requested_at text not null,
  resolved_at text,
  resolved_by text,
  resolution_note text,
  unique(job_id, interruption_index)
);

create index if not exists idx_approvals_chat_status on approvals(chat_id, status, requested_at desc);

create table if not exists agency_clients (
  id text primary key,
  name text not null,
  niche text,
  status text not null check (status in ('lead', 'onboarding', 'active', 'paused', 'churned')),
  owner text,
  monthly_retainer real,
  currency text not null default 'BRL',
  notes text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_agency_clients_status on agency_clients(status, updated_at desc);

create table if not exists agency_work_items (
  id text primary key,
  client_id text references agency_clients(id) on delete set null,
  title text not null,
  type text not null check (type in ('strategy', 'creative', 'campaign', 'landing_page', 'report', 'automation', 'client_request', 'finance')),
  status text not null check (status in ('backlog', 'planned', 'in_progress', 'waiting_client', 'waiting_approval', 'done', 'cancelled')),
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  owner text,
  due_date text,
  channel text,
  description text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_agency_work_client_status on agency_work_items(client_id, status, due_date);
create index if not exists idx_agency_work_status_due on agency_work_items(status, due_date);

create table if not exists agency_financial_items (
  id text primary key,
  client_id text references agency_clients(id) on delete set null,
  type text not null check (type in ('receivable', 'payable')),
  status text not null check (status in ('draft', 'open', 'overdue', 'paid', 'cancelled')),
  amount real not null,
  currency text not null default 'BRL',
  due_date text,
  description text not null,
  recurrence text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_agency_financial_status_due on agency_financial_items(status, due_date);
create index if not exists idx_agency_financial_client on agency_financial_items(client_id, status);

create table if not exists agency_campaigns (
  id text primary key,
  client_id text not null references agency_clients(id) on delete cascade,
  name text not null,
  objective text not null,
  status text not null check (status in ('idea', 'planned', 'live', 'paused', 'completed', 'cancelled')),
  budget real,
  currency text not null default 'BRL',
  channels_json text not null default '[]',
  kpis_json text not null default '{}',
  start_date text,
  end_date text,
  notes text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_agency_campaigns_client_status on agency_campaigns(client_id, status);

create table if not exists agency_creative_assets (
  id text primary key,
  client_id text not null references agency_clients(id) on delete cascade,
  campaign_id text references agency_campaigns(id) on delete set null,
  type text not null,
  status text not null check (status in ('briefed', 'draft', 'review', 'approved', 'published', 'archived')),
  channel text,
  format text,
  brief text not null,
  due_date text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_agency_assets_client_status on agency_creative_assets(client_id, status);
create index if not exists idx_agency_assets_campaign_status on agency_creative_assets(campaign_id, status);

create table if not exists agency_reports (
  id text primary key,
  client_id text not null references agency_clients(id) on delete cascade,
  period_start text not null,
  period_end text not null,
  status text not null check (status in ('draft', 'review', 'sent', 'approved')),
  summary text,
  next_steps text,
  metrics_json text not null default '{}',
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_agency_reports_client_period on agency_reports(client_id, period_start, period_end);
`;

export function openDatabase(databasePath: string): Database.Database {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  return db;
}
