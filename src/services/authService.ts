import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Company, MemberRole, SystemUser } from '@/types/fleet';
import { hashPassword } from '@/utils/crypto';

const USERS_COLLECTION = 'system_users';

export const AuthService = {
  async ensureDefaultAdmin(): Promise<void> {
    const q = query(collection(db, USERS_COLLECTION), where('isSystemAdmin', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) return;

    const now = new Date().toISOString();
    const adminRef = doc(db, USERS_COLLECTION, 'admin_master');
    const passwordHash = await hashPassword('123456');

    const adminUser: Omit<SystemUser, 'id'> = {
      email: 'admin@contagiro.com',
      name: 'Administrador do Sistema',
      passwordHash,
      isSystemAdmin: true,
      role: 'system_admin',
      status: 'ativo',
      createdAt: now,
    };

    await setDoc(adminRef, adminUser);
  },

  async login(email: string, password: string): Promise<SystemUser> {
    await this.ensureDefaultAdmin();
    const normalizedEmail = email.toLowerCase().trim();
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', normalizedEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const userDoc = snap.docs[0];
    const userData = { id: userDoc.id, ...(userDoc.data() as Omit<SystemUser, 'id'>) };

    if (userData.status === 'inativo') {
      throw new Error('Este usuário está inativo. Contate o administrador.');
    }

    const incomingHash = await hashPassword(password);
    if (incomingHash !== userData.passwordHash) {
      throw new Error('E-mail ou senha incorretos.');
    }

    return userData;
  },

  async getUserById(userId: string): Promise<SystemUser | null> {
    const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<SystemUser, 'id'>) };
  },

  async changeOwnPassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    if (newPassword.length < 4) {
      throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
    }
    const user = await this.getUserById(userId);
    if (!user) throw new Error('Usuário não encontrado.');

    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== user.passwordHash) {
      throw new Error('A senha atual está incorreta.');
    }

    const newHash = await hashPassword(newPassword);
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      passwordHash: newHash,
      updatedAt: new Date().toISOString(),
    });
  },

  async adminResetPassword(userId: string, newPassword: string): Promise<void> {
    if (newPassword.length < 4) {
      throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
    }
    const newHash = await hashPassword(newPassword);
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      passwordHash: newHash,
      updatedAt: new Date().toISOString(),
    });
  },

  async getAllSystemUsers(): Promise<SystemUser[]> {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<SystemUser, 'id'>) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getAllCompanies(): Promise<Company[]> {
    const snap = await getDocs(collection(db, 'companies'));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Company, 'id'>) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getCompaniesForUser(user: SystemUser): Promise<{ company: Company; role: MemberRole }[]> {
    const ids = Array.from(
      new Set([
        ...(user.companyIds || []),
        ...(user.companyId ? [user.companyId] : []),
      ].filter(Boolean))
    );
    if (ids.length === 0) return [];

    const role: MemberRole = user.role === 'system_admin' ? 'admin' : user.role;
    const docs = await Promise.all(ids.map((id) => getDoc(doc(db, 'companies', id))));
    return docs
      .filter((d) => d.exists())
      .map((d) => ({
        company: { id: d.id, ...(d.data() as Omit<Company, 'id'>) },
        role,
      }))
      .sort((a, b) => a.company.name.localeCompare(b.company.name));
  },

  async createSystemUser(params: {
    name: string;
    email: string;
    password: string;
    companyIds?: string[];
    role: MemberRole | 'system_admin';
    isSystemAdmin: boolean;
  }): Promise<SystemUser> {
    const normalizedEmail = params.email.toLowerCase().trim();
    const existingQ = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', normalizedEmail)
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    if (params.password.length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    const cleanCompanyIds = params.isSystemAdmin
      ? []
      : Array.from(new Set((params.companyIds || []).filter(Boolean)));

    const now = new Date().toISOString();
    const newUserRef = doc(collection(db, USERS_COLLECTION));
    const passwordHash = await hashPassword(params.password);

    const payload: Omit<SystemUser, 'id'> = {
      name: params.name.trim(),
      email: normalizedEmail,
      passwordHash,
      isSystemAdmin: params.isSystemAdmin,
      role: params.isSystemAdmin ? 'system_admin' : params.role,
      companyIds: cleanCompanyIds,
      companyId: cleanCompanyIds[0] || '',
      status: 'ativo',
      createdAt: now,
    };

    const batch = writeBatch(db);
    batch.set(newUserRef, payload);

    if (!params.isSystemAdmin) {
      cleanCompanyIds.forEach((cid) => {
        batch.set(doc(db, 'companies', cid, 'members', newUserRef.id), {
          uid: newUserRef.id,
          email: normalizedEmail,
          name: params.name.trim(),
          role: params.role === 'system_admin' ? 'admin' : params.role,
          status: 'ativo',
          joinedAt: now,
        });
      });
    }

    await batch.commit();
    return { id: newUserRef.id, ...payload };
  },

  async updateSystemUser(
    userId: string,
    updates: {
      name: string;
      companyIds?: string[];
      role: MemberRole | 'system_admin';
      isSystemAdmin: boolean;
      status: 'ativo' | 'inativo';
    }
  ): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('Usuário não encontrado.');

    const prevCompanyIds = Array.from(
      new Set([...(user.companyIds || []), ...(user.companyId ? [user.companyId] : [])].filter(Boolean))
    );
    const nextCompanyIds = updates.isSystemAdmin
      ? []
      : Array.from(new Set((updates.companyIds || []).filter(Boolean)));

    const batch = writeBatch(db);
    batch.update(doc(db, USERS_COLLECTION, userId), {
      name: updates.name.trim(),
      companyIds: nextCompanyIds,
      companyId: nextCompanyIds[0] || '',
      role: updates.isSystemAdmin ? 'system_admin' : updates.role,
      isSystemAdmin: updates.isSystemAdmin,
      status: updates.status,
      updatedAt: new Date().toISOString(),
    });

    prevCompanyIds
      .filter((cid) => !nextCompanyIds.includes(cid))
      .forEach((cid) => {
        batch.delete(doc(db, 'companies', cid, 'members', userId));
      });

    if (!updates.isSystemAdmin) {
      nextCompanyIds.forEach((cid) => {
        batch.set(
          doc(db, 'companies', cid, 'members', userId),
          {
            uid: userId,
            email: user.email,
            name: updates.name.trim(),
            role: updates.role === 'system_admin' ? 'admin' : updates.role,
            status: updates.status,
            joinedAt: user.createdAt || new Date().toISOString(),
          },
          { merge: true }
        );
      });
    }

    await batch.commit();
  },

  async deleteSystemUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    const ids = Array.from(
      new Set([...(user.companyIds || []), ...(user.companyId ? [user.companyId] : [])].filter(Boolean))
    );
    await Promise.all(
      ids.map((cid) => deleteDoc(doc(db, 'companies', cid, 'members', userId)))
    );
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  },
};
