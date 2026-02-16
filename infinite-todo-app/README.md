# Lista Infinita (PWA + Sync)

## Rodar local

```bash
cd "/Users/victorlamenha/Documents/New project/infinite-todo-app"
python3 -m http.server 5500
```

Acesse: `http://localhost:5500`

## Publicar para usar no iPhone + Mac

1. Publique esta pasta no Netlify/Vercel/GitHub Pages em HTTPS.
2. Abra a URL no Safari do iPhone.
3. Toque em Compartilhar -> Adicionar à Tela de Início.

## Sincronização com Supabase

### 1) Criar tabela e política

No SQL Editor do Supabase, rode:

```sql
create table if not exists public.todo_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  archived_tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_state enable row level security;

create policy "Users read own todo state"
on public.todo_state
for select
using (auth.uid() = user_id);

create policy "Users upsert own todo state"
on public.todo_state
for insert
with check (auth.uid() = user_id);

create policy "Users update own todo state"
on public.todo_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### 2) No app

1. Cole `Supabase URL` e `anon key` no painel de sync.
2. Clique em `Salvar nuvem`.
3. Digite seu e-mail e clique em `Enviar link de acesso`.
4. Abra o link do e-mail e retorne ao app.
5. Clique em `Sincronizar agora` (depois ele sincroniza automaticamente em alterações).

## Notificações no iPhone

- Funcionam melhor quando o app está instalado na Tela de Início e com permissão concedida.
- Em iOS, há limitações de notificações web em segundo plano comparado a apps nativos.

## Deploy automático no GitHub Pages

Workflow criado em:
- `.github/workflows/deploy-infinite-todo-pages.yml`

Passos:

1. Criar repositório no GitHub e conectar este projeto local.
2. Fazer push para a branch `main`.
3. No GitHub: `Settings > Pages > Build and deployment > Source = GitHub Actions`.
4. O deploy será publicado automaticamente a cada push em `infinite-todo-app/**`.
