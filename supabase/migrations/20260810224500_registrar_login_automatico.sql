-- Uma sessão restaurada automaticamente também conta como login recente.
-- A chamada ocorre uma única vez ao entrar na área autenticada do app.
create or replace function public.registrar_acesso_autenticado()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
begin
  if auth.uid() is null or v_usuario_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  update public.usuarios
  set last_login = now()
  where id = v_usuario_id;
end;
$$;

revoke all on function public.registrar_acesso_autenticado() from public, anon;
grant execute on function public.registrar_acesso_autenticado() to authenticated;
