import type { ConnectorPlan } from "./types.js";

export const CONNECTOR_PLANS: ConnectorPlan[] = [
  {
    id: "google_drive_sheets",
    name: "Google Drive and Sheets",
    status: "connected",
    accessMode: "read_only",
    priority: 1,
    useFor: ["client source files", "CSV onboarding", "reports", "finance sheets", "shared folders"],
    approvalRequiredFor: ["editing source-of-truth sheets", "creating public/shareable client files"],
    notes: "Use as the first external data source. Prefer reading/importing before writing.",
  },
  {
    id: "gmail",
    name: "Gmail",
    status: "connected",
    accessMode: "draft_only",
    priority: 2,
    useFor: ["inbox triage", "client follow-up drafts", "approval requests", "relationship context"],
    approvalRequiredFor: ["sending email", "bulk labeling/archive", "client-facing replies"],
    notes: "Draft-first only. Sending requires explicit approval.",
  },
  {
    id: "canva",
    name: "Canva",
    status: "connected",
    accessMode: "approval_gated_write",
    priority: 3,
    useFor: ["social assets", "ad variants", "presentations", "creative resizing"],
    approvalRequiredFor: ["creating final client designs", "moving files", "publishing/exporting deliverables"],
    notes: "No brand kits were available in the last connector check.",
  },
  {
    id: "figma",
    name: "Figma",
    status: "connected",
    accessMode: "read_only",
    priority: 4,
    useFor: ["layout inspection", "wireframes", "landing page specs", "design-system handoff"],
    approvalRequiredFor: ["writing to files", "creating new designs", "syncing code maps"],
    notes: "Last check showed view access. Write operations may need upgraded permissions.",
  },
  {
    id: "meta_ads",
    name: "Meta Ads",
    status: "planned",
    accessMode: "read_only",
    priority: 5,
    useFor: ["campaign insights", "creative fatigue", "budget pacing", "audience/funnel diagnosis"],
    approvalRequiredFor: ["budget changes", "campaign edits", "audience changes", "publishing ads", "pixel or event changes"],
    notes: "Connect read-only first, then add approval-gated mutations only after validation.",
  },
  {
    id: "social_scheduler",
    name: "Social Scheduler",
    status: "planned",
    accessMode: "draft_only",
    priority: 6,
    useFor: ["X and Instagram content calendar", "draft scheduling", "approval workflows"],
    approvalRequiredFor: ["publishing posts", "changing scheduled posts", "replying publicly"],
    notes: "Evaluate Postiz, TryPost, or existing scheduler before direct platform writes.",
  },
  {
    id: "supabase",
    name: "Supabase/Postgres",
    status: "planned",
    accessMode: "approval_gated_write",
    priority: 7,
    useFor: ["multi-user database", "hosted dashboard", "auth", "server functions"],
    approvalRequiredFor: ["DDL migrations", "production data changes", "auth changes"],
    notes: "Use only when SQLite becomes limiting.",
  },
  {
    id: "vercel_or_cloudflare",
    name: "Vercel or Cloudflare",
    status: "planned",
    accessMode: "approval_gated_write",
    priority: 8,
    useFor: ["dashboard deploy", "landing pages", "scheduled jobs", "webhooks"],
    approvalRequiredFor: ["deploying production", "domain changes", "billing-sensitive resources"],
    notes: "Choose after dashboard/runtime requirements are clear.",
  },
];

export function formatConnectorPlans(): string {
  return CONNECTOR_PLANS
    .sort((left, right) => left.priority - right.priority)
    .map((connector) => {
      return [
        `${connector.priority}. ${connector.name} [${connector.status}/${connector.accessMode}]`,
        `Use for: ${connector.useFor.join(", ")}`,
        `Approval required for: ${connector.approvalRequiredFor.join(", ")}`,
        `Notes: ${connector.notes}`,
      ].join("\n");
    })
    .join("\n\n");
}
