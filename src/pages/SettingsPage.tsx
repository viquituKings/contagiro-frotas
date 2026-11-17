import React, { useEffect, useState } from 'react';
import { Users, Building2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FleetService } from '@/services/fleetService';
import { CompanyMember } from '@/types/fleet';
import { ROLE_LABELS } from '@/utils/format';

export function SettingsPage() {
  const { user, activeCompany, activeRole, refreshCompanies, changePassword } = useAuth();
  const [members, setMembers] = useState<CompanyMember[]>([]);

  const [companyName, setCompanyName] = useState(activeCompany?.name || '');
  const [companyCnpj, setCompanyCnpj] = useState(activeCompany?.cnpj || '');
  const [companySegment, setCompanySegment] = useState(activeCompany?.segment || '');
  const [savedCompany, setSavedCompany] = useState(false);

  // Troca de senha do próprio usuário (cliente ou admin)
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  const canManage = activeRole === 'admin' || activeRole === 'gestor' || user?.isSystemAdmin;

  useEffect(() => {
    if (activeCompany) {
      setCompanyName(activeCompany.name);
      setCompanyCnpj(activeCompany.cnpj || '');
      setCompanySegment(activeCompany.segment || '');
      FleetService.getCompanyMembers(activeCompany.id).then(setMembers);
    }
  }, [activeCompany?.id]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !canManage) return;
    await FleetService.updateCompany(activeCompany.id, {
      name: companyName.trim(),
      cnpj: companyCnpj.trim(),
      segment: companySegment.trim(),
    });
    await refreshCompanies();
    setSavedCompany(true);
    setTimeout(() => setSavedCompany(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass !== confirmPass) {
      setPassMsg({ type: 'err', text: 'A confirmação da nova senha não confere.' });
      return;
    }
    setSavingPass(true);
    try {
      await changePassword(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setPassMsg({ type: 'ok', text: 'Senha alterada com sucesso!' });
    } catch (err: unknown) {
      setPassMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao alterar senha.',
      });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Alterar Minha Senha (para Clientes e Admin) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <KeyRound className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="font-bold text-base">Alterar Minha Senha</h3>
            <p className="text-xs text-slate-500">
              Conectado como <strong>{user?.name}</strong> ({user?.email})
            </p>
          </div>
        </div>

        {passMsg && (
          <div
            className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-sm ${
              passMsg.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            }`}
          >
            {passMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{passMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Senha Atual *</label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nova Senha *</label>
              <input
                type="password"
                required
                minLength={4}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Confirmar Nova Senha *</label>
              <input
                type="password"
                required
                minLength={4}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPass}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-60"
          >
            {savingPass ? 'Salvando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>

      {/* Dados da Empresa */}
      {activeCompany && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base">Dados da Empresa</h3>
          </div>
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">CNPJ</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={companyCnpj}
                  onChange={(e) => setCompanyCnpj(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Segmento</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={companySegment}
                  onChange={(e) => setCompanySegment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm disabled:opacity-60"
                />
              </div>
            </div>
            {canManage && (
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                {savedCompany ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Dados Atualizados
                  </>
                ) : (
                  'Salvar Dados da Empresa'
                )}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Equipe */}
      {activeCompany && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Users className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base">Equipe da Empresa ({members.length})</h3>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum membro vinculado a esta empresa.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => (
                <div key={m.uid} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {ROLE_LABELS[m.role]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
