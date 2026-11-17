import { FuelType, MaintenanceCategory, MemberRole, VehicleStatus, VehicleType } from '@/types/fleet';

export function formatCurrency(value: number | undefined | null): string {
  const num = Number(value || 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: number | undefined | null, decimals = 0): string {
  const num = Number(value || 0);
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPlate(text: string): string {
  const raw = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (raw.length > 3) {
    return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  }
  return raw;
}

export const FUEL_LABELS: Record<FuelType, string> = {
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  diesel: 'Diesel',
  gnv: 'GNV',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  carro: 'Carro',
  utilitario: 'Utilitário',
  moto: 'Motocicleta',
  caminhao: 'Caminhão',
  carreta: 'Carreta',
  onibus: 'Ônibus',
};

export const DEFAULT_TANK_BY_TYPE: Record<VehicleType, number> = {
  carro: 50,
  utilitario: 65,
  moto: 14,
  caminhao: 300,
  carreta: 600,
  onibus: 300,
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ativo: 'Ativo',
  manutencao: 'Em Manutenção',
  inativo: 'Inativo',
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor de Frota',
  motorista: 'Motorista',
};

export interface MaintenanceCategoryOption {
  value: MaintenanceCategory;
  label: string;
  needsSide?: boolean;
  motoOnly?: boolean;
  carOnly?: boolean;
  defaultIntervalKm?: number;
}

export const MAINTENANCE_CATEGORIES: MaintenanceCategoryOption[] = [
  { value: 'oleo_filtro', label: 'Troca de Óleo e Filtro', defaultIntervalKm: 10000 },
  { value: 'revisao_geral', label: 'Revisão Periódica Completa', defaultIntervalKm: 10000 },
  { value: 'freios', label: 'Freios (Pastilhas / Lonas)', needsSide: true },
  { value: 'troca_pneus', label: 'Troca de Pneus', needsSide: true },
  { value: 'alinhamento_balanceamento', label: 'Alinhamento e Balanceamento', carOnly: true, defaultIntervalKm: 10000 },
  { value: 'rodizio_pneus', label: 'Rodízio de Pneus', carOnly: true, defaultIntervalKm: 10000 },
  { value: 'lubrificar_corrente', label: 'Lubrificar Corrente', motoOnly: true, defaultIntervalKm: 500 },
  { value: 'esticar_corrente', label: 'Tensionar Corrente', motoOnly: true, defaultIntervalKm: 1500 },
  { value: 'suspensao', label: 'Suspensão / Amortecedores', needsSide: true },
  { value: 'ar_condicionado', label: 'Ar-Condicionado / Filtro de Cabine', carOnly: true, defaultIntervalKm: 15000 },
  { value: 'bateria', label: 'Bateria / Elétrica' },
  { value: 'documentacao', label: 'Documentação (IPVA / Licenciamento / Seguro)' },
  { value: 'outros', label: 'Outros Serviços' },
];

export const SIDE_OPTIONS = [
  { value: '', label: 'Não especificado' },
  { value: 'DIANTEIRO', label: 'Dianteiro' },
  { value: 'TRASEIRO', label: 'Traseiro' },
  { value: 'DIANTEIRO_ESQUERDO', label: 'Dianteiro Esquerdo' },
  { value: 'DIANTEIRO_DIREITO', label: 'Dianteiro Direito' },
  { value: 'TRASEIRO_ESQUERDO', label: 'Traseiro Esquerdo' },
  { value: 'TRASEIRO_DIREITO', label: 'Traseiro Direito' },
  { value: 'ESQUERDO', label: 'Lado Esquerdo' },
  { value: 'DIREITO', label: 'Lado Direito' },
  { value: 'TODOS', label: 'Todos / Jogo Completo' },
];

export function getMaintenanceCategoryLabel(cat: MaintenanceCategory): string {
  return MAINTENANCE_CATEGORIES.find((c) => c.value === cat)?.label || 'Serviço';
}
