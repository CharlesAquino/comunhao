-- ============================================================
-- MIGRAÇÃO SEGURANÇA v2 (Sprint S0)
-- ============================================================
-- 1. Adicionar auth_user_id e papel à tabela usuarios
-- 2. Reescrever RLS policies com auth.uid()
-- 3. Funções RPC seguras para criar/vincular perfil

-- ============================================================
-- STEP 1: Adicionar colunas à tabela usuarios
-- ============================================================
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS papel TEXT NOT NULL DEFAULT 'membro' CHECK (papel IN ('membro', 'admin'));

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON public.usuarios(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON public.usuarios(telefone);

-- ============================================================
-- STEP 2: Remover políticas antigas (permissivas)
-- ============================================================

-- Tabela: usuarios
DROP POLICY IF EXISTS "Usuários podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem inserir" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem deletar" ON public.usuarios;

-- Tabela: pedidos
DROP POLICY IF EXISTS "Pedidos visíveis para todos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios pedidos" ON public.pedidos;

-- Tabela: intercessoes
DROP POLICY IF EXISTS "Intercessões visíveis para todos" ON public.intercessoes;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir intercessões" ON public.intercessoes;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias intercessões" ON public.intercessoes;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias intercessões" ON public.intercessoes;

-- Tabela: historico_oracoes
DROP POLICY IF EXISTS "Histórico visível para todos" ON public.historico_oracoes;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir histórico" ON public.historico_oracoes;

-- ============================================================
-- STEP 3: Novas políticas RLS (restritivas com auth.uid())
-- ============================================================

-- ---- usuarios ----
CREATE POLICY "usuarios_select_todos" ON public.usuarios
  FOR SELECT USING (true);

CREATE POLICY "usuarios_insert_proprio" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_update_proprio_ou_admin" ON public.usuarios
  FOR UPDATE USING (
    auth.uid() = id OR
    (SELECT papel FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "usuarios_delete_apenas_admin" ON public.usuarios
  FOR DELETE USING (
    (SELECT papel FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- ---- pedidos ----
CREATE POLICY "pedidos_select_todos" ON public.pedidos
  FOR SELECT USING (true);

CREATE POLICY "pedidos_insert_autenticado" ON public.pedidos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "pedidos_update_autor_ou_admin" ON public.pedidos
  FOR UPDATE USING (
    autor_id = auth.uid() OR
    (SELECT papel FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "pedidos_delete_autor_ou_admin" ON public.pedidos
  FOR DELETE USING (
    autor_id = auth.uid() OR
    (SELECT papel FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- ---- intercessoes ----
CREATE POLICY "intercessoes_select_todos" ON public.intercessoes
  FOR SELECT USING (true);

CREATE POLICY "intercessoes_insert_autenticado" ON public.intercessoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "intercessoes_update_proprio_ou_admin" ON public.intercessoes
  FOR UPDATE USING (
    usuario_id = auth.uid() OR
    (SELECT papel FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "intercessoes_delete_proprio_ou_admin" ON public.intercessoes
  FOR DELETE USING (
    usuario_id = auth.uid() OR
    (SELECT papel FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- ---- historico_oracoes ----
CREATE POLICY "historico_select_todos" ON public.historico_oracoes
  FOR SELECT USING (true);

CREATE POLICY "historico_insert_autenticado" ON public.historico_oracoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- STEP 4: Funções RPC seguras (SECURITY DEFINER)
-- ============================================================

-- Criar perfil de usuário vinculado ao Auth
CREATE OR REPLACE FUNCTION public.criar_perfil_usuario(
  p_nome TEXT,
  p_telefone TEXT,
  p_device_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.usuarios (id, auth_user_id, nome, telefone, device_id, status_anel, papel)
  VALUES (v_user_id, v_user_id, p_nome, p_telefone, p_device_id, 'offline', 'membro')
  ON CONFLICT (id) DO UPDATE SET
    nome          = EXCLUDED.nome,
    telefone      = EXCLUDED.telefone,
    device_id     = COALESCE(EXCLUDED.device_id, public.usuarios.device_id),
    auth_user_id  = v_user_id;

  RETURN v_user_id;
END;
$$;

-- Vincular usuário existente (pré-migração) ao Auth
CREATE OR REPLACE FUNCTION public.vincular_usuario_auth(p_telefone TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_auth_uid UUID;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_user_id FROM public.usuarios WHERE telefone = p_telefone LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Telefone não encontrado';
  END IF;

  UPDATE public.usuarios SET auth_user_id = v_auth_uid, id = v_auth_uid
  WHERE id = v_user_id;

  RETURN v_auth_uid;
END;
$$;

-- ============================================================
-- STEP 5: Configurar admin inicial (executar manualmente no SQL Editor)
-- ============================================================
-- Para definir um admin, execute após a migração:
-- UPDATE public.usuarios SET papel = 'admin' WHERE telefone = '27999998888';
-- (substitua pelo número do professor responsável)

-- ============================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO:
-- ============================================================
-- 1. \dt public.*  (verificar se tabelas existem)
-- 2. SELECT * FROM pg_policies WHERE tablename = 'usuarios';
-- 3. Tentar SELECT/INSERT/UPDATE/DELETE de outro auth.uid() deve falhar

-- ============================================================
-- SPRINT S3: Módulo EBD (lições + quiz)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.licoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  referencia_biblica TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.licoes_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licao_id UUID NOT NULL REFERENCES public.licoes(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  alternativas JSONB NOT NULL DEFAULT '[]'::jsonb,
  resposta_correta INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.licoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licoes_perguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver lições"
  ON public.licoes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos podem ver perguntas"
  ON public.licoes_perguntas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Apenas admin pode gerenciar lições"
  ON public.licoes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND papel = 'admin'
  ));

CREATE POLICY "Apenas admin pode gerenciar perguntas"
  ON public.licoes_perguntas FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND papel = 'admin'
  ));

-- ============================================================
-- SPRINT S5: Lojinha de Resgate
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loja_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  preco_kesef INTEGER NOT NULL CHECK (preco_kesef > 0),
  estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  imagem_url TEXT DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'geral',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loja_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.loja_itens(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado','entregue')),
  kesef_debitado INTEGER NOT NULL,
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ,
  processado_por_admin_id UUID REFERENCES public.usuarios(id),
  observacoes TEXT DEFAULT ''
);

ALTER TABLE public.loja_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loja_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos veem itens ativos"
  ON public.loja_itens FOR SELECT
  USING (ativo = true OR EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin'
  ));

CREATE POLICY "Admin gerencia itens"
  ON public.loja_itens FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin'
  ));

CREATE POLICY "Usuário vê seus pedidos"
  ON public.loja_pedidos FOR SELECT
  USING (usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin'
  ));

CREATE POLICY "Usuário cria pedidos"
  ON public.loja_pedidos FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Admin processa pedidos"
  ON public.loja_pedidos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin'
  ));

-- RPC: debitar kesef do usuário
CREATE OR REPLACE FUNCTION public.debitar_kesef(p_usuario_id UUID, p_valor INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.usuarios
  SET pontos_comunhao = pontos_comunhao - p_valor
  WHERE id = p_usuario_id AND pontos_comunhao >= p_valor;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'saldo_insuficiente'
      USING HINT = 'Usuário não tem saldo suficiente';
  END IF;

  RETURN true;
END;
$$;

-- RPC: decrementar estoque de item
CREATE OR REPLACE FUNCTION public.decrementar_estoque(p_item_id UUID, p_quantidade INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.loja_itens
  SET estoque = estoque - p_quantidade
  WHERE id = p_item_id AND estoque >= p_quantidade;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'estoque_insuficiente'
      USING HINT = 'Estoque insuficiente para completar a operação';
  END IF;

  RETURN true;
END;
$$;
