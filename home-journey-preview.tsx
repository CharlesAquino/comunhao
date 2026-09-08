// Prévia local dos componentes de produção; nenhum envio ou acesso ao backend.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link } from 'react-router-dom';
import { Home, MessageCircle, UserRound, BookOpen, ShoppingBag } from 'lucide-react';
import HomeJourneySurface from './src/components/home/HomeJourneySurface';
import PrayerPartnerCard from './src/components/home/PrayerPartnerCard';
import DailyEbdCard from './src/components/home/DailyEbdCard';
import ComunhaoEstudosCard from './src/components/home/ComunhaoEstudosCard';
import MocidadeGrid from './src/components/MocidadeGrid';
import SectionHeader from './src/components/ui/SectionHeader';
import SealIcon from './src/components/ui/SealIcon';
import type { ConviteOracao } from './src/services/conviteService';
import { createEmptyEditorialDocument, type EbdEditorialLesson } from './src/types/ebdEditorial';
import './src/index.css';
import './src/styles/home-editorial.css';

const lesson: EbdEditorialLesson = {
  id: 'preview', title: 'Quando o erro parece familiar',
  number: 1, subtitle: '', status: 'published', version: 1,
  document: createEmptyEditorialDocument(),
};

const previewNav = [
  { label: 'Início', Icon: Home, active: true },
  { label: 'Mural', Icon: MessageCircle, active: false },
  { label: 'EBD', Icon: BookOpen, active: false },
  { label: 'Tesouro', Icon: ShoppingBag, active: false },
  { label: 'Perfil', Icon: UserRound, active: false },
];

function Preview() {
  const [theme, setTheme] = useState('dark');
  const [pending, setPending] = useState(false);
  const [withMission, setWithMission] = useState(true);
  const [access, setAccess] = useState(true);
  const [action, setAction] = useState('Prévia com dados fictícios');
  return (
    <main className="app-shell--home" style={{ height: '100dvh', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12, justifyContent: 'center' }}>
        <button className="sanctuary-mini-action" onClick={() => {
          const next = theme === 'dark' ? 'light' : 'dark';
          document.documentElement.dataset.theme = next;
          setTheme(next);
        }}>Tema {theme === 'dark' ? 'claro' : 'escuro'}</button>
        <button className="sanctuary-mini-action" onClick={() => setWithMission(!withMission)}>Alternar missão</button>
        <button className="sanctuary-mini-action" onClick={() => setAccess(!access)}>Alternar acesso</button>
      </div>
      <div className="home-editorial">
        <header style={{ paddingBlock: 24 }}>
          <h1>A paz do Senhor, Charles</h1>
          <p>Disponível para oração</p>
        </header>
        <HomeJourneySurface mission={withMission && (
          <PrayerPartnerCard
            missaoAtual={{ id: 'preview', nome: 'Sophia' }}
            parceiroSustentador={{ nome: 'Ana Beatriz' }}
            conviteEnviado={pending ? { id: 'preview' } as ConviteOracao : null}
            criandoSala={false}
            onConvidar={() => setPending(true)}
            onCancelarConvite={() => setPending(false)}
          />
        )}>
          <div className="home-formation">
            <DailyEbdCard editorialLesson={lesson} onAbrir={() => setAction('Abrir EBD acionado')} />
            <ComunhaoEstudosCard hasEstudosAccess={access} onAcessar={() => setAction('Acessar estudos acionado')} />
          </div>
          <section className="home-community spatial-section spatial-section--quiet space-y-3">
            <SectionHeader title="Nossa comunidade" eyebrow="" action={<Link to="/comunidade">Ver todos</Link>} />
            <div className="community-presence-card"><MocidadeGrid compact jovens={[]} /></div>
          </section>
        </HomeJourneySurface>
        <footer style={{ textAlign: 'center', padding: '24px 16px 64px' }}>
          <p>Jornada de Serviço — como funciona</p>
          <p style={{ marginTop: 64 }}>Como usar esta tela</p>
        </footer>
        <p role="status" style={{ textAlign: 'center', padding: 24 }}>{action}</p>
      </div>
      <div className="app-shell__bottom-nav" style={{ position: 'fixed', left: '50%', right: 'auto', transform: 'translateX(-50%)', bottom: 0, zIndex: 80, padding: '0 12px 12px', pointerEvents: 'none' }}>
        <nav aria-label="Navegação principal" className="sanctuary-nav sanctuary-floating-dock app-shell__nav pointer-events-auto relative mx-auto grid grid-cols-5 items-center px-1.5 py-1" style={{ pointerEvents: 'auto' }}>
          {previewNav.map(({ label, Icon, active }) => (
            <a key={label} href="#" aria-current={active ? 'page' : undefined} className={`sanctuary-nav__item relative flex min-h-[3.6rem] flex-col items-center justify-center gap-1 px-1 py-1 text-center transition-colors ${active ? 'sanctuary-nav__item--active text-[#BEC092]' : 'text-[color:var(--sanctuary-text-muted)]'}`} onClick={(event) => event.preventDefault()}>
              {active && <div className="absolute inset-0.5 z-[-1] rounded-[1.15rem]" />}
              <SealIcon Icon={Icon} active={active} size="sm" />
              <span className="text-[0.65rem] font-semibold leading-none tracking-[0.03em]">{label}</span>
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview /></BrowserRouter>);
