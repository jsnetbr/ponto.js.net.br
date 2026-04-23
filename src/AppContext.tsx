import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface Punch {
  id: string;
  timestamp: Date;
  type: 'in' | 'out';
}

interface AppContextType {
  user: User | null;
  loadingAuth: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  punches: Punch[];
  addPunch: () => Promise<void>;
  updatePunch: (id: string, newTimestamp: Date) => Promise<void>;
  deletePunch: (id: string) => Promise<void>;
  expectedMinutes: number;
  updateExpectedMinutes: (v: number) => Promise<void>;
  error: string | null;
}

const DEFAULT_EXPECTED_MINUTES = 528; // 8h48m
const AppContext = createContext<AppContextType | undefined>(undefined);

const toUserMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof FirebaseError)) {
    return fallback;
  }

  switch (error.code) {
    case 'permission-denied':
      return 'Sem permissao para esta acao. Verifique o login e as regras.';
    case 'resource-exhausted':
      return 'Cota diaria do banco excedida.';
    case 'unavailable':
      return 'Servico indisponivel no momento. Tente novamente.';
    case 'auth/popup-closed-by-user':
      return 'Login cancelado antes de concluir.';
    case 'auth/popup-blocked':
      return 'Popup de login bloqueado pelo navegador.';
    default:
      return `${fallback} (${error.code})`;
  }
};

const normalizeExpectedMinutes = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.round(value);
  if (normalized < 1 || normalized > 1440) {
    return null;
  }

  return normalized;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [expectedMinutes, setExpectedMinutes] = useState(DEFAULT_EXPECTED_MINUTES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      try {
        if (!nextUser) {
          setUser(null);
          setPunches([]);
          return;
        }

        if (!nextUser.emailVerified) {
          setUser(null);
          setPunches([]);
          setError('Sua conta Google precisa ter e-mail verificado.');
          await signOut(auth);
          return;
        }

        if (!nextUser.email) {
          setUser(null);
          setPunches([]);
          setError('Nao foi possivel obter o e-mail da conta Google.');
          await signOut(auth);
          return;
        }

        setError(null);
        setUser(nextUser);

        const userRef = doc(db, 'users', nextUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: nextUser.email,
            createdAt: serverTimestamp(),
          });
        }

        const settingsRef = doc(db, 'userSettings', nextUser.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
          await setDoc(settingsRef, {
            userId: nextUser.uid,
            expectedMinutes: DEFAULT_EXPECTED_MINUTES,
            requireLocation: true,
            updatedAt: serverTimestamp(),
          });
          setExpectedMinutes(DEFAULT_EXPECTED_MINUTES);
          return;
        }

        const settingsData = settingsSnap.data();
        const normalizedExpected = normalizeExpectedMinutes(settingsData.expectedMinutes);
        if (normalizedExpected == null) {
          await updateDoc(settingsRef, {
            expectedMinutes: DEFAULT_EXPECTED_MINUTES,
            updatedAt: serverTimestamp(),
          });
          setExpectedMinutes(DEFAULT_EXPECTED_MINUTES);
        } else {
          setExpectedMinutes(normalizedExpected);
        }
      } catch (authSetupError) {
        console.error('Failed during auth bootstrap', authSetupError);
        setError(toUserMessage(authSetupError, 'Falha ao carregar sua conta.'));
      } finally {
        setLoadingAuth(false);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setPunches([]);
      return;
    }

    const punchesQuery = query(
      collection(db, `users/${user.uid}/punches`),
      orderBy('timestamp', 'asc'),
    );

    const unsub = onSnapshot(
      punchesQuery,
      (snapshot) => {
        const nextPunches: Punch[] = [];
        snapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          if (!data.timestamp || typeof data.timestamp.toDate !== 'function') {
            return;
          }

          if (data.type !== 'in' && data.type !== 'out') {
            return;
          }

          nextPunches.push({
            id: snapshotDoc.id,
            timestamp: data.timestamp.toDate(),
            type: data.type,
          });
        });
        setPunches(nextPunches);
      },
      (snapshotError) => {
        console.error('Error fetching punches', snapshotError);
        setError(toUserMessage(snapshotError, 'Erro ao carregar historico de pontos.'));
      },
    );

    return unsub;
  }, [user]);

  const signIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (signInError) {
      setError(toUserMessage(signInError, 'Erro ao autenticar com Google.'));
    }
  };

  const logOut = async () => {
    setError(null);
    setPunches([]);
    try {
      await signOut(auth);
    } catch (signOutError) {
      setError(toUserMessage(signOutError, 'Erro ao sair da conta.'));
    }
  };

  const addPunch = async () => {
    if (!user) {
      return;
    }

    setError(null);

    if (punches.length > 0) {
      const lastPunch = punches[punches.length - 1];
      if (Date.now() - lastPunch.timestamp.getTime() < 15000) {
        setError('Aguarde alguns segundos antes de registrar novamente.');
        return;
      }
    }

    try {
      const type: 'in' | 'out' = punches.length % 2 === 0 ? 'in' : 'out';
      await addDoc(collection(db, `users/${user.uid}/punches`), {
        userId: user.uid,
        timestamp: serverTimestamp(),
        type,
      });
    } catch (addError) {
      console.error('Failed to add punch', addError);
      setError(toUserMessage(addError, 'Erro ao registrar ponto.'));
    }
  };

  const updatePunch = async (id: string, newTimestamp: Date) => {
    if (!user) {
      return;
    }

    if (!(newTimestamp instanceof Date) || Number.isNaN(newTimestamp.getTime())) {
      setError('Horario invalido para atualizar ponto.');
      return;
    }

    try {
      await updateDoc(doc(db, `users/${user.uid}/punches`, id), {
        timestamp: newTimestamp,
      });
    } catch (updateError) {
      console.error('Failed to update punch', updateError);
      setError(toUserMessage(updateError, 'Erro ao atualizar ponto.'));
    }
  };

  const deletePunch = async (id: string) => {
    if (!user) {
      return;
    }

    try {
      await deleteDoc(doc(db, `users/${user.uid}/punches`, id));
    } catch (deleteError) {
      console.error('Failed to delete punch', deleteError);
      setError(toUserMessage(deleteError, 'Erro ao excluir ponto.'));
    }
  };

  const updateExpectedMinutes = async (value: number) => {
    const normalized = normalizeExpectedMinutes(value);
    if (normalized == null) {
      setError('Jornada diaria invalida. Informe entre 1 e 1440 minutos.');
      return;
    }

    setExpectedMinutes(normalized);
    if (!user) {
      return;
    }

    try {
      await updateDoc(doc(db, 'userSettings', user.uid), {
        expectedMinutes: normalized,
        updatedAt: serverTimestamp(),
      });
    } catch (settingsError) {
      console.error('Failed to update expected minutes', settingsError);
      setError(toUserMessage(settingsError, 'Erro ao salvar jornada diaria.'));
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loadingAuth,
        signIn,
        logOut,
        punches,
        addPunch,
        updatePunch,
        deletePunch,
        expectedMinutes,
        updateExpectedMinutes,
        error,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext deve ser usado dentro de AppProvider');
  }
  return context;
};
