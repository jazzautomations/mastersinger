-- ─────────────────────────────────────────────────────────────────────────
-- MasterSinger — Setup de Professores
-- Execute no Supabase → SQL Editor → New query → paste → Run.
-- ─────────────────────────────────────────────────────────────────────────

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 1: Encontrar os UUIDs dos professores                        ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Buscar UUID da Amanda
SELECT id, email FROM auth.users WHERE email = 'amandix.maria@gmail.com';

-- Buscar UUID do Seli
SELECT id, email FROM auth.users WHERE email = 'slnorego@gmail.com';

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 2: Inserir professores (substitua os UUIDs abaixo)            ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Professora Amanda (substitua UUID_DA_AMANDA pelo UUID real)
INSERT INTO public.teachers (id, email, teacher_name)
VALUES ('UUID_DA_AMANDA', 'amandix.maria@gmail.com', 'Amanda')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  teacher_name = EXCLUDED.teacher_name;

-- Código de convite da Amanda (30 dias de trial)
INSERT INTO public.teacher_codes (code, teacher_name, teacher_email, trial_days, max_uses)
VALUES ('AMANDA30', 'Amanda', 'amandix.maria@gmail.com', 30, NULL)
ON CONFLICT (code) DO NOTHING;

-- Professor Seli (substitua UUID_DO_SELI pelo UUID real)
INSERT INTO public.teachers (id, email, teacher_name)
VALUES ('UUID_DO_SELI', 'slnorego@gmail.com', 'Seli')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  teacher_name = EXCLUDED.teacher_name;

-- Código de convite do Seli (30 dias de trial)
INSERT INTO public.teacher_codes (code, teacher_name, teacher_email, trial_days, max_uses)
VALUES ('SELI30', 'Seli', 'slnorego@gmail.com', 30, NULL)
ON CONFLICT (code) DO NOTHING;

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 3: Verificar se tudo foi criado                               ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Lista de professores
SELECT * FROM public.teachers;

-- Lista de códigos
SELECT * FROM public.teacher_codes;
