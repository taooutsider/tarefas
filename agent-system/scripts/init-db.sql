-- Initialize PostgreSQL schema for Agency Agent System
-- This script is auto-run by docker-compose on database init

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled')),
  result TEXT,
  error TEXT,
  run_state TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_chat_updated ON jobs(chat_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_updated ON jobs(status, updated_at DESC);

-- Job events table
CREATE TABLE IF NOT EXISTS job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_events_job_created ON job_events(job_id, created_at ASC);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  interruption_index INTEGER NOT NULL,
  agent_name TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  arguments_json JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  resolution_note TEXT,
  UNIQUE(job_id, interruption_index)
);

CREATE INDEX IF NOT EXISTS idx_approvals_chat_status ON approvals(chat_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_job_id ON approvals(job_id);

-- Agency clients
CREATE TABLE IF NOT EXISTS agency_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  niche TEXT,
  status TEXT NOT NULL CHECK (status IN ('lead', 'onboarding', 'active', 'paused', 'churned')) DEFAULT 'lead',
  owner TEXT,
  monthly_retainer NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_clients_status ON agency_clients(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_clients_name ON agency_clients(name);

-- Agency work items
CREATE TABLE IF NOT EXISTS agency_work_items (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES agency_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('strategy', 'creative', 'campaign', 'landing_page', 'report', 'automation', 'client_request', 'finance')),
  status TEXT NOT NULL CHECK (status IN ('backlog', 'planned', 'in_progress', 'waiting_client', 'waiting_approval', 'done', 'cancelled')) DEFAULT 'backlog',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  owner TEXT,
  due_date DATE,
  channel TEXT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_work_client_status ON agency_work_items(client_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_agency_work_status_due ON agency_work_items(status, due_date);
CREATE INDEX IF NOT EXISTS idx_agency_work_priority ON agency_work_items(priority, due_date);

-- Agency financial items
CREATE TABLE IF NOT EXISTS agency_financial_items (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES agency_clients(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('receivable', 'payable')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'overdue', 'paid', 'cancelled')) DEFAULT 'draft',
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  due_date DATE,
  description TEXT NOT NULL,
  recurrence TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_financial_status_due ON agency_financial_items(status, due_date);
CREATE INDEX IF NOT EXISTS idx_agency_financial_client ON agency_financial_items(client_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_financial_type ON agency_financial_items(type, status);

-- Agency campaigns
CREATE TABLE IF NOT EXISTS agency_campaigns (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('idea', 'planned', 'live', 'paused', 'completed', 'cancelled')) DEFAULT 'idea',
  budget NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  channels JSONB NOT NULL DEFAULT '[]',
  kpis JSONB NOT NULL DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_campaigns_client_status ON agency_campaigns(client_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_campaigns_start_date ON agency_campaigns(start_date);

-- Creative assets
CREATE TABLE IF NOT EXISTS agency_creative_assets (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES agency_campaigns(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('briefed', 'draft', 'review', 'approved', 'published', 'archived')) DEFAULT 'briefed',
  channel TEXT,
  format TEXT,
  brief TEXT NOT NULL,
  due_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_assets_client_status ON agency_creative_assets(client_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_assets_campaign_status ON agency_creative_assets(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_assets_due_date ON agency_creative_assets(due_date);

-- Reports
CREATE TABLE IF NOT EXISTS agency_reports (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'sent', 'approved')) DEFAULT 'draft',
  summary TEXT,
  next_steps TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_reports_client_period ON agency_reports(client_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_agency_reports_status ON agency_reports(status);

-- Grant permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO agency_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO agency_user;
