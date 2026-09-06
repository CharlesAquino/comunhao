-- Rollback de emergência da Fase 1 do Protocolo Sentinela.
-- NÃO executar por conveniência: ele reabre operações diretas que foram bloqueadas.
-- Use somente em ambiente controlado, após backup e validação do motivo da regressão.

begin;

-- Restaura temporariamente o comportamento editorial legado.
grant insert, update, delete on table public.ebd_editorial_lessons to authenticated;
grant execute on function public.publicar_ebd_editorial(text) to authenticated;

drop trigger if exists trg_ebd_editorial_guard_write on public.ebd_editorial_lessons;
drop function if exists public.ebd_editorial_guard_write();
drop function if exists public.ebd_enviar_para_revisao(text, text, text);
drop function if exists public.ebd_retornar_para_rascunho(text, text, text);
drop function if exists public.ebd_arquivar_editorial(text, text, text);
drop function if exists public.publicar_ebd_editorial_seguro(text, integer, text, text);
drop function if exists public.ebd_validar_documento(jsonb);

drop function if exists public.security_cleanup_operational_state();
drop function if exists public.security_set_circuit_breaker(text, boolean, text, timestamptz);
drop function if exists public.security_is_circuit_open(text);

drop trigger if exists trg_security_events_immutable on public.security_events;
drop function if exists public.security_events_immutable();
drop function if exists public.security_record_event(uuid, uuid, text, text, text, text, integer, text, jsonb, text);

drop function if exists public.security_fail_idempotent_operation(uuid, text, text, text);
drop function if exists public.security_complete_idempotent_operation(uuid, text, text, jsonb);
drop function if exists public.security_begin_idempotent_operation(uuid, text, text, text, integer);
drop function if exists public.security_consume_rate_limit(text, text);

drop table if exists public.security_events;
drop table if exists public.security_circuit_breakers;
drop table if exists public.security_idempotency_keys;
drop table if exists public.security_rate_limit_counters;
drop table if exists public.security_rate_limit_policies;

commit;
