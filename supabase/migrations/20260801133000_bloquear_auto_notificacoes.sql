-- Impede que uma ação gere atividade para o próprio autor.
-- Aplicar somente em local/staging durante o desenvolvimento da 1.4.

CREATE OR REPLACE FUNCTION public.notificar_aceite_mao_levantada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_anfitriao_nome text;
  v_aceitante_nome text;
BEGIN
  IF OLD.aceito_por_id IS NOT NULL OR NEW.aceito_por_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Proteção de domínio: ninguém deve ser destinatário da própria ação.
  IF NEW.anfitriao_id = NEW.aceito_por_id THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_anfitriao_nome
  FROM public.usuarios
  WHERE id = NEW.anfitriao_id;

  SELECT nome INTO v_aceitante_nome
  FROM public.usuarios
  WHERE id = NEW.aceito_por_id;

  INSERT INTO public.app_notificacoes (
    usuario_id, tipo, titulo, corpo, url, dados, evento_chave
  )
  VALUES
  (
    NEW.anfitriao_id,
    'mao_aceita',
    'Aceitou orar com você',
    coalesce(v_aceitante_nome, 'Alguém') || ' aceitou orar com você.',
    '/',
    jsonb_build_object(
      'sessao_id', NEW.id,
      'parceiro_id', NEW.aceito_por_id,
      'parceiro_nome', v_aceitante_nome,
      'tipo', 'mao_aceita'
    ),
    'mao_aceita:' || NEW.id::text || ':' || NEW.anfitriao_id::text
  ),
  (
    NEW.aceito_por_id,
    'orando_com',
    'Orando com você',
    'Você aceitou orar com ' || coalesce(v_anfitriao_nome, 'essa pessoa') || '.',
    '/',
    jsonb_build_object(
      'sessao_id', NEW.id,
      'parceiro_id', NEW.anfitriao_id,
      'parceiro_nome', v_anfitriao_nome,
      'tipo', 'orando_com'
    ),
    'orando_com:' || NEW.id::text || ':' || NEW.aceito_por_id::text
  )
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_aceite_mao_levantada() FROM PUBLIC;
