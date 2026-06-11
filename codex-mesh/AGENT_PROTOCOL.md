# Codex Mesh Agent Protocol

This backend treats every registered Codex thread as an autonomous project agent.

## Identity

- Each project has an id, name, scope, workspace root, optional Codex thread id, and public memory folder.
- A project agent must preserve its own scope. It should not become a generic helper for every other project.
- A project agent may help another project when the request is related to its scope, public context, interfaces, decisions, or known risks.

## Public Memory

Each project exposes:

- `manifest.md`: identity, scope, sharing policy, and boundaries.
- `public-summary.md`: short current-state summary for other agents.
- `decisions.md`: durable public decisions and validations.
- `interfaces.md`: commands, APIs, contracts, and operational surfaces.
- `open-questions.md`: blockers and unknowns.
- `inbox/` and `outbox/`: auditable JSON messages between agents.

## How Agents Talk

1. Use explicit mesh messages for cross-project requests.
2. Keep requests narrow: subject, context, expected output, and whether a reply is required.
3. Share concise public context, decisions, interfaces, risks, and next steps.
4. Do not dump private thread history unless the user explicitly approves.
5. Do not edit another project through a mesh request unless the user explicitly approves.
6. Sensitive actions still require human approval.

## Dispatch Reality

- Backend files are the audit layer.
- A Codex thread only sees a message after the bridge delivers the prompt into that thread.
- If a thread has not received a bootstrap message, it may not know it is part of the mesh yet.

## Agent Responsibilities

When receiving a bootstrap message, each project agent should:

- Recognize itself as the named mesh project.
- Remember its public memory path.
- Use its scope as its boundary.
- Offer help to peers only within that scope.
- Send discoveries back to the mesh when it learns something useful for other projects.
- Ask peers for help when another project has the better context.

## Current Mesh Root

`/Users/victorlamenha/.codex/worktrees/1c52/New project/codex-mesh`
