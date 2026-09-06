-- A seleção explícita do administrador é a única regra de elegibilidade do
-- círculo de oração. Critérios de atividade, presença ou autenticação não
-- podem excluir silenciosamente uma pessoa já marcada para o sorteio.

create or replace function public.admin_listar_elegiveis_sorteio(
  p_last_login_min timestamptz
)
returns table (id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('prayer.draw') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  -- Mantemos o parâmetro por compatibilidade com clientes já publicados.
  -- Ele não participa mais da decisão de elegibilidade.
  return query
  select u.id
  from public.usuarios u
  where u.participa_sorteio = true
  order by u.id;
end;
$$;

revoke all on function public.admin_listar_elegiveis_sorteio(timestamptz) from public, anon;
grant execute on function public.admin_listar_elegiveis_sorteio(timestamptz) to authenticated;

comment on function public.admin_listar_elegiveis_sorteio(timestamptz) is
  'Retorna exclusivamente as pessoas selecionadas pelo administrador para o próximo sorteio. O parâmetro histórico de acesso é ignorado por compatibilidade.';
