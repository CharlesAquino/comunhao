-- Inclui a capa no contrato público já protegido por grants de coluna.
-- Nenhum campo privado adicional é exposto.

grant select (perfil_capa) on public.usuarios to authenticated;

create or replace view public.usuarios_publicos
with (security_invoker = true)
as
select
  id,
  nome,
  username,
  foto_url,
  status_anel,
  papel,
  pontos_comunhao,
  xp,
  streak_dias,
  orando_por_id,
  sendo_orado_por_id,
  criado_em,
  perfil_capa
from public.usuarios;

grant select on public.usuarios_publicos to authenticated;

