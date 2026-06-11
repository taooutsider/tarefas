# Agency Agent System

MVP de agente autonomo para operar uma agencia de marketing via web, Codex, CLI, Telegram e Codex Mesh, usando OpenAI Agents SDK, `grammY` e SQLite.

## O que vem pronto

- Agency OS local-first para cerca de 20 clientes.
- Agency Command web app responsivo para desktop e iPhone.
- CLI para operar dentro do Codex: `npm run agency -- ...`.
- Bot Telegram com allowlist por user id.
- Comandos `/task`, `/status`, `/pending`, `/approve` e `/deny`.
- Orquestrador com especialistas de agencia: relacionamento, financeiro, campanhas, criativo, conteudo, revisao editorial/storytelling, layout, dados, automacao, relatorios, landing pages, codigo, pesquisa e operacoes.
- Codex Mesh local para coordenar este agente com outros chats/projetos sem misturar escopos.
- Persistencia local em SQLite para jobs, eventos, aprovacoes, clientes, demandas, financeiro, campanhas, assets criativos e relatorios.
- Human-in-the-loop usando interrupcoes do Agents SDK para ferramentas sensiveis.

## Setup

```bash
cd agent-system
npm install
cp .env.example .env
```

Preencha `.env`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
OPENAI_ORCHESTRATOR_MODEL=gpt-5.5
OPENAI_BUILDER_MODEL=gpt-5.3-codex
OPENAI_RESEARCHER_MODEL=gpt-5.5
OPENAI_OPERATOR_MODEL=gpt-5.4-mini
OPENAI_SAFETY_MODEL=gpt-5.5
OPENAI_ACCOUNT_MANAGER_MODEL=gpt-5.4-mini
OPENAI_FINANCE_MODEL=gpt-5.5
OPENAI_CAMPAIGN_STRATEGIST_MODEL=gpt-5.5
OPENAI_CREATIVE_PRODUCER_MODEL=gpt-5.4-mini
OPENAI_CONTENT_STRATEGIST_MODEL=gpt-5.4-mini
OPENAI_EDITORIAL_REVIEWER_MODEL=gpt-5.5
OPENAI_LAYOUT_DESIGNER_MODEL=gpt-5.3-codex
OPENAI_DATA_ANALYST_MODEL=gpt-5.5
OPENAI_AUTOMATION_ENGINEER_MODEL=gpt-5.3-codex
OPENAI_REPORTING_MODEL=gpt-5.5
OPENAI_LANDING_PAGE_MODEL=gpt-5.3-codex
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ALLOWED_USER_IDS=123456789
DATABASE_PATH=./data/agent.sqlite
```

`OPENAI_MODEL` funciona como fallback global. Variaveis especificas por agente permitem equilibrar custo e qualidade. A politica ativa pode ser auditada com:

```bash
npm run agency -- models
```

Regra atual: `gpt-5.5` para roteamento, estrategia, pesquisa, financeiro, safety, dados, revisao editorial e relatorios; `gpt-5.4-mini` para tarefas frequentes de operacao, relacionamento, criativo e conteudo; `gpt-5.3-codex` para codigo, automacoes, landing pages e layouts que viram especificacao implementavel.

Para descobrir seu `TELEGRAM_ALLOWED_USER_IDS`, rode o bot com o token configurado e envie `/start`; ele responde com seu user id. Enquanto a allowlist estiver vazia, apenas `/start` e `/help` sao uteis; tarefas e aprovacoes ficam bloqueadas.

## Rodar No Codex

```bash
npm run agency -- help
npm run agency -- seed
npm run agency -- models
npm run agency -- snapshot
npm run agency -- admin:snapshot
npm run agency -- delivery:snapshot
npm run agency -- command:center
```

As tres visoes locais:

- `admin:snapshot`: financeiro, contas a pagar/receber, atrasos, riscos internos e fila administrativa.
- `delivery:snapshot`: demandas de clientes, campanhas, criativos, relatorios e aprovacoes bloqueadas.
- `command:center`: fila executiva unica que combina os dois mundos apenas para priorizacao semanal.

Preparar ou trocar dados por CSV:

```bash
npm run agency -- data:templates --dir ./data/import-template
npm run agency -- data:import --dir ./data/import-template
npm run agency -- data:export --dir ./data/export
```

Adicionar dados reais:

```bash
npm run agency -- client:add --name "Cliente X" --niche ecommerce --retainer 7000
npm run agency -- work:add --client cli_x --title "Criar nova campanha Meta" --type campaign --priority high --due 2026-06-10
npm run agency -- finance:add --type receivable --amount 7000 --description "Retainer mensal" --client cli_x --due 2026-06-05
npm run agency -- campaign:add --client cli_x --name "Oferta principal" --objective "Gerar leads qualificados" --channels Meta,Google
```

Rodar o agente direto no Codex:

```bash
npm run agency -- ask "Monte o plano semanal da agencia com base no snapshot"
```

## Rodar No Telegram

```bash
npm run dev
```

No Telegram:

```txt
/task Analise a estrutura da agencia e proponha proximos passos
/status
/pending
/approve app_id
/deny app_id motivo
```

Mensagens de texto sem comando tambem viram tarefas, desde que o usuario esteja autorizado.

## Rodar Na Web

```bash
npm run build
WEB_ACCESS_TOKEN=troque-este-token npm run web:start
```

Acesse:

```txt
http://localhost:4173
```

Para uso online, rode em host Node com HTTPS e volume persistente:

```bash
WEB_PORT=4173
WEB_ACCESS_TOKEN=token-longo-e-privado
DATABASE_PATH=/data/agent.sqlite
CODEX_MESH_ROOT=/data/codex-mesh
OPENAI_API_KEY=sk-...
```

Em hosts que injetam `PORT`, o servidor usa `PORT` automaticamente.

Leia [docs/WEB_APP.md](docs/WEB_APP.md) para o deploy Docker e operacao online.

## Modelo De Seguranca

O bot bloqueia qualquer usuario que nao esteja em `TELEGRAM_ALLOWED_USER_IDS`.

A ferramenta `propose_sensitive_action` exige aprovacao humana antes de executar. Ela deve ser usada para acoes que:

- escrevem, apagam ou publicam algo;
- fazem deploy;
- enviam mensagens externas;
- gastam dinheiro;
- alteram producao;
- manipulam dados sensiveis.

As ferramentas de agencia criam registros locais. Elas nao pagam, cobram, enviam mensagens, publicam criativos, alteram campanhas ou fazem deploy. Integracoes reais, como Gmail, Google Drive, GitHub, Browser, Canva, Figma, Meta Ads, Google Ads ou financeiro, devem ser adicionadas como ferramentas separadas e protegidas por aprovacao.

## Estrategia

Leia [docs/AGENCY_OS.md](docs/AGENCY_OS.md) para arquitetura e ritmo operacional, [docs/WEB_APP.md](docs/WEB_APP.md) para a interface online, [docs/DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md) para planilhas/CSV, e [docs/CONNECTORS.md](docs/CONNECTORS.md) para a ordem de integracoes externas.

## Codex Mesh Local

O MVP sem Telegram fica disponivel pela CLI:

```bash
npm run mesh -- init
npm run mesh -- list
npm run mesh -- inbox --project agent-system
npm run mesh -- send --from agent-system --to infinite-todo-app --subject "Pergunta" --body "Contexto objetivo"
npm run mesh -- broadcast-intros
npm run mesh -- publish-discovery --from agent-system --subject "Descoberta" --body "Algo novo que outros projetos devem saber."
npm run mesh -- dispatch
npm run mesh -- bridge-list --status open
npm run mesh -- bridge-next
npm run mesh -- bridge-mark-sent --message-id msg_id --sent-turn-id turn_id
npm run mesh -- record-reply --message-id msg_id --source-turn-id turn_id --body "Resposta recebida da thread"
```

Por padrao, a CLI usa `../codex-mesh` como raiz quando executada dentro de `agent-system`. Tambem e possivel definir outro local:

```bash
CODEX_MESH_ROOT=/caminho/mesh npm run mesh -- list
```

Cada projeto registrado recebe:

- `manifest.md`: identidade, escopo, limites e politica de compartilhamento.
- `public-summary.md`: resumo que outros projetos podem ler.
- `decisions.md`, `open-questions.md`, `interfaces.md`: memoria publica estruturada.
- `inbox/` e `outbox/`: mensagens JSON auditaveis entre projetos.

O protocolo preserva fronteiras: um projeto pode pedir contexto, revisao ou decisao a outro, mas escrita cruzada e acoes sensiveis continuam exigindo aprovacao humana.

`dispatch` prepara mensagens que exigem resposta para a thread Codex do projeto destinatario, grava envelopes em `codex-mesh/dispatch/` e marca as mensagens como `dispatched`.

`bridge-list`, `bridge-next`, `bridge-mark-sent` e `record-reply` formam o fluxo operacional do bridge. O modulo `src/mesh/bridge.ts` contem o runner testavel com adapter de transporte para `send_message_to_thread` e `read_thread`.

## Scripts

```bash
npm run typecheck
npm test
npm run build
npm run web:start
```

## Proximos Incrementos Recomendados

1. Publicar a web em um host Node com HTTPS, `WEB_ACCESS_TOKEN` e volume persistente.
2. Validar o CLI/web com seus primeiros clientes reais.
3. Rodar o smoke test real do Telegram como canal auxiliar.
4. Conectar Google Drive/Sheets para relatorios, financeiro e arquivos de clientes.
5. Conectar Gmail para triagem e rascunhos de relacionamento.
6. Plugar o adapter nativo do Codex app no runner do bridge quando o transporte estiver disponivel fora do chat.
7. Adicionar GitHub/Codex workflow para landing pages e automacoes.
8. Adicionar Browser/Playwright para QA, screenshots e validacao de landing pages.
9. Trocar SQLite por Postgres quando virar multiusuario ou producao.
