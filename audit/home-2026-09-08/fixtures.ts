import { createEmptyEditorialDocument } from '/src/types/ebdEditorial';
const params = new URLSearchParams(location.search);
const empty = params.get('state') === 'empty';
const person = (id: string, nome: string, status_anel = 'disponivel') => ({ id, nome, status_anel, xp: 80, avatar: '' });
const dashboard = {
 usuario:person('audit-user','Marcos Oliveira'),
 missaoAtual:empty ? {nome:'Aguardando sorteio'} : person('audit-partner','Sophia'),
 parceiroSustentador:empty ? {nome:'Aguardando sorteio'} : person('audit-supporter','Ana Beatriz'),
 mocidade:empty ? [] : [person('audit-1','Ana Beatriz'), person('audit-2','Pedro Henrique','offline'), person('audit-3','Lucas'), person('audit-4','Maria Clara'), person('audit-user','Marcos Oliveira')],
};
const document = createEmptyEditorialDocument();
const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const today = document.days.find(day=>day.day===dayNames[new Date().getDay()]);
if(today) { today.title='Uma fé que permanece nas provações'; today.estimatedMinutes=9; }
const lesson={ id:'audit-lesson',number:11,title:'Fé em tempos difíceis',subtitle:'',status:'published',version:1,document,created_at:new Date().toISOString(),updated_at:new Date().toISOString() };
export const getCurrentUserId=async()=>dashboard.usuario.id;
export const getDashboardData=async()=>{if(params.get('state')==='error') throw new Error('Falha simulada ao carregar a Home'); return dashboard;};
export const readDashboardCache=()=>null;
export const getCachedEditorialLesson=()=>null;
export const getPublishedEditorialLesson=async()=>empty?null:lesson;
export const cacheEditorialLesson=()=>{};
export const toggleUserAvailability=async(available:boolean)=>{dashboard.usuario.status_anel=available?'disponivel':'offline';};
export const subscribeToDataChanges=()=>()=>{};
export const getResumablePrayerJourney=async()=>null;
let invitation:any=null;
export const getConvitesPendentes=async()=>[];
export const getConviteEnviadoEmAndamento=async()=>invitation;
export const enviarConviteOracao=async()=>{invitation={id:'audit-invite',status:'pendente',destinatario_id:'audit-partner',origem:'dupla_semana'};};
export const cancelarConvite=async()=>{invitation=null;};
export const responderConviteOracao=async()=>({status:'recusado'});
export const subscribeToConvites=()=>()=>{};
export const listarSessoesGrupoAbertas=async()=>[];
export const entrarSessaoGrupo=async()=>{throw new Error('Ação fora da auditoria local');};
export const subscribeToSessaoGrupo=()=>()=>{};
export const getSaldoKesef=async()=>120;
export const getUltimasConversas=async()=>[];
export const subscribeToInbox=()=>()=>{};
export const contarNotificacoesNaoLidas=async()=>0;
export const listarNotificacoes=async()=>[];
export const marcarNotificacaoComoLida=async()=>{};
export const marcarTodasNotificacoesComoLidas=async()=>{};
export const subscribeToAppNotifications=()=>()=>{};
