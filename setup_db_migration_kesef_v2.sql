-- ============================================================
-- Kesef Ledger v2 — Cap diário + tipos semânticos
-- ============================================================
-- Substitui as funções criadas em setup_db_migration_s4.sql
-- Novo paradigma: ledger é a ÚNICA fonte de verdade do saldo.
-- NÃO atualiza pontos_comunhao em usuarios.
-- O cap diário (60/dia) é enforced dentro da função security definer.

-- 1. Ajustar constraints da tabela existente
ALTER TABLE public.kesef_ledger
  DROP CONSTRAINT IF EXISTS kesef_ledger_tipo_check;

ALTER TABLE public.kesef_ledger
  ADD CONSTRAINT kesef_ledger_tipo_check
  CHECK (tipo IN ('oracao','licao','quiz_acerto','streak_bonus_7','streak_bonus_30','indicacao','resgate','estorno'));

-- Corrigir constraint de quantidade: permite negativos (débitos) mas bloqueia zero
ALTER TABLE public.kesef_ledger
  DROP CONSTRAINT IF EXISTS kesef_ledger_quantidade_check;

ALTER TABLE public.kesef_ledger
  ADD CONSTRAINT kesef_ledger_quantidade_check
  CHECK (quantidade <> 0);

-- Remover colunas que não existem no novo schema (se existirem do S4)
ALTER TABLE public.kesef_ledger DROP COLUMN IF EXISTS motivo;
ALTER TABLE public.kesef_ledger DROP COLUMN IF EXISTS referencia_tipo;

-- 2. View de saldo (soma simples)
DROP VIEW IF EXISTS public.kesef_saldo;

CREATE OR REPLACE VIEW public.kesef_saldo AS
SELECT
  usuario_id,
  COALESCE(SUM(quantidade), 0)::integer AS saldo
FROM public.kesef_ledger
GROUP BY usuario_id;

-- 3. Função de crédito com cap diário (security definer)
DROP FUNCTION IF EXISTS public.creditar_kesef;

CREATE OR REPLACE FUNCTION public.creditar_kesef(
  p_usuario_id UUID,
  p_tipo TEXT,
  p_quantidade INTEGER,
  p_referencia_id UUID DEFAULT NULL
)
RETURNS public.kesef_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creditado_hoje INTEGER;
  v_cap CONSTANT INTEGER := 60;
  v_final INTEGER := p_quantidade;
  v_registro public.kesef_ledger;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA';
  END IF;

  SELECT COALESCE(SUM(quantidade), 0) INTO v_creditado_hoje
  FROM public.kesef_ledger
  WHERE usuario_id = p_usuario_id
    AND tipo != 'resgate'
    AND criado_em >= date_trunc('day', now());

  IF v_creditado_hoje >= v_cap THEN
    RAISE EXCEPTION 'CAP_DIARIO_ATINGIDO';
  END IF;

  IF v_creditado_hoje + p_quantidade > v_cap THEN
    v_final := v_cap - v_creditado_hoje;
  END IF;

  INSERT INTO public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  VALUES (p_usuario_id, p_tipo, v_final, p_referencia_id)
  RETURNING * INTO v_registro;

  RETURN v_registro;
END;
$$;

-- 4. Função de débito (resgate na loja)
DROP FUNCTION IF EXISTS public.debitar_kesef;

CREATE OR REPLACE FUNCTION public.debitar_kesef(
  p_usuario_id UUID,
  p_quantidade INTEGER,
  p_referencia_id UUID DEFAULT NULL
)
RETURNS public.kesef_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo INTEGER;
  v_registro public.kesef_ledger;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA';
  END IF;

  SELECT COALESCE(saldo, 0) INTO v_saldo
  FROM public.kesef_saldo
  WHERE usuario_id = p_usuario_id;

  IF v_saldo < p_quantidade THEN
    RAISE EXCEPTION 'SALDO_INSUFICIENTE';
  END IF;

  INSERT INTO public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  VALUES (p_usuario_id, 'resgate', -p_quantidade, p_referencia_id)
  RETURNING * INTO v_registro;

  RETURN v_registro;
END;
$$;

-- 5. Função de estorno
CREATE OR REPLACE FUNCTION public.estornar_kesef(
  p_usuario_id UUID,
  p_quantidade INTEGER,
  p_referencia_id UUID DEFAULT NULL
)
RETURNS public.kesef_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registro public.kesef_ledger;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA';
  END IF;

  INSERT INTO public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  VALUES (p_usuario_id, 'estorno', p_quantidade, p_referencia_id)
  RETURNING * INTO v_registro;

  RETURN v_registro;
END;
$$;

-- 6. RLS: cada um vê seu próprio ledger
DROP POLICY IF EXISTS "Usuário vê seu ledger" ON public.kesef_ledger;
DROP POLICY IF EXISTS "Inserção via RPC apenas" ON public.kesef_ledger;

CREATE POLICY "usuario_le_proprio_ledger"
  ON public.kesef_ledger FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "admin_le_todo_ledger"
  ON public.kesef_ledger FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin'
  ));
