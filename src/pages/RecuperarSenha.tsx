import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import SealIcon from '../components/ui/SealIcon';
import { ROUTES } from '../services/constants';

export default function RecuperarSenha() {
  return (
    <div className="login-sanctuary flex min-h-[100dvh] flex-col justify-center overflow-y-auto px-8 py-10 max-w-md mx-auto relative">
      <div className="relative z-10 w-full max-w-sm mx-auto">
        <header className="mb-7 text-center">
          <SealIcon Icon={KeyRound} size="lg" active className="mx-auto mb-4" />
          <h1 className="font-display text-3xl font-semibold txt-primary">Recuperar acesso</h1>
          <p className="mt-2 text-sm leading-relaxed txt-secondary">Este recurso ainda está em preparação.</p>
        </header>

        <section className="login-card material-stone rounded-2xl p-6 text-center" aria-labelledby="recovery-status">
          <h2 id="recovery-status" className="font-display text-lg font-semibold txt-primary">Recuperação temporariamente indisponível</h2>
          <p className="mt-3 text-sm leading-relaxed txt-secondary">
            A recuperação de senha por WhatsApp ainda não foi estruturada. Nenhum código será solicitado ou enviado nesta etapa.
          </p>
        </section>

        <div className="mt-6 text-center">
          <Link to={ROUTES.LOGIN} className="text-sm font-semibold txt-secondary hover:txt-primary">Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}
