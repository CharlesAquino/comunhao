import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const fixture = '/audit/home-2026-09-08/fixtures.ts';
export default defineConfig({
 plugins:[{name:'home-audit-fixtures',enforce:'pre',transform(code,id){
  if(id.endsWith('/contexts/AdminContext.tsx')) return `export function useAdmin(){ const admin = new URLSearchParams(location.search).get('role') === 'admin'; return { checking:false,isAdmin:admin,hasAdminAccess:admin,can:()=>admin }; }`;
  if (/\/(Home|KesefDisplay|MessageInboxButton|NotificationCenterButton)\.tsx$/.test(id)) {
   code=code.replace(/(['"])(\.\.\/services\/(?:dataService|conviteService|oracaoAbertaService|prayerJourneyService|ebdEditorialService|ebdProgressService|dashboardCache|kesefService|mensagemService|notificationService))\1/g,JSON.stringify(fixture));
  }
  if(id.endsWith('/layout/BaseLayout.tsx')) code=code.replace(/import\('\.\.\/\.\.\/pages\/[^']+'\)/g,'Promise.resolve()');
  return code;
 }},react(),tailwindcss()],
 server:{host:'127.0.0.1',port:5178},
});
