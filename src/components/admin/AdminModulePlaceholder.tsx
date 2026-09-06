import { Construction } from 'lucide-react';
import type { AdminModuleDefinition } from '../../admin/adminModules';

export default function AdminModulePlaceholder({ module }: { module: AdminModuleDefinition }) {
  const { Icon } = module;
  return (
    <div className="space-y-5">
      <header>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]">
            <Icon size={21} className="txt-green" />
          </div>
          <div>
            <h1 className="font-display text-2xl txt-primary">{module.label}</h1>
            <p className="text-sm txt-tertiary">{module.description}</p>
          </div>
        </div>
      </header>

      <section className="card-surface elevation-1 p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Construction size={19} className="text-amber-400" />
          </div>
          <div>
            <h2 className="font-display text-base txt-primary">Módulo conectado ao novo painel</h2>
            <p className="mt-1 text-sm leading-6 txt-tertiary">
              A rota, a permissão e a navegação já estão prontas. As ações específicas serão migradas por etapas,
              com validação no servidor, auditoria e confirmação proporcional ao risco.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
