import { useAuth } from '../../../rbac/AuthContext';
import { ROLES } from '../../../rbac/roles';
import AccessDeniedView from '../shared/AccessDeniedView';
import VTVLTab from './VTVLTab';
import CanBoTab from './CanBoTab';

export function RestrictedVTVLTab() {
  const { role } = useAuth();
  if (role === ROLES.SUPER_ADMIN) {
    return (
      <AccessDeniedView message="Vui lòng chuyển sang vai trò HR Admin hoặc Lãnh đạo Ban để thao tác." />
    );
  }
  return <VTVLTab />;
}

export function RestrictedCanBoTab() {
  const { role } = useAuth();
  if (role === ROLES.SUPER_ADMIN) {
    return (
      <AccessDeniedView message="Vui lòng chuyển sang vai trò HR Admin để thao tác." />
    );
  }
  return <CanBoTab />;
}
