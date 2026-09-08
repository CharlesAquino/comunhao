begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
do $$ begin
  if exists (select 1 from public.ebd_source_days) then
    raise exception 'Identidade sem permissão leu biblioteca privada';
  end if;
  begin
    insert into public.ebd_source_days(lesson_id,lesson_key,weekday,revision,payload)
    values ('rls-test-no-lesson','test','monday',1,
      '{"schemaVersion":"comunhao.ebd.source.v1","lessonKey":"test","weekday":"monday","revision":1,"day":{"blocks":[{},{},{},{},{},{},{},{},{},{}]}}');
    raise exception 'Identidade sem permissão gravou biblioteca privada';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'RLS read/insert denied; transaction rolled back' as result;
