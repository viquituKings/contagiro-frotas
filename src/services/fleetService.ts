import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/services/firebase';
import {
  Company,
  CompanyInvite,
  CompanyMember,
  FuelPrices,
  FuelType,
  MaintenanceItem,
  MemberRole,
  Refueling,
  UserProfile,
  Vehicle,
} from '@/types/fleet';
import { compareDatesDesc } from '@/utils/date';

function sortRefuelingsDesc(list: Refueling[]): Refueling[] {
  return [...list].sort((a, b) => {
    const cmp = compareDatesDesc(a, b);
    if (cmp !== 0) return cmp;
    return Number(b.odometer || 0) - Number(a.odometer || 0);
  });
}

function sortMaintenancesDesc(list: MaintenanceItem[]): MaintenanceItem[] {
  return [...list].sort((a, b) => {
    const cmp = compareDatesDesc(a, b);
    if (cmp !== 0) return cmp;
    return Number(b.odometer || 0) - Number(a.odometer || 0);
  });
}

export const FleetService = {
  // =========================================================================
  // USUÁRIO & EMPRESAS (MULTI-TENANT)
  // =========================================================================
  async ensureUserProfile(uid: string, email: string, displayName: string, photoURL?: string): Promise<UserProfile> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const profile: UserProfile = {
      uid,
      email: email.toLowerCase().trim(),
      displayName: displayName || email.split('@')[0],
      photoURL: photoURL || '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, profile);
    return profile;
  },

  async getUserCompanies(uid: string): Promise<{ company: Company; role: MemberRole }[]> {
    const membersQuery = query(collectionGroup(db, 'members'), where('uid', '==', uid));
    const snap = await getDocs(membersQuery);
    const results: { company: Company; role: MemberRole }[] = [];

    for (const memberDoc of snap.docs) {
      const memberData = memberDoc.data() as CompanyMember;
      if (memberData.status === 'inativo') continue;
      const companyRef = memberDoc.ref.parent.parent;
      if (!companyRef) continue;
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists()) {
        results.push({
          company: { id: companySnap.id, ...(companySnap.data() as Omit<Company, 'id'>) },
          role: memberData.role,
        });
      }
    }
    return results;
  },

  async createCompany(params: {
    name: string;
    cnpj?: string;
    segment?: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
  }): Promise<Company> {
    const now = new Date().toISOString();
    const companyRef = doc(collection(db, 'companies'));
    const companyData: Omit<Company, 'id'> = {
      name: params.name.trim(),
      cnpj: params.cnpj?.trim() || '',
      segment: params.segment?.trim() || 'Transporte / Logística',
      ownerId: params.ownerId,
      ownerEmail: params.ownerEmail.toLowerCase().trim(),
      createdAt: now,
      updatedAt: now,
    };

    const batch = writeBatch(db);
    batch.set(companyRef, companyData);
    batch.set(doc(db, 'companies', companyRef.id, 'members', params.ownerId), {
      uid: params.ownerId,
      email: params.ownerEmail.toLowerCase().trim(),
      name: params.ownerName || params.ownerEmail.split('@')[0],
      role: 'admin',
      status: 'ativo',
      joinedAt: now,
    } satisfies CompanyMember);

    batch.set(
      doc(db, 'users', params.ownerId),
      { defaultCompanyId: companyRef.id },
      { merge: true }
    );

    await batch.commit();
    return { id: companyRef.id, ...companyData };
  },

  async updateCompany(companyId: string, data: Partial<Company>): Promise<void> {
    await updateDoc(doc(db, 'companies', companyId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async getPendingInvitesForEmail(email: string): Promise<CompanyInvite[]> {
    const normalized = email.toLowerCase().trim();
    const q = query(
      collection(db, 'invites'),
      where('email', '==', normalized),
      where('status', '==', 'pendente')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CompanyInvite, 'id'>) }));
  },

  async acceptInvite(invite: CompanyInvite, uid: string, name: string): Promise<void> {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.set(doc(db, 'companies', invite.companyId, 'members', uid), {
      uid,
      email: invite.email.toLowerCase().trim(),
      name: name || invite.email.split('@')[0],
      role: invite.role,
      status: 'ativo',
      joinedAt: now,
    } satisfies CompanyMember);
    batch.update(doc(db, 'invites', invite.id), { status: 'aceito' });
    batch.set(doc(db, 'users', uid), { defaultCompanyId: invite.companyId }, { merge: true });
    await batch.commit();
  },

  async getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'members'));
    return snap.docs.map((d) => d.data() as CompanyMember);
  },

  async getCompanyInvites(companyId: string): Promise<CompanyInvite[]> {
    const q = query(
      collection(db, 'invites'),
      where('companyId', '==', companyId),
      where('status', '==', 'pendente')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CompanyInvite, 'id'>) }));
  },

  async createInvite(params: {
    companyId: string;
    companyName: string;
    email: string;
    role: MemberRole;
    invitedBy: string;
  }): Promise<void> {
    await addDoc(collection(db, 'invites'), {
      companyId: params.companyId,
      companyName: params.companyName,
      email: params.email.toLowerCase().trim(),
      role: params.role,
      invitedBy: params.invitedBy,
      createdAt: new Date().toISOString(),
      status: 'pendente',
    });
  },

  async deleteInvite(inviteId: string): Promise<void> {
    await deleteDoc(doc(db, 'invites', inviteId));
  },

  async updateMemberRole(companyId: string, uid: string, role: MemberRole): Promise<void> {
    await updateDoc(doc(db, 'companies', companyId, 'members', uid), { role });
  },

  async toggleMemberStatus(companyId: string, uid: string, status: 'ativo' | 'inativo'): Promise<void> {
    await updateDoc(doc(db, 'companies', companyId, 'members', uid), { status });
  },

  // =========================================================================
  // VEÍCULOS
  // =========================================================================
  async getVehicles(companyId: string): Promise<Vehicle[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'veiculos'));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Vehicle, 'id'>) }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  async saveVehicle(companyId: string, vehicle: Omit<Vehicle, 'id'> & { id?: string }): Promise<Vehicle> {
    const now = new Date().toISOString();
    if (vehicle.id) {
      const { id, ...rest } = vehicle;
      await setDoc(doc(db, 'companies', companyId, 'veiculos', id), rest, { merge: true });
      return { id, ...rest } as Vehicle;
    }
    const newRef = doc(collection(db, 'companies', companyId, 'veiculos'));
    const data: Omit<Vehicle, 'id'> = {
      ...vehicle,
      createdAt: vehicle.createdAt || now.split('T')[0],
      status: vehicle.status || 'ativo',
      totalGastoAbast: 0,
      totalLitrosAbast: 0,
      mediaGeralKmPorLitro: 0,
      qtdAbastecimentos: 0,
      custoMedioPorKm: 0,
      gastoManutencao: 0,
      qtdManutencoes: 0,
    };
    await setDoc(newRef, data);
    return { id: newRef.id, ...data };
  },

  async updateVehicleOdometer(companyId: string, vehicleId: string, newOdometer: number): Promise<void> {
    await updateDoc(doc(db, 'companies', companyId, 'veiculos', vehicleId), {
      currentOdometer: newOdometer,
      ultimoKm: newOdometer,
    });
  },

  async deleteVehicle(companyId: string, vehicleId: string): Promise<void> {
    // Exclui abastecimentos da subcoleção e manutenções vinculadas
    const batch = writeBatch(db);
    const refsSnap = await getDocs(
      collection(db, 'companies', companyId, 'veiculos', vehicleId, 'abastecimentos')
    );
    refsSnap.docs.forEach((d) => batch.delete(d.ref));

    const mntsQuery = query(
      collection(db, 'companies', companyId, 'manutencoes'),
      where('vehicleId', '==', vehicleId)
    );
    const mntsSnap = await getDocs(mntsQuery);
    mntsSnap.docs.forEach((d) => batch.delete(d.ref));

    batch.delete(doc(db, 'companies', companyId, 'veiculos', vehicleId));
    await batch.commit();
  },

  // =========================================================================
  // ABASTECIMENTOS
  // =========================================================================
  async getRefuelings(companyId: string, vehicles: Vehicle[]): Promise<Refueling[]> {
    const all: Refueling[] = [];
    await Promise.all(
      vehicles.map(async (v) => {
        const snap = await getDocs(
          collection(db, 'companies', companyId, 'veiculos', v.id, 'abastecimentos')
        );
        snap.docs.forEach((d) => {
          all.push({ id: d.id, ...(d.data() as Omit<Refueling, 'id'>), vehicleId: v.id });
        });
      })
    );
    return sortRefuelingsDesc(all);
  },

  async saveRefueling(
    companyId: string,
    vehicle: Vehicle,
    refuelingData: Omit<Refueling, 'id'> & { id?: string },
    existingVehicleRefuelings: Refueling[]
  ): Promise<void> {
    const isEdit = Boolean(refuelingData.id);
    const refId =
      refuelingData.id ||
      doc(collection(db, 'companies', companyId, 'veiculos', vehicle.id, 'abastecimentos')).id;

    // Calcula consumo com base no abastecimento anterior
    const others = existingVehicleRefuelings
      .filter((r) => r.id !== refId)
      .sort((a, b) => a.odometer - b.odometer);

    const prev = [...others].reverse().find((r) => r.odometer < refuelingData.odometer);
    const previousOdometer = prev ? prev.odometer : refuelingData.previousOdometer || 0;
    const distanceTraveled =
      prev && refuelingData.odometer > prev.odometer
        ? refuelingData.odometer - prev.odometer
        : 0;

    let consumptionKmPerLiter: number | undefined;
    let costPerKm: number | undefined;

    if (refuelingData.isFullTank && distanceTraveled > 0 && refuelingData.liters > 0) {
      const kmL = distanceTraveled / refuelingData.liters;
      if (kmL > 0 && kmL < 60) {
        consumptionKmPerLiter = Number(kmL.toFixed(2));
        costPerKm = Number((refuelingData.totalAmount / distanceTraveled).toFixed(2));
      }
    }

    const payload: Omit<Refueling, 'id'> = {
      ...refuelingData,
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      previousOdometer,
      distanceTraveled,
      ...(consumptionKmPerLiter ? { consumptionKmPerLiter } : {}),
      ...(costPerKm ? { costPerKm } : {}),
    };

    const fullList = isEdit
      ? existingVehicleRefuelings.map((r) => (r.id === refId ? { id: refId, ...payload } : r))
      : [...existingVehicleRefuelings, { id: refId, ...payload }];

    const totalGastoAbast = Number(
      fullList.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0).toFixed(2)
    );
    const totalLitrosAbast = Number(
      fullList.reduce((acc, r) => acc + Number(r.liters || 0), 0).toFixed(2)
    );
    const validKmL = fullList
      .map((r) => r.consumptionKmPerLiter)
      .filter((c): c is number => typeof c === 'number' && c > 0 && c < 60);
    const mediaGeralKmPorLitro =
      validKmL.length > 0
        ? Number((validKmL.reduce((a, b) => a + b, 0) / validKmL.length).toFixed(2))
        : 0;
    const validCostKm = fullList
      .map((r) => r.costPerKm)
      .filter((c): c is number => typeof c === 'number' && c > 0);
    const custoMedioPorKm =
      validCostKm.length > 0
        ? Number((validCostKm.reduce((a, b) => a + b, 0) / validCostKm.length).toFixed(2))
        : 0;

    const maxOdometer = Math.max(
      vehicle.currentOdometer || 0,
      ...fullList.map((r) => r.odometer || 0)
    );

    const batch = writeBatch(db);
    batch.set(
      doc(db, 'companies', companyId, 'veiculos', vehicle.id, 'abastecimentos', refId),
      payload
    );
    batch.update(doc(db, 'companies', companyId, 'veiculos', vehicle.id), {
      currentOdometer: maxOdometer,
      ultimoKm: maxOdometer,
      ultimoComb: refuelingData.fuelType,
      totalGastoAbast,
      totalLitrosAbast,
      mediaGeralKmPorLitro,
      custoMedioPorKm,
      qtdAbastecimentos: fullList.length,
    });

    // Atualiza preço global do combustível da empresa
    batch.set(
      doc(db, 'companies', companyId, 'configuracoes', 'precosCombustivel'),
      {
        [refuelingData.fuelType]: refuelingData.pricePerLiter,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await batch.commit();
  },

  async deleteRefueling(
    companyId: string,
    vehicle: Vehicle,
    refuelingId: string,
    existingVehicleRefuelings: Refueling[]
  ): Promise<void> {
    const remaining = existingVehicleRefuelings.filter((r) => r.id !== refuelingId);
    const totalGastoAbast = Number(
      remaining.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0).toFixed(2)
    );
    const totalLitrosAbast = Number(
      remaining.reduce((acc, r) => acc + Number(r.liters || 0), 0).toFixed(2)
    );
    const validKmL = remaining
      .map((r) => r.consumptionKmPerLiter)
      .filter((c): c is number => typeof c === 'number' && c > 0 && c < 60);
    const mediaGeralKmPorLitro =
      validKmL.length > 0
        ? Number((validKmL.reduce((a, b) => a + b, 0) / validKmL.length).toFixed(2))
        : 0;
    const validCostKm = remaining
      .map((r) => r.costPerKm)
      .filter((c): c is number => typeof c === 'number' && c > 0);
    const custoMedioPorKm =
      validCostKm.length > 0
        ? Number((validCostKm.reduce((a, b) => a + b, 0) / validCostKm.length).toFixed(2))
        : 0;

    const batch = writeBatch(db);
    batch.delete(
      doc(db, 'companies', companyId, 'veiculos', vehicle.id, 'abastecimentos', refuelingId)
    );
    batch.update(doc(db, 'companies', companyId, 'veiculos', vehicle.id), {
      totalGastoAbast,
      totalLitrosAbast,
      mediaGeralKmPorLitro,
      custoMedioPorKm,
      qtdAbastecimentos: remaining.length,
    });
    await batch.commit();
  },

  // =========================================================================
  // MANUTENÇÕES
  // =========================================================================
  async getMaintenances(companyId: string): Promise<MaintenanceItem[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'manutencoes'));
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MaintenanceItem, 'id'>),
    }));
    return sortMaintenancesDesc(list);
  },

  async saveMaintenance(
    companyId: string,
    vehicle: Vehicle,
    mntData: Omit<MaintenanceItem, 'id'> & { id?: string },
    existingVehicleMaintenances: MaintenanceItem[]
  ): Promise<void> {
    const isEdit = Boolean(mntData.id);
    const mntId =
      mntData.id || doc(collection(db, 'companies', companyId, 'manutencoes')).id;

    const payload: Omit<MaintenanceItem, 'id'> = {
      ...mntData,
      vehicleId: vehicle.id,
    };

    const fullList = isEdit
      ? existingVehicleMaintenances.map((m) => (m.id === mntId ? { id: mntId, ...payload } : m))
      : [...existingVehicleMaintenances, { id: mntId, ...payload }];

    const gastoManutencao = Number(
      fullList.reduce((acc, m) => acc + Number(m.cost || 0), 0).toFixed(2)
    );

    const vehicleUpdates: Record<string, unknown> = {
      gastoManutencao,
      qtdManutencoes: fullList.length,
      currentOdometer: Math.max(vehicle.currentOdometer || 0, mntData.odometer || 0),
    };

    if (mntData.category === 'oleo_filtro') {
      const interval = vehicle.trocaOleoKm || (vehicle.vehicleType === 'moto' ? 3000 : 10000);
      vehicleUpdates.ultimaTrocaOleoKm = mntData.odometer;
      vehicleUpdates.proxTrocaOleoKm = mntData.nextDueOdometer || mntData.odometer + interval;
    } else if (mntData.category === 'revisao_geral') {
      const revInterval = vehicle.revisaoKm || (vehicle.vehicleType === 'moto' ? 6000 : 10000);
      const oilInterval = vehicle.trocaOleoKm || (vehicle.vehicleType === 'moto' ? 3000 : 10000);
      vehicleUpdates.ultimaRevisaoKm = mntData.odometer;
      vehicleUpdates.proxRevKm = mntData.nextDueOdometer || mntData.odometer + revInterval;
      vehicleUpdates.ultimaTrocaOleoKm = mntData.odometer;
      vehicleUpdates.proxTrocaOleoKm = mntData.odometer + oilInterval;
    } else if (mntData.category === 'lubrificar_corrente') {
      const interval = vehicle.lubrificarCorrenteKm || 500;
      vehicleUpdates.ultimaLubCorrenteKm = mntData.odometer;
      vehicleUpdates.proxLubCorrenteKm = mntData.nextDueOdometer || mntData.odometer + interval;
    } else if (mntData.category === 'esticar_corrente') {
      const interval = vehicle.esticarCorrenteKm || 1500;
      vehicleUpdates.ultimaEsticarCorrenteKm = mntData.odometer;
      vehicleUpdates.proxEsticarCorrenteKm = mntData.nextDueOdometer || mntData.odometer + interval;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'companies', companyId, 'manutencoes', mntId), payload);
    batch.update(doc(db, 'companies', companyId, 'veiculos', vehicle.id), vehicleUpdates);
    await batch.commit();
  },

  async deleteMaintenance(
    companyId: string,
    vehicle: Vehicle,
    maintenanceId: string,
    existingVehicleMaintenances: MaintenanceItem[]
  ): Promise<void> {
    const remaining = existingVehicleMaintenances.filter((m) => m.id !== maintenanceId);
    const gastoManutencao = Number(
      remaining.reduce((acc, m) => acc + Number(m.cost || 0), 0).toFixed(2)
    );

    const batch = writeBatch(db);
    batch.delete(doc(db, 'companies', companyId, 'manutencoes', maintenanceId));
    batch.update(doc(db, 'companies', companyId, 'veiculos', vehicle.id), {
      gastoManutencao,
      qtdManutencoes: remaining.length,
    });
    await batch.commit();
  },

  // =========================================================================
  // PREÇOS DE COMBUSTÍVEL & UPLOAD DE IMAGENS
  // =========================================================================
  async getFuelPrices(companyId: string): Promise<FuelPrices> {
    const snap = await getDoc(
      doc(db, 'companies', companyId, 'configuracoes', 'precosCombustivel')
    );
    if (snap.exists()) {
      const data = snap.data() as Partial<FuelPrices>;
      return {
        gasolina: data.gasolina ?? 5.89,
        etanol: data.etanol ?? 3.99,
        diesel: data.diesel ?? 6.15,
        gnv: data.gnv ?? 4.5,
        updatedAt: data.updatedAt,
      };
    }
    return { gasolina: 5.89, etanol: 3.99, diesel: 6.15, gnv: 4.5 };
  },

  async updateFuelPrices(companyId: string, prices: Partial<FuelPrices>): Promise<void> {
    await setDoc(
      doc(db, 'companies', companyId, 'configuracoes', 'precosCombustivel'),
      { ...prices, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  },

  async uploadFile(path: string, file: File): Promise<string> {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  },
};
