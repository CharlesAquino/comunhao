begin;

do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.creditar_kesef(uuid,text,integer,uuid)'::regprocedure);
  if v_def not like '%p_tipo = ''oracao'' and p_referencia_id is not null%' then
    raise exception 'creditar_kesef não contém verificação de idempotência para oração';
  end if;

  v_def := pg_get_functiondef('public.creditar_xp(uuid,integer,text)'::regprocedure);
  if v_def not like '%kesef_ledger%tipo = ''oracao''%' then
    raise exception 'creditar_xp não contém verificação de idempotência para oração';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - creditar_kesef e creditar_xp protegem contra duplicidade em orações';
rollback;
