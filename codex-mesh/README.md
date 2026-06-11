# Codex Mesh

Local coordination layer for Codex project threads.

Each project keeps its own scope and private context. Other projects should consume the public summary and send explicit inbox messages instead of reading full private history by default.

Read `AGENT_PROTOCOL.md` first. Every registered Codex thread is an autonomous project agent with its own identity, scope, public memory, inbox, and outbox. Backend files are the audit layer; a thread only becomes aware of a message after the bridge delivers it into that thread.

Important files:

- `registry.json`: project index.
- `AGENT_PROTOCOL.md`: identity and communication rules for autonomous project agents.
- `projects/<id>/manifest.md`: project identity, scope, and sharing policy.
- `projects/<id>/public-summary.md`: exportable summary for peers.
- `projects/<id>/inbox/`: incoming project messages.
- `projects/<id>/outbox/`: outgoing project messages.
