import React, { useMemo, useState } from 'react';
import { Fuel, Plus, Trash2, Edit2, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FleetService } from '@/services/fleetService';
import { FuelType, Refueling } from '@/types/fleet';
import { formatCurrency, formatNumber, FUEL_LABELS } from '@/utils/format';
import { formatDateToBR, getTodayISO } from '@/utils/date';

export function RefuelingsPage() {
  const {
    user,
    activeCompany,
    vehicles,
    refuelings,
    fuelPrices,
    selectedVehicleId,
    refreshFleetData,
  } = useAuth();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formVehicleId, setFormVehicleId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [odometer, setOdometer] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('gasolina');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [liters, setLiters] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [isAdditivated, setIsAdditivated] = useState(false);
  const [gasStation, setGasStation] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    return refuelings.filter((r) => {
      if (selectedVehicleId !== 'all' && r.vehicleId !== selectedVehicleId) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const v = vehicles.find((veh) => veh.id === r.vehicleId);
      return (
        v?.name.toLowerCase().includes(q) ||
        v?.plate.toLowerCase().includes(q) ||
        (r.gasStation || '').toLowerCase().includes(q) ||
        (r.driverName || '').toLowerCase().includes(q)
      );
    });
  }, [refuelings, selectedVehicleId, search, vehicles]);

  const openNew = () => {
    const defaultVeh =
      selectedVehicleId !== 'all'
        ? vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]
        : vehicles[0];
    if (!defaultVeh) return;
    setEditingId(null);
    setFormVehicleId(defaultVeh.id);
    setDate(getTodayISO());
    setOdometer(String(defaultVeh.currentOdometer || ''));
    const ft = defaultVeh.fuelType || 'gasolina';
    setFuelType(ft);
    const defaultPrice = fuelPrices[ft] || 5.89;
    setPricePerLiter(String(defaultPrice));
    setLiters('');
    setTotalAmount('');
    setIsFullTank(true);
    setIsAdditivated(false);
    setGasStation('');
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (r: Refueling) => {
    setEditingId(r.id);
    setFormVehicleId(r.vehicleId);
    setDate(r.date);
    setOdometer(String(r.odometer));
    setFuelType(r.fuelType);
    setPricePerLiter(String(r.pricePerLiter));
    setLiters(String(r.liters));
    setTotalAmount(String(r.totalAmount));
    setIsFullTank(r.isFullTank);
    setIsAdditivated(Boolean(r.isAdditivated));
    setGasStation(r.gasStation || '');
    setNotes(r.notes || '');
    setModalOpen(true);
  };

  const handlePriceOrLitersChange = (newPrice: string, newLiters: string) => {
    setPricePerLiter(newPrice);
    setLiters(newLiters);
    const p = parseFloat(newPrice.replace(',', '.'));
    const l = parseFloat(newLiters.replace(',', '.'));
    if (!isNaN(p) && !isNaN(l) && p > 0 && l > 0) {
      setTotalAmount((p * l).toFixed(2));
    }
  };

  const handleTotalChange = (newTotal: string) => {
    setTotalAmount(newTotal);
    const t = parseFloat(newTotal.replace(',', '.'));
    const p = parseFloat(pricePerLiter.replace(',', '.'));
    if (!isNaN(t) && !isNaN(p) && p > 0 && t > 0) {
      setLiters((t / p).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !user) return;
    const veh = vehicles.find((v) => v.id === formVehicleId);
    if (!veh) return;

    const p = parseFloat(pricePerLiter.replace(',', '.')) || 0;
    const l = parseFloat(liters.replace(',', '.')) || 0;
    const t = parseFloat(totalAmount.replace(',', '.')) || Number((p * l).toFixed(2));
    const odo = Number(odometer) || 0;

    if (l <= 0 || t <= 0 || odo <= 0) return;

    setSaving(true);
    try {
      const existingForVehicle = refuelings.filter((r) => r.vehicleId === veh.id);
      await FleetService.saveRefueling(
        activeCompany.id,
        veh,
        {
          ...(editingId ? { id: editingId } : {}),
          vehicleId: veh.id,
          date,
          odometer: odo,
          fuelType,
          pricePerLiter: p,
          liters: l,
          totalAmount: t,
          isFullTank,
          isAdditivated,
          gasStation: gasStation.trim(),
          notes: notes.trim(),
          registeredBy: user.email || '',
          driverName: user.name || user.email?.split('@')[0] || '',
        },
        existingForVehicle
      );
      await refreshFleetData();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Refueling) => {
    if (!activeCompany || !confirm('Excluir este abastecimento?')) return;
    const veh = vehicles.find((v) => v.id === r.vehicleId);
    if (!veh) return;
    const existingForVehicle = refuelings.filter((item) => item.vehicleId === veh.id);
    await FleetService.deleteRefueling(activeCompany.id, veh, r.id, existingForVehicle);
    await refreshFleetData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa, veículo, posto ou motorista..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={openNew}
          disabled={vehicles.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Registrar Abastecimento
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
          <Fuel className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          Nenhum abastecimento encontrado.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Combustível</th>
                  <th className="px-4 py-3">Odômetro</th>
                  <th className="px-4 py-3">Litros / Preço</th>
                  <th className="px-4 py-3">Consumo</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r) => {
                  const v = vehicles.find((veh) => veh.id === r.vehicleId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {formatDateToBR(r.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold">{v?.name || r.plate}</p>
                        <p className="text-xs text-slate-500">
                          {v?.plate} {r.gasStation ? `• ${r.gasStation}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800">
                          {FUEL_LABELS[r.fuelType]}
                          {r.isAdditivated ? ' Adit.' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatNumber(r.odometer)} km
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold">{formatNumber(r.liters, 2)} L</p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(r.pricePerLiter)}/L
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.consumptionKmPerLiter ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {r.consumptionKmPerLiter.toFixed(1)} km/L
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {r.isFullTank ? 'Base' : 'Parcial'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-extrabold whitespace-nowrap">
                        {formatCurrency(r.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingId ? 'Editar Abastecimento' : 'Novo Abastecimento'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Veículo *</label>
                  <select
                    value={formVehicleId}
                    onChange={(e) => {
                      const v = vehicles.find((item) => item.id === e.target.value);
                      setFormVehicleId(e.target.value);
                      if (v && !editingId) {
                        setOdometer(String(v.currentOdometer));
                        setFuelType(v.fuelType);
                      }
                    }}
                    disabled={Boolean(editingId)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.plate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Odômetro (km) *</label>
                  <input
                    type="number"
                    required
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Combustível *</label>
                  <select
                    value={fuelType}
                    onChange={(e) => {
                      const ft = e.target.value as FuelType;
                      setFuelType(ft);
                      if (!editingId && fuelPrices[ft]) {
                        handlePriceOrLitersChange(String(fuelPrices[ft]), liters);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  >
                    {Object.entries(FUEL_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Preço/L (R$) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={pricePerLiter}
                    onChange={(e) => handlePriceOrLitersChange(e.target.value, liters)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Litros *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={liters}
                    onChange={(e) => handlePriceOrLitersChange(pricePerLiter, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFullTank}
                    onChange={(e) => setIsFullTank(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  Tanque Cheio (calcula km/L)
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAdditivated}
                    onChange={(e) => setIsAdditivated(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  Combustível Aditivado
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Posto de Combustível</label>
                <input
                  type="text"
                  value={gasStation}
                  onChange={(e) => setGasStation(e.target.value)}
                  placeholder="Ex: Posto Shell Rodovia"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observações</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Viagem, rota, número da nota..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar Abastecimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
