-- Amplia a coleção curada de capas públicas de perfil.

alter table public.usuarios
  drop constraint if exists usuarios_perfil_capa_check;

alter table public.usuarios
  add constraint usuarios_perfil_capa_check
  check (perfil_capa in (
    'neutro',
    'louvor',
    'vocal',
    'ensino',
    'lideranca',
    'intercessao',
    'comunhao',
    'oliveira',
    'vitral',
    'aguas-tranquilas'
  ));

comment on column public.usuarios.perfil_capa is
  'Identificador curado da capa pública de expressão pessoal; não concede papel nem permissão.';
