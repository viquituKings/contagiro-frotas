import React, { useMemo, useState } from 'react';
import {
  Fuel,
  Wrench,
  Gauge,
  AlertTriangle,
  Printer,
  TrendingUp,
  Car,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Calculations } from '@/services/calculations';
import { FleetService } from '@/services/fleetService';
import { formatCurrency, formatNumber, VEHICLE_STATUS_LABELS } from '@/utils/format';
import { formatDateToBR } from '@/utils/date';
import { NavTab } from '@/components/Layout';

export function DashboardPage({ onNavigate }: { onNavigate: (tab: NavTab) => void }) {
  const {
    activeCompany,
    vehicles,
    refuelings,
    maintenances,
    selectedVehicleId,
    refreshFleetData,
  } = useAuth();

  const [odometerModal, setOdometerModal] = useState(false);
  const [newOdometer, setNewOdometer] = useState('');
  const [savingOdometer, setSavingOdometer] = useState(false);

  const selectedVehicle =
    selectedVehicleId !== 'all' ? vehicles.find((v) => v.id === selectedVehicleId) || null : null;

  const filteredRefuelings = useMemo(
    () =>
      selectedVehicle
        ? refuelings.filter((r) => r.vehicleId === selectedVehicle.id)
        : refuelings,
    [refuelings, selectedVehicle]
  );

  const filteredMaintenances = useMemo(
    () =>
      selectedVehicle
        ? maintenances.filter((m) => m.vehicleId === selectedVehicle.id)
        : maintenances,
    [maintenances, selectedVehicle]
  );

  const stats = useMemo(() => {
    if (selectedVehicle) {
      return Calculations.getVehicleStats(
        selectedVehicle,
        filteredRefuelings,
        filteredMaintenances
      );
    }
    // Consolidado da frota
    const totalFuelSpent = refuelings.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
    const totalLiters = refuelings.reduce((acc, r) => acc + Number(r.liters || 0), 0);
    const totalMaintenanceSpent = maintenances.reduce((acc, m) => acc + Number(m.cost || 0), 0);
    const validConsumptions = refuelings
      .map((r) => r.consumptionKmPerLiter)
      .filter((c): c is number => typeof c === 'number' && c > 0 && c < 60);
    const avgConsumption =
      validConsumptions.length > 0
        ? Number(
            (validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length).toFixed(2)
          )
        : 0;
    const validCosts = refuelings
      .map((r) => r.costPerKm)
      .filter((c): c is number => typeof c === 'number' && c > 0);
    const avgCostPerKm =
      validCosts.length > 0
        ? Number((validCosts.reduce((a, b) => a + b, 0) / validCosts.length).toFixed(2))
        : 0;

    return {
      totalSpent: Number((totalFuelSpent + totalMaintenanceSpent).toFixed(2)),
      totalFuelSpent: Number(totalFuelSpent.toFixed(2)),
      totalLiters: Number(totalLiters.toFixed(2)),
      totalMaintenanceSpent: Number(totalMaintenanceSpent.toFixed(2)),
      averageConsumption: avgConsumption,
      averageCostPerKm: avgCostPerKm,
      refuelingsCount: refuelings.length,
      maintenancesCount: maintenances.length,
    };
  }, [selectedVehicle, filteredRefuelings, filteredMaintenances, refuelings, maintenances]);

  const allAlerts = useMemo(() => {
    const targetVehicles = selectedVehicle ? [selectedVehicle] : vehicles;
    return targetVehicles.flatMap((v) => {
      const vMnts = maintenances.filter((m) => m.vehicleId === v.id);
      return Calculations.getMaintenanceAlerts(v.currentOdometer, vMnts, v).map((a) => ({
        ...a,
        vehicleName: v.name,
        vehiclePlate: v.plate,
      }));
    });
  }, [vehicles, selectedVehicle, maintenances]);

  const criticalAlerts = allAlerts.filter((a) => a.status === 'vencido' || a.status === 'alerta');

  const handleSaveOdometer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !selectedVehicle) return;
    const val = Number(newOdometer);
    if (isNaN(val) || val < selectedVehicle.currentOdometer) return;
    setSavingOdometer(true);
    try {
      await FleetService.updateVehicleOdometer(activeCompany.id, selectedVehicle.id, val);
      await refreshFleetData();
      setOdometerModal(false);
    } finally {
      setSavingOdometer(false);
    }
  };

  if (vehicles.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center max-w-xl mx-auto mt-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
          <Car className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold mb-2">Sua frota ainda está vazia</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Cadastre o primeiro veículo da empresa para começar a controlar abastecimentos,
          manutenções preventivas e previsões financeiras.
        </p>
        <button
          onClick={() => onNavigate('garagem')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20"
        >
          Cadastrar Primeiro Veículo
        </button>
      </div>
    );
  }

  const fuelPct =
    stats.totalSpent > 0 ? Math.round((stats.totalFuelSpent / stats.totalSpent) * 100) : 0;
  const mntPct = stats.totalSpent > 0 ? 100 - fuelPct : 0;
  const maxConsumption = Math.max(
    ...vehicles.map((v) => v.mediaGeralKmPorLitro || 0),
    15
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório / Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold">
            {selectedVehicle
              ? `${selectedVehicle.name} (${selectedVehicle.plate})`
              : `Visão Geral — ${activeCompany?.name}`}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedVehicle
              ? `Odômetro atual: ${formatNumber(selectedVehicle.currentOdometer)} km • Status: ${
                  VEHICLE_STATUS_LABELS[selectedVehicle.status || 'ativo']
                }`
              : `${vehicles.filter((v) => (v.status || 'ativo') === 'ativo').length} ativo(s) de ${
                  vehicles.length
                } veículo(s)`}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          {selectedVehicle && (
            <button
              onClick={() => {
                setNewOdometer(String(selectedVehicle.currentOdometer));
                setOdometerModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
              Atualizar Km
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gasto Total Acumulado
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold">{formatCurrency(stats.totalSpent)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.refuelingsCount} abast. • {stats.maintenancesCount} serviços
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Combustível
            </span>
            <Fuel className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold">{formatCurrency(stats.totalFuelSpent)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {formatNumber(stats.totalLiters, 1)} L abastecidos
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Oficina & Manutenções
            </span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold">{formatCurrency(stats.totalMaintenanceSpent)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {criticalAlerts.length > 0
              ? `${criticalAlerts.length} alerta(s) crítico(s)`
              : 'Preventivas em dia'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Consumo Médio / Custo km
            </span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold">
            {stats.averageConsumption > 0 ? `${stats.averageConsumption.toFixed(1)} km/L` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.averageCostPerKm > 0
              ? `${formatCurrency(stats.averageCostPerKm)} / km`
              : 'Aguardando 2º tanque cheio'}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras: Consumo por Veículo */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h4 className="font-bold text-base mb-1">Média de Consumo por Veículo (km/L)</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Comparativo de eficiência energética entre os veículos da frota
          </p>
          <div className="space-y-3">
            {vehicles.map((v) => {
              const val = Number((v.mediaGeralKmPorLitro || 0).toFixed(1));
              const pct = val > 0 ? Math.max(8, Math.round((val / maxConsumption) * 100)) : 0;
              return (
                <div key={v.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>
                      {v.name} <span className="text-slate-400">({v.plate})</span>
                    </span>
                    <span className={val > 0 ? 'text-emerald-500' : 'text-slate-400'}>
                      {val > 0 ? `${val.toFixed(1)} km/L` : 'Sem média'}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        v.id === selectedVehicleId ? 'bg-emerald-500' : 'bg-emerald-500/70'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Proporção Combustível vs Oficina */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-base mb-1">Distribuição de Custos</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Combustível vs Oficina
            </p>
          </div>

          <div className="flex items-center justify-center my-4">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="3.5"
                />
                {stats.totalSpent > 0 && (
                  <>
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3.5"
                      strokeDasharray={`${fuelPct} ${100 - fuelPct}`}
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="3.5"
                      strokeDasharray={`${mntPct} ${100 - mntPct}`}
                      strokeDashoffset={-fuelPct}
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] text-slate-400">Total</span>
                <span className="text-sm font-extrabold">{formatCurrency(stats.totalSpent)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Combustível
              </span>
              <span className="font-bold">
                {fuelPct}% ({formatCurrency(stats.totalFuelSpent)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Oficina
              </span>
              <span className="font-bold">
                {mntPct}% ({formatCurrency(stats.totalMaintenanceSpent)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Preventivos & Últimos Abastecimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertas de Manutenção Preventiva
            </h4>
            <button
              onClick={() => onNavigate('manutencoes')}
              className="text-xs font-semibold text-emerald-500 hover:underline no-print"
            >
              Ver todos
            </button>
          </div>
          {criticalAlerts.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              Nenhuma manutenção vencida ou em alerta crítico.
            </div>
          ) : (
            <div className="space-y-2.5">
              {criticalAlerts.slice(0, 5).map((alert, idx) => (
                <div
                  key={`${alert.vehiclePlate}-${alert.category}-${idx}`}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {alert.title} — <span className="text-slate-500">{alert.vehicleName}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Placa {alert.vehiclePlate} • Previsto para {formatNumber(alert.dueKm)} km
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                      alert.status === 'vencido'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {alert.status === 'vencido'
                      ? `Vencido (${formatNumber(Math.abs(alert.kmRemaining || 0))} km)`
                      : `Faltam ${formatNumber(alert.kmRemaining)} km`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-500" />
              Últimos Abastecimentos
            </h4>
            <button
              onClick={() => onNavigate('abastecimentos')}
              className="text-xs font-semibold text-emerald-500 hover:underline no-print"
            >
              Novo abastecimento
            </button>
          </div>
          {filteredRefuelings.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Nenhum abastecimento registrado ainda.
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredRefuelings.slice(0, 5).map((r) => {
                const v = vehicles.find((veh) => veh.id === r.vehicleId);
                return (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold">
                        {v?.name || r.plate} • {formatDateToBR(r.date)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatNumber(r.liters, 2)} L • {formatNumber(r.odometer)} km
                        {r.consumptionKmPerLiter ? ` • ${r.consumptionKmPerLiter} km/L` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(r.totalAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Odômetro */}
      {odometerModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
          <form
            onSubmit={handleSaveOdometer}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-sm space-y-4"
          >
            <h4 className="font-bold text-lg">Atualizar Odômetro</h4>
            <p className="text-xs text-slate-500">
              {selectedVehicle.name} ({selectedVehicle.plate}) — Atual:{' '}
              {formatNumber(selectedVehicle.currentOdometer)} km
            </p>
            <input
              type="number"
              required
              min={selectedVehicle.currentOdometer}
              value={newOdometer}
              onChange={(e) => setNewOdometer(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOdometerModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingOdometer}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold"
              >
                {savingOdometer ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
