import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthService } from '@/services/authService';
import { FleetService } from '@/services/fleetService';
import {
  Company,
  FuelPrices,
  MaintenanceItem,
  MemberRole,
  Refueling,
  SystemUser,
  Vehicle,
} from '@/types/fleet';

interface AuthContextValue {
  user: SystemUser | null;
  loadingAuth: boolean;
  companies: { company: Company; role: MemberRole }[];
  activeCompany: Company | null;
  activeRole: MemberRole | null;
  loadingData: boolean;
  vehicles: Vehicle[];
  refuelings: Refueling[];
  maintenances: MaintenanceItem[];
  fuelPrices: FuelPrices;
  selectedVehicleId: string;
  setSelectedVehicleId: (id: string) => void;
  selectCompany: (companyId: string) => void;
  refreshFleetData: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_USER_KEY = 'contagiro_frotas_session_uid';
const ACTIVE_COMPANY_KEY = 'contagiro_frotas_active_company';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [companies, setCompanies] = useState<{ company: Company; role: MemberRole }[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_COMPANY_KEY)
  );

  const [loadingData, setLoadingData] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [refuelings, setRefuelings] = useState<Refueling[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrices>({
    gasolina: 5.89,
    etanol: 3.99,
    diesel: 6.15,
    gnv: 4.5,
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

  const activeEntry =
    companies.find((c) => c.company.id === activeCompanyId) || companies[0] || null;
  const activeCompany = activeEntry?.company || null;
  const activeRole = activeEntry?.role || null;

  const refreshCompanies = useCallback(async () => {
    if (!user) return;
    try {
      if (user.isSystemAdmin) {
        const allCompanies = await AuthService.getAllCompanies();
        const mapped = allCompanies.map((c) => ({ company: c, role: 'admin' as MemberRole }));
        setCompanies(mapped);
        if (mapped.length > 0 && !mapped.some((c) => c.company.id === activeCompanyId)) {
          const firstId = mapped[0].company.id;
          setActiveCompanyId(firstId);
          localStorage.setItem(ACTIVE_COMPANY_KEY, firstId);
        }
      } else {
        const userCompanies = await AuthService.getCompaniesForUser(user);
        setCompanies(userCompanies);
        if (
          userCompanies.length > 0 &&
          !userCompanies.some((c) => c.company.id === activeCompanyId)
        ) {
          const firstId = userCompanies[0].company.id;
          setActiveCompanyId(firstId);
          localStorage.setItem(ACTIVE_COMPANY_KEY, firstId);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  }, [user, activeCompanyId]);

  const refreshFleetData = useCallback(async () => {
    if (!activeCompany) {
      setVehicles([]);
      setRefuelings([]);
      setMaintenances([]);
      return;
    }
    setLoadingData(true);
    try {
      const vehs = await FleetService.getVehicles(activeCompany.id);
      const [refs, mnts, prices] = await Promise.all([
        FleetService.getRefuelings(activeCompany.id, vehs),
        FleetService.getMaintenances(activeCompany.id),
        FleetService.getFuelPrices(activeCompany.id),
      ]);
      setVehicles(vehs);
      setRefuelings(refs);
      setMaintenances(mnts);
      setFuelPrices(prices);
      if (selectedVehicleId !== 'all' && !vehs.some((v) => v.id === selectedVehicleId)) {
        setSelectedVehicleId('all');
      }
    } catch (err) {
      console.error('Erro ao carregar dados da frota:', err);
    } finally {
      setLoadingData(false);
    }
  }, [activeCompany, selectedVehicleId]);

  useEffect(() => {
    const restoreSession = async () => {
      const savedUid = localStorage.getItem(SESSION_USER_KEY);
      if (!savedUid) {
        setLoadingAuth(false);
        return;
      }
      try {
        const found = await AuthService.getUserById(savedUid);
        if (found && found.status === 'ativo') {
          setUser(found);
        } else {
          localStorage.removeItem(SESSION_USER_KEY);
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
      } finally {
        setLoadingAuth(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      refreshCompanies();
    }
  }, [user, refreshCompanies]);

  useEffect(() => {
    if (activeCompany) {
      refreshFleetData();
    }
  }, [activeCompany?.id]);

  const selectCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    setSelectedVehicleId('all');
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
  };

  const loginEmail = async (email: string, password: string) => {
    const logged = await AuthService.login(email, password);
    localStorage.setItem(SESSION_USER_KEY, logged.id);
    setUser(logged);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Usuário não autenticado.');
    await AuthService.changeOwnPassword(user.id, currentPassword, newPassword);
    const updated = await AuthService.getUserById(user.id);
    if (updated) setUser(updated);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_USER_KEY);
    setUser(null);
    setCompanies([]);
    setVehicles([]);
    setRefuelings([]);
    setMaintenances([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loadingAuth,
        companies,
        activeCompany,
        activeRole,
        loadingData,
        vehicles,
        refuelings,
        maintenances,
        fuelPrices,
        selectedVehicleId,
        setSelectedVehicleId,
        selectCompany,
        refreshFleetData,
        refreshCompanies,
        loginEmail,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
