export type FuelType = 'gasolina' | 'etanol' | 'diesel' | 'gnv';

export type VehicleType = 'carro' | 'utilitario' | 'moto' | 'caminhao' | 'carreta' | 'onibus';

export type VehicleStatus = 'ativo' | 'manutencao' | 'inativo';

export type MemberRole = 'admin' | 'gestor' | 'motorista';

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isSystemAdmin: boolean;
  companyId?: string;
  companyIds?: string[];
  role: MemberRole | 'system_admin';
  status: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  defaultCompanyId?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  segment?: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CompanyMember {
  uid: string;
  email: string;
  name: string;
  role: MemberRole;
  status: 'ativo' | 'inativo';
  joinedAt: string;
}

export interface CompanyInvite {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  role: MemberRole;
  invitedBy: string;
  createdAt: string;
  status: 'pendente' | 'aceito';
}

export interface Vehicle {
  id: string;
  name: string;
  model: string;
  brand?: string;
  plate: string;
  year: number;
  tankCapacity: number;
  currentOdometer: number;
  fuelType: FuelType;
  acceptedFuelTypes?: FuelType[];
  photoUrl?: string;
  flexEfficiencyRatio?: number;
  createdAt?: string;

  // Campos de Frota Empresarial
  status?: VehicleStatus;
  costCenter?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;

  // Periodicidade / Campos integrados
  vehicleType?: VehicleType;
  engineDisplacement?: number;
  cadManPeriodica?: boolean;
  revisaoKm?: number;
  revisaoMes?: number;
  trocaOleoKm?: number;
  trocaOleoMeses?: number;
  ultimaRevisaoKm?: number;
  ultimaTrocaOleoKm?: number;
  proxRevKm?: number;
  proxTrocaOleoKm?: number;
  gastoManutencao?: number;
  manFreioDiant?: number;
  manFreioTras?: number;

  // Periodicidade exclusiva de motocicletas
  lubrificarCorrenteKm?: number;
  ultimaLubCorrenteKm?: number;
  proxLubCorrenteKm?: number;
  esticarCorrenteKm?: number;
  ultimaEsticarCorrenteKm?: number;
  proxEsticarCorrenteKm?: number;

  // Totalizadores agregados
  totalGastoAbast?: number;
  totalLitrosAbast?: number;
  mediaGeralKmPorLitro?: number;
  qtdAbastecimentos?: number;
  custoMedioPorKm?: number;
  qtdManutencoes?: number;
  ultimoKm?: number;
  ultimoComb?: string;
}

export interface Refueling {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  fuelType: FuelType;
  pricePerLiter: number;
  totalAmount: number;
  liters: number;
  isFullTank: boolean;
  gasStation?: string;
  notes?: string;
  plate?: string;
  isAdditivated?: boolean;
  previousOdometer?: number;
  distanceTraveled?: number;
  consumptionKmPerLiter?: number;
  costPerKm?: number;
  registeredBy?: string;
  driverName?: string;
}

export type MaintenanceCategory =
  | 'oleo_filtro'
  | 'revisao_geral'
  | 'freios'
  | 'pneus'
  | 'troca_pneus'
  | 'alinhamento_balanceamento'
  | 'rodizio_pneus'
  | 'esticar_corrente'
  | 'lubrificar_corrente'
  | 'suspensao'
  | 'ar_condicionado'
  | 'bateria'
  | 'documentacao'
  | 'outros';

export interface MaintenanceItem {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  category: MaintenanceCategory;
  title: string;
  description?: string;
  workshop?: string;
  cost: number;
  nextDueOdometer?: number;
  nextDueDate?: string;
  isCompleted: boolean;
  side?: string;
  sideLabel?: string;
  notes?: string;
  receiptUrl?: string;
  registeredBy?: string;
}

export interface MaintenanceAlert {
  category: MaintenanceCategory;
  title: string;
  status: 'ok' | 'atencao' | 'alerta' | 'vencido' | 'proximo';
  currentKm: number;
  dueKm?: number;
  kmRemaining?: number;
  dueDate?: string;
  daysRemaining?: number;
  estimatedCost: number;
}

export interface FuelForecast {
  averageDailyKm: number;
  averageConsumptionKmPerLiter: number;
  averagePricePerLiter: number;
  averageCostPerKm: number;
  projected30DaysKm: number;
  projected30DaysCost: number;
  projected60DaysCost: number;
  projected90DaysCost: number;
  upcomingMaintenancesCost30Days: number;
  totalProjectedCost30Days: number;
  vehicleBreakdowns?: { vehicle: Vehicle; forecast: FuelForecast }[];
  isInactive?: boolean;
  activeVehiclesCount?: number;
  inactiveVehiclesCount?: number;
}

export interface FuelPrices {
  gasolina: number;
  etanol: number;
  diesel: number;
  gnv: number;
  updatedAt?: string;
}
