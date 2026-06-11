import { tool } from "@openai/agents";
import { z } from "zod";
import type { AgentRunContext } from "../agents/context.js";
import { CONNECTOR_PLANS } from "../agency/connectors.js";
import { getModelRoutingPolicy } from "../modelPolicy.js";

const clientStatusSchema = z.enum(["lead", "onboarding", "active", "paused", "churned"]);
const workTypeSchema = z.enum([
  "strategy",
  "creative",
  "campaign",
  "landing_page",
  "report",
  "automation",
  "client_request",
  "finance",
]);
const workStatusSchema = z.enum([
  "backlog",
  "planned",
  "in_progress",
  "waiting_client",
  "waiting_approval",
  "done",
  "cancelled",
]);
const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const financialTypeSchema = z.enum(["receivable", "payable"]);
const financialStatusSchema = z.enum(["draft", "open", "overdue", "paid", "cancelled"]);
const campaignStatusSchema = z.enum(["idea", "planned", "live", "paused", "completed", "cancelled"]);
const assetStatusSchema = z.enum(["briefed", "draft", "review", "approved", "published", "archived"]);
const reportStatusSchema = z.enum(["draft", "review", "sent", "approved"]);

export const getAgencySnapshotTool = tool({
  name: "get_agency_snapshot",
  description:
    "Return the current local agency snapshot: clients, active work, open financial items, active campaigns, and reports in review.",
  parameters: z.object({}),
  execute: async (_args, runContext) => {
    return requireContext(runContext).agency.getSnapshot();
  },
});

export const getAdminSnapshotTool = tool({
  name: "get_admin_snapshot",
  description:
    "Return the Admin OS snapshot: receivables, payables, overdue financial items, internal work, finance work, and clients at financial risk.",
  parameters: z.object({}),
  execute: async (_args, runContext) => {
    return requireContext(runContext).agency.getAdminSnapshot();
  },
});

export const getDeliverySnapshotTool = tool({
  name: "get_delivery_snapshot",
  description:
    "Return the Client Delivery OS snapshot: client work, active campaigns, creative assets in production, reports in progress, and blocked approvals.",
  parameters: z.object({}),
  execute: async (_args, runContext) => {
    return requireContext(runContext).agency.getDeliverySnapshot();
  },
});

export const getCommandCenterSnapshotTool = tool({
  name: "get_command_center_snapshot",
  description:
    "Return the combined Command Center snapshot with Admin OS, Client Delivery OS, and a prioritized executive queue.",
  parameters: z.object({}),
  execute: async (_args, runContext) => {
    return requireContext(runContext).agency.getCommandCenterSnapshot();
  },
});

export const createAgencyClientTool = tool({
  name: "create_agency_client",
  description: "Create a local CRM client record for the agency.",
  parameters: z.object({
    name: z.string().min(1).max(160),
    niche: z.string().max(120).nullable(),
    status: clientStatusSchema.nullable(),
    owner: z.string().max(120).nullable(),
    monthlyRetainer: z.number().nonnegative().nullable(),
    currency: z.string().min(3).max(6).nullable(),
    notes: z.string().max(2000).nullable(),
  }),
  execute: async (args, runContext) => {
    const context = requireContext(runContext);
    const client = context.agency.createClient({
      ...args,
      status: args.status ?? undefined,
      currency: args.currency ?? undefined,
    });
    context.store.appendJobEvent(context.jobId, "agency_client_created", `Cliente criado: ${client.name}`, {
      clientId: client.id,
    });
    return client;
  },
});

export const createAgencyWorkItemTool = tool({
  name: "create_agency_work_item",
  description: "Create a demand, task, deliverable, or operational work item for the agency.",
  parameters: z.object({
    title: z.string().min(1).max(220),
    clientId: z.string().nullable(),
    type: workTypeSchema.nullable(),
    status: workStatusSchema.nullable(),
    priority: prioritySchema.nullable(),
    owner: z.string().max(120).nullable(),
    dueDate: z.string().max(40).nullable(),
    channel: z.string().max(80).nullable(),
    description: z.string().max(4000).nullable(),
  }),
  execute: async (args, runContext) => {
    const context = requireContext(runContext);
    const item = context.agency.createWorkItem({
      ...args,
      type: args.type ?? undefined,
      status: args.status ?? undefined,
      priority: args.priority ?? undefined,
    });
    context.store.appendJobEvent(context.jobId, "agency_work_item_created", `Demanda criada: ${item.title}`, {
      workItemId: item.id,
      clientId: item.clientId,
    });
    return item;
  },
});

export const createAgencyFinancialItemTool = tool({
  name: "create_agency_financial_item",
  description:
    "Create a local accounts payable or receivable item. This does not pay, charge, invoice, transfer money, or message anyone.",
  parameters: z.object({
    type: financialTypeSchema,
    amount: z.number().nonnegative(),
    description: z.string().min(1).max(240),
    clientId: z.string().nullable(),
    status: financialStatusSchema.nullable(),
    currency: z.string().min(3).max(6).nullable(),
    dueDate: z.string().max(40).nullable(),
    recurrence: z.string().max(80).nullable(),
  }),
  execute: async (args, runContext) => {
    const context = requireContext(runContext);
    const item = context.agency.createFinancialItem({
      ...args,
      status: args.status ?? undefined,
      currency: args.currency ?? undefined,
    });
    context.store.appendJobEvent(context.jobId, "agency_financial_item_created", `Lancamento financeiro criado: ${item.description}`, {
      financialItemId: item.id,
      type: item.type,
      amount: item.amount,
    });
    return item;
  },
});

export const createAgencyCampaignTool = tool({
  name: "create_agency_campaign",
  description: "Create a local campaign plan record for a client.",
  parameters: z.object({
    clientId: z.string().min(1),
    name: z.string().min(1).max(180),
    objective: z.string().min(1).max(800),
    status: campaignStatusSchema.nullable(),
    budget: z.number().nonnegative().nullable(),
    currency: z.string().min(3).max(6).nullable(),
    channels: z.array(z.string().min(1).max(80)).max(20).nullable(),
    kpis: z.record(z.string(), z.unknown()).nullable(),
    startDate: z.string().max(40).nullable(),
    endDate: z.string().max(40).nullable(),
    notes: z.string().max(4000).nullable(),
  }),
  execute: async (args, runContext) => {
    const context = requireContext(runContext);
    const campaign = context.agency.createCampaign({
      ...args,
      status: args.status ?? undefined,
      currency: args.currency ?? undefined,
      channels: args.channels ?? undefined,
      kpis: args.kpis ?? undefined,
    });
    context.store.appendJobEvent(context.jobId, "agency_campaign_created", `Campanha criada: ${campaign.name}`, {
      campaignId: campaign.id,
      clientId: campaign.clientId,
    });
    return campaign;
  },
});

export const createCreativeAssetTool = tool({
  name: "create_creative_asset",
  description: "Create a local creative production asset brief for review.",
  parameters: z.object({
    clientId: z.string().min(1),
    brief: z.string().min(1).max(6000),
    type: z.string().min(1).max(120),
    campaignId: z.string().nullable(),
    status: assetStatusSchema.nullable(),
    channel: z.string().max(80).nullable(),
    format: z.string().max(120).nullable(),
    dueDate: z.string().max(40).nullable(),
  }),
  execute: async (args, runContext) => {
    const context = requireContext(runContext);
    const asset = context.agency.createCreativeAsset({
      ...args,
      status: args.status ?? undefined,
    });
    context.store.appendJobEvent(context.jobId, "agency_asset_created", `Brief criativo criado: ${asset.type}`, {
      assetId: asset.id,
      clientId: asset.clientId,
      campaignId: asset.campaignId,
    });
    return asset;
  },
});

export const createAgencyReportTool = tool({
  name: "create_agency_report",
  description: "Create a local client report record with period, metrics, summary, and next steps.",
  parameters: z.object({
    clientId: z.string().min(1),
    periodStart: z.string().min(1).max(40),
    periodEnd: z.string().min(1).max(40),
    status: reportStatusSchema.nullable(),
    summary: z.string().max(5000).nullable(),
    nextSteps: z.string().max(5000).nullable(),
    metrics: z.record(z.string(), z.unknown()).nullable(),
  }),
  execute: async (args, runContext) => {
    const context = requireContext(runContext);
    const report = context.agency.createReport({
      ...args,
      status: args.status ?? undefined,
      metrics: args.metrics ?? undefined,
    });
    context.store.appendJobEvent(context.jobId, "agency_report_created", `Relatorio criado: ${report.periodStart} a ${report.periodEnd}`, {
      reportId: report.id,
      clientId: report.clientId,
    });
    return report;
  },
});

export const getAgencyPlaybookTool = tool({
  name: "get_agency_playbook",
  description:
    "Return the operating playbook for a marketing agency domain: client success, finance, demand management, campaign optimization, creative production, content, editorial review, storytelling, layout direction, reporting, automation, landing pages, or data analysis.",
  parameters: z.object({
    playbook: z.enum([
      "client_success",
      "finance",
      "demand_management",
      "campaign_optimization",
      "creative_production",
      "social_content",
      "editorial_review",
      "storytelling_copy",
      "layout_direction",
      "reporting",
      "automation",
      "landing_pages",
      "data_analysis",
      "weekly_command_center",
    ]),
  }),
  execute: async ({ playbook }) => PLAYBOOKS[playbook],
});

export const getModelRoutingPolicyTool = tool({
  name: "get_model_routing_policy",
  description:
    "Return the active model-routing policy for the agency agents, including role, env var, active model, use case, and rationale.",
  parameters: z.object({}),
  execute: async (_args, runContext) => {
    const context = requireContext(runContext);
    return getModelRoutingPolicy(context.config.models);
  },
});

export const getConnectorPlansTool = tool({
  name: "get_connector_plans",
  description:
    "Return the planned and connected agency integrations, with status, access mode, use cases, and approval boundaries.",
  parameters: z.object({}),
  execute: async () => CONNECTOR_PLANS,
});

export const agencyTools = [
  getAgencySnapshotTool,
  getAdminSnapshotTool,
  getDeliverySnapshotTool,
  getCommandCenterSnapshotTool,
  getAgencyPlaybookTool,
  getModelRoutingPolicyTool,
  getConnectorPlansTool,
  createAgencyClientTool,
  createAgencyWorkItemTool,
  createAgencyFinancialItemTool,
  createAgencyCampaignTool,
  createCreativeAssetTool,
  createAgencyReportTool,
];

function requireContext(runContext: unknown): AgentRunContext {
  const context = (runContext as { context?: AgentRunContext } | undefined)?.context;
  if (!context) {
    throw new Error("No local run context was available.");
  }

  return context;
}

const PLAYBOOKS = {
  client_success: [
    "Client success playbook",
    "1. Keep one owner, one business objective, and one current risk per client.",
    "2. Track every client request as a work item with due date, priority, and status.",
    "3. Maintain weekly client notes: wins, blockers, approvals needed, next action.",
    "4. Escalate if no client response blocks a deadline for more than 2 business days.",
    "5. Never invent results, testimonials, approvals, or campaign performance.",
  ].join("\n"),
  finance: [
    "Finance playbook",
    "1. Separate receivables from payables.",
    "2. Every financial item needs amount, due date, status, description, and client when relevant.",
    "3. Local records are bookkeeping prompts, not payments or invoices.",
    "4. Any payment, charge, invoice send, contract change, or collections message requires human approval.",
    "5. Weekly review: overdue receivables, upcoming payables, cash-risk clients, margin outliers.",
  ].join("\n"),
  demand_management: [
    "Demand management playbook",
    "1. Convert every ambiguous request into a work item.",
    "2. Use priority urgent only for revenue, delivery breach, legal, security, or executive escalation.",
    "3. Tie campaign, creative, report, automation, and landing-page work to a client.",
    "4. Keep status factual: backlog, planned, in_progress, waiting_client, waiting_approval, done, cancelled.",
    "5. A task is not done until output path/link, owner, and review state are clear.",
  ].join("\n"),
  campaign_optimization: [
    "Campaign optimization playbook",
    "1. Start with objective, audience, offer, channel, budget, conversion event, and KPI.",
    "2. Diagnose before changing: tracking, spend distribution, creative fatigue, audience overlap, landing-page mismatch, bid/budget constraints.",
    "3. Separate hypotheses from actions.",
    "4. Any real campaign edit, spend change, audience upload, or publishing action requires approval.",
    "5. Report impact with before/after windows and caveats.",
  ].join("\n"),
  creative_production: [
    "Creative production playbook",
    "1. Turn briefing into angle, promise, proof, format, copy, visual direction, and variants.",
    "2. Produce platform-native assets: Meta, Google, TikTok, LinkedIn, YouTube, landing page, email, WhatsApp.",
    "3. Generate 3-5 variations per strong angle: hook, visual, offer framing, CTA.",
    "4. Keep claims compliant. No fabricated testimonials, metrics, scarcity, or guarantees.",
    "5. Mark output as draft, review, approved, or published.",
  ].join("\n"),
  social_content: [
    "Social content playbook",
    "1. Start with audience, belief shift, offer, proof, platform, and distribution objective.",
    "2. For X, prioritize a sharp opening line, one clear idea, proof or contrast, and a low-friction CTA.",
    "3. For Instagram, define format first: reel, carousel, static, story, live, or DM flow.",
    "4. Turn one strong idea into native variants instead of cross-posting the same caption everywhere.",
    "5. Keep a production handoff: hook, body beats, visual direction, caption, CTA, owner, status.",
  ].join("\n"),
  editorial_review: [
    "Editorial review playbook",
    "1. Preserve facts, offer, client intent, legal meaning, and brand position.",
    "2. Remove generic AI-sounding phrases, inflated adjectives, vague transformations, filler intros, and predictable contrast formulas.",
    "3. Replace abstraction with specificity: scene, number, concrete consequence, objection, proof, or next action.",
    "4. Improve rhythm by varying sentence length and cutting repeated structures.",
    "5. Return clean copy plus brief notes only when notes help the operator approve the change.",
  ].join("\n"),
  storytelling_copy: [
    "Storytelling copy playbook",
    "1. Use story only when it makes the offer clearer or more believable.",
    "2. Structure: context, tension, turning point, proof, implication, CTA.",
    "3. Keep the client/customer as the center of the story, not the agency or the model.",
    "4. Avoid melodrama. Make the stakes practical, visible, and tied to the buying decision.",
    "5. Never invent case studies, testimonials, revenue numbers, or before/after claims.",
  ].join("\n"),
  layout_direction: [
    "Layout direction playbook",
    "1. Start with the first thing the viewer must understand in 2 seconds.",
    "2. Specify hierarchy: hero signal, offer, proof, visual asset, CTA, secondary detail.",
    "3. Define format constraints: dimensions, safe zones, mobile crop, text density, accessibility, and platform rules.",
    "4. For landing pages, specify section order, sticky elements, form behavior, tracking, speed, and responsive states.",
    "5. Do not claim a design file exists until Canva, Figma, or code tools create it.",
  ].join("\n"),
  reporting: [
    "Reporting playbook",
    "1. A good report says what happened, why it likely happened, what changed, what we will do next.",
    "2. Separate channel metrics from business metrics.",
    "3. Flag tracking gaps before interpreting results.",
    "4. Use plain language for clients and keep technical detail in appendix.",
    "5. Never manufacture metrics. If data is missing, say what connector/import is missing.",
  ].join("\n"),
  automation: [
    "Automation playbook",
    "1. Automate repeated, rules-based workflows with clear inputs and failure states.",
    "2. Start with internal automations before client-facing automations.",
    "3. Every automation needs owner, trigger, data source, action, approval rule, logging, and rollback.",
    "4. Any external send, publish, delete, payment, or production change requires approval.",
    "5. Prefer incremental automation: monitor first, suggest second, act third.",
  ].join("\n"),
  landing_pages: [
    "Landing page playbook",
    "1. Define audience, offer, source traffic, promise, proof, objection, form/action, and tracking.",
    "2. Above the fold must state offer, audience, outcome, and action.",
    "3. Match message to the ad creative and campaign objective.",
    "4. Include mobile layout, load-speed, accessibility, analytics, and consent requirements.",
    "5. Publishing or connecting domains/forms requires approval.",
  ].join("\n"),
  data_analysis: [
    "Data analysis playbook",
    "1. Identify the question before touching metrics.",
    "2. Validate source, date range, attribution window, currency, timezone, and tracking quality.",
    "3. Use comparable periods and call out sample-size limits.",
    "4. Give the smallest decision-ready answer: insight, confidence, action, expected risk.",
    "5. If source data is not connected, request/import the dataset instead of guessing.",
  ].join("\n"),
  weekly_command_center: [
    "Weekly command center playbook",
    "1. Review client status, overdue work, approvals blocked, financial risk, live campaigns, and reports.",
    "2. For each active client, decide: protect, grow, fix, or pause.",
    "3. Rank agency work by revenue impact, deadline risk, client trust, and team capacity.",
    "4. Produce a Monday execution queue and Friday client update list.",
    "5. Escalate anything involving money movement, contracts, production campaign changes, or public publishing.",
  ].join("\n"),
} as const;
