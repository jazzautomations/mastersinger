-- ─────────────────────────────────────────────────────────────────────────
-- MasterSinger — Fix RLS for Teachers Table
-- Execute no Supabase → SQL Editor → New query → paste → Run.
-- ─────────────────────────────────────────────────────────────────────────

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 1: Criar tabelas se não existirem                             ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Tabela de professores
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de códigos de convite
CREATE TABLE IF NOT EXISTS public.teacher_codes (
  code TEXT PRIMARY KEY,
  teacher_name TEXT NOT NULL,
  teacher_email TEXT NOT NULL,
  trial_days INTEGER DEFAULT 30,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 2: Habilitar RLS nas tabelas                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_codes ENABLE ROW LEVEL SECURITY;

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 3: Criar políticas RLS para teachers                          ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Política 1: Usuários autenticados podem LER a tabela teachers
-- (necessário para verificar se um usuário é professor)
DROP POLICY IF EXISTS "teachers_select_authenticated" ON public.teachers;
CREATE POLICY "teachers_select_authenticated" ON public.teachers
  FOR SELECT
  TO authenticated
  USING (true);

-- Política 2: Service role pode fazer tudo (INSERT/UPDATE/DELETE)
-- Usado pelo backend para gerenciar professores
DROP POLICY IF EXISTS "teachers_service_role_all" ON public.teachers;
CREATE POLICY "teachers_service_role_all" ON public.teachers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política 3: Usuários podem ver apenas seu próprio registro (opcional)
-- Descomente se quiser que professores vejam apenas seus próprios dados
-- DROP POLICY IF EXISTS "teachers_select_own" ON public.teachers;
-- CREATE POLICY "teachers_select_own" ON public.teachers
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() = id);

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 4: Criar políticas RLS para teacher_codes                     ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Política 1: Qualquer um pode LER códigos (para usar códigos de convite)
DROP POLICY IF EXISTS "teacher_codes_select_public" ON public.teacher_codes;
CREATE POLICY "teacher_codes_select_public" ON public.teacher_codes
  FOR SELECT
  TO anon
  USING (true);

-- Política 2: Usuários autenticados podem LER códigos
DROP POLICY IF EXISTS "teacher_codes_select_authenticated" ON public.teacher_codes;
CREATE POLICY "teacher_codes_select_authenticated" ON public.teacher_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Política 3: Service role pode fazer tudo
DROP POLICY IF EXISTS "teacher_codes_service_role_all" ON public.teacher_codes;
CREATE POLICY "teacher_codes_service_role_all" ON public.teacher_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 5: Criar índice para performance                               ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_teachers_email ON public.teachers(email);
CREATE INDEX IF NOT EXISTS idx_teacher_codes_code ON public.teacher_codes(code);

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 6: Inserir professores (substitua os UUIDs)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Primeiro, busque os UUIDs:
-- SELECT id, email FROM auth.users WHERE email IN ('amandix.maria@gmail.com', 'slnorego@gmail.com', 'jazzautomations@gmail.com');

-- Depois insira (substitua UUID_DA_AMANDA, UUID_DO_SELI, UUID_DO_JAZZ):
-- INSERT INTO public.teachers (id, email, teacher_name)
-- VALUES 
--   ('UUID_DA_AMANDA', 'amandix.maria@gmail.com', 'Amanda'),
--   ('UUID_DO_SELI', 'slnorego@gmail.com', 'Seli'),
--   ('UUID_DO_JAZZ', 'jazzautomations@gmail.com', 'Jazz')
-- ON CONFLICT (id) DO UPDATE SET
--   email = EXCLUDED.email,
--   teacher_name = EXCLUDED.teacher_name;

-- Códigos de convite (opcional):
-- INSERT INTO public.teacher_codes (code, teacher_name, teacher_email, trial_days, max_uses)
-- VALUES 
--   ('AMANDA30', 'Amanda', 'amandix.maria@gmail.com', 30, NULL),
--   ('SELI30', 'Seli', 'slnorego@gmail.com', 30, NULL),
--   ('JAZZ30', 'Jazz', 'jazzautomations@gmail.com', 30, NULL)
-- ON CONFLICT (code) DO NOTHING;

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 7: Verificar se tudo está correto                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('teachers', 'teacher_codes');

-- Verificar tabelas
SELECT * FROM public.teachers;
SELECT * FROM public.teacher_codes;
