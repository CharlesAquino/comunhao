import { describe, expect, it } from 'vitest';
import { legacyRoleToAdminRoles, permissionsForRoles } from '../admin/accessControl';

describe('admin access control', () => {
  it('preserva o admin legado como administrador completo', () => {
    const roles = legacyRoleToAdminRoles('admin');
    const permissions = permissionsForRoles(roles);
    expect(roles).toEqual(['administrador']);
    expect(permissions).toContain('admin.access');
    expect(permissions).toContain('people.roles');
    expect(permissions).toContain('ebd.publish');
  });

  it('reconhece mod como guardião sem elevar para administrador', () => {
    const roles = legacyRoleToAdminRoles('mod');
    const permissions = permissionsForRoles(roles);
    expect(roles).toEqual(['guardiao']);
    expect(permissions).toContain('moderation.manage');
    expect(permissions).not.toContain('people.roles');
    expect(permissions).not.toContain('prayer.draw');
  });

  it('combina papéis sem duplicar permissões', () => {
    const permissions = permissionsForRoles(['editor_ebd', 'revisor_ebd']);
    expect(permissions).toContain('ebd.manage');
    expect(permissions).toContain('ebd.review');
    expect(permissions).toContain('ebd.publish');
    expect(new Set(permissions).size).toBe(permissions.length);
  });

  it('separa gestão e unifica a operação da Loja e Cantina', () => {
    const gestor = permissionsForRoles(['gestor_cantina']);
    const operador = permissionsForRoles(['operador_cantina']);
    const operadorLoja = permissionsForRoles(['operador_loja']);

    expect(gestor).toContain('canteen.events.manage');
    expect(gestor).toContain('canteen.team.manage');
    expect(gestor).toContain('economy.read');
    expect(gestor).not.toContain('economy.adjust');

    expect(operador).toContain('canteen.checkout.operate');
    expect(operador).toContain('store.manage');
    expect(operador).toContain('economy.read');
    expect(operador).not.toContain('canteen.events.manage');
    expect(operador).not.toContain('economy.adjust');
    expect([...operadorLoja].sort()).toEqual([...operador].sort());
  });
});
