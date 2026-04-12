# Tao Outsider — Estratégia Completa do Conglomerado

> Versão 1.0 | Abril 2026  
> Objetivo central: ser a **referência em conteúdo estratégico de Bittensor** no Brasil e no mundo lusófono, usando o conteúdo como funil para o grupo pago.

---

## 1. VISÃO GERAL DO ECOSSISTEMA

```
FONTES DE DADOS (on-chain + mercado)
         │
         ▼
   AGENTES DE IA  ←──────────────────────────────┐
         │                                        │
         ├──► TWITTER/X (6-7 posts/dia)           │
         │         │                              │
         ├──► BLOG (3-5 posts/sem.)               │
         │         │                              │
         ├──► SITE INSTITUCIONAL                  │
         │         │                              │
         └──► TELEGRAM PÚBLICO (preview)          │
                   │                              │
                   ▼                              │
         GRUPO PAGO TELEGRAM ───── dados/análises─┘
         (produto principal / receita)
```

**Tudo converge para o grupo pago.** O conteúdo gratuito é amostra. A promessa é: "o que você vê no free é 10% do que está dentro."

---

## 2. PRODUTO PRINCIPAL — GRUPO PAGO TELEGRAM

### 2.1 Posicionamento

> "O único grupo em português que entrega inteligência de dados do ecossistema Bittensor em tempo real, com análise estratégica para investidores."

### 2.2 Estrutura do Grupo (Canais Internos)

| Canal | Conteúdo | Frequência |
|-------|----------|------------|
| `#análise-diária` | Resumo do dia: emissões, movimentos de stake, destaques de subnets | Diário |
| `#insights-semanais` | Análise profunda de 1 subnet por semana | Semanal |
| `#alertas-on-chain` | Movimentos relevantes detectados por bots (stake >10k TAO, etc.) | Tempo real |
| `#dtao-tracker` | Performance dos tokens alpha das subnets | Diário |
| `#tira-dúvidas` | Perguntas respondidas pelo fundador + IA | Diário |
| `#portfólio-model` | Portfolio modelo com racional de alocação | Semanal |
| `#calls-ao-vivo` | Chamadas de voz/vídeo ao vivo | Quinzenal |
| `#notícias-filtradas` | Só o que importa, sem ruído | Diário |
| `#educação` | Conteúdo estruturado para aprender Bittensor do zero | Permanente |

### 2.3 Precificação (Sugestão)

| Plano | Preço | Benefícios |
|-------|-------|------------|
| Mensal | R$ 197/mês | Acesso completo |
| Trimestral | R$ 497/tri | ~17% desconto |
| Anual | R$ 1.497/ano | ~37% desconto + bônus de onboarding |

### 2.4 Ferramentas para o Grupo

- **Plataforma**: Telegram (grupos/canais + bot de pagamento)
- **Gestão de membros**: Telegramo, MemberSpace ou bot customizado (Python + `python-telegram-bot`)
- **Pagamento**: Stripe + Hotmart ou Kiwify (integração automática)
- **Bot de análise**: Python + SDK Bittensor (análises automáticas diárias)

---

## 3. CONTEÚDO ESTRATÉGICO — TWITTER/X

### 3.1 Objetivo

Ser a principal voz em português sobre Bittensor. Cada post é uma mini-demonstração de inteligência que termina com um CTA para o grupo.

### 3.2 Mix de 6-7 Posts por Dia

| Tipo | Qtd/dia | Formato | Exemplo |
|------|---------|---------|---------|
| Dado on-chain do dia | 1 | Texto + gráfico | "A subnet 8 (Taoshi) recebeu X% de emissão hoje. Por quê isso importa..." |
| Thread educativa | 1 | Thread 5-8 tweets | "O que é dTAO e por que mudou tudo no Bittensor [thread]" |
| Opinião/análise | 1 | Texto curto | Hot take sobre movimento do mercado |
| Alerta/notícia | 1 | Texto curto | Novidade do ecossistema filtrada e comentada |
| Repost estratégico | 1 | Citar + comentar | Pegar post em inglês e traduzir/comentar |
| Meme/cultura | 1 | Imagem/vídeo curto | Engajamento e humanização |
| CTA direto | 1 | Texto | Convite explícito para o grupo pago |

### 3.3 Automação do Twitter

- **Geração de conteúdo**: Claude API (Anthropic) com contexto de dados on-chain
- **Agendamento**: Buffer, Typefully ou Hypefury
- **Dados automáticos**: Script Python puxa metagraph + Taostats API → formata → Claude gera post
- **Horários ideais**: 8h, 10h, 12h, 15h, 18h, 21h, 22h (horário de Brasília)

---

## 4. BLOG ESTRATÉGICO — SEO PARA BITTENSOR

### 4.1 Objetivo

Dominar o Google para buscas sobre Bittensor em português. O blog é o maior ativo de longo prazo — conteúdo evergreen que traz leads 24/7.

### 4.2 Plataforma

- **Recomendado**: Ghost (blog + newsletter + membership integrado) ou WordPress com Rank Math SEO
- **Alternativa leve**: Next.js + MDX (controle total, SSG para velocidade)
- **Domínio sugerido**: `taooutsider.com.br` ou `bittensorbrasil.com`

### 4.3 Categorias e Palavras-chave Alvo

| Categoria | Exemplos de Posts | Intenção |
|-----------|------------------|----------|
| **O que é** | "O que é Bittensor?", "O que é TAO token?" | Informacional / topo de funil |
| **Como funciona** | "Como funciona a mineração no Bittensor", "O que são subnets?" | Educacional |
| **Investimento** | "Como comprar TAO no Brasil", "Vale a pena investir em TAO?" | Transacional |
| **dTAO** | "O que é Dynamic TAO?", "Como funcionam os tokens alpha das subnets" | Tendência |
| **Subnets** | "Subnet 8 Taoshi: guia completo", "Melhor subnet para staking" | Comparativo |
| **Staking** | "Como fazer staking de TAO", "Melhores validadores Bittensor" | Transacional |
| **Análises** | "Análise mensal do ecossistema Bittensor" | Autoridade |
| **Notícias** | "Novidades Bittensor [mês/ano]" | Atualidade |

### 4.4 Frequência e Processo com Agentes

```
1. Pesquisa de palavra-chave (SEMrush / Ahrefs / Ubersuggest)
2. Briefing automático (dados on-chain + contexto do ecossistema)
3. Geração de rascunho (Claude API — modelo Opus/Sonnet)
4. Revisão humana (15-20 min)
5. Publicação + distribuição automática (RSS → Twitter → Telegram)
```

- **Volume**: 3-5 posts/semana nos primeiros 3 meses → depois 2-3 posts/semana de manutenção
- **Tamanho**: Mínimo 1.500 palavras por post (ideal: 2.500-4.000 para posts pilar)

### 4.5 SEO Técnico

- Schema markup (Article, FAQ, BreadcrumbList)
- Core Web Vitals otimizados
- Link building: parcerias com sites crypto BR, guest posts
- Sitemap automático + Google Search Console configurado

---

## 5. SITE INSTITUCIONAL

### 5.1 Objetivo

Credibilidade, apresentação e conversão. Quem chega via Twitter ou Blog precisa de um destino que converta.

### 5.2 Estrutura de Páginas

| Página | Conteúdo |
|--------|----------|
| `/` (Home) | Proposta de valor + CTA para o grupo |
| `/sobre` | História, missão, credenciais do fundador |
| `/grupo-pago` | Página de vendas do Telegram pago |
| `/blog` | Hub de conteúdo (integrado ou link para blog) |
| `/servicos` | Consultoria, relatórios custom, etc. (futuro) |
| `/contato` | Formulário + links |

### 5.3 Stack Recomendada

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Deploy**: Vercel (grátis até escalar)
- **CMS** (para o fundador editar sem código): Sanity.io ou Contentful
- **Analytics**: Plausible (privacidade) ou Google Analytics 4
- **Formulários**: Resend (e-mail) + Typeform

---

## 6. ARQUITETURA DE AGENTES DE IA

### 6.1 Visão Geral

```
┌─────────────────────────────────────────────┐
│           ORQUESTRADOR CENTRAL              │
│     (n8n / Python scheduler / Airflow)      │
└──────────┬──────────────────────────────────┘
           │
    ┌──────┴────────────────────────────┐
    │                                   │
    ▼                                   ▼
AGENTE DE DADOS                  AGENTE DE CONTEÚDO
(coleta e processa)              (gera e distribui)
    │                                   │
    ├─ SDK Bittensor                    ├─ Claude API (Anthropic)
    ├─ Taostats API                     ├─ Buffer / Typefully
    ├─ CoinGecko API                    ├─ Ghost API
    ├─ Twitter API                      └─ Telegram Bot API
    └─ RSS feeds (Bittensor news)
```

### 6.2 Agente de Dados (Python)

```python
# Exemplo de pipeline diário
import bittensor as bt
import requests
from anthropic import Anthropic

def coletar_metagraph(netuid: int):
    sub = bt.subtensor(network="finney")
    meta = sub.metagraph(netuid=netuid)
    return {
        "emissions": meta.E.tolist(),
        "stakes": meta.S.tolist(),
        "uids": meta.uids.tolist(),
    }

def obter_preco_tao():
    r = requests.get(
        "https://api.coingecko.com/api/v3/simple/price",
        params={"ids": "bittensor", "vs_currencies": "usd,brl"}
    )
    return r.json()

def gerar_resumo_diario(dados: dict) -> str:
    client = Anthropic()
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"""
            Com base nos seguintes dados do ecossistema Bittensor de hoje:
            {dados}
            
            Gere um resumo diário conciso (max 280 caracteres para Twitter) 
            destacando o dado mais relevante para investidores. 
            Tom: direto, inteligente, sem hype.
            """
        }]
    )
    return response.content[0].text
```

### 6.3 Fluxo Diário Automatizado (Pipeline)

```
06:00 — Bot coleta dados on-chain (metagraph de top 10 subnets)
06:15 — Bot coleta preço TAO + volume + dados dTAO
06:30 — Claude gera: post Twitter manhã + resumo para grupo
07:00 — Post agendado no Twitter (manhã)
08:00 — Resumo enviado automaticamente no grupo pago
10:00 — Post Twitter (educativo/thread)
12:00 — Post Twitter (notícia do dia)
15:00 — Post Twitter (análise)
17:00 — Bot verifica eventos on-chain relevantes
18:00 — Post Twitter (tarde)
20:00 — Alerta no grupo se houver movimentos relevantes
21:00 — Post Twitter (engajamento/meme)
22:00 — Post Twitter (CTA para grupo)
```

### 6.4 Stack de Automação

| Função | Ferramenta | Custo estimado |
|--------|-----------|----------------|
| Orquestração de fluxos | n8n (self-hosted) | ~$10/mês (VPS) |
| Geração de texto | Claude API (Anthropic) | ~$30-50/mês |
| Geração de imagens | DALL-E 3 ou Ideogram API | ~$20/mês |
| Agendamento Twitter | Typefully ou Buffer | $15-18/mês |
| Dados de mercado | CoinGecko (free tier) | $0 |
| Dados on-chain | Bittensor SDK + RPC | $0 |
| Hospedagem agentes | Railway ou Render | $5-10/mês |
| Monitoramento | UptimeRobot | $0 |
| **Total estimado** | | **~$80-108/mês** |

---

## 7. FONTES DE DADOS DETALHADAS

### 7.1 On-Chain (Gratuito)

| Fonte | O que fornece | Como acessar |
|-------|--------------|--------------|
| Bittensor SDK | Metagraph, emissões, stake, pesos | `pip install bittensor` |
| Subtensor RPC | Dados brutos do blockchain | `wss://entrypoint-finney.opentensor.ai:443` |
| Polkadot.js | Queries de baixo nível | Substrate RPC |
| Taostats | Dashboard aggregado, histórico | API (verificar docs) |
| Subscan | Transações, blocos, histórico | `bittensor.subscan.io/api` |

### 7.2 Mercado

| Fonte | O que fornece | API |
|-------|--------------|-----|
| CoinGecko | Preço, volume, market cap TAO | Free tier disponível |
| CoinMarketCap | Dados alternativos de mercado | Free tier disponível |
| Binance API | Preço em tempo real (se listado) | Gratuito |

### 7.3 Notícias e Comunidade

| Fonte | O que fornece | Como monitorar |
|-------|--------------|----------------|
| Twitter/X | Movimentos da comunidade | API ou Nitter RSS |
| Bittensor Discord | Anúncios oficiais | Webhook + bot |
| GitHub Opentensor | Updates técnicos, PRs | GitHub RSS / API |
| Bittensor Docs | Documentação oficial | RSS / crawler |
| r/bittensor | Reddit discussion | Reddit API |

---

## 8. ROADMAP DE EXECUÇÃO — DO ZERO

### Fase 0 — Fundação (Semanas 1-2)

- [ ] Registrar domínio
- [ ] Criar contas: Twitter/X, Telegram, YouTube
- [ ] Configurar VPS para agentes (Railway ou Render)
- [ ] Criar conta Anthropic API
- [ ] Configurar n8n (orquestrador)
- [ ] Instalar e testar SDK Bittensor localmente
- [ ] Criar repositório privado no GitHub para os agentes

### Fase 1 — MVP de Conteúdo (Semanas 3-6)

- [ ] Publicar site institucional básico (1 landing page de captura)
- [ ] Configurar blog (Ghost ou WordPress)
- [ ] Escrever 10 posts pilares de SEO (manual + IA)
- [ ] Ativar pipeline Twitter automático (3 posts/dia inicialmente)
- [ ] Criar grupo Telegram público (preview gratuito)
- [ ] Primeiros 20 posts no Twitter manualmente (aquecer conta)

### Fase 2 — Lançamento do Grupo Pago (Semanas 7-10)

- [ ] Configurar bot de pagamento Telegram (Stripe/Kiwify)
- [ ] Criar estrutura de canais do grupo pago
- [ ] Configurar pipeline de análises automáticas para o grupo
- [ ] Campanha de lançamento: 7 dias de conteúdo intenso no Twitter
- [ ] Meta inicial: 50 membros pagantes no primeiro mês

### Fase 3 — Escala e Automação (Mês 3-6)

- [ ] Pipeline 100% automático de Twitter (6-7 posts/dia)
- [ ] Blog: 3-5 posts/semana via agente + revisão
- [ ] Dashboard interno de métricas (MRR, churn, engajamento)
- [ ] Primeiras parcerias (outros projetos Bittensor, exchanges BR)
- [ ] YouTube: 1 vídeo/semana (roteiro gerado por IA)
- [ ] Meta: 200-500 membros pagantes

### Fase 4 — Autoridade Total (Mês 6-12)

- [ ] Newsletter semanal automatizada com dados on-chain
- [ ] Relatórios mensais premium (produto adicional)
- [ ] Consultoria para projetos do ecossistema
- [ ] Possível fundo/indexador de subnets (produto avançado)
- [ ] Meta: 1.000+ membros pagantes (R$ 197k+ MRR)

---

## 9. PARCERIAS ESTRATÉGICAS

| Parceiro | Por quê | Como abordar |
|----------|---------|--------------|
| **Taostats** | Maior fonte de dados, credibilidade | Parceria de dados / co-marketing |
| **Taoshi (SN8)** | Subnet de trading, público alinhado | Entrevistas, conteúdo conjunto |
| **Neural Internet (SN27)** | GPU compute, muito técnico | Educational content |
| **Exchanges BR** (Mercado Bitcoin, Foxbit, Bitget BR) | Onde BR compra TAO | Programa de afiliados |
| **Influencers Crypto BR** | Distribuição para novos públicos | Collab posts, entrevistas |
| **Validadores top** | Autoridade técnica | Entrevistas, guest posts |

---

## 10. MÉTRICAS E KPIs

### Conteúdo
- Seguidores Twitter: meta 1k → 5k → 20k (3 meses / 6 meses / 12 meses)
- Impressões/mês Twitter: meta 100k → 500k → 2M
- Visitas orgânicas blog/mês: meta 500 → 5k → 30k
- Posts indexados Google: meta 10 → 50 → 150

### Produto (Grupo Pago)
- MRR (Receita Mensal Recorrente): meta R$10k → R$50k → R$200k
- Membros ativos: meta 50 → 250 → 1.000
- Churn mensal: meta < 5%
- NPS: meta > 50

### Automação
- % de conteúdo gerado por IA: meta 70% (com revisão humana)
- Tempo humano/dia para operação: meta < 2 horas/dia
- Uptime dos agentes: meta > 99%

---

## 11. ESTRUTURA TECNOLÓGICA COMPLETA

```
┌─────────────────────────────────────────────────────────┐
│                    INFRAESTRUTURA                        │
│                                                         │
│  Railway/Render (agentes Python)                        │
│  Vercel (site + blog)                                   │
│  GitHub (código dos agentes)                            │
│  Cloudflare (DNS + proteção)                            │
└─────────────────────────────────────────────────────────┘
           │
┌──────────┴──────────────────────────────────────────────┐
│                   DADOS & IA                             │
│                                                         │
│  Bittensor SDK ──► Metagraph, emissões, stake           │
│  CoinGecko API ──► Preço, volume, market cap            │
│  Taostats API  ──► Dados agregados de subnets           │
│  Claude API    ──► Geração de todo conteúdo textual     │
│  DALL-E/Ideogram ► Geração de imagens para posts        │
└─────────────────────────────────────────────────────────┘
           │
┌──────────┴──────────────────────────────────────────────┐
│                  DISTRIBUIÇÃO                            │
│                                                         │
│  n8n           ──► Orquestração de todos os fluxos      │
│  Typefully     ──► Agendamento e publicação Twitter      │
│  Ghost API     ──► Publicação automática no blog        │
│  Telegram Bot  ──► Distribuição no grupo pago           │
│  Resend        ──► E-mail marketing / newsletter        │
└─────────────────────────────────────────────────────────┘
           │
┌──────────┴──────────────────────────────────────────────┐
│                  MONETIZAÇÃO                             │
│                                                         │
│  Kiwify/Hotmart ──► Checkout e gestão de assinaturas    │
│  Stripe        ──► Pagamentos internacionais            │
│  Bot Telegram  ──► Controle de acesso automático        │
└─────────────────────────────────────────────────────────┘
```

---

## 12. PRÓXIMOS PASSOS IMEDIATOS (Esta Semana)

1. **Hoje**: Definir o handle do Twitter/X e criar conta
2. **Hoje**: Registrar domínio `taooutsider.com` (ou `.com.br`)
3. **Amanhã**: Criar conta na Anthropic API (Claude) e Railway
4. **Essa semana**: Escrever 5 posts manualmente para aquecer o Twitter
5. **Essa semana**: Instalar SDK Bittensor localmente e rodar primeiras queries
6. **Essa semana**: Criar o grupo público do Telegram (preview gratuito)

---

*Este documento é vivo e deve ser atualizado à medida que o projeto evolui.*
