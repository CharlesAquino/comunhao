-- Verificação estrutural da proteção contra auto-notificação.

do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.notificar_aceite_mao_levantada()'::regprocedure)
    into v_def;

  if v_def is null or v_def not ilike '%NEW.anfitriao_id = NEW.aceito_por_id%' then
    raise exception 'proteção contra auto-notificação ausente';
  end if;
end;
$$;

select 'auto_notification_guard_present' as result;
