-- Acrescenta capas fornecidas pelo produto sem substituir o catálogo existente.

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
    'aguas-tranquilas',
    'refugio',
    'vigilia',
    'caminho',
    'luz-serena',
    'adoracao',
    'louvor-acustico',
    'devocional'
  ));
