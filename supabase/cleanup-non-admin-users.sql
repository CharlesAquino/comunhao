begin;

-- Perfil que deve permanecer como único usuário administrativo.
do $$
declare
  keep_id uuid := '8ec5138e-4a0e-41c7-8235-ac50d8e3ec01';
begin
  -- Remove referências que possuem RESTRICT/NO ACTION.
  update public.usuarios
    set orando_por_id = null,
        sendo_orado_por_id = null,
        indicado_por_id = null
  where id <> keep_id;

  delete from public.historico_oracoes
    where usuario_1_id <> keep_id or usuario_2_id <> keep_id;

  delete from public.loja_pedidos
    where usuario_id <> keep_id or processado_por_admin_id <> keep_id;

  delete from public.salas_oracao_participantes
    where usuario_id <> keep_id;

  delete from public.salas_oracao
    where host_usuario_id <> keep_id;

  delete from public.sessoes_oracao_grupo_participantes
    where usuario_id <> keep_id;

  delete from public.sessoes_oracao_grupo
    where anfitriao_id <> keep_id;

  delete from public.usuarios where id <> keep_id;

  update public.usuarios set papel = 'admin' where id = keep_id;

  -- Remove contas Auth que não correspondem ao administrador preservado.
  delete from auth.users
    where id <> (select auth_user_id from public.usuarios where id = keep_id);
end $$;

commit;
