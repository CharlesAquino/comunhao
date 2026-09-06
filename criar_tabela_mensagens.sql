-- ============================================================
-- Tabela: mensagens (chat de texto 1:1)
-- Executar no SQL Editor do Supabase
-- ============================================================

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS public.mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON public.mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario ON public.mensagens(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_par ON public.mensagens(
  LEAST(remetente_id, destinatario_id),
  GREATEST(remetente_id, destinatario_id)
);

-- 3. RLS
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY mensagens_select ON public.mensagens
  FOR SELECT USING (
    remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR destinatario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY mensagens_insert ON public.mensagens
  FOR INSERT WITH CHECK (
    remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY mensagens_update ON public.mensagens
  FOR UPDATE USING (
    destinatario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );
