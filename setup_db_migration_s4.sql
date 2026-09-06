-- ============================================================
-- SPRINT S4: Sistema Kesef (Moeda + Ledger + Streaks)
-- ============================================================
-- ATENÇÃO: Executar APÓS setup_db_migration_v2.sql

-- Tabela: kesef_ledger (histórico imutável de transações)
CREATE TABLE IF NOT EXISTS public.kesef_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  motivo TEXT NOT NULL,
  referencia_id UUID,
  referencia_tipo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Não permitir UPDATE ou DELETE no ledger (imutável)
CREATE RULE ledger_no_update AS ON UPDATE TO public.kesef_ledger DO INSTEAD NOTHING;
CREATE RULE ledger_no_delete AS ON DELETE TO public.kesef_ledger DO INSTEAD NOTHING;

ALTER TABLE public.kesef_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seu ledger"
  ON public.kesef_ledger FOR SELECT
  USING (usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin'
  ));

CREATE POLICY "Inserção via RPC apenas"
  ON public.kesef_ledger FOR INSERT
  WITH CHECK (false);

-- View: saldo calculado do ledger
CREATE OR REPLACE VIEW public.kesef_saldo AS
SELECT
  usuario_id,
  COALESCE(SUM(CASE WHEN tipo = 'credito' THEN quantidade ELSE 0 END), 0) AS total_ganho,
  COALESCE(SUM(CASE WHEN tipo = 'debito' THEN quantidade ELSE 0 END), 0) AS total_gasto,
  COALESCE(SUM(CASE WHEN tipo = 'credito' THEN quantidade ELSE -quantidade END), 0) AS saldo_atual
FROM public.kesef_ledger
GROUP BY usuario_id;

-- ============================================================
-- RPCs (substituem/atualizam as criadas no S5)
-- ============================================================

-- RPC: creditar kesef (cria entrada no ledger + atualiza pontos_comunhao)
CREATE OR REPLACE FUNCTION public.creditar_kesef(
  p_usuario_id UUID,
  p_quantidade INTEGER,
  p_motivo TEXT,
  p_referencia_id UUID DEFAULT NULL,
  p_referencia_tipo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_novo_saldo INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Inserir no ledger
  INSERT INTO public.kesef_ledger (usuario_id, tipo, quantidade, motivo, referencia_id, referencia_tipo)
  VALUES (p_usuario_id, 'credito', p_quantidade, p_motivo, p_referencia_id, p_referencia_tipo)
  RETURNING id INTO v_ledger_id;

  -- Atualizar saldo do usuário
  UPDATE public.usuarios
  SET pontos_comunhao = pontos_comunhao + p_quantidade
  WHERE id = p_usuario_id
  RETURNING pontos_comunhao INTO v_novo_saldo;

  RETURN jsonb_build_object(
    'ledger_id', v_ledger_id,
    'novo_saldo', v_novo_saldo,
    'creditado', p_quantidade
  );
END;
$$;

-- RPC: debitar kesef (atualizada com ledger)
CREATE OR REPLACE FUNCTION public.debitar_kesef(
  p_usuario_id UUID,
  p_valor INTEGER,
  p_motivo TEXT DEFAULT 'Resgate na loja',
  p_referencia_id UUID DEFAULT NULL,
  p_referencia_tipo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_atual INTEGER;
  v_novo_saldo INTEGER;
  v_ledger_id UUID;
BEGIN
  SELECT pontos_comunhao INTO v_saldo_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'usuario_nao_encontrado'
      USING HINT = 'Usuário não encontrado';
  END IF;

  IF v_saldo_atual < p_valor THEN
    RAISE EXCEPTION 'saldo_insuficiente'
      USING HINT = 'Saldo insuficiente';
  END IF;

  -- Inserir no ledger
  INSERT INTO public.kesef_ledger (usuario_id, tipo, quantidade, motivo, referencia_id, referencia_tipo)
  VALUES (p_usuario_id, 'debito', p_valor, p_motivo, p_referencia_id, p_referencia_tipo)
  RETURNING id INTO v_ledger_id;

  -- Atualizar saldo do usuário
  UPDATE public.usuarios
  SET pontos_comunhao = pontos_comunhao - p_valor
  WHERE id = p_usuario_id
  RETURNING pontos_comunhao INTO v_novo_saldo;

  RETURN jsonb_build_object(
    'ledger_id', v_ledger_id,
    'novo_saldo', v_novo_saldo,
    'debitado', p_valor
  );
END;
$$;
