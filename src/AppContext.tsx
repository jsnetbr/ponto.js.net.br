import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, query, orderBy, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';

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
  expectedMinutes: number;
  updateExpectedMinutes: (v: number) => Promise<void>;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [expectedMinutes, setExpectedMinutes] = useState(528); // 8h48m default
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (!u.emailVerified) {
          setError('Sua conta do Google precisa ter um e-mail verificado.');
          setUser(null);
        } else {
          setUser(u);
          // Check/create user profile
          try {
            const userRef = doc(db, 'users', u.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
               await setDoc(userRef, {
                 email: u.email,
                 createdAt: serverTimestamp()
               });
            }
            
            const settingsRef = doc(db, 'userSettings', u.uid);
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
               const data = settingsSnap.data();
               if (data.expectedMinutes !== undefined) {
                 setExpectedMinutes(data.expectedMinutes);
               } else if (data.expectedHours !== undefined) {
                 // Migrate older decimal expectedHours to expectedMinutes
                 const convertedMinutes = Math.round(data.expectedHours * 60);
                 setExpectedMinutes(convertedMinutes);
                 try {
                   await updateDoc(settingsRef, {
                     expectedMinutes: convertedMinutes,
                     updatedAt: serverTimestamp()
                   });
                 } catch (e) {
                   console.error("Failed to migrate expectedHours to expectedMinutes", e);
                 }
               }
            } else {
               await setDoc(settingsRef, {
                 userId: u.uid,
                 expectedMinutes: 528, // 8:48 hours Default
                 requireLocation: true,
                 updatedAt: serverTimestamp()
               });
               setExpectedMinutes(528);
            }
          } catch (err: any) {
             console.error("Profile check fail", err);
          }
        }
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setPunches([]);
      return;
    }
    const q = query(
      collection(db, `users/${user.uid}/punches`), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const p: Punch[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp) {
          p.push({
            id: doc.id,
            timestamp: data.timestamp.toDate(),
            type: data.type
          });
        }
      });
      setPunches(p);
    }, (err) => {
       console.error("Error fetching punches", err);
       if (err.message.includes('offline')) {
          setError("Conexão offline.");
       } else if (err.message.includes('Quota exceeded')) {
          setError("Cota do banco de dados excedida por hoje.");
       }
    });
    return unsub;
  }, [user]);

  const signIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const logOut = async () => {
    setPunches([]);
    setError(null);
    await signOut(auth);
  };

  const addPunch = async () => {
    if (!user) return;
    
    setError(null);
    
    if (punches.length > 0) {
      const lastPunch = punches[punches.length - 1];
      if (Date.now() - lastPunch.timestamp.getTime() < 15000) {
        setError('Aguarde alguns segundos antes de registrar novamente.');
        return;
      }
    }

    try {
      const type = punches.length % 2 === 0 ? 'in' : 'out';
      await addDoc(collection(db, `users/${user.uid}/punches`), {
        userId: user.uid,
        timestamp: serverTimestamp(),
        type
      });
    } catch (e: any) {
      console.error(e);
      if (e.message.includes('Quota exceeded')) {
         setError("Cota do banco de dados excedida por hoje.");
      } else {
         setError("Erro ao bater ponto de acesso: " + e.message);
      }
    }
  };

  const updateExpectedMinutes = async (m: number) => {
    if (m < 1 || m > 1440) return; // limit to 24h, deny 0
    setExpectedMinutes(m);
    if (user) {
      try {
        await updateDoc(doc(db, 'userSettings', user.uid), {
          expectedMinutes: m,
          updatedAt: serverTimestamp()
        });
      } catch (e: any) {
        console.error(e);
        setError("Erro ao salvar jornada diária: " + e.message);
      }
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
        expectedMinutes, 
        updateExpectedMinutes,
        error
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};

