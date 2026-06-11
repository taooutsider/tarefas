export const MODEL_ROLE_KEYS = [
  "default",
  "orchestrator",
  "builder",
  "researcher",
  "operator",
  "safety",
  "accountManager",
  "finance",
  "campaignStrategist",
  "creativeProducer",
  "contentStrategist",
  "editorialReviewer",
  "layoutDesigner",
  "dataAnalyst",
  "automationEngineer",
  "reporting",
  "landingPage",
] as const;

export type ModelRoleKey = (typeof MODEL_ROLE_KEYS)[number];

export const MODEL_ENV_BY_ROLE: Record<ModelRoleKey, string> = {
  default: "OPENAI_MODEL",
  orchestrator: "OPENAI_ORCHESTRATOR_MODEL",
  builder: "OPENAI_BUILDER_MODEL",
  researcher: "OPENAI_RESEARCHER_MODEL",
  operator: "OPENAI_OPERATOR_MODEL",
  safety: "OPENAI_SAFETY_MODEL",
  accountManager: "OPENAI_ACCOUNT_MANAGER_MODEL",
  finance: "OPENAI_FINANCE_MODEL",
  campaignStrategist: "OPENAI_CAMPAIGN_STRATEGIST_MODEL",
  creativeProducer: "OPENAI_CREATIVE_PRODUCER_MODEL",
  contentStrategist: "OPENAI_CONTENT_STRATEGIST_MODEL",
  editorialReviewer: "OPENAI_EDITORIAL_REVIEWER_MODEL",
  layoutDesigner: "OPENAI_LAYOUT_DESIGNER_MODEL",
  dataAnalyst: "OPENAI_DATA_ANALYST_MODEL",
  automationEngineer: "OPENAI_AUTOMATION_ENGINEER_MODEL",
  reporting: "OPENAI_REPORTING_MODEL",
  landingPage: "OPENAI_LANDING_PAGE_MODEL",
};

export const MODEL_ROLE_DEFAULTS: Record<ModelRoleKey, string> = {
  default: "gpt-5.5",
  orchestrator: "gpt-5.5",
  builder: "gpt-5.3-codex",
  researcher: "gpt-5.5",
  operator: "gpt-5.4-mini",
  safety: "gpt-5.5",
  accountManager: "gpt-5.4-mini",
  finance: "gpt-5.5",
  campaignStrategist: "gpt-5.5",
  creativeProducer: "gpt-5.4-mini",
  contentStrategist: "gpt-5.4-mini",
  editorialReviewer: "gpt-5.5",
  layoutDesigner: "gpt-5.3-codex",
  dataAnalyst: "gpt-5.5",
  automationEngineer: "gpt-5.3-codex",
  reporting: "gpt-5.5",
  landingPage: "gpt-5.3-codex",
};

export interface ModelRoutingRule {
  role: ModelRoleKey;
  envVar: string;
  defaultModel: string;
  activeModel: string;
  useFor: string;
  rationale: string;
}

const ROLE_GUIDANCE: Record<ModelRoleKey, Pick<ModelRoutingRule, "useFor" | "rationale">> = {
  default: {
    useFor: "Fallback when a role-specific model is not configured.",
    rationale: "Use the latest strong general model as the safe baseline.",
  },
  orchestrator: {
    useFor: "Task classification, delegation, agency command-center decisions.",
    rationale: "Routing errors are expensive, so this uses the strongest general reasoning model.",
  },
  builder: {
    useFor: "Code, tests, refactors, repositories, debugging, implementation.",
    rationale: "Codex is the preferred model family for code-heavy execution.",
  },
  researcher: {
    useFor: "Source-backed research, vendor comparisons, market context, synthesis.",
    rationale: "Research needs precision, source discipline, and careful uncertainty handling.",
  },
  operator: {
    useFor: "Status, workflow sequencing, handoffs, approval coordination.",
    rationale: "Operational routing is frequent and benefits from a faster balanced model.",
  },
  safety: {
    useFor: "Approval gates, sensitive-action review, compliance and risk checks.",
    rationale: "Use the strongest model for actions that can affect money, accounts, or clients.",
  },
  accountManager: {
    useFor: "Client relationship, expectations, onboarding, retention, approvals.",
    rationale: "Most relationship work is high-volume and benefits from a balanced model with clear guardrails.",
  },
  finance: {
    useFor: "Payables, receivables, cash-risk review, billing prep, margin concerns.",
    rationale: "Finance work needs high precision and conservative reasoning.",
  },
  campaignStrategist: {
    useFor: "Meta Ads, paid media, offers, funnels, optimization hypotheses.",
    rationale: "Campaign decisions mix strategy, statistics, and spend risk, so use a strong model.",
  },
  creativeProducer: {
    useFor: "Briefs, ad variants, production specs, visual directions.",
    rationale: "Creative drafting is iterative and can be cost-balanced before editorial review.",
  },
  contentStrategist: {
    useFor: "X, Instagram, editorial calendars, post angles, hooks, distribution.",
    rationale: "High-volume content planning should be fast, structured, and brand-aware.",
  },
  editorialReviewer: {
    useFor: "Humanized revision, anti-AI-cliche editing, storytelling, tone polishing.",
    rationale: "Final copy quality depends on nuance, taste, and preserving truth while improving voice.",
  },
  layoutDesigner: {
    useFor: "Canva/Figma-ready layout specs, landing sections, ad composition, responsive structure.",
    rationale: "Layout work often becomes code or structured specs, so Codex fits the implementation edge.",
  },
  dataAnalyst: {
    useFor: "Dashboards, metric analysis, attribution, data quality, insight generation.",
    rationale: "Analytical mistakes compound quickly across 20 clients, so use a strong model.",
  },
  automationEngineer: {
    useFor: "Scripts, integrations, chatbot flows, workflow automation.",
    rationale: "Automation is code-adjacent and should default to Codex.",
  },
  reporting: {
    useFor: "Client reports, executive summaries, performance narratives, next-step memos.",
    rationale: "Reports combine analysis and client-facing judgment, so use the strong general model.",
  },
  landingPage: {
    useFor: "Landing-page strategy, copy structure, wireframes, tracking, implementation planning.",
    rationale: "Landing pages blend copy, UX, tracking, and code, making Codex a good default.",
  },
};

export function getModelRoutingPolicy(
  activeModels: Partial<Record<ModelRoleKey, string>> = {},
): ModelRoutingRule[] {
  return MODEL_ROLE_KEYS.map((role) => ({
    role,
    envVar: MODEL_ENV_BY_ROLE[role],
    defaultModel: MODEL_ROLE_DEFAULTS[role],
    activeModel: activeModels[role] ?? MODEL_ROLE_DEFAULTS[role],
    useFor: ROLE_GUIDANCE[role].useFor,
    rationale: ROLE_GUIDANCE[role].rationale,
  }));
}
