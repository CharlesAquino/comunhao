do $$
begin
  if to_regprocedure('public.ebd_antecipar_semana_publicada(text,integer,text,text)') is null then
    raise exception 'ebd_antecipar_semana_publicada ausente';
  end if;

  if has_function_privilege('anon', 'public.ebd_antecipar_semana_publicada(text,integer,text,text)', 'EXECUTE') then
    raise exception 'anon não pode antecipar semana EBD';
  end if;

  if not has_function_privilege('authenticated', 'public.ebd_antecipar_semana_publicada(text,integer,text,text)', 'EXECUTE') then
    raise exception 'authenticated precisa executar a RPC protegida por permissão interna';
  end if;
end;
$$;
