# Agency Command Web

Agency Command e a interface principal para operar o agente em desktop e iPhone.

## Rodar local

```bash
npm run build
WEB_ACCESS_TOKEN=troque-este-token npm run web:start
```

Acesse:

```txt
http://localhost:4173
```

Para desenvolvimento visual:

```bash
npm run web:server
npm run web:dev
```

`web:dev` abre o Vite em `5173` e usa proxy para a API em `4173`.

## Variaveis

```bash
WEB_PORT=4173
WEB_ACCESS_TOKEN=token-longo-e-privado
DATABASE_PATH=/data/agent.sqlite
CODEX_MESH_ROOT=/data/codex-mesh
OPENAI_API_KEY=sk-...
```

Em plataformas que injetam `PORT`, o servidor usa `PORT` antes de `WEB_PORT`.

Se `WEB_ACCESS_TOKEN` estiver vazio, a API fica sem protecao. Para uso online, defina sempre um token.

## Deploy online

O app precisa de um host Node com HTTPS e volume persistente para SQLite. Caminhos naturais:

- Railway, Fly.io, Render ou VPS Docker.
- Volume persistente montado em `/data`.
- `DATABASE_PATH=/data/agent.sqlite`.
- `CODEX_MESH_ROOT=/data/codex-mesh`.
- `WEB_ACCESS_TOKEN` longo e privado.

O `Dockerfile` ja executa:

```bash
npm ci
npm run build
npm run web:start
```

## Railway staging

O repo inclui `railway.json` para usar o `Dockerfile` e healthcheck em `/api/health`.

Checklist:

1. Criar um projeto Railway a partir do repo GitHub privado.
2. Adicionar um volume persistente montado em `/data`.
3. Definir variaveis:

```bash
WEB_ACCESS_TOKEN=token-longo-e-privado
OPENAI_API_KEY=sk-...
DATABASE_PATH=/data/agent.sqlite
CODEX_MESH_ROOT=/data/codex-mesh
LOG_LEVEL=info
```

4. Deployar.
5. Abrir a URL publica no desktop e iPhone.
6. Criar demo data pela UI ou via `POST /api/demo/seed`.

Nao defina `WEB_ACCESS_TOKEN` vazio em staging/producao.

## Superficies

- Command Center: fila executiva e KPIs.
- Clientes: lista operacional.
- Delivery OS: demandas, criativos e relatorios.
- Admin OS: recebiveis e pagaveis.
- Aprovacoes: aprovar/negar acoes sensiveis.
- Mesh: projetos e mensagens recentes.
- Agente: tarefas enviadas pela web.
