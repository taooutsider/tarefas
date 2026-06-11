import fs from "node:fs";
import path from "node:path";
import type { CommandCenterSnapshot } from "./types.js";

export function formatCommandCenterMarkdown(snapshot: CommandCenterSnapshot): string {
  return [
    "# Agency Command Center",
    "",
    `Generated: ${snapshot.generatedAt}`,
    "",
    "## Admin OS",
    "",
    `- Open receivables: ${snapshot.admin.openReceivables.length}`,
    `- Open payables: ${snapshot.admin.openPayables.length}`,
    `- Overdue financial items: ${snapshot.admin.overdueFinancialItems.length}`,
    `- Internal work: ${snapshot.admin.internalWork.length}`,
    `- Clients at financial risk: ${snapshot.admin.clientsAtFinancialRisk.length}`,
    "",
    "## Client Delivery OS",
    "",
    `- Clients: ${snapshot.delivery.clients.length}`,
    `- Client work: ${snapshot.delivery.clientWork.length}`,
    `- Active campaigns: ${snapshot.delivery.activeCampaigns.length}`,
    `- Creative assets in production: ${snapshot.delivery.creativeAssetsInProduction.length}`,
    `- Reports in progress: ${snapshot.delivery.reportsInProgress.length}`,
    `- Blocked approvals: ${snapshot.delivery.blockedApprovals.length}`,
    "",
    "## Executive Queue",
    "",
    ...snapshot.executiveQueue.map((item, index) => {
      return `${index + 1}. [${item.source}] ${item.priority.toUpperCase()} | ${item.dueDate ?? "no due"} | client=${item.clientId ?? "none"} | ${item.title}\n   Reason: ${item.reason}`;
    }),
    "",
    "## Operating Notes",
    "",
    "- Admin OS and Client Delivery OS stay separate until prioritization.",
    "- External sends, publishing, payments, ad changes, deploys, and production mutations require approval.",
    "- Missing data should be called out instead of guessed.",
  ].join("\n");
}

export function writeCommandCenterMarkdown(snapshot: CommandCenterSnapshot, outputPath: string): string {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${formatCommandCenterMarkdown(snapshot)}\n`, "utf8");
  return outputPath;
}
