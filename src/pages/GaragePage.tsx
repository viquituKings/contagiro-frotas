import React, { useState } from 'react';
import { Car, Bike, Truck, Bus, Plus, Edit2, Trash2, X, Gauge } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FleetService } from '@/services/fleetService';
import { FuelType, Vehicle, VehicleStatus, VehicleType } from '@/types/fleet';
import {
  DEFAULT_TANK_BY_TYPE,
  formatCurrency,
  formatNumber,
  formatPlate,
  FUEL_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from '@/utils/format';

export function GaragePage() {
  const { activeCompany, vehicles, refreshFleetData } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [vehicleType, setVehicleType] = useState<VehicleType>('carro');
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tankCapacity, setTankCapacity] = useState('50');
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('gasolina');
  const [acceptedFuelTypes, setAcceptedFuelTypes] = useState<FuelType[]>([]);
  const [fuelError, setFuelError] = useState('');
  const [engineDisplacement, setEngineDisplacement] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('ativo');
  const [costCenter, setCostCenter] = useState('');
  const [assignedDriverName, setAssignedDriverName] = useState('');

  const openNew = () => {
    setEditingId(null);
    setVehicleType('carro');
    setBrand('');
    setName('');
    setModel('');
    setPlate('');
    setYear(String(new Date().getFullYear()));
    setTankCapacity('50');
    setCurrentOdometer('');
    setFuelType('gasolina');
    setAcceptedFuelTypes([]);
    setFuelError('');
    setEngineDisplacement('');
    setStatus('ativo');
    setCostCenter('');
    setAssignedDriverName('');
    setModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setVehicleType(v.vehicleType || 'carro');
    setBrand(v.brand || '');
    setName(v.name);
    setModel(v.model);
    setPlate(v.plate);
    setYear(String(v.year));
    setTankCapacity(String(v.tankCapacity));
    setCurrentOdometer(String(v.currentOdometer));
    setFuelType(v.fuelType);
    setAcceptedFuelTypes(v.acceptedFuelTypes || (v.fuelType ? [v.fuelType] : []));
    setFuelError('');
    setEngineDisplacement(v.engineDisplacement ? String(v.engineDisplacement) : '');
    setStatus(v.status || 'ativo');
    setCostCenter(v.costCenter || '');
    setAssignedDriverName(v.assignedDriverName || '');
    setModalOpen(true);
  };

  const toggleFuel = (ft: FuelType) => {
    setFuelError('');
    setAcceptedFuelTypes((prev) =>
      prev.includes(ft) ? prev.filter((f) => f !== ft) : [...prev, ft]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (acceptedFuelTypes.length === 0) {
      setFuelError('Selecione pelo menos um combustível aceito.');
      return;
    }
    setSaving(true);
    try {
      await FleetService.saveVehicle(activeCompany.id, {
        ...(editingId ? { id: editingId } : {}),
        vehicleType,
        brand: brand.trim(),
        name: name.trim() || model.trim(),
        model: model.trim() || name.trim(),
        plate: formatPlate(plate),
        year: Number(year) || new Date().getFullYear(),
        tankCapacity: Number(tankCapacity) || (vehicleType === 'moto' ? 14 : 50),
        currentOdometer: Number(currentOdometer) || 0,
        fuelType: acceptedFuelTypes[0] || fuelType,
        acceptedFuelTypes,
        ...(vehicleType === 'moto' && engineDisplacement
          ? { engineDisplacement: Number(engineDisplacement) }
          : {}),
        status,
        costCenter: costCenter.trim(),
        assignedDriverName: assignedDriverName.trim(),
      });
      await refreshFleetData();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (
      !activeCompany ||
      !confirm(`Excluir o veículo ${v.name} (${v.plate}) e todo o histórico dele?`)
    ) {
      return;
    }
    await FleetService.deleteVehicle(activeCompany.id, v.id);
    await refreshFleetData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Garagem da Frota</h3>
          <p className="text-xs text-slate-500">
            Gerencie carros, motos, motoristas responsáveis e centros de custo
          </p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Novo Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {vehicles.map((v) => {
          const vType = v.vehicleType || 'carro';
          const VehicleIcon =
            vType === 'moto'
              ? Bike
              : vType === 'caminhao' || vType === 'carreta'
              ? Truck
              : vType === 'onibus'
              ? Bus
              : Car;
          const statusColor =
            v.status === 'manutencao'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              : v.status === 'inativo'
              ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

          return (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <VehicleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base leading-tight">{v.name}</h4>
                      <p className="text-xs text-slate-500">
                        {VEHICLE_TYPE_LABELS[vType]} • {v.brand ? `${v.brand} • ` : ''}
                        {v.plate} • {v.year}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusColor}`}>
                    {VEHICLE_STATUS_LABELS[v.status || 'ativo']}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <div>
                    <span className="text-slate-400 block">Odômetro</span>
                    <span className="font-bold">{formatNumber(v.currentOdometer)} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Média Geral</span>
                    <span className="font-bold text-emerald-500 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5" />
                      {v.mediaGeralKmPorLitro ? `${v.mediaGeralKmPorLitro.toFixed(1)} km/L` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Combustível</span>
                    <span className="font-bold">{formatCurrency(v.totalGastoAbast)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Oficina</span>
                    <span className="font-bold">{formatCurrency(v.gastoManutencao)}</span>
                  </div>
                </div>

                {(v.assignedDriverName || v.costCenter) && (
                  <p className="text-xs text-slate-500 mt-3">
                    {v.assignedDriverName ? `Motorista: ${v.assignedDriverName}` : ''}
                    {v.assignedDriverName && v.costCenter ? ' • ' : ''}
                    {v.costCenter ? `Centro de Custo: ${v.costCenter}` : ''}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => openEdit(v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingId ? 'Editar Veículo' : 'Cadastrar Veículo'}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Tipo de Veículo *</label>
                <select
                  value={vehicleType}
                  onChange={(e) => {
                    const selected = e.target.value as VehicleType;
                    setVehicleType(selected);
                    if (!editingId) {
                      setTankCapacity(String(DEFAULT_TANK_BY_TYPE[selected]));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                >
                  {(Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Fiat, Volkswagen, Honda"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nome / Modelo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setModel(e.target.value);
                    }}
                    placeholder="Ex: Strada Freedom 1.3"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Placa *</label>
                  <input
                    type="text"
                    required
                    value={plate}
                    onChange={(e) => setPlate(formatPlate(e.target.value))}
                    placeholder="ABC-1D23"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Tanque (L)</label>
                  <input
                    type="number"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Odômetro Atual (km) *</label>
                  <input
                    type="number"
                    required
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status na Frota</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  >
                    {Object.entries(VEHICLE_STATUS_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {vehicleType === 'moto' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Cilindrada (cc)</label>
                  <input
                    type="number"
                    value={engineDisplacement}
                    onChange={(e) => setEngineDisplacement(e.target.value)}
                    placeholder="Ex: 160"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5">Combustíveis Aceitos *</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FUEL_LABELS) as FuelType[]).map((ft) => {
                    const active = acceptedFuelTypes.includes(ft);
                    return (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => toggleFuel(ft)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                          active
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {FUEL_LABELS[ft]}
                      </button>
                    );
                  })}
                </div>
                {fuelError && <p className="text-xs text-red-500 mt-1.5 font-medium">{fuelError}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Motorista Responsável</label>
                  <input
                    type="text"
                    value={assignedDriverName}
                    onChange={(e) => setAssignedDriverName(e.target.value)}
                    placeholder="Nome do motorista"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Centro de Custo</label>
                  <input
                    type="text"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="Ex: Operações Sul"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
                >
                  {saving ? 'Salvando...' : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
