import Dashboard from './dashboard/Dashboard.jsx';
import SignIn from './sign-in/SignIn.jsx';
import { AuthProvider, useAuth } from './rbac/AuthContext';
import { KPIProvider } from './kpi/KPIContext';
import { NavigationProvider } from './kpi/NavigationContext';

function AuthenticatedContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <KPIProvider>
      <NavigationProvider>
        <Dashboard />
      </NavigationProvider>
    </KPIProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedContent />
    </AuthProvider>
  );
}

export default App;
