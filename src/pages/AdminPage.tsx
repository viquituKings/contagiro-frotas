import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Building2,
  UserPlus,
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthService } from '@/services/authService';
import { FleetService } from '@/services/fleetService';
import { Company, MemberRole, SystemUser } from '@/types/fleet';
import { ROLE_LABELS } from '@/utils/format';

export function AdminPage() {
  const { user, refreshCompanies } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Modal Empresa
  const [companyModal, setCompanyModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compCnpj, setCompCnpj] = useState('');
  const [compSegment, setCompSegment] = useState('Transporte e Logística');

  // Modal Usuário
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uCompanyIds, setUCompanyIds] = useState<string[]>([]);
  const [uRole, setURole] = useState<MemberRole>('motorista');
  const [uIsAdmin, setUIsAdmin] = useState(false);
  const [uStatus, setUStatus] = useState<'ativo' | 'inativo'>('ativo');

  // Modal Troca de Senha pelo Admin
  const [resetModalUser, setResetModalUser] = useState<SystemUser | null>(null);
  const [newPass, setNewPass] = useState('');

  const showMsg = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [comps, usrs] = await Promise.all([
        AuthService.getAllCompanies(),
        AuthService.getAllSystemUsers(),
      ]);
      setCompanies(comps);
      setUsers(usrs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (!user?.isSystemAdmin) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-sm text-red-500">
        Acesso restrito ao Administrador do Sistema.
      </div>
    );
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await FleetService.createCompany({
        name: compName,
        cnpj: compCnpj,
        segment: compSegment,
        ownerId: user.id,
        ownerEmail: user.email,
        ownerName: user.name,
      });
      setCompanyModal(false);
      setCompName('');
      setCompCnpj('');
      await loadAll();
      await refreshCompanies();
      showMsg('ok', 'Empresa cadastrada com sucesso!');
    } catch (err: unknown) {
      showMsg('err', err instanceof Error ? err.message : 'Erro ao criar empresa.');
    }
  };

  const openNewUser = () => {
    setEditingUser(null);
    setUName('');
    setUEmail('');
    setUPassword('');
    setUCompanyIds([]);
    setURole('motorista');
    setUIsAdmin(false);
    setUStatus('ativo');
    setUserModal(true);
  };

  const openEditUser = (u: SystemUser) => {
    setEditingUser(u);
    setUName(u.name);
    setUEmail(u.email);
    setUPassword('');
    const ids = Array.from(
      new Set([...(u.companyIds || []), ...(u.companyId ? [u.companyId] : [])].filter(Boolean))
    );
    setUCompanyIds(ids);
    setURole(u.role === 'system_admin' ? 'admin' : u.role);
    setUIsAdmin(u.isSystemAdmin);
    setUStatus(u.status);
    setUserModal(true);
  };

  const toggleUserCompany = (cid: string) => {
    setUCompanyIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uIsAdmin && uCompanyIds.length === 0) {
      showMsg('err', 'Selecione pelo menos uma empresa para o usuário.');
      return;
    }
    try {
      if (editingUser) {
        await AuthService.updateSystemUser(editingUser.id, {
          name: uName,
          companyIds: uIsAdmin ? [] : uCompanyIds,
          role: uIsAdmin ? 'system_admin' : uRole,
          isSystemAdmin: uIsAdmin,
          status: uStatus,
        });
        showMsg('ok', 'Usuário atualizado com sucesso!');
      } else {
        await AuthService.createSystemUser({
          name: uName,
          email: uEmail,
          password: uPassword,
          companyIds: uIsAdmin ? [] : uCompanyIds,
          role: uIsAdmin ? 'system_admin' : uRole,
          isSystemAdmin: uIsAdmin,
        });
        showMsg('ok', 'Usuário criado com sucesso!');
      }
      setUserModal(false);
      await loadAll();
    } catch (err: unknown) {
      showMsg('err', err instanceof Error ? err.message : 'Erro ao salvar usuário.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    try {
      await AuthService.adminResetPassword(resetModalUser.id, newPass);
      setResetModalUser(null);
      setNewPass('');
      showMsg('ok', `Senha de ${resetModalUser.name} alterada com sucesso!`);
    } catch (err: unknown) {
      showMsg('err', err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    }
  };

  const handleDeleteUser = async (u: SystemUser) => {
    if (u.id === user.id) {
      showMsg('err', 'Você não pode excluir seu próprio usuário logado.');
      return;
    }
    if (!confirm(`Excluir o usuário ${u.name} (${u.email})?`)) return;
    await AuthService.deleteSystemUser(u.id);
    await loadAll();
    showMsg('ok', 'Usuário excluído.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Administração do Sistema</h3>
            <p className="text-xs text-slate-500">
              Cadastre empresas, usuários clientes e gerencie senhas de acesso
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompanyModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            Nova Empresa
          </button>
          <button
            onClick={openNewUser}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Empresas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h4 className="font-bold text-base flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-emerald-500" />
          Empresas Cadastradas ({companies.length})
        </h4>
        {companies.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma empresa cadastrada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
              >
                <p className="font-bold text-sm">{c.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.cnpj || 'Sem CNPJ'} • {c.segment || 'Frota'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usuários */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h4 className="font-bold text-base">Usuários do Sistema ({users.length})</h4>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nome / E-mail</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const uIds = Array.from(
                    new Set(
                      [...(u.companyIds || []), ...(u.companyId ? [u.companyId] : [])].filter(Boolean)
                    )
                  );
                  const linkedCompanies = companies.filter((c) => uIds.includes(c.id));
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <p className="font-bold">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {u.isSystemAdmin ? (
                          <span className="text-xs font-semibold text-emerald-500">
                            Acesso Global (Sistema)
                          </span>
                        ) : linkedCompanies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {linkedCompanies.map((c) => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sem empresa</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800">
                          {u.isSystemAdmin
                            ? 'Admin do Sistema'
                            : ROLE_LABELS[u.role as MemberRole] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            u.status === 'ativo'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPass('');
                          }}
                          title="Trocar senha do usuário"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditUser(u)}
                          title="Editar usuário"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 ml-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Excluir usuário"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Empresa */}
      {companyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCompany}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Cadastrar Nova Empresa</h3>
              <button type="button" onClick={() => setCompanyModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nome da Empresa *</label>
              <input
                type="text"
                required
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="Ex: Transportadora Alpha"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">CNPJ</label>
              <input
                type="text"
                value={compCnpj}
                onChange={(e) => setCompCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Segmento</label>
              <input
                type="text"
                value={compSegment}
                onChange={(e) => setCompSegment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompanyModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
              >
                Criar Empresa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Criar / Editar Usuário */}
      {userModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h3>
              <button type="button" onClick={() => setUserModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Nome completo *</label>
              <input
                type="text"
                required
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">E-mail de acesso *</label>
              <input
                type="email"
                required
                disabled={Boolean(editingUser)}
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm disabled:opacity-60"
              />
            </div>

            {!editingUser && (
              <div>
                <label className="block text-xs font-semibold mb-1">Senha inicial *</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>
            )}

            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={uIsAdmin}
                onChange={(e) => setUIsAdmin(e.target.checked)}
                className="rounded text-emerald-500"
              />
              Administrador Geral do Sistema
            </label>

            {!uIsAdmin && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Empresas Vinculadas * ({uCompanyIds.length} selecionada(s))
                  </label>
                  {companies.length === 0 ? (
                    <p className="text-xs text-amber-500">
                      Cadastre pelo menos uma empresa antes de vincular usuários.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 space-y-1">
                      {companies.map((c) => {
                        const checked = uCompanyIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUserCompany(c.id)}
                              className="rounded text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="font-medium truncate">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Perfil nas Empresas</label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as MemberRole)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  >
                    <option value="motorista">Motorista</option>
                    <option value="gestor">Gestor de Frota</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
            )}

            {editingUser && (
              <div>
                <label className="block text-xs font-semibold mb-1">Status</label>
                <select
                  value={uStatus}
                  onChange={(e) => setUStatus(e.target.value as 'ativo' | 'inativo')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
              >
                Salvar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Trocar Senha de Usuário */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleResetPassword}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Redefinir Senha</h3>
              <button type="button" onClick={() => setResetModalUser(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Definir nova senha para <strong>{resetModalUser.name}</strong> ({resetModalUser.email})
            </p>
            <input
              type="password"
              required
              minLength={4}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Nova senha (mín. 4 caracteres)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold"
              >
                Salvar Nova Senha
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
