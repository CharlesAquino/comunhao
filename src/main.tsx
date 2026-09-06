import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { prepareAppRuntime, registerWebPwa } from './services/runtimeLifecycle';

async function bootstrap(): Promise<void> {
  const runtimeState = await prepareAppRuntime();
  if (runtimeState === 'reloading') return;

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Elemento raiz #root não encontrado no DOM.');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  registerWebPwa();
}

bootstrap().catch(() => {
  document.body.innerHTML = '<main style="padding:24px;font-family:system-ui"><h1>Não foi possível iniciar o Comunhão.</h1><p>Feche e abra o aplicativo novamente.</p></main>';
});
