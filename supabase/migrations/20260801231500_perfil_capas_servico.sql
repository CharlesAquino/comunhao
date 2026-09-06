-- Capas autorais e curadas para o card público de perfil.

alter table public.usuarios
  add column if not exists perfil_capa text not null default 'neutro';

alter table public.usuarios
  drop constraint if exists usuarios_perfil_capa_check;

alter table public.usuarios
  add constraint usuarios_perfil_capa_check
  check (perfil_capa in (
    'neutro', 'louvor', 'vocal', 'ensino', 'lideranca', 'intercessao', 'comunhao'
  ));

comment on column public.usuarios.perfil_capa is
  'Identificador curado da capa pública de expressão de serviço; não concede papel nem permissão.';
