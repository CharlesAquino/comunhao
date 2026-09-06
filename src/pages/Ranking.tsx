import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Award, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { getHierarquiaData, subscribeToDataChanges } from '../services/dataService';
import { PATENTES, ESFERAS, calcularDivisao, formatarDivisao, type PatenteId, type Esfera } from '../services/patente';
import { useToast } from '../contexts/ToastContext';
import { getCurrentUserProfile } from '../services/dataService';
import AvatarComEmblema from '../components/AvatarComEmblema';
import ProvaBanner from '../components/ProvaBanner';
import BadgeRank from '../components/BadgeRank';
import type { Usuario } from '../types';

type HierarquiaUser = Pick<Usuario, 'id' | 'nome' | 'foto_url' | 'xp' | 'brasao_institucional'>;

export default function Ranking() {
  const [users, setUsers] = useState<HierarquiaUser[]>([]);
  const [expanded, setExpanded] = useState<PatenteId | null>(null);
  const [meuXp, setMeuXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadHierarquia = useCallback(async () => {
    try {
      const [data, profile] = await Promise.all([
        getHierarquiaData(),
        getCurrentUserProfile(),
      ]);
      setUsers(data);
      if (profile) setMeuXp(profile.xp ?? 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar hierarquia');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHierarquia();
    const unsubscribe = subscribeToDataChanges(() => loadHierarquia());
    return () => unsubscribe();
  }, [loadHierarquia]);

  const meuProgresso = calcularDivisao(meuXp);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-transparent txt-tertiary">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Buscando hierarquia...</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-8 space-y-8 max-w-lg mx-auto page-enter">
      <header className="text-center">
        <h1 className="font-display text-2xl txt-primary">Jornada de Serviço</h1>
        <p className="txt-tertiary text-base mt-1">8 patentes · uma caminhada de comunhão</p>
      </header>

      <ProvaBanner />

      {/* Meu progresso */}
      <div className="glass rounded-2xl p-5 space-y-3 relative overflow-hidden">
        <div className="glass-shine"></div>
        <p className="text-sm font-bold txt-secondary uppercase tracking-[0.1em]">Meu Progresso</p>
        <div className="flex items-center gap-4">
          <AvatarComEmblema nome="" statusAnel="disponivel" xp={meuXp} tamanho="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display text-base txt-primary flex items-center gap-2">
                <BadgeRank rank={meuProgresso.patente.badgeRank} size={24} />
                {meuProgresso.patente.nome}
                {meuProgresso.divisao && <span className="txt-muted text-xs">{formatarDivisao(meuProgresso.divisao)}</span>}
              </span>
              <span className="numero-destaque text-sm txt-secondary">{meuXp} XP</span>
            </div>
            <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${meuProgresso.pc}%`, background: `linear-gradient(90deg, ${meuProgresso.patente.cor}, var(--green-light))` }}
              />
            </div>
            <p className="text-xs txt-muted mt-1">
              {meuProgresso.patente.temDivisoes
                ? `${meuProgresso.pc} PC · ${meuProgresso.patente.xpMin}+ XP`
                : 'Patente máxima — ladder aberta'}
            </p>
          </div>
        </div>
      </div>

      {/* Escalada da Semana */}
      <div className="glass rounded-2xl p-6 space-y-4 relative overflow-hidden">
        <div className="glass-shine"></div>
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={22} className="txt-amber" />
          <p className="text-sm font-bold txt-secondary uppercase tracking-[0.1em]">Escalada da Semana</p>
        </div>
        <p className="text-sm txt-muted">Quem mais ganhou Pontos de Comunhão nos últimos 7 dias.</p>
        <div className="flex items-center justify-center py-5">
          <p className="text-base txt-muted">Disponível em breve</p>
        </div>
      </div>

      {/* Tiers por Esfera */}
      {([3, 2, 1] as Esfera[]).map((esfera) => (
        <div key={esfera} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-subtle" />
            <span className="text-xs font-bold txt-tertiary uppercase tracking-[0.15em]">{ESFERAS[esfera].nome}</span>
            <div className="h-px flex-1 bg-subtle" />
          </div>

          {PATENTES.filter((p) => p.esfera === esfera).map((patente) => {
            const membros = users.filter((u) => calcularDivisao(u.xp).patente.id === patente.id);
            const estaExpandido = expanded === patente.id;

            return (
              <div key={patente.id} className="glass rounded-2xl overflow-hidden relative">
                <div className="glass-shine"></div>
                <button
                  onClick={() => setExpanded(estaExpandido ? null : patente.id)}
                  className="sanctuary-disclosure w-full px-6 py-5 flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ boxShadow: `0 0 16px ${patente.cor}33` }}>
                    <BadgeRank rank={patente.badgeRank} size={48} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold" style={{ color: patente.cor }}>{patente.nome}</h3>
                      {patente.id === 'pacificador' && <span className="text-xs bg-[var(--accent-soft)] text-[var(--accent-primary)] px-2 py-0.5 rounded-full font-medium">Patente máxima</span>}
                      {patente.temDivisoes && (
                        <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-full font-medium txt-tertiary">IV–I</span>
                      )}
                    </div>
                    <p className="text-xs txt-tertiary">
                      {membros.length} {membros.length === 1 ? 'membro' : 'membros'} · mínimo {patente.xpMin} XP
                    </p>
                  </div>
                  <div className="txt-tertiary shrink-0">
                    {estaExpandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {estaExpandido && (
                  <div className="px-6 pb-5 space-y-3 border-t border-subtle pt-4">
                    {membros.length === 0 && (
                      <p className="text-sm txt-muted text-center py-3">Ninguém nesta patente ainda</p>
                    )}
                    {membros.map((user) => {
                      const div = calcularDivisao(user.xp);
                      return (
                        <div key={user.id} className="flex items-center gap-3">
                          <AvatarComEmblema nome={user.nome} fotoUrl={user.foto_url} statusAnel="disponivel" xp={user.xp} tamanho="sm" brasaoInstitucional={user.brasao_institucional} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold txt-primary truncate block">{user.nome}</span>
                            <span className="text-xs txt-muted">
                              {user.xp} XP
                              {div.divisao && <span> · {formatarDivisao(div.divisao)}</span>}
                              <span> · {div.pc} PC</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Link pro Guia */}
      <div className="text-center">
        <Link to="/guia" className="inline-flex items-center gap-1.5 txt-muted hover:txt-secondary text-xs font-medium transition">
          <Award size={14} />
          Como funciona a Jornada?
        </Link>
      </div>
    </div>
  );
}
