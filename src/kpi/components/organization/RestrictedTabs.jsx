import { useAuth } from '../../../rbac/AuthContext';
import { ROLES } from '../../../rbac/roles';
import AccessDeniedView from '../shared/AccessDeniedView';
import VTVLTab from './VTVLTab';
import CanBoTab from './CanBoTab';

export function RestrictedVTVLTab() {
  const { role } = useAuth();
  if (role === ROLES.SUPER_ADMIN) {
    return (
      <AccessDeniedView message="" />
    );
  }
  return <VTVLTab />;
}

export function RestrictedCanBoTab() {
  const { role } = useAuth();
  if (role === ROLES.SUPER_ADMIN) {
    return (
      <AccessDeniedView message="" />
    );
  }
  return <CanBoTab />;
}
