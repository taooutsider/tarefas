import { tool } from "@openai/agents";
import { z } from "zod";
import type { AgentRunContext } from "../agents/context.js";
import { agencyTools } from "./agencyTools.js";

export const recordNoteTool = tool({
  name: "record_note",
  description:
    "Record a concise operational note for the current job. Use this for decisions, assumptions, risks, and next steps.",
  parameters: z.object({
    category: z.enum(["decision", "assumption", "risk", "progress", "next_step"]),
    note: z.string().min(1).max(1200),
  }),
  execute: async ({ category, note }, runContext) => {
    const context = runContext?.context as AgentRunContext | undefined;
    if (!context) {
      return "No local run context was available, so the note was not saved.";
    }

    context.store.appendJobEvent(context.jobId, `note_${category}`, note, { category });
    return "Note saved.";
  },
});

export const proposeSensitiveActionTool = tool({
  name: "propose_sensitive_action",
  description:
    "Use before any action that writes, deploys, deletes, spends money, sends external messages, changes production, or handles sensitive data.",
  parameters: z.object({
    action: z.string().min(1).max(240),
    reason: z.string().min(1).max(1200),
    risk: z.enum(["low", "medium", "high"]),
    rollbackPlan: z.string().min(1).max(1200),
  }),
  needsApproval: true,
  execute: async ({ action, reason, risk, rollbackPlan }, runContext) => {
    const context = runContext?.context as AgentRunContext | undefined;
    if (!context) {
      return "Approved, but no local run context was available to record it.";
    }

    context.store.appendJobEvent(context.jobId, "sensitive_action_approved", action, {
      reason,
      risk,
      rollbackPlan,
    });

    return `Sensitive action approved and recorded: ${action}`;
  },
});

export const inspectJobTool = tool({
  name: "inspect_current_job",
  description: "Return the current job goal and recent events.",
  parameters: z.object({}),
  execute: async (_args, runContext) => {
    const context = runContext?.context as AgentRunContext | undefined;
    if (!context) {
      return "No local run context was available.";
    }

    const job = context.store.getJob(context.jobId);
    const events = context.store.listJobEvents(context.jobId, 8);

    return {
      job,
      events: events.map((event) => ({
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
      })),
    };
  },
});

export const sharedAgentTools = [recordNoteTool, inspectJobTool, proposeSensitiveActionTool, ...agencyTools];
