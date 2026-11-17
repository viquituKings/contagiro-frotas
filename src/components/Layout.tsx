import React, { useState } from 'react';
import {
  Gauge,
  Fuel,
  Wrench,
  TrendingUp,
  Car,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ROLE_LABELS } from '@/utils/format';

export type NavTab =
  | 'painel'
  | 'abastecimentos'
  | 'manutencoes'
  | 'previsao'
  | 'garagem'
  | 'equipe'
  | 'admin';

interface LayoutProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  children: React.ReactNode;
}

const BASE_NAV_ITEMS: {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresCompany?: boolean;
  adminOnly?: boolean;
}[] = [
  { id: 'painel', label: 'Painel', icon: Gauge, requiresCompany: true },
  { id: 'abastecimentos', label: 'Abastecer', icon: Fuel, requiresCompany: true },
  { id: 'manutencoes', label: 'Oficina', icon: Wrench, requiresCompany: true },
  { id: 'previsao', label: 'Previsão & Flex', icon: TrendingUp, requiresCompany: true },
  { id: 'garagem', label: 'Garagem', icon: Car, requiresCompany: true },
  { id: 'equipe', label: 'Configurações & Senha', icon: Settings },
  { id: 'admin', label: 'Administração', icon: ShieldCheck, adminOnly: true },
];

export function Layout({ activeTab, onChangeTab, children }: LayoutProps) {
  const {
    user,
    companies,
    activeCompany,
    activeRole,
    selectCompany,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    refreshFleetData,
    loadingData,
    logout,
  } = useAuth();
  const { preference, setPreference } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = BASE_NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !user?.isSystemAdmin) return false;
    if (item.requiresCompany && !activeCompany) return false;
    return true;
  });

  const cycleTheme = () => {
    const next = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
    setPreference(next);
  };

  const ThemeIcon = preference === 'dark' ? Moon : preference === 'light' ? Sun : Monitor;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 no-print">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-tight">
              ContaGiro <span className="text-emerald-500">Frotas</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestão de Frotas</p>
          </div>
        </div>

        {/* Seletor de Empresa */}
        {activeCompany && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Empresa / Frota
            </label>
            {companies.length > 1 ? (
              <select
                value={activeCompany.id}
                onChange={(e) => selectCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {companies.map((c) => (
                  <option key={c.company.id} value={c.company.id}>
                    {c.company.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold truncate">
                {activeCompany.name}
              </div>
            )}
            {user?.isSystemAdmin ? (
              <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Admin do Sistema
              </span>
            ) : (
              activeRole && (
                <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {ROLE_LABELS[activeRole]}
                </span>
              )
            )}
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  active
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate font-medium">{user?.name || user?.email}</span>
            <button
              onClick={cycleTheme}
              title={`Tema: ${preference}`}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 transition"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col p-4 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                  <Gauge className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-base">ContaGiro Frotas</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onChangeTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                      active
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base lg:text-lg font-bold">
                {navItems.find((i) => i.id === activeTab)?.label}
              </h2>
              {activeCompany && (
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  {activeCompany.name} • {vehicles.length} veículo(s) na frota
                </p>
              )}
            </div>
          </div>

          {activeCompany && (
            <div className="flex items-center gap-2.5">
              {activeTab !== 'garagem' && activeTab !== 'equipe' && activeTab !== 'admin' && (
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[200px] sm:max-w-xs"
                >
                  <option value="all">Toda a Frota ({vehicles.length})</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate})
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={refreshFleetData}
                disabled={loadingData}
                title="Atualizar dados"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingData ? 'animate-spin text-emerald-500' : ''}`}
                />
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
