import { Link } from 'react-router-dom';
import { ArrowLeft, Award, TrendingUp, Users, BookOpen, MessageCircle } from 'lucide-react';
import { PATENTES, ESFERAS, calcularProgressoProximoNivel, XP_ACOES, formatarDivisao, type PatenteId, type Esfera } from '../services/patente';
import BadgeRank from '../components/BadgeRank';

function ExemplarAvatar({ patenteId, nome }: { patenteId: PatenteId; nome: string }) {
  const patente = PATENTES.find((p) => p.id === patenteId)!;
  return (
    <div className="flex flex-col items-center gap-2">
      <BadgeRank rank={patente.badgeRank} size={48} />
      <span className="text-xs font-bold txt-primary">{nome}</span>
      <span className="text-[10px] font-semibold" style={{ color: patente.cor }}>{patente.nome}</span>
    </div>
  );
}

function SecaoEsfera({ esfera }: { esfera: Esfera }) {
  const patentes = PATENTES.filter((p) => p.esfera === esfera);
  const info = ESFERAS[esfera];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-subtle" />
        <span className="text-[10px] font-bold txt-tertiary uppercase tracking-[0.15em]">{info.nome}</span>
        <div className="h-px flex-1 bg-subtle" />
      </div>
      <p className="text-[11px] txt-muted text-center -mt-1">{info.descricao}</p>
      {patentes.map((patente) => (
        <div key={patente.id} className="glass rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden card-3d">
          <div className="glass-shine"></div>
          <div className="shrink-0">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ boxShadow: `0 0 20px ${patente.cor}33` }}>
              <BadgeRank rank={patente.badgeRank} size={48} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold" style={{ color: patente.cor }}>{patente.nome}</h3>
              {patente.temDivisoes && (
                <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full font-medium txt-tertiary">IV → I</span>
              )}
              {!patente.temDivisoes && (
                <span className="text-[9px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-medium">Ladder</span>
              )}
              {patente.id === 'servo-fiel' && <span className="text-xs bg-[var(--accent-soft)] text-[var(--accent-primary)] px-2 py-0.5 rounded-full font-medium">Inicial</span>}
            </div>
            <p className="text-[11px] txt-tertiary leading-relaxed">{patente.descricao}</p>
            <p className="text-[10px] txt-muted mt-1">
              A partir de <span className="font-bold" style={{ color: patente.cor }}>{patente.xpMin} XP</span>
              {patente.temDivisoes && patente.id !== 'servo-fiel' && (
                <> · {formatarDivisao(4)} a {formatarDivisao(1)}</>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GuiaPatentes() {
  const exemplo = calcularProgressoProximoNivel(200);

  return (
    <div className="px-5 py-8 space-y-8 max-w-lg mx-auto page-enter">
      <div className="flex items-center gap-4">
        <Link to="/" className="glass rounded-xl p-2.5 hover:brightness-110 transition active:scale-95">
          <ArrowLeft size={18} className="txt-primary" />
        </Link>
        <div>
          <h1 className="font-display text-xl txt-primary">Jornada de Serviço</h1>
          <p className="txt-tertiary text-xs">8 patentes · Serviço, Missão e Sabedoria</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3 relative overflow-hidden card-3d">
        <div className="glass-shine"></div>
        <div className="flex items-center gap-3">
          <Award size={24} className="text-amber-300" />
          <p className="text-sm txt-secondary leading-relaxed">
            Quanto mais você ora, estuda e participa, mais amadurece na jornada. Cada patente tem 4 divisões (IV → I). Ao chegar ao topo, a próxima patente reconhece uma nova etapa de serviço.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold txt-secondary uppercase tracking-[0.1em] flex items-center gap-2">
          <TrendingUp size={16} />
          Como evoluir
        </h2>
        <div className="glass rounded-2xl p-5 space-y-3 relative overflow-hidden card-3d">
          <div className="glass-shine"></div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-[var(--accent-soft)] rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <MessageCircle size={14} className="txt-green" />
            </div>
            <div>
              <p className="text-xs font-bold txt-primary">Ore com outros +{XP_ACOES.ORAR} XP</p>
              <p className="text-[11px] txt-tertiary">Orar com alguém rende XP de comunhão e Pontos de Comunhão</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-sky-500/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen size={14} className="text-sky-300" />
            </div>
            <div>
              <p className="text-xs font-bold txt-primary">Complete lições +{XP_ACOES.LICAO} XP</p>
              <p className="text-[11px] txt-tertiary">Estude a lição da EBD e faça o quiz</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-rose-500/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <Users size={14} className="text-rose-300" />
            </div>
            <div>
              <p className="text-xs font-bold txt-primary">Indique amigos +{XP_ACOES.INDICAR} XP</p>
              <p className="text-[11px] txt-tertiary">Cada novo membro que você trouxer rende XP</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3 relative overflow-hidden card-3d">
        <div className="glass-shine"></div>
        <p className="text-xs font-bold txt-secondary">Exemplo de progresso</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold txt-primary flex items-center gap-1.5">
            <BadgeRank rank={exemplo.atual.badgeRank} size={24} />
            {exemplo.atual.nome} {exemplo.divisao && formatarDivisao(exemplo.divisao)}
          </span>
          <div className="flex-1 mx-4">
            <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${exemplo.porcentagem}%`, background: `linear-gradient(90deg, ${exemplo.atual.cor}, ${exemplo.proximo?.cor || exemplo.atual.cor})` }}
              />
            </div>
          </div>
          <span className="text-sm font-bold txt-primary flex items-center gap-1.5">
            {exemplo.proximo ? <><BadgeRank rank={exemplo.proximo.badgeRank} size={24} /> {exemplo.proximo.nome}</> : '?'}
          </span>
        </div>
        <p className="text-[11px] txt-tertiary text-center">
          {exemplo.proximo
            ? `${200} / ${exemplo.proximo.xpMin} XP — ${exemplo.porcentagem}% · ${exemplo.pc} PC`
            : 'Máximo nível atingido!'}
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-bold txt-secondary uppercase tracking-[0.1em]">As 8 patentes da jornada</h2>
        <SecaoEsfera esfera={3} />
        <SecaoEsfera esfera={2} />
        <SecaoEsfera esfera={1} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold txt-secondary uppercase tracking-[0.1em]">Visual</h2>
        <div className="glass rounded-2xl p-5 relative overflow-hidden card-3d">
          <div className="glass-shine"></div>
          <p className="text-xs txt-tertiary mb-5">Como cada esfera aparece no grid da mocidade:</p>
          <div className="space-y-4">
            {([3, 2, 1] as Esfera[]).map((esfera) => (
              <div key={esfera}>
                <p className="text-[10px] font-bold txt-muted uppercase tracking-[0.1em] mb-2">{ESFERAS[esfera].nome}</p>
                <div className="grid grid-cols-4 gap-4">
                  {PATENTES.filter((p) => p.esfera === esfera).map((p) => (
                    <ExemplarAvatar key={p.id} patenteId={p.id} nome={p.nome} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-subtle">
            <div className="flex items-center gap-2 text-[11px] txt-tertiary">
              <span className="w-3 h-3 rounded-full ring-2 ring-[var(--accent-solid)] shrink-0" />
              Anel verde = disponível para oração
            </div>
            <div className="flex items-center gap-2 text-[11px] txt-tertiary mt-1">
              <span className="w-3 h-3 rounded-full ring-2 ring-rose-400 shrink-0" />
              Anel rosa = orando no momento
            </div>
            <div className="flex items-center gap-2 text-[11px] txt-tertiary mt-1">
              <span className="w-3 h-3 rounded-full ring-2 ring-slate-300 shrink-0" />
              Anel cinza = offline
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pb-4">
        <p className="text-[11px] txt-muted leading-relaxed">
          "Orai sem cessar."<br />1 Tessalonicenses 5:17
        </p>
      </div>
    </div>
  );
}
