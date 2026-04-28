import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
import { sortPunches, toDateKey, validateEditedPunchTime } from './utils';

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
  addPunch: () => Promise<boolean>;
  updatePunch: (id: string, newTimestamp: Date) => Promise<boolean>;
  deletePunch: (id: string) => Promise<boolean>;
  isSavingPunch: boolean;
  isOnline: boolean;
  pendingPunchCount: number;
  expectedMinutes: number;
  updateExpectedMinutes: (v: number) => Promise<void>;
  error: string | null;
}

const DEFAULT_EXPECTED_MINUTES = 528; // 8h48m
const AppContext = createContext<AppContextType | undefined>(undefined);
type PendingPunchEvent = {
  id: string;
  createdAtMs: number;
};

const toUserMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof FirebaseError)) {
    return fallback;
  }

  switch (error.code) {
    case 'permission-denied':
      return 'Sem permissão para esta ação. Verifique o login e as regras.';
    case 'resource-exhausted':
      return 'Cota diária do banco excedida.';
    case 'unavailable':
      return 'Serviço indisponível no momento. Tente novamente.';
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
  const [isSavingPunch, setIsSavingPunch] = useState(false);
  const [pendingPunchCount, setPendingPunchCount] = useState(0);
  const isFlushingQueueRef = useRef(false);
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === 'undefined' ? true : navigator.onLine
  ));

  const getQueueStorageKey = (uid: string) => `pontojs:pendingPunches:${uid}`;

  const readPendingQueue = (uid: string): PendingPunchEvent[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(getQueueStorageKey(uid));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry): entry is PendingPunchEvent => (
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as PendingPunchEvent).id === 'string' &&
          typeof (entry as PendingPunchEvent).createdAtMs === 'number'
        ))
        .sort((a, b) => a.createdAtMs - b.createdAtMs);
    } catch {
      return [];
    }
  };

  const writePendingQueue = (uid: string, value: PendingPunchEvent[]) => {
    if (typeof window === 'undefined') return;
    if (value.length === 0) {
      window.localStorage.removeItem(getQueueStorageKey(uid));
      return;
    }
    window.localStorage.setItem(getQueueStorageKey(uid), JSON.stringify(value));
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
          setError('Não foi possível obter o e-mail da conta Google.');
          await signOut(auth);
          return;
        }

        setError(null);
        setUser(nextUser);
        setPendingPunchCount(readPendingQueue(nextUser.uid).length);

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
        setError(toUserMessage(snapshotError, 'Erro ao carregar histórico de pontos.'));
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

  const addPunch = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setError(null);

    if (isSavingPunch) {
      setError('Registro em andamento. Aguarde alguns segundos.');
      return false;
    }

    const now = new Date();
    const todayKey = toDateKey(now);
    const todayPunches = sortPunches(punches.filter((punch) => toDateKey(punch.timestamp) === todayKey));

    if (todayPunches.length > 0) {
      const lastPunch = todayPunches[todayPunches.length - 1];
      if (Date.now() - lastPunch.timestamp.getTime() < 15000) {
        setError('Aguarde alguns segundos antes de registrar novamente.');
        return false;
      }
    }

    if (!isOnline) {
      const queued = readPendingQueue(user.uid);
      const eventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const nextQueue = [...queued, { id: eventId, createdAtMs: Date.now() }];
      writePendingQueue(user.uid, nextQueue);
      setPendingPunchCount(nextQueue.length);
      return true;
    }

    try {
      setIsSavingPunch(true);
      const type: 'in' | 'out' = todayPunches.length % 2 === 0 ? 'in' : 'out';
      await addDoc(collection(db, `users/${user.uid}/punches`), {
        userId: user.uid,
        timestamp: serverTimestamp(),
        type,
      });
      return true;
    } catch (addError) {
      console.error('Failed to add punch', addError);
      setError(toUserMessage(addError, 'Erro ao registrar ponto.'));
      return false;
    } finally {
      setIsSavingPunch(false);
    }
  };

  useEffect(() => {
    const flushPendingPunches = async () => {
      if (!user || !isOnline || isSavingPunch || isFlushingQueueRef.current) return;

      const queued = readPendingQueue(user.uid);
      if (queued.length <= 0) return;

      isFlushingQueueRef.current = true;
      setIsSavingPunch(true);
      try {
        let remainingQueue = [...queued];
        for (let i = 0; i < queued.length; i += 1) {
          const todayKey = toDateKey(new Date());
          const todayCount = punches.filter((punch) => toDateKey(punch.timestamp) === todayKey).length + i;
          const type: 'in' | 'out' = todayCount % 2 === 0 ? 'in' : 'out';
          await addDoc(collection(db, `users/${user.uid}/punches`), {
            userId: user.uid,
            timestamp: serverTimestamp(),
            type,
          });
          remainingQueue = remainingQueue.slice(1);
          writePendingQueue(user.uid, remainingQueue);
          setPendingPunchCount(remainingQueue.length);
        }
        writePendingQueue(user.uid, []);
        setPendingPunchCount(0);
      } catch (syncError) {
        console.error('Failed to sync queued punches', syncError);
        setError(toUserMessage(syncError, 'Falha ao sincronizar pontos em fila.'));
      } finally {
        isFlushingQueueRef.current = false;
        setIsSavingPunch(false);
      }
    };

    void flushPendingPunches();
  }, [user, isOnline, punches, isSavingPunch]);

  const updatePunch = async (id: string, newTimestamp: Date): Promise<boolean> => {
    if (!user) {
      return false;
    }

    if (!isOnline) {
      setError('Sem internet no momento. Conecte-se antes de editar o ponto.');
      return false;
    }

    const validationMessage = validateEditedPunchTime(punches, id, newTimestamp);
    if (validationMessage) {
      setError(validationMessage);
      return false;
    }

    try {
      await updateDoc(doc(db, `users/${user.uid}/punches`, id), {
        timestamp: newTimestamp,
      });
      return true;
    } catch (updateError) {
      console.error('Failed to update punch', updateError);
      setError(toUserMessage(updateError, 'Erro ao atualizar ponto.'));
      return false;
    }
  };

  const deletePunch = async (id: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    if (!isOnline) {
      setError('Sem internet no momento. Conecte-se antes de excluir o ponto.');
      return false;
    }

    try {
      await deleteDoc(doc(db, `users/${user.uid}/punches`, id));
      return true;
    } catch (deleteError) {
      console.error('Failed to delete punch', deleteError);
      setError(toUserMessage(deleteError, 'Erro ao excluir ponto.'));
      return false;
    }
  };

  const updateExpectedMinutes = async (value: number) => {
    const normalized = normalizeExpectedMinutes(value);
    if (normalized == null) {
      setError('Jornada diária inválida. Informe entre 1 e 1440 minutos.');
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
      setError(toUserMessage(settingsError, 'Erro ao salvar jornada diária.'));
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
        isSavingPunch,
        isOnline,
        pendingPunchCount,
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
