export interface ReadinessSection {
  title: string;
  status: "ready" | "needs_data" | "needs_connector" | "later";
  items: string[];
}

export function getReadinessChecklist(): ReadinessSection[] {
  return [
    {
      title: "Local OS",
      status: "ready",
      items: [
        "Admin OS snapshot",
        "Client Delivery OS snapshot",
        "Command Center executive queue",
        "SQLite local state",
        "CSV templates, import, and export",
        "Telegram runtime with approval gates",
      ],
    },
    {
      title: "Agency Data Needed",
      status: "needs_data",
      items: [
        "Client list with niche, owner, status, and retainer",
        "Current work items and deadlines",
        "Receivables, payables, due dates, and status",
        "Active or planned campaigns by client",
        "Creative assets in production",
        "Reports in progress and reporting periods",
      ],
    },
    {
      title: "First Connectors",
      status: "needs_connector",
      items: [
        "Google Drive or Sheets for source-of-truth onboarding",
        "Gmail for inbox triage and draft-only client communication",
        "Canva for editable creative assets",
        "Figma for layouts, wireframes, and landing-page specs",
      ],
    },
    {
      title: "Marketing Platform Connectors",
      status: "later",
      items: [
        "Meta Ads read-only insights first",
        "Instagram/X scheduling or publishing through a safe scheduler",
        "Google Ads and GA4 once reporting schema is stable",
        "Approval-gated campaign mutations only after read-only validation",
      ],
    },
    {
      title: "Production Upgrade",
      status: "later",
      items: [
        "Supabase/Postgres when SQLite is not enough",
        "Dashboard UI for command center",
        "Scheduled weekly command center automation",
        "Deployment through Vercel or Cloudflare",
      ],
    },
  ];
}

export function formatReadinessChecklist(): string {
  return getReadinessChecklist()
    .map((section) => {
      return [
        `${section.title} [${section.status}]`,
        ...section.items.map((item) => `- ${item}`),
      ].join("\n");
    })
    .join("\n\n");
}
