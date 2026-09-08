import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EstudosRouteGuard from '../components/estudos/EstudosRouteGuard';
import * as AdminContextModule from '../contexts/AdminContext';

vi.mock('../contexts/AdminContext', () => ({
  useAdmin: vi.fn(),
}));

describe('EstudosRouteGuard e Controle de Acesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe tela de "Em preparação editorial" para usuários testers regulares sem atribuição', () => {
    vi.mocked(AdminContextModule.useAdmin).mockReturnValue({
      checking: false,
      isAdmin: false,
      isGuardiao: false,
      hasAdminAccess: false,
      can: () => false,
      hasRole: () => false,
      refreshRole: vi.fn(),
      userId: 'tester-1',
      legacyRole: 'membro',
      roles: [],
      permissions: [],
    });

    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <Routes>
          <Route element={<EstudosRouteGuard />}>
            <Route path="/estudos" element={<div>Conteúdo Interno de Estudos</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Estudos Bíblicos')).toBeInTheDocument();
    expect(screen.getByText('Em preparação editorial')).toBeInTheDocument();
    expect(screen.getByText(/estruturação e modelo editorial/i)).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Interno de Estudos')).not.toBeInTheDocument();
  });

  it('libera o conteúdo interno para usuários com atribuição de editor_estudos', () => {
    vi.mocked(AdminContextModule.useAdmin).mockReturnValue({
      checking: false,
      isAdmin: false,
      isGuardiao: false,
      hasAdminAccess: false,
      can: (perm: string) => perm === 'estudos.manage',
      hasRole: () => false,
      refreshRole: vi.fn(),
      userId: 'editor-1',
      legacyRole: 'membro',
      roles: ['editor_estudos'],
      permissions: ['estudos.manage'],
    });

    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <Routes>
          <Route element={<EstudosRouteGuard />}>
            <Route path="/estudos" element={<div>Conteúdo Interno de Estudos</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Conteúdo Interno de Estudos')).toBeInTheDocument();
    expect(screen.queryByText('Em preparação editorial')).not.toBeInTheDocument();
  });

  it('libera o conteúdo interno para administradores', () => {
    vi.mocked(AdminContextModule.useAdmin).mockReturnValue({
      checking: false,
      isAdmin: true,
      isGuardiao: true,
      hasAdminAccess: true,
      can: () => true,
      hasRole: () => true,
      refreshRole: vi.fn(),
      userId: 'admin-1',
      legacyRole: 'admin',
      roles: ['administrador'],
      permissions: ['admin.access', 'estudos.manage', 'estudos.review'],
    });

    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <Routes>
          <Route element={<EstudosRouteGuard />}>
            <Route path="/estudos" element={<div>Conteúdo Interno de Estudos</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Conteúdo Interno de Estudos')).toBeInTheDocument();
  });
});
