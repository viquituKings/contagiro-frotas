import React, { useMemo, useState } from 'react';
import { TrendingUp, Calculator, Fuel, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Calculations } from '@/services/calculations';
import { FleetService } from '@/services/fleetService';
import { formatCurrency, formatNumber } from '@/utils/format';

export function ForecastPage() {
  const { activeCompany, vehicles, refuelings, maintenances, fuelPrices, selectedVehicleId } =
    useAuth();

  const [gasPrice, setGasPrice] = useState(String(fuelPrices.gasolina || 5.89));
  const [ethPrice, setEthPrice] = useState(String(fuelPrices.etanol || 3.99));
  const [ratioPct, setRatioPct] = useState('70');
  const [savedPricesMsg, setSavedPricesMsg] = useState(false);

  const selectedVehicle =
    selectedVehicleId !== 'all' ? vehicles.find((v) => v.id === selectedVehicleId) || null : null;

  const forecast = useMemo(() => {
    if (selectedVehicle) {
      const vRefs = refuelings.filter((r) => r.vehicleId === selectedVehicle.id);
      const vMnts = maintenances.filter((m) => m.vehicleId === selectedVehicle.id);
      return Calculations.calculateFuelForecast(selectedVehicle, vRefs, vMnts, fuelPrices);
    }
    return Calculations.calculateFleetForecast(vehicles, refuelings, maintenances, fuelPrices);
  }, [selectedVehicle, vehicles, refuelings, maintenances, fuelPrices]);

  const flexResult = useMemo(() => {
    const g = parseFloat(gasPrice.replace(',', '.')) || 0;
    const e = parseFloat(ethPrice.replace(',', '.')) || 0;
    const r = (parseFloat(ratioPct) || 70) / 100;
    const tank = selectedVehicle?.tankCapacity || 50;
    return Calculations.calculateFlex(g, e, r, tank);
  }, [gasPrice, ethPrice, ratioPct, selectedVehicle]);

  const handleSaveGlobalPrices = async () => {
    if (!activeCompany) return;
    const g = parseFloat(gasPrice.replace(',', '.')) || 0;
    const e = parseFloat(ethPrice.replace(',', '.')) || 0;
    await FleetService.updateFuelPrices(activeCompany.id, { gasolina: g, etanol: e });
    setSavedPricesMsg(true);
    setTimeout(() => setSavedPricesMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs font-semibold text-slate-500">Projeção 30 Dias (Total)</span>
          <p className="text-2xl font-extrabold text-emerald-500 mt-1">
            {formatCurrency(forecast.totalProjectedCost30Days)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatNumber(forecast.projected30DaysKm)} km estimados
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs font-semibold text-slate-500">Combustível (30 dias)</span>
          <p className="text-2xl font-extrabold mt-1">
            {formatCurrency(forecast.projected30DaysCost)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Média diária: {formatNumber(forecast.averageDailyKm)} km/dia
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs font-semibold text-slate-500">Projeção 60 Dias</span>
          <p className="text-2xl font-extrabold mt-1">
            {formatCurrency(forecast.projected60DaysCost)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Apenas combustível</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs font-semibold text-slate-500">Projeção 90 Dias</span>
          <p className="text-2xl font-extrabold mt-1">
            {formatCurrency(forecast.projected90DaysCost)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Oficina prevista 30d: {formatCurrency(forecast.upcomingMaintenancesCost30Days)}
          </p>
        </div>
      </div>

      {/* Calculadora Flex */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Calculadora Flex Inteligente</h3>
              <p className="text-xs text-slate-500">
                Compare Etanol vs Gasolina com base nos preços praticados pela frota
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveGlobalPrices}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {savedPricesMsg ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Preços Salvos
              </>
            ) : (
              'Salvar Preços na Empresa'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1">Gasolina (R$/L)</label>
            <input
              type="number"
              step="0.01"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Etanol (R$/L)</label>
            <input
              type="number"
              step="0.01"
              value={ethPrice}
              onChange={(e) => setEthPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Eficiência Flex (%)</label>
            <input
              type="number"
              value={ratioPct}
              onChange={(e) => setRatioPct(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
            />
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Relação: {flexResult.ratio}% • Recomendado:
            </p>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
              {flexResult.recommendation}
            </p>
            <p className="text-[11px] text-slate-500">
              Economia/tanque: {formatCurrency(flexResult.savingsFullTank)}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown por veículo quando "Toda a Frota" */}
      {!selectedVehicle && forecast.vehicleBreakdowns && forecast.vehicleBreakdowns.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Projeção por Veículo (Próximos 30 dias)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecast.vehicleBreakdowns.map(({ vehicle, forecast: vf }) => (
              <div
                key={vehicle.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{vehicle.name}</span>
                  <span className="text-xs font-mono text-slate-500">{vehicle.plate}</span>
                </div>
                {vf.isInactive ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5" />
                    Sem atividade nos últimos 30 dias
                  </p>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Km projetado:</span>
                      <span className="font-semibold">{formatNumber(vf.projected30DaysKm)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Combustível:</span>
                      <span className="font-semibold">{formatCurrency(vf.projected30DaysCost)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="font-bold">Total 30d:</span>
                      <span className="font-extrabold text-emerald-500">
                        {formatCurrency(vf.totalProjectedCost30Days)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
