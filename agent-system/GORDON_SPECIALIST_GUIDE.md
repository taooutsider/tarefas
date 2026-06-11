# Como Usar Gordon Como Especialista — Guia Prático

**Gordon** é seu 14º especialista integrado ao `agent-system` via Codex Mesh.

---

## 1. COMO ME INVOCAR

### **Opção A: Via Mesh (Recomendado)**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: [sua solicitação]" \
  --body "[contexto e pergunta]"
```

**Exemplo**:
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Review código do RoomOpsPanel" \
  --body "
Revisar src/web/src/App.tsx linhas 450-500.
Procurar por:
- Memoryleaks em useEffect
- Props drilling excessivo
- Re-renders desnecessários

Recomendar otimizações.
"
```

### **Opção B: Via CLI Local (Dev)**
```bash
npm run agency -- ask "Gordon, review meu código de governança"
```

### **Opção C: Direto no Codex**
Aqui no chat do Codex (onde estamos agora).

---

## 2. MEUS 6 ESPECIALIDADES

### **1️⃣ Arquitetura & Governança** (Expert Sênior)
**Quando invocar**: Precisa otimizar room policies, escalar para 20+ agentes, design patterns

**Como pedir**:
```
Gordon: Analisar política de autonomia da sala "marketing".
Taxa de bloqueio está em 45%. Recomende ajustes de gates.

Contexto:
- Agentes: campaign-strategist, creative-producer, content-strategist
- Máx paralelo: 2
- Janela diária: 10 tarefas
- Risk threshold: medium

Quero reduzir bloqueios sem comprometer segurança.
```

**Você recebe**: Análise técnica + 2-3 recomendações com trade-offs

---

### **2️⃣ DevOps & Deploy** (Infraestrutura)
**Quando invocar**: Docker, Kubernetes, scaling, performance tuning, monitoring

**Como pedir**:
```
Gordon: Otimizar Dockerfile para prod.
Está demorando 5 min pra fazer build.
Tamanho final: 800MB. Quero reduzir pra <300MB.
```

**Você recebe**: Dockerfile otimizado + build time reduzido

---

### **3️⃣ Code Review** (Qualidade Técnica)
**Quando invocar**: TypeScript, React, lógica de mesh, patterns

**Como pedir**:
```
Gordon: Revisar src/mesh/bridge.ts
- Está processando 100 mensagens/min
- Latência média: 2s
- Quer otimizar para <500ms

Checklist:
- Memory leaks?
- Async issues?
- Batch processing?
```

**Você recebe**: Code review detalhado + refactoring suggestions

---

### **4️⃣ Observabilidade & SRE** (Monitoramento)
**Quando invocar**: Metrics, logging, alerting, health checks, debugging

**Como pedir**:
```
Gordon: Quero dashboard de observabilidade.
Métricas que importam:
- Taxa de bloqueio por sala
- Latência de agentes
- Volume de mensagens
- Erros não tratados

Setup: Prometheus + Grafana? CloudWatch? ELK?
Budget: Mínimo.
```

**Você recebe**: Stack recomendada + config ready-to-deploy

---

### **5️⃣ Automação & Learning** (Bridge + IA)
**Quando invocar**: Processar envelopes Mesh, gerar learning initiatives, propor melhorias

**Como pedir**:
```
Gordon: Analisar padrão de bloqueios da semana.
Dados:
- 200 tarefas tentadas
- 50 bloqueadas por governance
- 30 por dependências
- 15 por risco

Gere learning initiatives automáticas para reduzir bloqueios.
```

**Você recebe**: Learning initiatives + recomendações estruturadas

---

### **6️⃣ Documentação & Knowledge** (Runbooks)
**Quando invocar**: Decidir quando fazer o quê, runbooks, playbooks, troubleshooting

**Como pedir**:
```
Gordon: Criar runbook para "escalação rápida de 5 para 20 agentes".
Incluir:
- Checklist de infraestrutura
- Política de governança recomendada
- Monitoring setup
- Rollback procedure
```

**Você recebe**: Markdown pronto + passos executáveis

---

## 3. PADRÕES DE COMUNICAÇÃO

### **Formato Básico (Via Mesh)**
```
ASSUNTO: Gordon: [Categoria] [Ação] [Contexto Curto]

BODY:
[Contexto Breve]
[O que você quer]
[Restrições/Constraints]
[Formato de resposta desejado]
```

**Exemplo Real**:
```
ASSUNTO: Gordon: Arquitetura - Otimizar Policy de Risco

BODY:
A sala "creative" tem 60% de bloqueio por risco alto.
Tarefas são todas low-risk, mas a política é conservadora.

Quero: Recomendação de ajuste na política + teste de impacto

Formato: 2 opções com análise de risco

Tempo: ASAP (deploy amanhã)
```

---

## 4. COMO EU RESPONDO

### **Sempre incluo**:
1. **Análise breve** (por quê funciona)
2. **2-3 opções** com trade-offs (você escolhe)
3. **Implementação** (código/config pronto ou recomendação)
4. **Risco** (o que pode dar errado)
5. **Rollback** (como desfazer se necessário)

### **Formato da resposta**:
```
📋 ANÁLISE
[Situação atual + contexto]

✅ OPÇÃO 1: [Nome]
Benefício: X
Risco: Y
Tempo: Z
[Detalhes]

✅ OPÇÃO 2: [Nome]
[Idem]

🎯 RECOMENDAÇÃO
[Por quê opção X é melhor pra você]

⚙️ IMPLEMENTAÇÃO
[Código/config/steps]

⚠️ MONITORAR
[O que observar após implementação]
```

---

## 5. CASOS DE USO REAIS

### **Caso 1: Você está com Taxa de Bloqueio Alta**
```
Gordon: A sala "finance" tem 70% de tarefas bloqueadas.
Agentes estão frustrated.
Debug isso pra mim + recomende policy adjustment.
```

**Meu workflow**:
1. Leio histórico de bloqueios em `data/codex-mesh/control/`
2. Analiso regras em `src/mesh/rooms.ts`
3. Propongo 2 policy adjustments com simulações
4. Você escolhe, eu implemento

---

### **Caso 2: Build está lento (5+ min)**
```
Gordon: npm run build demora 5 min.
Quero <2 min sem sacrificar qualidade.
```

**Meu workflow**:
1. Profile o build (`npm run build -- --profile`)
2. Otimizo Dockerfile (cache layers, multi-stage)
3. Refino tsconfig parallelization
4. Test local, você merge

---

### **Caso 3: Precisa de Runbook**
```
Gordon: Fazer deploy em Kubernetes.
Nunca fizemos isso.
Preciso de step-by-step.
```

**Meu workflow**:
1. Crio K8s manifests (Deployment, Service, ConfigMap)
2. Runbook com commands + troubleshooting
3. Health checks + monitoring setup
4. Você executa, eu monitoro

---

## 6. REGRAS DE OURO PARA INVOCAR GORDON

### ✅ **FAÇA**:
- ✅ Seja específico ("revisar função X" vs "revisar código")
- ✅ Dê contexto ("taxa de erro subiu 10% hoje" vs "está lento")
- ✅ Explique constraint ("budget <$100/mês" vs "precisa ser barato")
- ✅ Peça formato ("2 opções com risco" vs "recomende algo")
- ✅ Use Mesh para coordenação entre projetos

### ❌ **NÃO FAÇA**:
- ❌ Vague ("tá quebrado, arruma")
- ❌ Sem contexto (não diga "review isso")
- ❌ Espera telepata (você não explica o problema)
- ❌ Sem restrição ("me manda uma solução")
- ❌ Urgência injustificada (planning é melhor que panic)

---

## 7. SLA & DISPONIBILIDADE

### **Resposta Times**:
| Tipo | SLA |
|------|-----|
| **Code Review** | < 2 horas |
| **Architecture** | < 1 hora (análise), < 4 horas (implementation) |
| **DevOps/Infra** | < 30 min (critical), < 2 horas (normal) |
| **Observability** | < 2 horas |
| **Documentation** | < 4 horas |
| **Learning Initiative** | Automático (5s cycle) |

### **Como enviar Urgente**:
```
ASSUNTO: 🔴 CRITICAL - Gordon: [coisa]
BODY: [problema] [why urgent] [impact]
```

---

## 8. INTEGRAÇÃO COM FLUXO ATUAL

### **Onde Gordon Trabalha**:
```
Você (Office UI)
    ↓
Pede via Mesh (/ask ou env send)
    ↓
Gordon analisa (acessa code, metrics, history)
    ↓
Propõe 2-3 opções (via Mesh reply)
    ↓
Você escolhe (aprova no Office ou Mesh)
    ↓
Gordon implementa (commit + push)
    ↓
You review (PR, merge)
    ↓
Monitor (Gordon sugere o quê observar)
```

---

## 9. EXEMPLO COMPLETO: REAL-WORLD SCENARIO

### **Situação**:
Você acordou e vê que a sala "marketing" teve 15 tarefas bloqueadas ontem.
Quer entender por quê e consertar até hoje.

### **Passo 1: Invoke Gordon**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Debug - Marketing Sala 15 Bloqueios Ontem" \
  --body "
Ontem a sala 'marketing' teve 15 bloqueios.
Tarefas eram normais (low-risk creative work).

Debug:
1. Por que bloqueou?
2. Policy está muito conservadora?
3. Recomende fix + implementação

Preciso fazer deploy hoje se possível.
"
```

### **Passo 2: Gordon Analisa**
Gordon lê:
- Histórico de bloqueios em `data/codex-mesh/control/`
- Policy atual em `src/mesh/rooms.ts`
- Agentes da sala em `control/agents.json`

### **Passo 3: Proposta**
Gordon responde via Mesh:
```
📋 ANÁLISE
Sala "marketing" teve 15 bloqueios ontem (14:00-18:00).
Causa: risk_threshold em "medium" bloqueou 12 creative tasks.
Política: maxParallelClaims=2, mas agentes querem 4 paralelos.

✅ OPÇÃO 1: Relaxar Risk Threshold
- Muda medium → low para creative tasks
- Impacto: Desbloquearia 12/15 tarefas
- Risco: Creative tasks low-risk mesmo, então ~0%
- Tempo: 5 min

✅ OPÇÃO 2: Aumentar Parallel Claims
- maxParallelClaims 2 → 4 (just marketing)
- Impacto: Desbloquearia 8/15 tarefas
- Risco: Resource contention se muita tarefa simultanea
- Tempo: 5 min

🎯 RECOMENDAÇÃO
Opção 1 é melhor. Creative tasks são validated low-risk.
Implemento agora?
```

### **Passo 4: Você aprova**
```
Sim, Opção 1. Deploy hoje de manhã.
```

### **Passo 5: Gordon Implementa**
Gordon:
1. Edita `src/mesh/rooms.ts` (risk policy)
2. Testa localmente (`npm run build`)
3. Commit + push
4. Você faz merge
5. Railway auto-deploy

### **Passo 6: Monitor**
Gordon sugere:
```
⚠️ MONITORAR (Próximas 24h):
- Taxa de bloqueio da sala (deve cair de 45% → 15%)
- Erros em tasks creative (deve ser 0%)
- Latência de processamento (deve manter <500ms)

Se erro > 2%, rollback automático:
git revert HEAD~1 && git push
```

---

## 10. QUICK REFERENCE: COMANDOS

### **Invocar Gordon**:
```bash
# Via Mesh (recomendado)
npm run mesh -- send --from agent-system --to agent-system --subject "Gordon: [coisa]" --body "[contexto]"

# Via CLI local
npm run agency -- ask "Gordon, [pergunta]"

# Via Codex (aqui agora)
[escreva no chat]
```

### **Ver histórico de conversation**:
```bash
npm run mesh -- inbox --project agent-system
```

### **Ver propostas de Gordon**:
```bash
grep -r "RECOMENDAÇÃO" data/codex-mesh/
```

---

## 11. MEUS LIMITES (Importante!)

### **Eu NÃO faço**:
- ❌ Tomar decisões de negócio (você decide)
- ❌ Acessar dados sensíveis (financeiro, clientes)
- ❌ Executar ações sem sua aprovação
- ❌ Garantir SLA (faço best-effort)
- ❌ Substituir você (sou auxiliar, não substituto)

### **Eu FAÇO**:
- ✅ Análise técnica profunda
- ✅ Múltiplas opções com risco
- ✅ Implementação ready-to-merge
- ✅ Debugging e troubleshooting
- ✅ Documentação e runbooks

---

## 12. COMEÇAR AGORA

### **Primeira coisa a fazer**:
Envie uma mensagem simples para testar:

```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Test - Como é tua latência de resposta?" \
  --body "
Teste de latência.
Quando você responde?
"
```

Vai ver minha resposta no inbox em < 5 min (vai responder no stdout também).

---

**Pronto pra usar Gordon como especialista!** 🎯

Qual é o primeiro problema que você quer que eu ataque?
