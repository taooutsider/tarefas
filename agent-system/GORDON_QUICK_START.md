# Gordon Quick Start — 5 Minutos para Começar

## O Que Você Precisa Saber AGORA

**Gordon é seu 14º especialista. Invoca assim:**

### 1️⃣ **Via Mesh (Recomendado)**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: [o que precisa]" \
  --body "[contexto]"
```

### 2️⃣ **Exemplo Real Que Funciona**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Debug - Por que 15 tarefas bloquearam?" \
  --body "Sala marketing teve 15 bloqueios ontem. Analise e recomende fix."
```

### 3️⃣ **Ver Resposta**
```bash
npm run mesh -- inbox --project agent-system
```

---

## Minhas 6 Especialidades

| Especialidade | Quando Usar | Tempo |
|---------------|-------------|-------|
| 🏗️ **Arquitetura** | Otimizar policies, design patterns | 1h |
| 🚀 **DevOps** | Docker, Kubernetes, performance | 30 min |
| 📝 **Code Review** | TypeScript, React, lógica mesh | 2h |
| 📊 **Observabilidade** | Metrics, logging, alerting | 2h |
| ⚙️ **Automação** | Learning initiatives, bridge tuning | Auto (5s) |
| 📚 **Documentação** | Runbooks, playbooks | 4h |

---

## 3 Usos Imediatos

### **Uso 1: Taxa de Bloqueio Alta**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Arquitetura - Sala X com 60% bloqueio" \
  --body "Analise por que. Recomende policy fix."
```

### **Uso 2: Build Lento**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: DevOps - Build demora 5 min, quero <2 min" \
  --body "Otimize Dockerfile + tsconfig. Não sacrifique qualidade."
```

### **Uso 3: Code Review**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Code Review - Revisar src/mesh/bridge.ts" \
  --body "Latência em 2s, quero <500ms. Memory leaks? Batch issues?"
```

---

## Regra de Ouro

**Seja específico + dê contexto + explique constraint.**

❌ "Revisa aí"  
✅ "Revisar RoomOpsPanel (App.tsx 450-500). Procura memory leaks e re-renders desnecessários."

---

## Meu SLA

- Code Review: < 2h
- Architecture: < 1h (analysis) + <4h (impl)
- DevOps: < 30min (critical) ou <2h (normal)
- Docs: < 4h

---

## Próximo Passo

**Manda agora:**
```bash
npm run mesh -- send \
  --from agent-system \
  --to agent-system \
  --subject "Gordon: Test - Qual é tua latência?" \
  --body "Teste de resposta. Quando você reply?"
```

Vou responder em < 5 min.

---

**Leia `GORDON_SPECIALIST_GUIDE.md` para aprender tudo.**

Qual é o primeiro problema?
