import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { Layout, NavTab } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { RefuelingsPage } from '@/pages/RefuelingsPage';
import { MaintenancesPage } from '@/pages/MaintenancesPage';
import { ForecastPage } from '@/pages/ForecastPage';
import { GaragePage } from '@/pages/GaragePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AdminPage } from '@/pages/AdminPage';

function AppShell() {
  const { user, loadingAuth, activeCompany, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('painel');

  useEffect(() => {
    if (user?.isSystemAdmin && !activeCompany) {
      setActiveTab('admin');
    }
  }, [user?.isSystemAdmin, activeCompany]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-emerald-500">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!activeCompany && !user.isSystemAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">Nenhuma empresa vinculada</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sua conta ainda não foi vinculada a nenhuma empresa. Solicite ao administrador do
            sistema que realize o vínculo.
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} onChangeTab={setActiveTab}>
      {activeTab === 'painel' && activeCompany && <DashboardPage onNavigate={setActiveTab} />}
      {activeTab === 'abastecimentos' && activeCompany && <RefuelingsPage />}
      {activeTab === 'manutencoes' && activeCompany && <MaintenancesPage />}
      {activeTab === 'previsao' && activeCompany && <ForecastPage />}
      {activeTab === 'garagem' && activeCompany && <GaragePage />}
      {activeTab === 'equipe' && <SettingsPage />}
      {activeTab === 'admin' && user.isSystemAdmin && <AdminPage />}
    </Layout>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
