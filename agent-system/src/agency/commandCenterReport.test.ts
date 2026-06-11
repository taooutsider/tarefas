import { describe, expect, it } from "vitest";
import { formatCommandCenterMarkdown } from "./commandCenterReport.js";
import type { CommandCenterSnapshot } from "./types.js";

describe("command center report", () => {
  it("formats the executive queue as markdown", () => {
    const markdown = formatCommandCenterMarkdown({
      generatedAt: "2026-06-04T00:00:00.000Z",
      admin: {
        generatedAt: "2026-06-04T00:00:00.000Z",
        openReceivables: [],
        openPayables: [],
        overdueFinancialItems: [],
        internalWork: [],
        financeWork: [],
        clientsAtFinancialRisk: [],
      },
      delivery: {
        generatedAt: "2026-06-04T00:00:00.000Z",
        clients: [],
        clientWork: [],
        activeCampaigns: [],
        creativeAssetsInProduction: [],
        reportsInProgress: [],
        blockedApprovals: [],
      },
      executiveQueue: [
        {
          source: "admin",
          id: "fin_1",
          title: "Receber retainer",
          reason: "receivable overdue",
          priority: "urgent",
          dueDate: "2026-06-01",
          clientId: "cli_1",
          owner: null,
        },
      ],
    } satisfies CommandCenterSnapshot);

    expect(markdown).toContain("# Agency Command Center");
    expect(markdown).toContain("[admin] URGENT");
    expect(markdown).toContain("Receber retainer");
  });
});
