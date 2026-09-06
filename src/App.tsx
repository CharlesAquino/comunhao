import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AdminProvider } from './contexts/AdminContext';
import UpdateDialog from './components/UpdateDialog';
import WhatsNewDialog from './components/WhatsNewDialog';
import BaseLayout from './components/layout/BaseLayout';
import NavigationHistoryGuard from './components/NavigationHistoryGuard';
import NativeNavigationBridge from './components/NativeNavigationBridge';
import GuideOrchestrator from './components/guides/GuideOrchestrator';
import GlobalPageHelpFallback from './components/guides/GlobalPageHelpFallback';
import ProtectedRoute from './components/ProtectedRoute';
import { GraphicsProvider } from './contexts/GraphicsContext';
import AdminRoute from './components/admin/AdminRoute';
import AdminShell from './components/admin/AdminShell';
import UsageTracker from './components/UsageTracker';

const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Mural = lazy(() => import('./pages/Mural'));
const Ranking = lazy(() => import('./pages/Ranking'));
const Register = lazy(() => import('./pages/Register'));
const Admin = lazy(() => import('./pages/Admin'));
const EBD = lazy(() => import('./pages/EBD'));
const ComunhaoEstudos = lazy(() => import('./pages/ComunhaoEstudos'));
const EstudosCurso = lazy(() => import('./pages/EstudosCurso'));
const EstudosAula = lazy(() => import('./pages/EstudosAula'));
const EstudosPastoralReview = lazy(() => import('./pages/EstudosPastoralReview'));
const EstudosStudio = lazy(() => import('./pages/EstudosStudio'));
const Loja = lazy(() => import('./pages/Loja'));
const Carteira = lazy(() => import('./pages/Carteira'));
const SalaOracao = lazy(() => import('./pages/SalaOracao'));
const TimerOracao = lazy(() => import('./pages/TimerOracao'));
const Chat = lazy(() => import('./pages/Chat'));
const GuiaPatentes = lazy(() => import('./pages/GuiaPatentes'));
const Comunidade = lazy(() => import('./pages/Comunidade'));
const Mensagens = lazy(() => import('./pages/Mensagens'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const PerfilUsuario = lazy(() => import('./pages/PerfilUsuario'));
const CentralOracao = lazy(() => import('./pages/CentralOracao'));
const RecuperarSenha = lazy(() => import('./pages/RecuperarSenha'));
const EbdStudio = lazy(() => import('./pages/EbdStudio'));
const BibliotecaConhecimento = lazy(() => import('./pages/BibliotecaConhecimento'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));
const AdminPeople = lazy(() => import('./pages/admin/AdminPeople'));
const AdminModeration = lazy(() => import('./pages/admin/AdminModeration'));
const AdminStore = lazy(() => import('./pages/admin/AdminStore'));
const AdminPastoral = lazy(() => import('./pages/admin/AdminPastoral'));
const AdminCantina = lazy(() => import('./pages/admin/AdminCantina'));
const AdminUserInsights = lazy(() => import('./pages/admin/AdminUserInsights'));

function RouteFallback(): React.ReactElement {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas)] px-5 text-sm txt-tertiary">
      Carregando…
    </div>
  );
}

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GraphicsProvider>
          <ToastProvider>
            <AdminProvider>
              <BrowserRouter>
                <NavigationHistoryGuard />
                <UsageTracker />
                <NativeNavigationBridge />
                <GuideOrchestrator />
                <GlobalPageHelpFallback />
                <UpdateDialog />
                <WhatsNewDialog />
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-otp" element={<Navigate to="/recuperar-senha" replace />} />
                  <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                  <Route path="/sala/:salaId" element={<SalaOracao />} />
                  <Route path="/timer/:conviteId" element={<TimerOracao />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/chat/:userId" element={<Chat />} />

                    <Route element={<AdminRoute permission="estudos.review" />}>
                      <Route path="/estudos/revisao/:courseId" element={<EstudosPastoralReview />} />
                    </Route>
                    <Route element={<AdminRoute permission="estudos.manage" />}>
                      <Route path="/estudos/studio" element={<EstudosStudio />} />
                    </Route>

                    <Route element={<AdminRoute permission="admin.access" />}>
                      <Route path="/admin" element={<AdminShell />}>
                        <Route index element={<AdminDashboard />} />

                        <Route element={<AdminRoute permission="people.read" />}>
                          <Route path="pessoas" element={<AdminPeople />} />
                        </Route>
                        <Route element={<AdminRoute permission="people.sensitive" />}>
                          <Route path="indicadores" element={<AdminUserInsights />} />
                        </Route>
                        <Route element={<AdminRoute permission="prayer.read" />}>
                          <Route path="oracao" element={<Admin />} />
                        </Route>
                        <Route element={<AdminRoute permission="pastoral.read" />}>
                          <Route path="pastoral" element={<AdminPastoral />} />
                        </Route>
                        <Route element={<AdminRoute permission="moderation.read" />}>
                          <Route path="moderacao" element={<AdminModeration />} />
                        </Route>
                        <Route element={<AdminRoute permission="ebd.read" />}>
                          <Route path="ebd" element={<EbdStudio />} />
                        </Route>
                        <Route element={<AdminRoute permission="knowledge.read" />}>
                          <Route path="conhecimento" element={<BibliotecaConhecimento />} />
                        </Route>
                        <Route element={<AdminRoute permission="store.read" />}>
                          <Route path="loja" element={<AdminStore />} />
                        </Route>
                        <Route element={<AdminRoute permission="canteen.read" />}>
                          <Route path="cantina" element={<AdminCantina />} />
                        </Route>
                        <Route element={<AdminRoute permission="economy.read" />}>
                          <Route path="economia" element={<Navigate to="/admin" replace />} />
                        </Route>
                        <Route element={<AdminRoute permission="notifications.read" />}>
                          <Route path="notificacoes" element={<Navigate to="/admin" replace />} />
                        </Route>
                        <Route element={<AdminRoute permission="audit.read" />}>
                          <Route path="auditoria" element={<AdminAudit />} />
                        </Route>
                        <Route element={<AdminRoute permission="system.read" />}>
                          <Route path="sistema" element={<Navigate to="/admin" replace />} />
                        </Route>
                        <Route element={<AdminRoute permission="system.manage" />}>
                          <Route path="configuracoes" element={<Navigate to="/admin" replace />} />
                        </Route>
                      </Route>
                    </Route>

                    <Route path="/admin/ebd-studio" element={<Navigate to="/admin/ebd" replace />} />

                    <Route element={<BaseLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/mural" element={<Mural />} />
                      <Route path="/ranking" element={<Ranking />} />
                      <Route path="/ebd" element={<EBD />} />
                      <Route path="/estudos" element={<ComunhaoEstudos />} />
                      <Route path="/estudos/curso/:courseId" element={<EstudosCurso />} />
                      <Route path="/estudos/aula/:lessonId" element={<EstudosAula />} />
                      <Route path="/estudos/estudo/:studyId" element={<Navigate to="/estudos" replace />} />
                      <Route path="/loja" element={<Loja />} />
                      <Route path="/carteira" element={<Carteira />} />
                      <Route path="/guia" element={<GuiaPatentes />} />
                      <Route path="/comunidade" element={<Comunidade />} />
                      <Route path="/mensagens" element={<Mensagens />} />
                      <Route path="/perfil" element={<Perfil />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="/perfil/:userId" element={<PerfilUsuario />} />
                      <Route path="/oracao" element={<CentralOracao />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </AdminProvider>
          </ToastProvider>
        </GraphicsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
