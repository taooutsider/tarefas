import fs from "node:fs";
import path from "node:path";
import { getReadinessChecklist } from "./readiness.js";

export function formatOnboardingManifest(): string {
  const readiness = getReadinessChecklist();

  return [
    "# Agency OS Onboarding Manifest",
    "",
    "Use this file when the local structure is ready and it is time to provide real agency data, files, and API credentials.",
    "",
    "## Data To Provide",
    "",
    "1. Client roster: name, niche, owner, status, retainer, currency, notes.",
    "2. Current delivery queue: title, client, type, status, priority, owner, due date, channel, description.",
    "3. Finance: receivables, payables, amount, due date, recurrence, status, client when relevant.",
    "4. Campaigns: client, campaign name, objective, channel, status, budget, date range, KPIs.",
    "5. Creative production: client, campaign, asset type, channel, format, brief, due date, status.",
    "6. Reports: client, period, status, metrics, summary, next steps.",
    "",
    "## Files Or Access",
    "",
    "- Existing client spreadsheets.",
    "- Google Drive folder structure, if already used.",
    "- Report templates.",
    "- Creative brief templates.",
    "- Brand assets and brand guidelines.",
    "- Any current campaign export from Meta Ads, Google Ads, GA4, CRM, or scheduler.",
    "",
    "## Credentials Or Connectors",
    "",
    "- OpenAI API key for agent runtime.",
    "- Telegram bot token and allowed user IDs.",
    "- Google Drive/Sheets connector access.",
    "- Gmail connector access for triage and drafts.",
    "- Canva/Figma access for creative/layout work.",
    "- Meta Ads access, read-only first.",
    "- Any scheduler/social platform access, draft-first and approval-gated.",
    "",
    "## Readiness Checklist",
    "",
    ...readiness.flatMap((section) => [
      `### ${section.title} (${section.status})`,
      "",
      ...section.items.map((item) => `- ${item}`),
      "",
    ]),
    "## Safety Rules",
    "",
    "- Do not send, publish, pay, deploy, mutate campaigns, or change production without approval.",
    "- Start with read-only imports before write actions.",
    "- Prefer CSV or Sheets import before direct platform mutation.",
  ].join("\n");
}

export function writeOnboardingManifest(outputPath: string): string {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${formatOnboardingManifest()}\n`, "utf8");
  return outputPath;
}
