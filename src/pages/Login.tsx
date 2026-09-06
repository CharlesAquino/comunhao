import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRound, Lock, ArrowRight, UserPlus, Eye, EyeOff, KeyRound } from 'lucide-react';
import { ROUTES } from '../services/constants';
import luzCompartilhadaEmblem from '../assets/brand/luz-compartilhada-emblem.webp';
import Button from '../components/ui/Button';
import { signInWithUsername } from '../services/authService';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErro('Preencha o usuário e a senha para continuar.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      await signInWithUsername(username, password);
      navigate(ROUTES.HOME);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Usuário ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-sanctuary flex min-h-[100dvh] flex-col justify-center overflow-y-auto px-8 py-10 max-w-md mx-auto relative">
      <div className="login-light-beam absolute inset-x-0 top-0 h-[46%] pointer-events-none" />
      <div className="login-presence-mark absolute inset-x-0 top-[4%] h-[38%] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto">
        <div className="text-center mb-7">
          <img
            src={luzCompartilhadaEmblem}
            alt=""
            aria-hidden="true"
            className="brand-emblem mx-auto mb-3 h-28 w-28 object-contain"
          />
          <h1 className="font-display text-[2.65rem] leading-none font-semibold txt-primary mb-3 tracking-[-0.035em]">
            Comunhão
          </h1>
          <div className="brand-divider mx-auto mb-3" aria-hidden="true" />
          <p className="txt-secondary text-sm leading-relaxed">
            Entre com seu usuário e senha<br/>
            para continuar na corrente de <span className="txt-amber">oração.</span>
          </p>
        </div>

        <div className="login-card material-stone rounded-2xl p-6 relative overflow-hidden">

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Usuário</label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="Ex: CharlesAquino"
                  className="login-input w-full input-theme rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-[var(--focus)] focus:border-green-subtle outline-none transition text-sm"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErro(''); }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-senha" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="login-senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  className="login-input w-full input-theme rounded-xl py-3.5 pl-11 pr-11 focus:ring-2 focus:ring-[var(--focus)] focus:border-green-subtle outline-none transition text-sm"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErro(''); }}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="field-icon-button right-2"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {erro && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-3 text-center text-sm font-medium text-rose-300"
              >
                {erro}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full min-h-12 text-base"
            >
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <ArrowRight size={18} />}
            </Button>

            <div className="text-center">
              <Link
                to={ROUTES.RECUPERAR_SENHA}
                className="inline-flex items-center gap-2 txt-tertiary hover:txt-primary text-sm font-medium transition disabled:opacity-50"
              >
                <KeyRound size={14} />
                Esqueceu a senha?
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            to={ROUTES.REGISTER}
            className="inline-flex items-center gap-2 txt-secondary hover:txt-primary text-sm font-semibold transition"
          >
            <UserPlus size={16} />
            Novo por aqui? Crie sua conta
          </Link>
        </div>

        <p className="text-center txt-muted text-xs mt-4">
          Ao entrar, você concorda em orar pelo seu parceiro da semana.
        </p>
      </div>
    </main>
  );
}
