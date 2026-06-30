# MJP — Movimento Jovens na Política · Capitador de Apoio

Formulário público para registrar apoio à criação do partido **MJP**, hospedado em **`https://mjp.droppfy.com`**.

Stack: **HTML estático + Cloudflare Pages + Pages Functions + D1**.

```
index.html                     ← front (bandeira animada + formulário)
functions/api/votar/index.js   ← POST /api/votar  (valida + grava + dedup)
functions/api/votar/count.js   ← GET  /api/votar/count (contador)
migrations/0001_init.sql       ← schema do D1
wrangler.jsonc                 ← config Pages + binding D1
.github/workflows/deploy.yml   ← CI: push na main → deploy Pages
```

---

## 1) Deploy automático (GitHub Actions) — **JÁ CONFIGURADO**

A cada `push` na `main`, o workflow publica no Cloudflare Pages.

### Secrets a criar no GitHub (Settings → Secrets and variables → Actions)
| Secret              | Valor                                            |
|---------------------|--------------------------------------------------|
| `CF_API_TOKEN`      | Token Cloudflare com permissão **Pages**         |
| `CF_ACCOUNT_ID`     | Account ID Cloudflare (dashboard lateral)        |

Criar o token: **Cloudflare → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"** (ou template Pages).

---

## 2) Criar o banco D1 **ANTES** do primeiro deploy

```bash
npx wrangler d1 create mjp-apoiadores
```

Copie o `database_id` retornado e cole em `wrangler.jsonc` (campo `"database_id": "..."`).

Aplique o schema:

```bash
# local (teste)
npx wrangler d1 execute mjp-apoiadores --file=./migrations/0001_init.sql

# produção
npx wrangler d1 execute mjp-apoiadores --file=./migrations/0001_init.sql --remote
```

> Sem D1 configurado, o formulário responde 503 no POST e o contador fica em 0. O site **não quebra**.

---

## 3) Conectar o projeto Pages + domínio `mjp.droppfy.com`

### 3a. Criar o projeto no Cloudflare Pages
- **Workers & Pages → Create → Pages → Upload assets** não é necessário: o GitHub Actions cria o projeto no primeiro deploy. **OU**, se preferir criar antes:
  - **Workers & Pages → Create → Pages → Connect to Git →** selecione `gpartnerllc-png/ASSINATURA-PARTIDO`
  - Framework preset: **None**
  - Build command: *(vazio)*
  - Build output: `.` (raiz)

### 3b. Custom domain `mjp.droppfy.com`
Como `droppfy.com` usa nameservers do **Google Domains** (não Cloudflare), adicione um **CNAME** no Google Domains:

| Tipo  | Host | Valor (CNAME)                              | TTL  |
|-------|------|--------------------------------------------|------|
| CNAME | mjp  | `mjp-droppfy.pages.dev`                    | 3600 |

Depois, no Cloudflare Pages → **Custom domains → Set up → mjp.droppfy.com**. O Cloudflare emite o certificado TLS automaticamente.

> Alternativa avançada: migrar o domínio inteiro para o Cloudflare (mudando NS no Google Domains). Aí o registro do subdomínio passa a ser por **CNAME flattening** no painel CF.

---

## 4) (Opcional) Notificação Telegram a cada 100 apoios

No painel Pages → **Settings → Variables and Secrets**, adicionar:

| Variável              | Valor                              |
|-----------------------|------------------------------------|
| `TELEGRAM_BOT_TOKEN`  | token do bot (`@BotFather`)        |
| `TELEGRAM_CHAT_ID`    | id do canal/grupo destino          |

Sem essas variáveis, o site funciona normalmente — apenas o Telegram fica desligado.

---

## 5) Variáveis de ambiente resumidas (Pages)

| Variável            | Obrigatório | Descrição                              |
|---------------------|:-----------:|----------------------------------------|
| `DB` (binding D1)   | sim*        | Vem do `wrangler.jsonc`               |
| `ALLOWED_ORIGIN`    | não         | `https://mjp.droppfy.com` (CORS)      |
| `TELEGRAM_*`        | não         | Notificação em marcos                  |

*sem D1 o site degrada graciosamente.

---

## LGPD

Coleta apenas: nome, e-mail, título de eleitor, zona, seção, estado, município.
**Não** coleta foto, documento ou dados biométricos. Dados ficam no D1 (criptografado em repouso pela Cloudflare). Dedup por título garante um apoio por eleitor.
