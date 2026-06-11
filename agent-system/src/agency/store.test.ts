import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../state/db.js";
import { AgencyStore } from "./store.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agency-store-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});

describe("AgencyStore", () => {
  it("creates a client, work item, financial item, campaign, asset, and report", () => {
    const db = openDatabase(path.join(tmpDir, "agent.sqlite"));
    const agency = new AgencyStore(db);

    const client = agency.createClient({
      name: "Cliente Teste",
      niche: "ecommerce",
      monthlyRetainer: 5000,
    });
    const work = agency.createWorkItem({
      clientId: client.id,
      title: "Criar variacoes de anuncios",
      type: "creative",
      priority: "high",
    });
    const finance = agency.createFinancialItem({
      clientId: client.id,
      type: "receivable",
      amount: 5000,
      description: "Retainer mensal",
    });
    const campaign = agency.createCampaign({
      clientId: client.id,
      name: "Campanha de teste",
      objective: "Gerar vendas",
      channels: ["Meta Ads"],
      kpis: { roas: 2 },
    });
    const asset = agency.createCreativeAsset({
      clientId: client.id,
      campaignId: campaign.id,
      type: "static_ad",
      brief: "Anuncio estatico com oferta principal.",
    });
    const report = agency.createReport({
      clientId: client.id,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      summary: "Resumo inicial.",
    });

    const snapshot = agency.getSnapshot();

    expect(client.id).toMatch(/^cli_/);
    expect(work.id).toMatch(/^wrk_/);
    expect(finance.id).toMatch(/^fin_/);
    expect(campaign.id).toMatch(/^cmp_/);
    expect(asset.id).toMatch(/^ast_/);
    expect(report.id).toMatch(/^rep_/);
    expect(snapshot.clients).toHaveLength(1);
    expect(snapshot.activeWork).toHaveLength(1);
    expect(snapshot.openFinancialItems).toHaveLength(1);
    expect(snapshot.activeCampaigns).toHaveLength(1);
    expect(snapshot.reportsInReview).toHaveLength(1);
  });

  it("separates Admin OS, Client Delivery OS, and Command Center queues", () => {
    const db = openDatabase(path.join(tmpDir, "agent.sqlite"));
    const agency = new AgencyStore(db);

    const client = agency.createClient({
      name: "Cliente Separacao",
      niche: "education",
      monthlyRetainer: 8000,
    });
    const campaign = agency.createCampaign({
      clientId: client.id,
      name: "Matriculas",
      objective: "Gerar leads para matricula.",
      status: "live",
    });
    const internalWork = agency.createWorkItem({
      title: "Revisar contrato da ferramenta de BI",
      type: "automation",
      priority: "medium",
    });
    const clientWork = agency.createWorkItem({
      clientId: client.id,
      title: "Criar criativos para nova turma",
      type: "creative",
      priority: "high",
      dueDate: "2026-06-07",
    });
    const blockedWork = agency.createWorkItem({
      clientId: client.id,
      title: "Aprovar relatorio semanal",
      type: "report",
      status: "waiting_approval",
      priority: "medium",
      dueDate: "2026-06-05",
    });
    const overdueReceivable = agency.createFinancialItem({
      clientId: client.id,
      type: "receivable",
      status: "overdue",
      amount: 8000,
      description: "Retainer em atraso",
      dueDate: "2026-06-01",
    });
    agency.createCreativeAsset({
      clientId: client.id,
      campaignId: campaign.id,
      type: "carousel",
      status: "review",
      brief: "Carrossel com objecoes e CTA.",
    });
    agency.createReport({
      clientId: client.id,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-07",
      status: "draft",
    });

    const admin = agency.getAdminSnapshot();
    const delivery = agency.getDeliverySnapshot();
    const commandCenter = agency.getCommandCenterSnapshot();

    expect(admin.openReceivables.map((item) => item.id)).toContain(overdueReceivable.id);
    expect(admin.internalWork.map((item) => item.id)).toContain(internalWork.id);
    expect(admin.clientsAtFinancialRisk.map((item) => item.id)).toContain(client.id);

    expect(delivery.clientWork.map((item) => item.id)).toContain(clientWork.id);
    expect(delivery.blockedApprovals.map((item) => item.id)).toContain(blockedWork.id);
    expect(delivery.activeCampaigns.map((item) => item.id)).toContain(campaign.id);
    expect(delivery.creativeAssetsInProduction).toHaveLength(1);
    expect(delivery.reportsInProgress).toHaveLength(1);
    expect(delivery.clientWork.map((item) => item.id)).not.toContain(internalWork.id);

    expect(commandCenter.executiveQueue[0].priority).toBe("urgent");
    expect(commandCenter.executiveQueue.some((item) => item.source === "admin")).toBe(true);
    expect(commandCenter.executiveQueue.some((item) => item.source === "client_delivery")).toBe(true);
    expect(commandCenter.executiveQueue.filter((item) => item.id === blockedWork.id)).toHaveLength(1);
  });
});
