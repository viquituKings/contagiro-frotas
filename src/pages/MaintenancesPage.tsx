import React, { useMemo, useState } from 'react';
import { Wrench, AlertTriangle, Plus, Trash2, Edit2, Settings2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Calculations } from '@/services/calculations';
import { FleetService } from '@/services/fleetService';
import { MaintenanceCategory, MaintenanceItem } from '@/types/fleet';
import {
  formatCurrency,
  formatNumber,
  getMaintenanceCategoryLabel,
  MAINTENANCE_CATEGORIES,
  SIDE_OPTIONS,
} from '@/utils/format';
import { formatDateToBR, getTodayISO } from '@/utils/date';

export function MaintenancesPage() {
  const { user, activeCompany, vehicles, maintenances, selectedVehicleId, refreshFleetData } =
    useAuth();

  const [tab, setTab] = useState<'alertas' | 'historico'>('alertas');
  const [modalOpen, setModalOpen] = useState(false);
  const [periodicModalOpen, setPeriodicModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formVehicleId, setFormVehicleId] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('oleo_filtro');
  const [title, setTitle] = useState('Troca de Óleo e Filtro');
  const [date, setDate] = useState(getTodayISO());
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [side, setSide] = useState('');
  const [notes, setNotes] = useState('');

  // Periodicidade
  const [perVehicleId, setPerVehicleId] = useState('');
  const [trocaOleoKm, setTrocaOleoKm] = useState('10000');
  const [revisaoKm, setRevisaoKm] = useState('10000');
  const [ultimaTrocaOleoKm, setUltimaTrocaOleoKm] = useState('');
  const [ultimaRevisaoKm, setUltimaRevisaoKm] = useState('');

  const filteredMaintenances = useMemo(() => {
    return selectedVehicleId === 'all'
      ? maintenances
      : maintenances.filter((m) => m.vehicleId === selectedVehicleId);
  }, [maintenances, selectedVehicleId]);

  const alerts = useMemo(() => {
    const target =
      selectedVehicleId === 'all'
        ? vehicles
        : vehicles.filter((v) => v.id === selectedVehicleId);
    return target.flatMap((v) => {
      const vMnts = maintenances.filter((m) => m.vehicleId === v.id);
      return Calculations.getMaintenanceAlerts(v.currentOdometer, vMnts, v).map((a) => ({
        ...a,
        vehicle: v,
      }));
    });
  }, [vehicles, selectedVehicleId, maintenances]);

  const openNew = () => {
    const veh =
      selectedVehicleId !== 'all'
        ? vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]
        : vehicles[0];
    if (!veh) return;
    setEditingId(null);
    setFormVehicleId(veh.id);
    setCategory('oleo_filtro');
    setTitle('Troca de Óleo e Filtro');
    setDate(getTodayISO());
    setOdometer(String(veh.currentOdometer));
    setCost('');
    setWorkshop('');
    setSide('');
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (m: MaintenanceItem) => {
    setEditingId(m.id);
    setFormVehicleId(m.vehicleId);
    setCategory(m.category);
    setTitle(m.title);
    setDate(m.date);
    setOdometer(String(m.odometer));
    setCost(String(m.cost));
    setWorkshop(m.workshop || '');
    setSide(m.side || '');
    setNotes(m.notes || '');
    setModalOpen(true);
  };

  const openPeriodic = () => {
    const veh =
      selectedVehicleId !== 'all'
        ? vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]
        : vehicles[0];
    if (!veh) return;
    setPerVehicleId(veh.id);
    setTrocaOleoKm(String(veh.trocaOleoKm || (veh.vehicleType === 'moto' ? 3000 : 10000)));
    setRevisaoKm(String(veh.revisaoKm || (veh.vehicleType === 'moto' ? 6000 : 10000)));
    setUltimaTrocaOleoKm(String(veh.ultimaTrocaOleoKm || veh.currentOdometer || 0));
    setUltimaRevisaoKm(String(veh.ultimaRevisaoKm || veh.currentOdometer || 0));
    setPeriodicModalOpen(true);
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !user) return;
    const veh = vehicles.find((v) => v.id === formVehicleId);
    if (!veh) return;

    setSaving(true);
    try {
      const sideOption = SIDE_OPTIONS.find((s) => s.value === side);
      const existing = maintenances.filter((m) => m.vehicleId === veh.id);
      await FleetService.saveMaintenance(
        activeCompany.id,
        veh,
        {
          ...(editingId ? { id: editingId } : {}),
          vehicleId: veh.id,
          date,
          odometer: Number(odometer) || veh.currentOdometer,
          category,
          title: title.trim() || getMaintenanceCategoryLabel(category),
          cost: parseFloat(cost.replace(',', '.')) || 0,
          workshop: workshop.trim(),
          side: side || undefined,
          sideLabel: sideOption && side ? sideOption.label : undefined,
          notes: notes.trim(),
          isCompleted: true,
          registeredBy: user.email || '',
        },
        existing
      );
      await refreshFleetData();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePeriodic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    const veh = vehicles.find((v) => v.id === perVehicleId);
    if (!veh) return;
    const oilInt = Number(trocaOleoKm) || 10000;
    const revInt = Number(revisaoKm) || 10000;
    const lastOil = Number(ultimaTrocaOleoKm) || 0;
    const lastRev = Number(ultimaRevisaoKm) || 0;

    setSaving(true);
    try {
      await FleetService.saveVehicle(activeCompany.id, {
        ...veh,
        cadManPeriodica: true,
        trocaOleoKm: oilInt,
        revisaoKm: revInt,
        ultimaTrocaOleoKm: lastOil,
        proxTrocaOleoKm: lastOil + oilInt,
        ultimaRevisaoKm: lastRev,
        proxRevKm: lastRev + revInt,
      });
      await refreshFleetData();
      setPeriodicModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: MaintenanceItem) => {
    if (!activeCompany || !confirm('Excluir este registro de manutenção?')) return;
    const veh = vehicles.find((v) => v.id === m.vehicleId);
    if (!veh) return;
    const existing = maintenances.filter((item) => item.vehicleId === veh.id);
    await FleetService.deleteMaintenance(activeCompany.id, veh, m.id, existing);
    await refreshFleetData();
  };

  const selectedCatOption = MAINTENANCE_CATEGORIES.find((c) => c.value === category);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
          <button
            onClick={() => setTab('alertas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              tab === 'alertas'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Alertas Preventivos ({alerts.length})
          </button>
          <button
            onClick={() => setTab('historico')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              tab === 'historico'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Histórico de Serviços ({filteredMaintenances.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openPeriodic}
            disabled={vehicles.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <Settings2 className="w-4 h-4 text-emerald-500" />
            Periodicidade
          </button>
          <button
            onClick={openNew}
            disabled={vehicles.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Registrar Serviço
          </button>
        </div>
      </div>

      {tab === 'alertas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((a, idx) => {
            const badgeColor =
              a.status === 'vencido'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : a.status === 'alerta'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : a.status === 'atencao'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

            return (
              <div
                key={`${a.vehicle.id}-${a.category}-${idx}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        a.status === 'vencido'
                          ? 'text-red-500'
                          : a.status === 'alerta'
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                      }`}
                    />
                    <h4 className="font-bold text-sm">{a.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    {a.vehicle.name} ({a.vehicle.plate}) • Atual: {formatNumber(a.currentKm)} km
                  </p>
                  <p className="text-xs text-slate-500">
                    Previsto: {formatNumber(a.dueKm)} km • Estimativa:{' '}
                    {formatCurrency(a.estimatedCost)}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${badgeColor}`}>
                  {a.status === 'vencido'
                    ? `Vencido (${formatNumber(Math.abs(a.kmRemaining || 0))} km)`
                    : `${formatNumber(a.kmRemaining)} km`}
                </span>
              </div>
            );
          })}
        </div>
      ) : filteredMaintenances.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
          <Wrench className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          Nenhuma manutenção registrada.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Serviço / Categoria</th>
                  <th className="px-4 py-3">Odômetro</th>
                  <th className="px-4 py-3">Oficina</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMaintenances.map((m) => {
                  const v = vehicles.find((veh) => veh.id === m.vehicleId);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateToBR(m.date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold">{v?.name || 'Veículo'}</p>
                        <p className="text-xs text-slate-500">{v?.plate}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{m.title}</p>
                        <p className="text-xs text-slate-500">
                          {getMaintenanceCategoryLabel(m.category)}
                          {m.sideLabel ? ` • ${m.sideLabel}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatNumber(m.odometer)} km</td>
                      <td className="px-4 py-3">{m.workshop || '—'}</td>
                      <td className="px-4 py-3 font-extrabold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {formatCurrency(m.cost)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
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

      {/* Modal Manutenção */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingId ? 'Editar Serviço' : 'Registrar Serviço / Oficina'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Veículo *</label>
                  <select
                    value={formVehicleId}
                    onChange={(e) => setFormVehicleId(e.target.value)}
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
                  <label className="block text-xs font-semibold mb-1">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const c = e.target.value as MaintenanceCategory;
                      setCategory(c);
                      setTitle(getMaintenanceCategoryLabel(c));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  >
                    {MAINTENANCE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descrição do Serviço *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="block text-xs font-semibold mb-1">Odômetro *</label>
                  <input
                    type="number"
                    required
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
              </div>

              {selectedCatOption?.needsSide && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Posição / Lado</label>
                  <select
                    value={side}
                    onChange={(e) => setSide(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  >
                    {SIDE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">Oficina / Fornecedor</label>
                <input
                  type="text"
                  value={workshop}
                  onChange={(e) => setWorkshop(e.target.value)}
                  placeholder="Ex: Auto Center Silva"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observações / Peças</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
                >
                  {saving ? 'Salvando...' : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Periodicidade */}
      {periodicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePeriodic}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Configurar Periodicidade</h3>
              <button type="button" onClick={() => setPeriodicModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Veículo</label>
              <select
                value={perVehicleId}
                onChange={(e) => setPerVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.plate})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Intervalo Óleo (km)</label>
                <input
                  type="number"
                  value={trocaOleoKm}
                  onChange={(e) => setTrocaOleoKm(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Última Troca Óleo (km)</label>
                <input
                  type="number"
                  value={ultimaTrocaOleoKm}
                  onChange={(e) => setUltimaTrocaOleoKm(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Intervalo Revisão (km)</label>
                <input
                  type="number"
                  value={revisaoKm}
                  onChange={(e) => setRevisaoKm(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Última Revisão (km)</label>
                <input
                  type="number"
                  value={ultimaRevisaoKm}
                  onChange={(e) => setUltimaRevisaoKm(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPeriodicModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
              >
                {saving ? 'Salvando...' : 'Salvar Ciclos'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
