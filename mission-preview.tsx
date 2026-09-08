// Harness local: renderiza o componente de produção com dados fictícios, sem backend.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import PrayerPartnerCard from './src/components/home/PrayerPartnerCard';
import ComunhaoEstudosCard from './src/components/home/ComunhaoEstudosCard';
import './src/index.css';

function Preview() {
  const [pending, setPending] = React.useState(false);
  return (
    <main style={{padding: '24px 16px', height: '100dvh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '24px'}}>
      <PrayerPartnerCard
        missaoAtual={{ id: 'preview', nome: 'Sophia' }}
        parceiroSustentador={{nome: 'Ana Beatriz'}}
        conviteEnviado={pending ? {id: 'preview'} as never : null}
        criandoSala={false}
        onConvidar={() => setPending(true)}
        onCancelarConvite={() => setPending(false)}
      />
      <ComunhaoEstudosCard
        hasEstudosAccess={true}
        onAcessar={() => {}}
      />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview /></BrowserRouter>);
