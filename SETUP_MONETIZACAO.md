# MasterSinger — Setup de Monetização (passo a passo)

> Este doc te leva do "tenho as credenciais" até "vendendo". Tudo que NÃO precisa
> de credencial já está implementado. Só falta plugar as chaves e configurar.

---

## O que já está pronto (não precisa mexer)

- ✅ Pricing: Free / Pro Mensal R$54,90 / Pro Anual R$347 (47% OFF, 7 dias grátis)
- ✅ Free tier ajustado: afinador ilimitado + 1 curso (Aquecimento) + 1 exercício de cada tipo
- ✅ Paywall no app: Studio, Treino de Ouvido, Harmonia, Teoria, Aquecimento, Progresso = Pro
- ✅ Gate na Academia (1 curso free, 7 bloqueados) e na Prática (1 exercício/tipo free)
- ✅ Modal de upgrade com login/cadastro, trial 7d, código de professor (30d) e checkout
- ✅ Backend: `/api/checkout`, `/api/trial`, `/api/asaas-webhook`, `/api/subscription`
- ✅ Schema SQL completo (subscriptions, teacher_codes, payment_events + RLS + triggers)
- ✅ Landing atualizada (FAQ sem "em breve", vitalício removido)

---

## Passo 1 — Supabase (5 min)

1. Acesse https://supabase.com → seu projeto (ou crie um novo)
2. Vá em **Settings → API** e copie:
   - **Project URL** (`https://xxx.supabase.co`)
   - **anon public key** (`eyJ...`)
   - **service_role key** (`eyJ...`) ⚠️ NUNCA expor no browser
3. Vá em **SQL Editor → New query**, cole o conteúdo de `supabase-schema.sql` e rode.
   - Isso cria as tabelas `profiles`, `subscriptions`, `teacher_codes`, `payment_events` + RLS + triggers.
4. **Authentication → Sign In / Providers → Email**: ative e **desative "Confirm email"**
   (assim o cadastro loga direto, sem validar email — mais conversão pra MVP).

---

## Passo 2 — Asaas (5 min)

1. Acesse https://www.asaas.com → sua conta
2. **Configurações → API → Gerar token de acesso** → copie o token
   - Sandbox: começa com `$aac...` (testes)
   - Produção: `$aat...` (vendas reais)
3. **Configurações → Webhooks → Novo webhook**:
   - URL: `https://mastersinger.vercel.app/api/asaas-webhook`
   - Marque os eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`
   - Anote o secret do webhook (ou crie um secret próprio)

---

## Passo 3 — Variáveis de ambiente na Vercel (3 min)

Vá em https://vercel.com → seu projeto `mastersinger` → **Settings → Environment Variables** e adicione:

| Nome | Valor | Onde achar |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...anon...` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...service...` | Supabase → Settings → API |
| `ASAAS_ACCESS_TOKEN` | `$aac...` ou `$aat...` | Asaas → Configurações → API |
| `ASAAS_BASE_URL` | `https://sandbox.asaas.com/api/v3` (teste) ou `https://www.asaas.com/api/v3` (prod) | — |
| `ASAAS_WEBHOOK_SECRET` | string aleatória longa (a mesma do webhook no Asaas) | você inventa |

> ⚠️ As variáveis `VITE_` vão pro bundle do browser (públicas, seguras). As demais (`SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_*`) ficam só no servidor.

Depois de adicionar, faça um **redeploy** (Deployments → Redeploy) pra pegar as variáveis.

---

## Passo 4 — Cadastrar códigos de professor (opcional, quando tiver professores)

No SQL Editor do Supabase, insira um código por professor:

```sql
insert into public.teacher_codes (code, teacher_name, teacher_email, trial_days, max_uses)
values ('PROFJOAO10', 'João Silva', 'joao@email.com', 30, 50);
```

- `max_uses` = null para ilimitado. Defina um limite pra evitar que o código vaze e vire trial padrão.
- Quando um aluno usa o código no app, ganha 30 dias grátis e o `uses` é incrementado.

---

## Passo 5 — Testar o fluxo completo

1. Abra https://mastersinger.vercel.app
2. Clique em **Assinar Pro** (ou entre numa feature bloqueada como Estúdio)
3. Crie uma conta (email + senha)
4. Teste o **trial de 7 dias** → deve liberar tudo
5. Teste o **checkout** (use sandbox do Asaas) → paga com Pix de teste → o webhook ativa o Pro
6. Verifique no Supabase → Table Editor → `subscriptions`: status deve virar `active`

### Troubleshooting
- **"Backend não configurado"**: falta alguma variável de ambiente na Vercel. Redeploy.
- **Webhook não ativa**: confira a URL do webhook no Asaas e o `ASAAS_WEBHOOK_SECRET`.
- **Login não funciona**: confira `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e que "Confirm email" está desativado.

---

## Arquivos criados/modificados

| Arquivo | O que faz |
|---|---|
| `data/pricing.ts` | Planos e preços (single source of truth) |
| `services/entitlements.ts` | Lógica do paywall (o que é free vs Pro) |
| `store/store.tsx` | Estado de subscription + auth + upgrade modal |
| `components/UpgradeModal.tsx` | UI de login/trial/checkout |
| `api/checkout.ts` | Cria cobrança Asaas → retorna link de pagamento |
| `api/trial.ts` | Ativa trial 7d (ou 30d com código de professor) |
| `api/asaas-webhook.ts` | Recebe confirmação de pagamento → ativa Pro |
| `api/subscription.ts` | Retorna status da assinatura do usuário |
| `api/_lib/supabaseAdmin.ts` | Client service-role + validação de JWT |
| `api/_lib/asaas.ts` | Cliente HTTP do Asaas |
| `supabase-schema.sql` | Tabelas + RLS + triggers |
| `vercel.json` | Rewrite do SPA (exclui `/api`) |
| `App.tsx` | Gate de navegação + badge Pro + modal |
| `components/Landing.tsx` | CTAs de plano + FAQ atualizada |
| `components/Academy.tsx` | Gate de cursos (1 free) |
| `components/Practice.tsx` | Gate de exercícios (1/tipo free) |
