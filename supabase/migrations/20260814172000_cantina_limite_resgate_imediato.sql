-- Garante no banco que o limite por membro também vale no resgate imediato.
-- A validação ocorre na transição para concluído, quando o beneficiário já é conhecido.

create or replace function public.cantina_validar_limite_resgate_imediato()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_limite integer;
  v_quantidade_anterior integer;
begin
  if old.status <> 'aguardando_confirmacao' or new.status <> 'concluido' then
    return new;
  end if;

  if new.beneficiario_id is null then
    raise exception 'BENEFICIARIO_OBRIGATORIO';
  end if;

  for v_item in
    select item.anuncio_id, sum(item.quantidade)::integer as quantidade
    from public.cantina_resgate_itens item
    where item.resgate_id = new.id
    group by item.anuncio_id
  loop
    select anuncio.limite_por_membro
      into v_limite
    from public.cantina_anuncios anuncio
    where anuncio.id = v_item.anuncio_id;

    select
      coalesce((
        select sum(reserva.quantidade)
        from public.cantina_reservas reserva
        where reserva.usuario_id = new.beneficiario_id
          and reserva.anuncio_id = v_item.anuncio_id
          and reserva.status in ('reservada', 'retirada', 'nao_compareceu', 'doada')
      ), 0)
      + coalesce((
        select sum(item_anterior.quantidade)
        from public.cantina_resgates resgate_anterior
        join public.cantina_resgate_itens item_anterior
          on item_anterior.resgate_id = resgate_anterior.id
        where resgate_anterior.beneficiario_id = new.beneficiario_id
          and resgate_anterior.status = 'concluido'
          and resgate_anterior.id <> new.id
          and item_anterior.anuncio_id = v_item.anuncio_id
      ), 0)
      into v_quantidade_anterior;

    if v_quantidade_anterior + v_item.quantidade > v_limite then
      raise exception 'LIMITE_POR_MEMBRO_ATINGIDO';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists cantina_validar_limite_resgate_imediato_trigger
  on public.cantina_resgates;
create trigger cantina_validar_limite_resgate_imediato_trigger
before update of status, beneficiario_id on public.cantina_resgates
for each row execute function public.cantina_validar_limite_resgate_imediato();

revoke all on function public.cantina_validar_limite_resgate_imediato()
  from public, anon, authenticated;
