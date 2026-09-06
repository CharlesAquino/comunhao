-- Ajusta o fluxo "Levantar a mão" para funcionar como um pedido de companhia:
-- a pessoa fica aguardando, toda a mocidade é avisada e a sala compartilhada
-- só começa quando a primeira pessoa aceita.

ALTER TABLE public.sessoes_oracao_grupo
  ADD COLUMN IF NOT EXISTS aceito_por_id uuid REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS aceito_em timestamptz;

COMMENT ON COLUMN public.sessoes_oracao_grupo.aceito_por_id IS
  'Primeiro membro que aceitou orar com o anfitriao da mao levantada.';

COMMENT ON COLUMN public.sessoes_oracao_grupo.aceito_em IS
  'Momento em que o pedido de companhia para oracao foi aceito.';

-- Preserva sessões antigas que já tinham outra pessoa conectada.
WITH aceite_existente AS (
  SELECT DISTINCT ON (p.sessao_id)
    p.sessao_id,
    p.usuario_id,
    p.entrou_em
  FROM public.sessoes_oracao_grupo_participantes p
  JOIN public.sessoes_oracao_grupo s ON s.id = p.sessao_id
  WHERE p.usuario_id <> s.anfitriao_id
    AND p.saiu_em IS NULL
    AND s.status = 'aberta'
  ORDER BY p.sessao_id, p.entrou_em
)
UPDATE public.sessoes_oracao_grupo s
SET
  aceito_por_id = aceite.usuario_id,
  aceito_em = aceite.entrou_em
FROM aceite_existente aceite
WHERE s.id = aceite.sessao_id
  AND s.aceito_por_id IS NULL;

-- Sessões que tinham somente o anfitrião passam a representar apenas espera.
DELETE FROM public.sessoes_oracao_grupo_participantes participante
USING public.sessoes_oracao_grupo sessao
WHERE participante.sessao_id = sessao.id
  AND participante.usuario_id = sessao.anfitriao_id
  AND sessao.status = 'aberta'
  AND sessao.aceito_por_id IS NULL;

CREATE INDEX IF NOT EXISTS sessoes_oracao_grupo_aguardando_idx
  ON public.sessoes_oracao_grupo(criado_em DESC)
  WHERE status = 'aberta' AND aceito_por_id IS NULL;

CREATE OR REPLACE FUNCTION public.abrir_sessao_grupo()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_sessao public.sessoes_oracao_grupo%ROWTYPE;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO';
  END IF;

  SELECT * INTO v_sessao
  FROM public.sessoes_oracao_grupo s
  WHERE s.anfitriao_id = v_user_id
    AND s.status = 'aberta'
  ORDER BY s.criado_em DESC
  LIMIT 1;

  IF v_sessao.id IS NULL THEN
    INSERT INTO public.sessoes_oracao_grupo (anfitriao_id, status)
    VALUES (v_user_id, 'aberta')
    RETURNING * INTO v_sessao;
  END IF;

  RETURN json_build_object(
    'id', v_sessao.id,
    'status', v_sessao.status,
    'anfitriao_id', v_sessao.anfitriao_id,
    'aceito_por_id', v_sessao.aceito_por_id,
    'retomada', v_sessao.criado_em IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.entrar_sessao_grupo(p_sessao_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_sessao public.sessoes_oracao_grupo%ROWTYPE;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO';
  END IF;

  SELECT * INTO v_sessao
  FROM public.sessoes_oracao_grupo s
  WHERE s.id = p_sessao_id
  FOR UPDATE;

  IF v_sessao.id IS NULL THEN
    RAISE EXCEPTION 'SESSAO_NAO_ENCONTRADA';
  END IF;

  IF v_sessao.status = 'encerrada' THEN
    RAISE EXCEPTION 'SESSAO_ENCERRADA';
  END IF;

  IF v_user_id = v_sessao.anfitriao_id THEN
    IF v_sessao.aceito_por_id IS NULL THEN
      RAISE EXCEPTION 'AGUARDANDO_PARTICIPANTE';
    END IF;
  ELSIF v_sessao.aceito_por_id IS NULL THEN
    UPDATE public.sessoes_oracao_grupo
    SET
      aceito_por_id = v_user_id,
      aceito_em = now()
    WHERE id = p_sessao_id
    RETURNING * INTO v_sessao;
  ELSIF v_sessao.aceito_por_id <> v_user_id THEN
    RAISE EXCEPTION 'SESSAO_JA_ACEITA';
  END IF;

  INSERT INTO public.sessoes_oracao_grupo_participantes (sessao_id, usuario_id)
  VALUES
    (p_sessao_id, v_sessao.anfitriao_id),
    (p_sessao_id, v_sessao.aceito_por_id)
  ON CONFLICT (sessao_id, usuario_id)
  DO UPDATE SET
    saiu_em = NULL,
    entrou_em = now();

  RETURN json_build_object(
    'id', v_sessao.id,
    'status', v_sessao.status,
    'anfitriao_id', v_sessao.anfitriao_id,
    'aceito_por_id', v_sessao.aceito_por_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_sessoes_grupo_abertas()
RETURNS TABLE(
  sessao_id uuid,
  anfitriao_id uuid,
  anfitriao_nome text,
  anfitriao_foto text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sessao.id,
    sessao.anfitriao_id,
    usuario.nome::text,
    usuario.foto_url::text
  FROM public.sessoes_oracao_grupo sessao
  JOIN public.usuarios usuario ON usuario.id = sessao.anfitriao_id
  WHERE sessao.status = 'aberta'
    AND sessao.aceito_por_id IS NULL
    AND sessao.anfitriao_id <> public.usuario_atual_id()
  ORDER BY sessao.criado_em DESC;
END;
$$;

-- Garante que o alerta de mão levantada chegue a toda a mocidade e abra uma
-- tela de resposta, sem colocar ninguém automaticamente dentro da oração.
CREATE OR REPLACE FUNCTION public.notificar_mao_levantada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_anfitriao_nome text;
BEGIN
  IF NEW.status <> 'aberta' OR NEW.aceito_por_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.nome INTO v_anfitriao_nome
  FROM public.usuarios u
  WHERE u.id = NEW.anfitriao_id;

  INSERT INTO public.app_notificacoes (
    usuario_id, tipo, titulo, corpo, url, dados, evento_chave
  )
  SELECT
    u.id,
    'mao_levantada',
    'Mão levantada para oração',
    coalesce(v_anfitriao_nome, 'Alguém') || ' quer companhia para orar agora.',
    '/?orar_com=' || NEW.id::text,
    jsonb_build_object(
      'sessao_id', NEW.id,
      'anfitriao_id', NEW.anfitriao_id,
      'tipo', 'mao_levantada'
    ),
    'mao_levantada:' || NEW.id::text
  FROM public.usuarios u
  WHERE u.id <> NEW.anfitriao_id
    AND u.auth_user_id IS NOT NULL
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

-- Quando alguém aceita ou o anfitrião abaixa a mão, os demais alertas deixam
-- de aparecer como pendentes no centro de notificações.
CREATE OR REPLACE FUNCTION public.atualizar_alertas_mao_levantada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (OLD.aceito_por_id IS NULL AND NEW.aceito_por_id IS NOT NULL)
     OR (OLD.status <> 'encerrada' AND NEW.status = 'encerrada') THEN
    UPDATE public.app_notificacoes notificacao
    SET lida = true
    WHERE notificacao.tipo = 'mao_levantada'
      AND notificacao.dados->>'sessao_id' = NEW.id::text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessao_grupo_atualizar_alertas ON public.sessoes_oracao_grupo;
CREATE TRIGGER sessao_grupo_atualizar_alertas
AFTER UPDATE OF aceito_por_id, status ON public.sessoes_oracao_grupo
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_alertas_mao_levantada();

REVOKE ALL ON FUNCTION public.abrir_sessao_grupo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abrir_sessao_grupo() TO authenticated;

REVOKE ALL ON FUNCTION public.entrar_sessao_grupo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar_sessao_grupo(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.listar_sessoes_grupo_abertas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_sessoes_grupo_abertas() TO authenticated;

REVOKE ALL ON FUNCTION public.notificar_mao_levantada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atualizar_alertas_mao_levantada() FROM PUBLIC;
