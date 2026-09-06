-- Loja e Cantina dividem a mesma operação. Os dois códigos permanecem válidos
-- para não retirar acesso de nomeações antigas, mas passam a conceder o mesmo
-- conjunto operacional de permissões.

update public.admin_roles
set name = 'Operador da Loja e Cantina',
    description = 'Catálogo, estoque e pedidos da Loja; caixa, retiradas e resgates da Cantina.'
where code in ('operador_loja', 'operador_cantina');

insert into public.admin_role_permissions (role_code, permission_code)
select role_code, permission_code
from (values
  ('operador_loja', 'admin.access'),
  ('operador_loja', 'dashboard.read'),
  ('operador_loja', 'store.read'),
  ('operador_loja', 'store.manage'),
  ('operador_loja', 'economy.read'),
  ('operador_loja', 'canteen.read'),
  ('operador_loja', 'canteen.checkout.operate'),
  ('operador_loja', 'canteen.redemptions.read'),
  ('operador_cantina', 'admin.access'),
  ('operador_cantina', 'dashboard.read'),
  ('operador_cantina', 'store.read'),
  ('operador_cantina', 'store.manage'),
  ('operador_cantina', 'economy.read'),
  ('operador_cantina', 'canteen.read'),
  ('operador_cantina', 'canteen.checkout.operate'),
  ('operador_cantina', 'canteen.redemptions.read')
) as desired(role_code, permission_code)
on conflict (role_code, permission_code) do nothing;

insert into public.admin_audit_log (
  actor_user_id, permission, action, entity_type, entity_id, after_data, reason
) values (
  null, 'system.manage', 'roles.store_canteen_operator_unified',
  'admin_role', 'operador_loja',
  jsonb_build_object(
    'compatible_role_codes', jsonb_build_array('operador_loja', 'operador_cantina'),
    'store_manage', true,
    'canteen_checkout_operate', true
  ),
  'Unificação operacional da Loja e Cantina solicitada pela gestão.'
);
