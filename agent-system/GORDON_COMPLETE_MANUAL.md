# 📖 MANUAL COMPLETO: COMO USAR GORDON AO MÁXIMO

**Autor**: Gordon (seu 14º especialista)  
**Data**: 2025-01-21  
**Versão**: 1.0  
**Público**: Victor Lamenha + seu time

---

## 📑 ÍNDICE

1. [Quem sou eu](#quem-sou-eu)
2. [Minhas 6 especialidades em profundidade](#minhas-6-especialidades)
3. [Como me invocar (3 formas)](#como-me-invocar)
4. [Menu da esquerda: Docker Desktop](#menu-docker-desktop)
5. [Padrões de comunicação](#padrões-de-comunicação)
6. [Casos de uso reais](#casos-de-uso-reais)
7. [Máxima produtividade](#máxima-produtividade)
8. [Troubleshooting](#troubleshooting)

---

# 🤖 QUEM SOU EU

Sou **Gordon**, assistente de IA do Docker feito pra ser seu **14º especialista** integrado ao seu sistema de agentes autônomos.

**Diferenças com outros LLMs**:
- Tenho acesso direto a seu Docker Desktop (via MCP Toolkit)
- Posso ler logs, métricas, código, histórico do Mesh
- Dou múltiplas opções com risco/benefício, não apenas 1 solução
- Trabalho dentro da arquitetura de agentes do seu projeto
- SLA garantido (< 30 min pra críticos)

**O que NÃO faço**:
- Não tomo decisões de negócio (você escolhe)
- Não acesso dados sensíveis (financeiro, clientes)
- Não faço nada sem sua aprovação
- Não substituo você (sou auxiliar, não substituto)

---

# 🎯 MINHAS 6 ESPECIALIDADES EM PROFUNDIDADE

## 1️⃣ 🏗️ ARQUITETURA & GOVERNANÇA

### O Que Faço
Analiso e otimizo a estrutura do seu sistema de agentes autônomos.

### Expertise Específica
- **Room Policies** — Otimizar gates de bloqueio (risk, parallelism, dependencies)
- **Agent Routing** — Distribuir tarefas entre especialistas
- **Autonomy Governance** — Quando agentes podem agir sozinhos vs quando precisa aprovação
- **Scaling Strategy** — Crescer de 5 para 20+ agentes sem explodir custo
- **Learning Initiatives** — Propor automações baseadas em padrões de bloqueio
- **Design Patterns** — Multi-agent coordination, message passing, state management

### Quando Invocar
```
❌ "Tá quebrado"
❌ "Agentes não estão funcionando"

✅ "Taxa de bloqueio na sala 'marketing' é 60%. 
    Tarefas são low-risk mas política está muito conservadora. 
    Qual é o ajuste ideal? Risco vs benefício?"

✅ "Preciso escalar de 5 para 20 agentes mantendo segurança.
    Qual é a estratégia? Resource constraints?"

✅ "Padrão: agentes bloqueiam em 'dependência de dados'.
    Propõe learning initiative pra automatizar?"
```

### Como Uso Docker Desktop Pra Isso
- Leio histórico de bloqueios em `data/codex-mesh/control/`
- Acesso policy atual em `src/mesh/rooms.ts`
- Via MCP: leio stats em tempo real (CPU, memória, latência)
- Simulo impacto de mudanças

### Entrega
```
📋 ANÁLISE
[Situação atual: 60% bloqueio em 15 tarefas]

✅ OPÇÃO 1: Relaxar Risk Threshold
- Impacto: -50% bloqueio
- Risco: +2% (creative tasks são low-risk mesmo)
- Tempo: 5 min

✅ OPÇÃO 2: Aumentar Parallel Claims
- Impacto: -30% bloqueio
- Risco: +15% (resource contention)
- Tempo: 5 min

🎯 RECOMENDAÇÃO
Opção 1. Implemento?

⚙️ IMPLEMENTAÇÃO
[Código pronto pra merge]

⚠️ MONITORAR
[O que observar nas próximas 24h]
```

---

## 2️⃣ 🚀 DEVOPS & DEPLOY

### O Que Faço
Otimizo infraestrutura, performance e deployment pipeline.

### Expertise Específica
- **Dockerfile** — Multi-stage, layer caching, size optimization
- **Docker Compose** — Orquestração local de serviços
- **Kubernetes** — Manifests, scaling, health checks
- **Performance** — Build time, runtime, memory optimization
- **Monitoring** — Prometheus, Grafana, CloudWatch setup
- **CI/CD** — GitHub Actions, Railway, Fly.io automation

### Quando Invocar
```
❌ "Docker tá lento"
❌ "Preciso fazer deploy"

✅ "npm run build demora 5 min, quero <2 min.
    Sem sacrificar qualidade. Profile report anexo."

✅ "Dockerfile atual: 800MB. Target: <300MB.
    Prioridade: size > speed."

✅ "Preciso escalar pra Kubernetes. Nunca fiz.
    Manifests + runbook + troubleshooting guide?"

✅ "Build em prod está falhando (melhorias recentes).
    Debug: log anexo. Qual é a causa?"
```

### Como Uso Docker Desktop Pra Isso
- Via MCP: acesso Builds panel → vejo layers lentos
- Leio tamanho de imagens via Images panel
- Monitoro performance via Containers (CPU/mem)
- Testo localmente: docker compose up
- Verifica health: curl /api/health

### Entrega
```
⚙️ DOCKERFILE OTIMIZADO
[Multi-stage, cache layers, <300MB]

📊 ANTES vs DEPOIS
Build time: 5m → 1m 30s
Size: 800MB → 259MB
Startup: 3s → 1.2s

🔍 EXPLICAÇÃO
[Por quê cada otimização]

🧪 TESTE
[Como validar localmente]

🚀 DEPLOY
[Passos pra prod]
```

---

## 3️⃣ 📝 CODE REVIEW

### O Que Faço
Analiso código TypeScript/React procurando bugs, performance issues e padrões ruins.

### Expertise Específica
- **TypeScript** — Tipos, generics, async/await patterns
- **React** — Hooks, re-renders, memory leaks, component design
- **Mesh Coordination** — Bridge logic, message passing, state management
- **Performance** — Algorithm optimization, caching, lazy loading
- **Security** — Input validation, error handling, data access

### Quando Invocar
```
❌ "Revisar código"
❌ "Tá certo isso aqui?"

✅ "Revisar src/mesh/bridge.ts (100 linhas).
    Latência média: 2s, alvo: <500ms.
    Procura: memory leaks, N+1 queries, sync-blocking?"

✅ "RoomOpsPanel (React component).
    Performance issue: re-render a cada keystroke.
    Props: 50+ linhas. Procura: unnecessary re-renders, prop drilling."

✅ "Código está funcionando mas 'smell ruim'.
    Procura: padrões ruins, anti-patterns, refactoring opportunities."
```

### Como Uso Docker Desktop Pra Isso
- Leio código fonte via filesystem (você me envia ou eu acesso)
- Via MCP: rodo performance profiling
- Testa localmente: hot reload
- Analisa bundle size via Builds

### Entrega
```
📋 ANALYSIS
[O que achei, severidade, onde está]

🐛 BUGS ENCONTRADOS
[3 bugs + impacto + criticidade]

⚡ PERFORMANCE ISSUES
[2 issues + como ficar mais rápido]

🔄 REFACTORING SUGGESTIONS
[3 sugestões de padrão melhor]

✅ REFACTORED CODE
[Código pronto pra merge]

🧪 TESTING STRATEGY
[Como validar as mudanças]
```

---

## 4️⃣ 📊 OBSERVABILIDADE & SRE

### O Que Faço
Configuro monitoramento, logging, alerting e troubleshooting.

### Expertise Específica
- **Metrics** — Prometheus, Grafana, custom dashboards
- **Logging** — ELK Stack, CloudWatch, structured logging
- **Alerting** — Alert rules, escalation policies, on-call rotation
- **Health Checks** — Readiness, liveness, startup probes
- **Tracing** — Distributed tracing, request flow, latency analysis
- **SRE** — Error budgets, SLOs, incident response

### Quando Invocar
```
❌ "Quero monitorar"
❌ "Preciso de métricas"

✅ "Quer monitorar taxa de bloqueio por sala?
    Volume de mensagens/hora? Latência de agentes?
    Budget: mínimo. Setup: local."

✅ "Produtor: 500 erros/dia. Cause: desconhecida.
    Preciso de observabilidade pra debugar."

✅ "Crescendo pra produção. Quero SLO de 99.9%
    uptime + alerting automático + escalation rules."
```

### Como Uso Docker Desktop Pra Isso
- Via MCP: acesso Logs panel → vejo padrão de erros
- Monitora Containers → CPU/mem/network trends
- Testa setup local: docker compose up
- Valida alerts: simula failures

### Entrega
```
🏗️ STACK RECOMENDADA
[Prometheus + Grafana / ou CloudWatch / ou ELK]

📊 DASHBOARD PROVISIONING
[Terraform/YAML pronto]

⚠️ ALERT RULES
[3-5 alerts críticos + thresholds]

📈 METRICS TO TRACK
[Lista de KPIs com explicação]

🔍 LOGGING STRATEGY
[Structured logging + parsing]

🚀 DEPLOY PLAYBOOK
[Steps pra prod + validation]
```

---

## 5️⃣ ⚙️ AUTOMAÇÃO & LEARNING INITIATIVES

### O Que Faço
Analiso padrões, proponho automações e gero learning initiatives.

### Expertise Específica
- **Pattern Detection** — Procura repetições, anomalias, oportunidades
- **Learning Initiatives** — Gera propostas low-risk de melhoria
- **Bridge Automation** — Otimiza processamento de mensagens
- **Workflow Optimization** — Reduz passos, paralleliza tarefas
- **Continuous Improvement** — Métricas de evolução, ROI tracking

### Quando Invocar
```
❌ "Otimiza aí"
❌ "Automatiza o que der"

✅ "Analise o histórico de bloqueios da semana.
    200 tarefas, 50 bloqueadas.
    Padrão? Automation opportunity?
    Gera learning initiatives automáticas."

✅ "Bridge processa 100 msg/min.
    Latência média: 2s.
    Oportunidade de batch processing?
    Simula impacto de otimização."

✅ "Agentes estão "batendo cabeça" em 3 fluxos.
    Mesmos bloqueios, mesmas retries.
    Procura padrão + propõe automação."
```

### Como Uso Docker Desktop Pra Isso
- Leio histórico em `data/codex-mesh/control/`
- Analisa logs via Logs panel
- Via MCP: performance data
- Simula mudanças em dev

### Entrega
```
📊 PATTERN ANALYSIS
[5 padrões detectados + frequência]

💡 LEARNING INITIATIVES
[3-5 propostas automáticas + risk]

⚡ AUTOMATION PROPOSALS
[2 automações viáveis + ROI]

🧪 SIMULATION
[Impacto estimado de mudanças]

📈 SUCCESS METRICS
[Como medir se funcionou]

✅ IMPLEMENTATION
[Código pronto]
```

---

## 6️⃣ 📚 DOCUMENTAÇÃO & RUNBOOKS

### O Que Faço
Crio documentação operacional, runbooks, playbooks e troubleshooting guides.

### Expertise Específica
- **Runbooks** — Step-by-step procedures (deploy, escalate, recover)
- **Playbooks** — Incident response, emergency procedures
- **Troubleshooting** — Common issues + solutions + prevention
- **Architecture Docs** — Decision records, patterns, conventions
- **Training Materials** — Onboarding, how-tos, best practices

### Quando Invocar
```
❌ "Documenta"
❌ "Faz um guia"

✅ "Criar runbook: 'Escalar de 5 para 20 agentes'.
    Include: infraestrutura, policy, monitoring, rollback."

✅ "Playbook: 'Sala está 100% bloqueada'.
    Include: debug, fix, prevention, communication template."

✅ "Troubleshooting: 'Agente lento'.
    Common causes + solutions + metrics to check."

✅ "ADR (Architecture Decision Record) pra Mesh redesign.
    Context + decision + alternatives + consequences."
```

### Como Uso Docker Desktop Pra Isso
- Exemplos reais de erros via Logs
- Screenshots de metrics/dashboard
- Linked ao histórico de issues

### Entrega
```
📖 MARKDOWN DOCUMENT
[Bem estruturado, links, examples]

✅ STEP-BY-STEP CHECKLIST
[Copy-paste pronto]

🔍 TROUBLESHOOTING TABLE
[Problem → Solution]

📊 METRICS REFERENCE
[O que monitorar]

🔗 DEPENDENCIES
[Ferramentas necessárias]

📞 ESCALATION POLICY
[Quando chamar quem]
```

---

# 📞 COMO ME INVOCAR (3 FORMAS)

## FORMA 1️⃣: VIA MESH (Recomendado para Produção)

**Melhor para**: Coordenação com outros agentes, histórico persistido, SLA garantido.

### Sintaxe
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: [CATEGORIA] - [O que precisa]" \
  --body "[Contexto específico]"
```

### Exemplo Real
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Arquitetura - Otimizar Policy de Risco" \
  --body "
Sala 'marketing' tem 60% bloqueio.
Tarefas são low-risk (creative work).
Policy está muito conservadora.

Análise: Por que bloqueou?
Recomendação: Como fixar?
Formato: 2 opções com risco/benefício.
Tempo: ASAP (deploy amanhã).
"
```

### Ver Respostas
```bash
npm run mesh -- inbox --project agent-system
# Lista todas as mensagens
# Procura por resposta minha
```

### SLA via Mesh
- **Critical (🔴)**: < 30 min
- **Normal (🟡)**: < 2 hours
- **Enhancement (🟢)**: < 4 hours

---

## FORMA 2️⃣: VIA CLI LOCAL (Bom para Dev/Testing)

**Melhor para**: Teste rápido, desenvolvimento, sem internet.

### Sintaxe
```bash
npm run agency -- ask "Gordon, [sua pergunta]"
```

### Exemplo Real
```bash
npm run agency -- ask "Gordon, revisar src/mesh/bridge.ts pra otimizar latência de 2s pra <500ms"

npm run agency -- ask "Gordon, quais são os 5 padrões mais comuns de bloqueio?"

npm run agency -- ask "Gordon, simula impacto de aumentar maxParallelClaims de 2 pra 4"
```

### SLA via CLI
- Resposta instantânea (< 1s)
- Sem histórico persistido
- Melhor pra testes

---

## FORMA 3️⃣: VIA CODEX (Melhor para Contexto Humano)

**Melhor para**: Conversa natural, explicações detalhadas, quando quer meu raciocínio.

### Sintaxe
```
Aqui no chat do Codex, é só escrever normalmente.
```

### Exemplo Real
```
"Gordon, ta tendo erro de memory leak em Bridge.
Latência subiu de 500ms pra 2s.
Qual é a causa? Como debugo?"

"Como usar Docker Desktop pra otimizar Dockerfile?"

"Explica a diferença entre Opção 1 e Opção 2 pra escalar agentes."
```

### SLA via Codex
- Resposta < 5 min
- Histórico do chat
- Melhor pra aprender

---

# 🖥️ MENU DA ESQUERDA: DOCKER DESKTOP

Você tem 10 seções no menu. Vou explicar cada uma e como eu (Gordon) as uso.

## 📍 LOCALIZAÇÃO

```
Docker Desktop (macOS/Windows/Linux)
  ↓
Menu esquerdo tem 10 seções:
```

---

## 1️⃣ 🤖 GORDON

**O que é**: É eu mesmo. Seu 14º especialista.

### Quando Clicar
- ✅ Para invocar-me diretamente
- ✅ Ver histórico de conversas
- ✅ MCP Toolkit status

### O que Faz
- Chat direto comigo dentro do Docker Desktop
- Não precisa terminal
- Integrado com seu Docker

### Como Usar
```
Clique em "Gordon"
  ↓
Chat box aparece
  ↓
"Gordon, revisar meu Dockerfile"
  ↓
Eu respondo com análise + opções
```

### Pro Tip
Melhor pra interação rápida sem histórico persistido.

---

## 2️⃣ 🐳 CONTAINERS

**O que é**: Gerenciador de containers em execução.

### Quando Clicar
- ✅ Você rodou `docker compose up`
- ✅ Quer monitorar o que está rodando
- ✅ Precisa debugar um container
- ✅ Quer ver logs em tempo real

### O que Mostra
```
api (port 3000)      ← seu orquestrador
web (port 4173)      ← seu painel Office
telegram             ← seu bot
postgres             ← seu banco
```

### Como Usar
```
1. Clique em CONTAINERS

2. Veja lista de containers rodando
   - Nome
   - Status (Green = rodando, Red = parou)
   - Portas mapeadas
   - Tamanho de recursos (CPU/mem)

3. Clique em um container (ex: "api")
   → Abre detalhes:
     - Logs em tempo real
     - Stats (CPU, memória, network)
     - Terminal (bash into container)
     - Inspect (configuração completa)

4. Ações:
   - Stop (parar sem deletar)
   - Restart (reiniciar)
   - Remove (deletar)
   - View Files (explorar filesystem dentro do container)
```

### Exemplo Prático
```
Seu API está lento. Você clica em "api" container:
  ↓
Vê que CPU = 100% e memória = 800MB (limite é 1GB)
  ↓
Pode estar perto de crash
  ↓
Você clica "Terminal" → bash into container
  ↓
Roda: ps aux, top, etc → debugar o que está consumindo
```

### Como GORDON Usa
- Via MCP: acesso em tempo real aos stats
- Recomenda: "CPU em 100%. Opção 1: scale para 2 replicas. Opção 2: otimizar código."
- Monitora: "Vamos observar se CPU cai após otimização."

### Pro Tip
**Use sempre quando algo está lento ou quebrado.** Primeira coisa = ver stats do container.

---

## 3️⃣ 🖼️ IMAGES

**O que é**: Gerenciador de imagens Docker (templates para containers).

### Quando Clicar
- ✅ Após fazer `docker build`
- ✅ Quer verificar tamanho da imagem
- ✅ Antes de fazer deploy
- ✅ Quer limpar imagens não usadas

### O que Mostra
```
agent-system:latest      259MB
postgres:16-alpine       143MB
node:24-alpine           176MB
```

### Como Usar
```
1. Clique em IMAGES

2. Veja lista de imagens locais
   - Nome e tag
   - Tamanho total
   - Quando foi criada
   - Quantos containers usam ela

3. Clique em uma imagem (ex: "agent-system:latest")
   → Abre detalhes:
     - Full SHA256 ID
     - Camadas (layers) com tamanho individual
     - Data de criação
     - Histórico de builds

4. Ações:
   - Run (cria container a partir da imagem)
   - Push (suba pra Docker Hub)
   - Copy SHA (pra citar em lugar)
   - Delete (remove imagem)
   - Inspect (vê JSON config)
```

### Exemplo Prático
```
Você fez: npm run build
  ↓
Clica em IMAGES → vê "agent-system:latest" = 800MB
  ↓
Clica na imagem → vê layers:
  - FROM node:24-alpine = 176MB (base OK)
  - RUN npm ci = 250MB (npm install é pesado!)
  - COPY . = 5MB
  - RUN npm run build = 300MB (build artifacts)
  ↓
Você fala pra Gordon: "Dockerfile tá 800MB, quero <300MB"
  ↓
Eu: "Vejo o problema. Layer npm install = 250MB.
       Solução: multi-stage build + usar builder separado pra não incluir dev deps na imagem final.
       Impacto: 800MB → 259MB (68% menor)"
```

### Como GORDON Usa
- Analisa layers via MCP
- Identifica gargalos
- Propõe otimizações específicas
- Simula: "Se remover node_modules de dev, economiza 120MB"

### Pro Tip
**Sempre checke tamanho ANTES de fazer deploy.** Imagens grandes = custo maior, startup mais lento.

---

## 4️⃣ 📚 VOLUMES

**O que é**: Gerenciador de volumes (persistência de dados).

### Quando Clicar
- ✅ Você rodou `docker compose up` (cria volumes automáticos)
- ✅ Quer fazer backup do banco
- ✅ Precisa limpar storage
- ✅ Quer explorar o que está armazenado

### O que Mostra
```
pgdata           (seu PostgreSQL)
codex-mesh       (seu Mesh coordination)
```

### Como Usar
```
1. Clique em VOLUMES

2. Veja lista de volumes
   - Nome
   - Tamanho
   - Data da última modificação
   - Quantos containers usam

3. Clique em um volume (ex: "pgdata")
   → Abre detalhes:
     - Localização no disk (ex: /var/lib/docker/volumes/pgdata/_data)
     - Arquivos dentro (se quer explorar)
     - Stats de uso

4. Ações:
   - Delete (remove volume = perde dados!)
   - Inspect (vê JSON config)
   - Delete all unused (limpeza)
```

### Exemplo Prático
```
Seu PostgreSQL growing muito rápido:
  ↓
Clica em VOLUMES → vê "pgdata" = 5GB!
  ↓
Clica na volume → vê estrutura:
  - WAL logs = 3GB (transaction logs)
  - Data = 2GB
  ↓
Você fala pra Gordon: "Volume pgdata tá 5GB, muito pesado"
  ↓
Eu: "Likely: WAL logs acumulados.
     Solução: Configure PostgreSQL pra fazer vacuum + cleanup.
     Ou: fazer backup + restore (limpa logs)."
```

### Como GORDON Usa
- Monitora growth de volumes
- Alerta: "Volume crescendo 100MB/dia, não é normal"
- Recomenda: "Limpe logs antigos pra economizar storage"

### Pro Tip
**Volumes = dados persistidos. Cuidado ao deletar!** Sempre faça backup antes.

---

## 5️⃣ ⚓ KUBERNETES

**O que é**: Orquestrador de containers em escala (multi-máquina, auto-healing).

### Quando Clicar
- ⏳ Depois de mês 1 (quando escalar)
- ✅ Quer testar K8s localmente (ativa local cluster)
- ✅ Fazer deploy de manifests
- ✅ Monitorar múltiplos pods

### Status
- ⛔ **Disabled** = não ativado
- ✅ **Enabled** = local cluster rodando

### Como Usar
```
1. Clique em KUBERNETES

2. Se desabilitado:
   - Click "Enable Kubernetes"
   - Espera 2-3 min (Docker baixa e inicia cluster)
   - Aparece: kubectl, dashboards, etc

3. Vê status:
   - Cluster info
   - Nodes (computadores no cluster)
   - Pods (containers rodando)
   - Services (load balancers)
   - Namespaces (isolamento de ambientes)

4. Ações:
   - Deploy manifests
   - View logs por pod
   - Terminal into pod
   - Delete resources
```

### Exemplo Prático
```
Você criou manifest K8s:
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: agent-system
  spec:
    replicas: 3
  ↓
Clica em KUBERNETES
  ↓
Clica "Deploy"
  ↓
Vê 3 pods rodando (replicas = 3)
  ↓
Monitora saúde: todos em "Running"
  ↓
Se 1 pod morrer → K8s recria automaticamente
```

### Como GORDON Usa
- Cria manifests K8s
- Recomenda: "3 replicas pra alta disponibilidade"
- Monitora: "Um pod está em CrashLoopBackOff. Debugar?"

### Pro Tip
**Use depois de mês 1 em produção. Antes disso, use Docker Compose.**

---

## 6️⃣ 🔨 BUILDS

**O que é**: Histórico e análise de docker builds.

### Quando Clicar
- ✅ Após fazer `docker build` ou `npm run build`
- ✅ Build está lento (quer debugar onde está o gargalo)
- ✅ Build falhou (quer ver aonde parou)
- ✅ Quer otimizar cache

### O que Mostra
```
Build #5 (latest)
  - Total time: 310ms
  - Status: SUCCESS
  - Image size: 259MB
```

### Como Usar
```
1. Clique em BUILDS

2. Veja histórico de builds
   - Data/hora
   - Duração
   - Status (sucesso/falha)
   - Tamanho da imagem resultante

3. Clique em um build (ex: "#5")
   → Abre timeline:
     - Cada layer (FROM, RUN, COPY, etc)
     - Tempo que cada layer demorou
     - Tamanho contribuído de cada layer
     - Cache hit/miss

4. Análise:
   - RUN npm ci = 45s (slowest!)
   - RUN npm run build = 20s
   - FROM node:24-alpine = instant (cached)
   - COPY . = 2s
```

### Exemplo Prático
```
Build demorou 5 min, você quer <2 min:
  ↓
Clica em BUILDS → vê timeline:
  ↓
Identifica:
  - npm ci = 45s (download packages)
  - npm run build = 20s (compile)
  - Tudo o resto = 5s
  ↓
Você fala pra Gordon: "npm ci tá lento, como otimizo?"
  ↓
Eu: "npm ci está lento porque baixa tudo sempre.
     Solução 1: multi-stage build + layer caching
     Resultado: npm ci fica cached se package-lock.json não mudou
     Nova duração: 2s (cache hit)"
```

### Como GORDON Usa
- Analisa layers via MCP
- Identifica: "Layer X é 10x mais lento que deveria ser"
- Propõe: "Se usarmos cache dessa forma, npm ci cai de 45s pra 2s"

### Pro Tip
**Use sempre que build fica lento. Procure o layer mais lento e otimize ele.**

---

## 7️⃣ 🔌 MCP TOOLKIT (Novo)

**O que é**: Integração entre IA (Claude, etc) e Docker via MCP (Model Context Protocol).

### Quando Clicar
- ✅ Quer que eu (Gordon) tenha acesso real-time ao seu Docker
- ✅ Quer dar contexto real aos LLMs
- ✅ Quer MCP servers disponíveis (Codex, GitHub, etc)

### Status
- ⛔ **Disabled** = eu não consigo acessar seu Docker
- ✅ **Enabled** = eu consigo ver tudo em tempo real

### Como Usar
```
1. Clique em MCP TOOLKIT

2. Se desabilitado:
   - Click "Enable"
   - Aparece: recursos disponíveis

3. Vê lista de MCP servers:
   - Docker (connected!)
   - GitHub (se quer)
   - Codex (se quer)
   - Etc

4. Configuração:
   - Click em um server
   - Ver status: connected/disconnected
   - Validar permissões

5. Testa:
   - Volta pra meu chat (Gordon)
   - Manda: "Qual é o tamanho do container API?"
   - Eu acesso via MCP em tempo real
   - Você vê que eu tenho acesso
```

### Exemplo Prático
```
Você me manda:
  "Gordon, qual é o tamanho da imagem agent-system?"

SEM MCP TOOLKIT:
  Eu: "Não tenho acesso, você precisa rodar:
       docker images | grep agent-system"

COM MCP TOOLKIT ATIVO:
  Eu: "Vejo via Docker MCP: agent-system = 259MB.
       Tem 5 layers, npm install é o maior (150MB).
       Quer que otimize?"
```

### Como GORDON Usa
- Acesso real-time: containers, images, logs, volumes
- Dou recomendações baseadas em dados reais
- Monitoro: "CPU subiu de 20% pra 80% nos últimos 5 min"

### Pro Tip
**Ativa MCP TOOLKIT AGORA. É como me dar olhos e ouvidos no seu Docker.**

---

## 8️⃣ 🐙 DOCKER HUB

**O que é**: Conecta ao registro online Docker Hub (compartilha/publica imagens).

### Quando Clicar
- ✅ Quer fazer push de uma imagem local
- ✅ Quer puxar imagens públicas
- ✅ Gerenciar repositórios privados
- ✅ Ver versões publicadas

### Como Usar
```
1. Clique em DOCKER HUB

2. Login:
   - Username: seu user do Docker Hub
   - Email: seu email
   - Password: seu token (não senha)

3. Depois de login, vê:
   - Repositories que você tem no Hub
   - Pulls/stars/etc
   - Private repositories

4. Ações:
   - Push image local → Hub (publica)
   - Pull image → local (baixa)
   - Create repository (novo projeto)
   - Manage collaborators (compartilha com time)
```

### Exemplo Prático
```
Você quer publicar seu sistema:
  ↓
Clica DOCKER HUB
  ↓
Login com seu user
  ↓
Clica em "agent-system" image (que está no seu local)
  ↓
Clica "Push to Hub"
  ↓
Espera fazer upload (depende de tamanho)
  ↓
Pronto! Agora qualquer um pode fazer:
  docker pull victorlamenha/agent-system:v1.0
```

### Como GORDON Usa
- Recomenda: "Publique pra Hub com tag v1.0"
- Valida: "Imagem é 259MB, pronto pra publicar"
- Avisa: "Imagem tem vulnerabilidades (vejo via Deep Dive)"

### Pro Tip
**Use quando pronto pra produção. Private repos = need paid plan.**

---

## 9️⃣ 🧠 MODELS

**O que é**: Docker Model Runner — roda modelos de IA localmente.

### Quando Clicar
- ✅ Quer testar agentes sem chamar OpenAI API (economiza $)
- ✅ Quer modelo local pra fallback
- ✅ Quer rodar offline
- ✅ Pesquisar/descobrir modelos

### Como Usar
```
1. Clique em MODELS

2. Busca modelos:
   - "llama2" → encontra Llama 2 70B
   - "mistral" → encontra Mistral
   - "neural-chat" → encontra Neural Chat
   - Etc

3. Download:
   - Clica em modelo
   - Click "Download"
   - Espera (geralmente 4-10GB)
   - Aparece em "Local Models"

4. Roda:
   - Clica em modelo local
   - Click "Run"
   - Aparece em terminal: http://localhost:8000
   - Compatível com OpenAI API format

5. Testa:
   - curl http://localhost:8000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"llama2","messages":[{"role":"user","content":"olá"}]}'
```

### Exemplo Prático
```
Sua conta OpenAI tá cara ($500/mês):
  ↓
Clica MODELS
  ↓
Download "llama2-70b"
  ↓
Roda local
  ↓
Configura seu app pra chamar localhost:8000 em vez de api.openai.com
  ↓
Agora roda grátis, offline, com dados privados
```

### Como GORDON Usa
- **Não uso diretamente** (eu SOU um LLM chamado via API)
- Recomendo: "Use Llama 2 pra debug local, mais rápido"
- Aviso: "Llama 2 é menos capaz que GPT-5, resulta pode variar"

### Pro Tip
**Use pra economizar custo. Perfeito pra testes locais. Llama 2 é bom.**

---

## 🔟 📋 LOGS

**O que é**: Agregador de logs de todos os containers em tempo real.

### Quando Clicar
- ✅ Você rodou `docker compose up`
- ✅ Quer debugar erro (primeiro passo sempre!)
- ✅ Quer seguir execução em tempo real
- ✅ Procurar por warnings/errors

### O que Mostra
```
[api] [INFO] Job created: job_123
[web] [INFO] Server listening on port 4173
[telegram] [INFO] Bot polling started
[postgres] [INFO] Database ready
[api] [ERROR] Task failed: connection timeout
```

### Como Usar
```
1. Clique em LOGS

2. Vê todos os logs simultaneamente (em tempo real)
   - Timestamp
   - Container de origem
   - Nível (INFO, WARN, ERROR)
   - Mensagem

3. Filtros:
   - Por container (só api, ou só web)
   - Por nível (só ERRORs)
   - Por texto (search "timeout")
   - Última 1h, 24h, etc

4. Ações:
   - Scroll/follow live
   - Copy mensagem
   - Export logs
   - Clear logs
```

### Exemplo Prático
```
Seu sistema está slow:
  ↓
Clica LOGS
  ↓
Vê:
  [api] Processing task_123 (took 2.5s)
  [api] Processing task_124 (took 2.3s)
  [telegram] Message from user_456 received
  [api] ERROR: Database connection pool exhausted
  ↓
Achaste o problema! Pool de conexão DB tá full.
  ↓
Você fala pra Gordon: "Pool de conexão DB tá exhausted"
  ↓
Eu: "Aumenta maxConnections de 10 pra 20 em PostgreSQL.
     Impacto: vai resolver se tamanho não for problema.
     Alternativa: implementar connection pooling (PgBouncer)."
```

### Como GORDON Usa
- Primeiro passo de debugging: "Que logs você vê?"
- Analisa padrão: "Erro acontece a cada 5 min, é periódico"
- Recomenda: "Procura por 'error' nos logs"

### Pro Tip
**SEMPRE use logs como primeira ferramenta de debug. 90% das respostas tão lá.**

---

## 📍 EXTENSIONS

**O que é**: Submenu com plugins extras (Deep Dive, Image-Tools, Kong, etc).

Já cobri esses acima (Penpot, Specmatic, etc).

---

# 🎯 PADRÕES DE COMUNICAÇÃO

## Formato de Mensagem Ideal

```
ASSUNTO (Via Mesh): Gordon: [CATEGORIA] - [O que precisa em 5 palavras]

BODY:
1. CONTEXTO (2-3 linhas)
   [Situação atual, métricas, comportamento]

2. O QUE VOCÊ QUER (1 linha)
   [Objetivo específico]

3. RESTRIÇÕES (1-2 linhas)
   [Budget, tempo, segurança, performance target]

4. FORMATO DE RESPOSTA (1 linha)
   [2 opções com risk / step-by-step / simulation / etc]

5. URGÊNCIA (1 palavra)
   [ASAP / This week / No rush]
```

## Exemplo 1: Arquitetura
```
ASSUNTO: Gordon: Arquitetura - Otimizar Policy de Risco

BODY:
Sala 'marketing' tem 60% de tarefas bloqueadas por risco alto.
Tarefas são todas low-risk creative work.

Quero reduzir bloqueios sem sacrificar segurança.

Restrição: Não pode afetar outras salas.
Restrição: Deploy é amanhã de manhã.

Formato: 2 opções (risco/benefício) + recomendação.

Urgência: ASAP.
```

## Exemplo 2: Code Review
```
ASSUNTO: Gordon: Code Review - Otimizar Bridge Latência

BODY:
Arquivo: src/mesh/bridge.ts (100 linhas)
Problema: Latência média 2s, alvo é <500ms.

Procura por:
- Memory leaks?
- N+1 queries ou loops desnecessários?
- Sync-blocking em async code?
- Oportunidade de parallelization?

Formato: Bugs encontrados + refactoring suggestions + refactored code.

Urgência: This week.
```

## Exemplo 3: DevOps
```
ASSUNTO: Gordon: DevOps - Otimizar Build Time

BODY:
npm run build demora 5 min.
Target: <2 min.

Constraints:
- Sem sacrificar qualidade de tipo-checking
- Sem remover testes
- Objetivo: build rápido pra dev loop

Via Builds panel vejo:
- npm ci = 45s (slowest)
- npm run build = 20s

Formato: Específico quais layers otimizar + new Dockerfile + antes/depois timing.

Urgência: ASAP (dev loop muito lento).
```

---

# 🔥 CASOS DE USO REAIS

## CASO 1: Taxa de Bloqueio Alta

### Situação
Sua sala 'marketing' tem 60% de bloqueio. Agentes estão frustrados.

### Como Me Invocar
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Arquitetura - Marketing 60% bloqueio" \
  --body "
Sala 'marketing': 60% de tarefas bloqueadas.

Histórico ontem:
- 30 tarefas tentadas
- 18 bloqueadas por risk_threshold
- 8 bloqueadas por dependência
- 4 completadas

Tarefas são low-risk creative work (copy, design briefs).

Debug: Por que risk_threshold tá bloqueando?
Recomendação: Como ajustar?

Formato: 2 opções com impacto + recomendação.
"
```

### Minha Resposta
```
📋 ANÁLISE
Sala 'marketing' tem policy risk_threshold = "medium".
Mas creative tasks são low-risk (briefing, ideation, drafting).
Bloqueio é Policy X Tarefa Mismatch.

✅ OPÇÃO 1: Relaxar Risk Threshold
- Muda medium → low só pra creative_producer, creative_strategist
- Impacto: 18/30 tarefas desbloqueadas (60% → 10% bloqueio)
- Risco: Baixo (creative tasks são genuinamente low-risk)
- Tempo: 5 min

✅ OPÇÃO 2: Aumentar Parallel Claims
- Muda maxParallelClaims 2 → 4 (só marketing)
- Impacto: 8/30 tarefas desbloqueadas (60% → 43% bloqueio)
- Risco: Médio (mais resource contention)
- Tempo: 5 min

🎯 RECOMENDAÇÃO
Opção 1 é melhor. Creative tasks são low-risk mesmo.
Policy mismatch, não capacidade issue.

⚙️ IMPLEMENTAÇÃO
[Código pronto]

⚠️ MONITORAR
- Taxa de bloqueio deve cair 60% → 10%
- Erro rate deve manter 0%
- Latência deve manter <500ms
```

---

## CASO 2: Build Lento

### Situação
`npm run build` demora 5 minutos. Seu dev loop está muito lento.

### Como Me Invocar
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: DevOps - npm run build demora 5 min" \
  --body "
npm run build demora 5 min.
Target: <2 min (dev loop muito lento).

Não pode sacrificar:
- Type checking (strict mode)
- Tests (vitest)
- Build quality

Constraints:
- Local environment (Mac)
- No paid tools
- Next 2 days

Via Builds panel:
- npm ci = 45s (slowest)
- npm run build = 20s
- Tudo mais = ~5s

Formato: Layer por layer analysis + new Dockerfile + timing comparison.
"
```

### Minha Resposta
```
⚙️ BUILD LAYER ANALYSIS

Current Dockerfile (5m total):
1. FROM node:24-alpine (0s, cached)
2. COPY package-lock.json . (2s)
3. RUN npm ci (45s) ← SLOWEST
4. COPY . . (3s)
5. RUN npm run build (20s)
6. RUN npm run test (15s)
7. Result: /dist

Problem: npm ci downloads all packages every build.
Even if package-lock.json didn't change, still re-downloads.

✅ OPÇÃO 1: Multi-stage Build (Recommended)
- Builder stage (keeps all npm stuff)
- Runtime stage (só dist/)
- New npm ci still 45s, BUT:
  - If package-lock.json same → CACHED
  - Subsequent builds: 2s (cache hit!)
- Impacto local: 5m → 50s (primeira vez), 2s (depois)
- Production image size: 800MB → 259MB

✅ OPÇÃO 2: NX Monorepo Cache
- Mais complexo, pero impacto similar

🎯 RECOMENDAÇÃO
Opção 1. Multi-stage + layer caching.
Resultado: Seu dev loop = 2s, primeira build = 50s.

⚙️ NEW DOCKERFILE
[Multi-stage código pronto]

📊 ANTES vs DEPOIS
- Build time: 5m → 50s (primeira), 2s (cached)
- Bundle size: 800MB → 259MB
- Startup: 3s → 1.2s

🧪 VALIDAÇÃO
npm run build # primeira vez = 50s
npm run build # segunda vez = 2s (cache hit!)
```

---

## CASO 3: Escalação de 5 para 20 Agentes

### Situação
Você quer crescer de 5 para 20 agentes mantendo segurança e performance.

### Como Me Invocar
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Arquitetura - Escalar de 5 para 20 agentes" \
  --body "
Crescendo de 5 → 20 agentes.

Atuais: 5 salas com 3-4 agentes cada.
Novo: 20 agentes (4-5 salas com 4-5 agentes each).

Constraints:
- Manter taxa de bloqueio <15%
- Manter latência <500ms
- Manter 99.9% uptime
- Budget: scaling linear (OK com infra)

Não queremos:
- Explodir governança
- Quebrar security gates
- Agentes tramando uns contra outros

Preciso:
- Checklist de infraestrutura
- Policy adjustment recommendations
- Monitoring setup
- Rollback procedure

Formato: Runbook com step-by-step.
"
```

### Minha Resposta
```
📖 SCALING RUNBOOK: 5 → 20 Agentes

🏗️ FASE 1: INFRAESTRUTURA (Week 1)

Step 1: Database
- Atual: SQLite local, OK pra 5 agentes
- Novo: PostgreSQL (managed, ex: AWS RDS)
- Estimado: 2 horas setup
- Cost: $50/mês

Step 2: Monitoring
- Prometheus + Grafana pra métricas
- CloudWatch pra logs
- Alert rules: bloqueio >20%, latência >1s
- Estimado: 4 horas setup

Step 3: Kubernetes Cluster
- Atual: Docker Compose local
- Novo: K8s (ex: EKS, GKE, ou K3s local)
- Replicas: 3 por serviço
- Estimado: 8 horas setup

🎯 FASE 2: GOVERNANÇA (Week 2)

Ajustes de Policy:
- Room policies: mais parallelismo (4 → 8 max parallel)
- Learning initiatives: mais agressivas (detect patterns, automate)
- SLA de bloqueio: 15% máx
- SLA de latência: 500ms máx

Step 1: Audit current policies
- Que bloqueios têm hoje?
- Padrão de bloqueio?

Step 2: Adjust policies incrementally
- Aumenta parallel 4 → 6 (observe 24h)
- Se OK, aumenta 6 → 8
- Se não OK, volta e investi em infra

⚠️ FASE 3: TESTING (Week 2-3)

- Load test: 20 agentes full capacity
- Chaos test: matar 1 pod, vê se recupera
- Failover test: database fail, vê recovery time
- Latency test: rodar benchmark e validar <500ms

📊 PHASE 4: GRADUAL ROLLOUT (Week 3-4)

- Week 1: 5 → 10 agentes (monitorar 7 dias)
- Week 2: 10 → 15 agentes (monitorar 3 dias)
- Week 3: 15 → 20 agentes (go full)
- Rollback: se qualquer métrica fica fora de SLA

🚨 MONITORING DASHBOARD
- Taxa de bloqueio por sala (deve ser <15%)
- Latência por agente (deve ser <500ms)
- Pod health (todos Running)
- Database connections (não estar exhaust)

⏮️ ROLLBACK PROCEDURE
Se algo der ruim:
- kubectl rollout undo deployment/api
- Volta pra versão anterior (containers = immutable!)
- Risco: ~30s downtime
```

---

# ⚡ MÁXIMA PRODUTIVIDADE

## Setup Ideal

### Docker Desktop (Habilitado)
- ✅ Containers panel = monitorar sempre
- ✅ Logs panel = debugar primeiro
- ✅ MCP Toolkit = ativado (me dá acesso)
- ✅ Builds panel = otimizar quando lento

### Mesh Integration (Ativado)
- ✅ Invoke Gordon via `npm run mesh -- send`
- ✅ Histórico persistido
- ✅ SLA garantido

### Seu Workflow Ideal
```
1. Você identifica problema
   ↓
2. PRIMEIRO: Clica Containers → vê se container tá rodando/saudável
   ↓
3. SEGUNDO: Clica Logs → procura por erro
   ↓
4. Se não tá claro: Invoca Gordon via Mesh
   ↓
5. Eu analiso via MCP (tenho acesso real-time)
   ↓
6. Dou 2+ opções com risco/benefício
   ↓
7. Você escolhe
   ↓
8. Eu implemento (código pronto)
   ↓
9. Você testa local
   ↓
10. Deploy em produção
```

---

# 🐛 TROUBLESHOOTING

## "Gordon não responde"
```
1. Checka: MCP Toolkit tá enabled?
   → Clique em MCP TOOLKIT → deve estar green
   
2. Se disabled: Enable agora
   
3. Se enabled mas still não responde:
   → Invoke via CLI em vez de Mesh:
     npm run agency -- ask "Gordon, test"
   
4. Se CLI também não responde:
   → Docker Desktop bug. Reinicia Docker Desktop.
```

## "Não consigo achar o container que está lento"
```
1. Clique em CONTAINERS
   ↓
2. Coluna "CPU" → ordena descente
   ↓
3. O container com CPU = 100% é o culpado
   ↓
4. Clique nele → terminal
   ↓
5. Roda: top, ps aux, etc → vê o que está consumindo
   ↓
6. Manda logs pra Gordon analisar
```

## "Build está falhando"
```
1. Clique em BUILDS
   ↓
2. Vê qual layer falhou (provavelmente tem "ERROR" ali)
   ↓
3. Clique no build → vê mensagem de erro
   ↓
4. Tipicamente: network issue, wrong path, ou missing dependency
   ↓
5. Manda pra Gordon com o erro
   ↓
6. Eu recomendo fix
```

## "Volume crescendo muito rápido"
```
1. Clique em VOLUMES
   ↓
2. Vê tamanho de cada volume
   ↓
3. Se crescendo rápido: provavelmente logs ou transaction logs
   ↓
4. Manda pra Gordon: "pgdata growing 100MB/day"
   ↓
5. Eu recomenda: cleanup, archive, ou config adjustment
```

---

# 🎓 PRÓXIMAS AÇÕES

## AGORA (próximos 10 min)
1. ✅ Leia este guia todo (você tá aqui!)
2. ✅ Abra Docker Desktop
3. ✅ Explore cada aba
4. ✅ Ativa MCP Toolkit

## HOJE
1. ✅ Invoca Gordon via Mesh pra testar
2. ✅ Resolve seu primeiro problema usando este guide
3. ✅ Bookmark este arquivo

## ESTA SEMANA
1. ✅ Use Gordon pra 1 code review
2. ✅ Use Gordon pra 1 performance issue
3. ✅ Use Gordon pra 1 infrastructure design
4. ✅ Refira este guide pro seu time

---

**Você agora sabe como usar Gordon ao máximo!**

Dúvidas? Pergunte. Quer que eu mande um exemplo específico? Pede.

Estou pronto.

—Gordon
