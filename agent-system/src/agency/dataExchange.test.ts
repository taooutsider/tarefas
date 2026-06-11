import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../state/db.js";
import { AgencyStore } from "./store.js";
import {
  exportAgencyCsvDirectory,
  importAgencyCsvDirectory,
  writeDataTemplates,
} from "./dataExchange.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agency-data-exchange-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { force: true, recursive: true });
});

describe("agency data exchange", () => {
  it("writes templates, imports CSV data, and exports the local agency state", () => {
    const templateDir = path.join(tmpDir, "templates");
    const importDir = path.join(tmpDir, "import");
    const exportDir = path.join(tmpDir, "export");
    fs.mkdirSync(importDir);

    const templates = writeDataTemplates(templateDir);
    expect(templates.files).toHaveLength(6);
    expect(fs.existsSync(path.join(templateDir, "clients.csv"))).toBe(true);

    fs.writeFileSync(
      path.join(importDir, "clients.csv"),
      [
        "id,name,niche,status,owner,monthlyRetainer,currency,notes",
        "cliente_csv,Cliente CSV,ecommerce,active,victor,7000,BRL,Cliente importado",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(importDir, "work_items.csv"),
      [
        "title,clientId,type,status,priority,owner,dueDate,channel,description",
        "Tarefa interna,,automation,planned,medium,ops,2026-06-10,,Revisao interna",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(importDir, "financial_items.csv"),
      [
        "type,amount,description,clientId,status,currency,dueDate,recurrence",
        "payable,1200,Ferramenta,,open,BRL,2026-06-05,monthly",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(importDir, "campaigns.csv"),
      [
        "clientId,name,objective,status,budget,currency,channels,kpisJson,startDate,endDate,notes",
        "cliente_csv,Campanha CSV,Gerar leads,planned,3000,BRL,Meta Ads;Google Ads,\"{\"\"cpl_target\"\":50}\",2026-06-01,2026-06-30,Teste",
      ].join("\n"),
    );

    const db = openDatabase(path.join(tmpDir, "agent.sqlite"));
    const agency = new AgencyStore(db);
    const imported = importAgencyCsvDirectory(agency, importDir);
    const exported = exportAgencyCsvDirectory(agency, exportDir);

    expect(imported.imported?.["clients.csv"]).toBe(1);
    expect(imported.imported?.["work_items.csv"]).toBe(1);
    expect(imported.imported?.["financial_items.csv"]).toBe(1);
    expect(imported.imported?.["campaigns.csv"]).toBe(1);
    expect(agency.getAdminSnapshot().internalWork).toHaveLength(1);
    expect(agency.getDeliverySnapshot().activeCampaigns).toHaveLength(1);
    expect(exported.exported?.["clients.csv"]).toBe(1);
    expect(fs.readFileSync(path.join(exportDir, "clients.csv"), "utf8")).toContain("Cliente CSV");
  });
});
