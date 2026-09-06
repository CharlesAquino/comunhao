import { ADMIN_MODULES } from '../../admin/adminModules';
import AdminModulePlaceholder from '../../components/admin/AdminModulePlaceholder';

export default function AdminPlaceholderRoute({ to }: { to: string }) {
  const module = ADMIN_MODULES.find(item => item.to === to);
  if (!module) return null;
  return <AdminModulePlaceholder module={module} />;
}
