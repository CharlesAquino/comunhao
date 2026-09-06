do $$
begin
  if (
    select count(*) from public.loja_itens
    where id in (
      'aa100001-2026-4802-9000-000000000001',
      'aa100001-2026-4802-9000-000000000002',
      'aa100001-2026-4802-9000-000000000003'
    )
  ) <> 3 then
    raise exception 'catalogo inicial do Tesouro incompleto';
  end if;
end;
$$;

select 'tesouro_catalogo_inicial_ok' as result;
