-- Integridade do Círculo de Oração: uma formação só pode ser persistida se
-- todos, e somente, os membros marcados pelo administrador estiverem nela.
-- Isso impede exclusão silenciosa, relações com pessoas não selecionadas e
-- gravações parciais quando a seleção muda durante o sorteio.

create or replace function public.admin_aplicar_sorteio_circulo(
  p_relacoes jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_actor uuid := public.usuario_atual_id();
  v_execucao_id uuid;
begin
  if not public.admin_tem_permissao('prayer.draw') then
    raise exception 'PRAYER_DRAW_REQUIRED';
  end if;
  if coalesce(jsonb_typeof(p_relacoes) <> 'array', true)
    or jsonb_array_length(p_relacoes) < 2
    or jsonb_array_length(p_relacoes) > 500 then
    raise exception 'SORTEIO_RELACOES_INVALIDAS';
  end if;

  with payload as (
    select
      (item->>'id')::uuid as id,
      (item->>'orando_por_id')::uuid as orando_por_id,
      (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
    from jsonb_array_elements(p_relacoes) as item
  )
  select count(*)::integer into v_count from payload;

  if v_count <> jsonb_array_length(p_relacoes)
    or exists (
      with payload as (
        select (item->>'id')::uuid as id, (item->>'orando_por_id')::uuid as orando_por_id,
          (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
        from jsonb_array_elements(p_relacoes) as item
      )
      select 1 from payload
      group by id having count(*) > 1
      union all
      select 1 from payload where id is null or orando_por_id is null or sendo_orado_por_id is null
        or id = orando_por_id or id = sendo_orado_por_id
    ) then
    raise exception 'SORTEIO_RELACOES_INVALIDAS';
  end if;

  -- A relação recebida precisa formar uma permutação completa do conjunto de
  -- selecionados, tanto para quem ora quanto para quem recebe oração.
  if exists (
    with payload as (
      select
        (item->>'id')::uuid as id,
        (item->>'orando_por_id')::uuid as orando_por_id,
        (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
      from jsonb_array_elements(p_relacoes) as item
    ), selecionados as (
      select u.id from public.usuarios u where u.participa_sorteio = true
    ), divergencias as (
      (select id from payload except select id from selecionados)
      union all
      (select id from selecionados except select id from payload)
      union all
      (select orando_por_id from payload except select id from selecionados)
      union all
      (select sendo_orado_por_id from payload except select id from selecionados)
      union all
      (select orando_por_id from payload group by orando_por_id having count(*) <> 1)
      union all
      (select sendo_orado_por_id from payload group by sendo_orado_por_id having count(*) <> 1)
    )
    select 1 from divergencias
  ) then
    raise exception 'SORTEIO_SELECAO_DESATUALIZADA';
  end if;

  insert into public.sorteio_circulo_execucoes (executado_por_id, participantes_total)
  values (v_actor, v_count)
  returning id into v_execucao_id;

  with payload as (
    select
      (item->>'id')::uuid as id,
      (item->>'orando_por_id')::uuid as orando_por_id,
      (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
    from jsonb_array_elements(p_relacoes) as item
  )
  insert into public.sorteio_circulo_relacoes (
    execucao_id, participante_id, orando_por_id, sendo_orado_por_id
  )
  select v_execucao_id, id, orando_por_id, sendo_orado_por_id from payload;

  with payload as (
    select
      (item->>'id')::uuid as id,
      (item->>'orando_por_id')::uuid as orando_por_id,
      (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
    from jsonb_array_elements(p_relacoes) as item
  ), updated as (
    update public.usuarios u
    set orando_por_id = payload.orando_por_id,
        sendo_orado_por_id = payload.sendo_orado_por_id
    from payload
    where u.id = payload.id
    returning 1
  )
  select count(*)::integer into v_count from updated;

  if v_count <> jsonb_array_length(p_relacoes) then
    raise exception 'SORTEIO_PARTICIPANTE_INVALIDO';
  end if;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_actor, 'prayer.draw', 'prayer.circle.draw', 'sorteio_circulo', v_execucao_id::text,
    jsonb_build_object('participantes', v_count), 'Formação do círculo de oração'
  );

  return v_count;
end;
$$;

revoke all on function public.admin_aplicar_sorteio_circulo(jsonb) from public, anon;
grant execute on function public.admin_aplicar_sorteio_circulo(jsonb) to authenticated;

comment on function public.admin_aplicar_sorteio_circulo(jsonb) is
  'Persiste o círculo somente quando suas relações correspondem exatamente ao conjunto selecionado pelo administrador.';
