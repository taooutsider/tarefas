# Auto-Bridge Implementation

## O Que Foi Implementado

O **auto-bridge** é um loop automático que processa mensagens pendentes do Mesh continuamente, permitindo que agentes **conversem sozinhos** sem depender de cliques manuais ou comandos CLI.

## Onde Está

Arquivo: `src/web/server.ts` (linhas ~120-155)

```typescript
// Auto-bridge: process pending mesh envelopes continuously
const MESH_BRIDGE_INTERVAL_MS = Number(process.env.MESH_BRIDGE_INTERVAL_MS ?? "5000");
const MESH_BRIDGE_ENABLED = process.env.MESH_BRIDGE_ENABLED !== "0" && process.env.MESH_BRIDGE_ENABLED?.toLowerCase() !== "false";

if (MESH_BRIDGE_ENABLED && Number.isFinite(MESH_BRIDGE_INTERVAL_MS) && MESH_BRIDGE_INTERVAL_MS > 0) {
  let bridgeLastRun = Date.now();
  setInterval(() => {
    const now = Date.now();
    if (now - bridgeLastRun < 1000) {
      return;
    }
    bridgeLastRun = now;
    
    try {
      const result = dispatchPendingMessages(mesh);
      if (result && result.dispatched && result.dispatched.length > 0) {
        logger.info("Auto-bridge processed envelopes", {
          dispatched: result.dispatched.length,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("Auto-bridge dispatch failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, MESH_BRIDGE_INTERVAL_MS);
  logger.info(`Mesh auto-bridge scheduled: ${MESH_BRIDGE_INTERVAL_MS}ms`);
}
```

## Como Funciona

1. **Loop**: A cada `MESH_BRIDGE_INTERVAL_MS` (padrão: 5 segundos), o servidor:
   - Checa se há envelopes pendentes no Mesh
   - Chama `dispatchPendingMessages(mesh)` para processá-los
   - Registra logs estruturados

2. **Rate-limiting**: Garante que não há disparo mais rápido que 1 segundo entre ciclos (proteção contra spam)

3. **Logging**: Cada despacho registra quantos envelopes foram processados

4. **Error handling**: Falhas são capturadas e logadas, não travando o servidor

## Configuração

### Variáveis de Ambiente

| Variável | Padrão | O Que Faz |
|----------|--------|----------|
| `MESH_BRIDGE_INTERVAL_MS` | `5000` | Intervalo em ms entre ciclos de auto-bridge |
| `MESH_BRIDGE_ENABLED` | `true` | Ativa/desativa o auto-bridge (use `0` ou `false` para desabilitar) |

### Exemplos

**Ativar com 3s de intervalo:**
```bash
MESH_BRIDGE_INTERVAL_MS=3000 npm run web:start
```

**Desabilitar auto-bridge:**
```bash
MESH_BRIDGE_ENABLED=false npm run web:start
```

**Docker Compose:**
```yaml
web:
  environment:
    MESH_BRIDGE_INTERVAL_MS: "3000"
    MESH_BRIDGE_ENABLED: "true"
```

## O Que Mudou para os Agentes

### Antes (sem auto-bridge)
- Mensagens eram **criadas** no Mesh
- Mas **não eram despachadas** automaticamente
- Agentes precisavam ser acionados manualmente via CLI ou interface

### Depois (com auto-bridge)
- Mensagens são **criadas**
- **Automaticamente despachadas** a cada 5s (ou intervalo configurado)
- Agentes processam e **respondem sozinhos**
- Conversa flui naturalmente

## Observabilidade

### Logs no Terminal

```
[INFO] Mesh auto-bridge scheduled: 5000ms
[INFO] Auto-bridge processed envelopes { dispatched: 2, timestamp: "2025-01-21T10:30:45.123Z" }
```

### Métricas Disponíveis

Via endpoint `/api/mesh/bridge`:

```json
{
  "summary": {
    "pending": 0,
    "sent": 2,
    "replied": 5,
    "failed": 0,
    "open": 2
  }
}
```

## Próximos Passos

### 1. Deploy (Imediato)
```bash
git add src/web/server.ts
git commit -m "feat: auto-bridge mesh for autonomous agent communication"
git push origin main
```

### 2. Monitorar (30 min)
- Verificar logs em http://office.taooutsider.com (com token)
- Conferir se as mensagens entre agentes estão fluindo
- Validar latência de processamento

### 3. Refinar (Opcional)
- Ajustar `MESH_BRIDGE_INTERVAL_MS` baseado em observações
- Adicionar métricas ao painel (taxa de despacho, latência média)
- Implementar backoff exponencial se houver muitos erros

## Impacto

- ✅ **Agentes conversam automaticamente**
- ✅ **Sem dependência de CLI ou cliques**
- ✅ **Escalável para 20+ agentes**
- ✅ **Seguro** (não toca em finanças, respeita governança)
- ✅ **Observável** (logs estruturados)

## Troubleshooting

### "Auto-bridge processed 0 envelopes"
**Normal** — significa que não há mensagens pendentes no momento.

### "Auto-bridge dispatch failed"
Verifique:
1. Logs completos: `docker compose logs web -f`
2. Se o Mesh root está acessível
3. Se há erros de permissão nos arquivos do Mesh

### Agentes não respondem
1. Verifique se `MESH_BRIDGE_ENABLED=true`
2. Confirme que `MESH_BRIDGE_INTERVAL_MS > 0`
3. Cheque se há envelopes em `data/codex-mesh/dispatch/`

---

**Status:** ✅ Implementado e testado  
**Próxima Ação:** Deploy para produção
