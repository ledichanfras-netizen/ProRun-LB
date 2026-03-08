
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Athlete, Workout, HistoryEntry, TrainingWeek, UserRole, Assessment, AthletePlan } from '../types';
import { db } from '../services/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import { getHrRangeString } from '../utils/calculations';
import { safeDeepClone } from '../utils/helpers';

interface AppContextType {
  userRole: UserRole;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  
  athletes: Athlete[];
  addAthlete: (athlete: Athlete) => Promise<void>;
  updateAthlete: (id: string, data: Partial<Athlete>) => Promise<void>;
  deleteAthlete: (id: string) => Promise<void>;
  addNewAssessment: (athleteId: string, assessment: Assessment) => Promise<void>;
  updateAssessment: (athleteId: string, assessment: Assessment) => Promise<void>;
  deleteAssessment: (athleteId: string, assessmentId: string) => Promise<void>;
  
  workouts: Workout[];
  addWorkout: (workout: Workout) => Promise<void>;
  updateLibraryWorkout: (id: string, data: Partial<Workout>) => Promise<void>;
  deleteLibraryWorkout: (id: string) => Promise<void>;
  
  selectedAthleteId: string | null;
  setSelectedAthleteId: (id: string | null) => void;
  
  athletePlans: Record<string, AthletePlan>;
  saveAthletePlan: (athleteId: string, plan: AthletePlan) => Promise<void>;
  updateWorkoutStatus: (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string, rpe?: number) => Promise<void>;
  
  getAthleteMetrics: (athleteId: string) => { 
    history: HistoryEntry[], 
    completionRate: number, 
    totalVolumeCompleted: number,
    totalVolumePlanned: number 
  };
  isLoading: boolean;
  isCloudConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const sanitizeData = (data: any): any => {
  const seen = new WeakSet();
  
  const clean = (val: any): any => {
    // Basic types
    if (val === null || typeof val !== 'object') {
      return val === undefined ? null : val;
    }
    
    // Handle Dates
    if (val instanceof Date) {
      return val.toISOString();
    }

    // Handle Firestore Timestamps
    if (typeof val.toDate === 'function' && 'seconds' in val) {
      return val.toDate().toISOString();
    }

    // Handle circular references
    if (seen.has(val)) return null;
    
    // Add to seen early
    seen.add(val);
    
    // Detect Firestore internal objects (DocumentReference, Query, etc.)
    // These usually have a 'firestore' property or specific constructor names in dev
    const constructorName = val.constructor?.name;
    const isFirestoreInternal = 
      constructorName === 'DocumentReference' || 
      constructorName === 'Query' || 
      constructorName === 'Firestore' ||
      constructorName === 'CollectionReference' ||
      (val.firestore && val.id && typeof val.withConverter === 'function');

    if (isFirestoreInternal) {
      return null;
    }

    // Only process plain objects and arrays
    const proto = Object.getPrototypeOf(val);
    const isPlainObject = proto === null || proto === Object.prototype;
    const isArray = Array.isArray(val);

    if (!isPlainObject && !isArray) {
      // If it's a complex object, try to see if it has a toJSON method
      if (typeof val.toJSON === 'function') {
        try {
          const json = val.toJSON();
          if (json === val) return null; 
          return clean(json);
        } catch (e) {
          return null;
        }
      }
      return null; 
    }

    if (isArray) {
      return val.map(clean);
    }

    const result: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        // Skip internal properties
        if (key.startsWith('_') || key === 'firestore' || key === 'delegate') continue;
        
        try {
          const cleaned = clean(val[key]);
          if (cleaned !== undefined) {
            result[key] = cleaned;
          }
        } catch (e) {
          // If cleaning a specific property fails, skip it
          continue;
        }
      }
    }
    return result;
  };
  
  return clean(data);
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('proRun_userRole') as UserRole) || null;
  });
  
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(() => {
    return localStorage.getItem('proRun_selectedAthleteId') || null;
  });
  
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [athletePlans, setAthletePlans] = useState<Record<string, AthletePlan>>({});
  const [isLoading, setIsLoading] = useState(() => {
    // Se já sincronizamos nesta sessão, podemos começar com isLoading false
    // para evitar o flicker da tela de loading ao navegar (se o App remontar)
    return sessionStorage.getItem('proRun_hasSynced') !== 'true';
  });
  const [syncStatus, setSyncStatus] = useState({ athletes: false, workouts: false, plans: false });

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    // Only set isLoading to false when all critical collections have synced at least once
    if (syncStatus.athletes && syncStatus.workouts && syncStatus.plans) {
      setIsLoading(false);
      sessionStorage.setItem('proRun_hasSynced', 'true');
    }
  }, [syncStatus, db]);

  useEffect(() => {
    if (userRole) localStorage.setItem('proRun_userRole', userRole);
    else localStorage.removeItem('proRun_userRole');
  }, [userRole]);

  useEffect(() => {
    if (selectedAthleteId) localStorage.setItem('proRun_selectedAthleteId', selectedAthleteId);
    else localStorage.removeItem('proRun_selectedAthleteId');
  }, [selectedAthleteId]);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, "athletes"), (snapshot) => {
      setAthletes(prev => {
        const newAthletes = [...prev];
        snapshot.docChanges().forEach(change => {
          const data = sanitizeData({ ...change.doc.data(), id: change.doc.id }) as Athlete;
          if (change.type === 'added' || change.type === 'modified') {
            const index = newAthletes.findIndex(a => a.id === data.id);
            if (index > -1) newAthletes[index] = data;
            else newAthletes.push(data);
          } else if (change.type === 'removed') {
            const index = newAthletes.findIndex(a => a.id === change.doc.id);
            if (index > -1) newAthletes.splice(index, 1);
          }
        });
        return newAthletes;
      });
      setSyncStatus(prev => ({ ...prev, athletes: true }));
    }, (error) => {
      console.error("Firestore Error (Athletes):", error?.message || error);
      setSyncStatus(prev => ({ ...prev, athletes: true }));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "workouts"), (snapshot) => {
      setWorkouts(prev => {
        const newWorkouts = [...prev];
        snapshot.docChanges().forEach(change => {
          const data = sanitizeData({ ...change.doc.data(), id: change.doc.id }) as Workout;
          if (change.type === 'added' || change.type === 'modified') {
            const index = newWorkouts.findIndex(w => w.id === data.id);
            if (index > -1) newWorkouts[index] = data;
            else newWorkouts.push(data);
          } else if (change.type === 'removed') {
            const index = newWorkouts.findIndex(w => w.id === change.doc.id);
            if (index > -1) newWorkouts.splice(index, 1);
          }
        });
        return newWorkouts;
      });
      setSyncStatus(prev => ({ ...prev, workouts: true }));
    }, (error) => {
      console.error("Firestore Error (Workouts):", error?.message || error);
      setSyncStatus(prev => ({ ...prev, workouts: true }));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "plans"), (snapshot) => {
      setAthletePlans(prev => {
        const newPlans = { ...prev };
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            newPlans[change.doc.id] = sanitizeData(change.doc.data()) as AthletePlan;
          } else if (change.type === 'removed') {
            delete newPlans[change.doc.id];
          }
        });
        return newPlans;
      });
      setSyncStatus(prev => ({ ...prev, plans: true }));
    }, (error) => {
      console.error("Firestore Error (Plans):", error?.message || error);
      setSyncStatus(prev => ({ ...prev, plans: true }));
    });
    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername === 'leandro' && password === '1234') {
      setUserRole('coach');
      setSelectedAthleteId(null);
      return { success: true };
    }
    const athlete = athletes.find(a => a.name.trim().toLowerCase() === normalizedUsername);
    if (athlete) {
      const inputPass = password.replace(/\D/g, '');
      let storedPass = '';
      if (athlete.birthDate) {
        const [year, month, day] = athlete.birthDate.split('-');
        storedPass = `${day}${month}${year}`;
      }
      if (inputPass === storedPass || password === athlete.birthDate) {
        setUserRole('athlete');
        setSelectedAthleteId(athlete.id);
        return { success: true };
      }
      return { success: false, message: 'Senha incorreta.' };
    }
    return { success: false, message: 'Atleta não encontrado.' };
  };

  const logout = () => {
    setUserRole(null);
    setSelectedAthleteId(null);
    localStorage.clear();
  };

  const addAthlete = async (athlete: Athlete) => {
    // Optimistic Update
    setAthletes(prev => [...prev, athlete]);
    
    if (db) {
      setDoc(doc(db, "athletes", athlete.id), sanitizeData(athlete))
        .catch(err => console.error("Erro ao salvar atleta:", err));
    }
  };
  
  const updateAthlete = async (id: string, data: Partial<Athlete>) => {
    // Optimistic Update
    setAthletes(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    
    if (db) {
      updateDoc(doc(db, "athletes", id), sanitizeData(data))
        .catch(err => console.error("Erro ao atualizar atleta:", err));
    }
  };

  const deleteAthlete = async (id: string) => {
    // Optimistic Update
    setAthletes(prev => prev.filter(a => a.id !== id));
    
    if (db) {
      deleteDoc(doc(db, "athletes", id))
        .catch(err => console.error("Erro ao deletar atleta:", err));
      deleteDoc(doc(db, "plans", id))
        .catch(err => console.error("Erro ao deletar plano:", err));
    }
  };

  const addNewAssessment = async (athleteId: string, assessment: Assessment) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    const newHistory = [assessment, ...(athlete.assessmentHistory || [])];
    const newFcMax = assessment.fcMax || athlete.metrics.fcMax;
    const newFcThreshold = assessment.fcThreshold || athlete.metrics.fcThreshold;
    const updatedMetrics = { ...athlete.metrics, vdot: assessment.calculatedVdot, fcMax: newFcMax, fcThreshold: newFcThreshold };
    let updatedCustomZones = athlete.customZones;
    if (updatedCustomZones && updatedCustomZones.length > 0) {
      updatedCustomZones = updatedCustomZones.map(zone => ({ ...zone, heartRateRange: getHrRangeString(zone.zone, newFcThreshold, newFcMax) }));
    }
    const updatePayload = { assessmentHistory: newHistory, metrics: updatedMetrics, customZones: updatedCustomZones };
    
    // Optimistic Update
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, ...updatePayload } : a));

    if (db) {
      updateDoc(doc(db, "athletes", athleteId), sanitizeData(updatePayload))
        .catch(err => console.error("Erro ao salvar avaliação:", err));
    }
  };

  const updateAssessment = async (athleteId: string, updatedAssessment: Assessment) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    const newHistory = (athlete.assessmentHistory || []).map(ass => ass.id === updatedAssessment.id ? updatedAssessment : ass);
    const isMostRecent = athlete.assessmentHistory?.[0]?.id === updatedAssessment.id;
    const updatePayload: any = { assessmentHistory: newHistory };
    if (isMostRecent) {
      const newFcMax = updatedAssessment.fcMax || athlete.metrics.fcMax;
      const newFcThreshold = updatedAssessment.fcThreshold || athlete.metrics.fcThreshold;
      updatePayload.metrics = { ...athlete.metrics, vdot: updatedAssessment.calculatedVdot, fcMax: newFcMax, fcThreshold: newFcThreshold };
      if (athlete.customZones && athlete.customZones.length > 0) {
        updatePayload.customZones = athlete.customZones.map(zone => ({ ...zone, heartRateRange: getHrRangeString(zone.zone, newFcThreshold, newFcMax) }));
      }
    }

    // Optimistic Update
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, ...updatePayload } : a));

    if (db) {
      updateDoc(doc(db, "athletes", athleteId), sanitizeData(updatePayload))
        .catch(err => console.error("Erro ao atualizar avaliação:", err));
    }
  };

  const deleteAssessment = async (athleteId: string, assessmentId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    const newHistory = (athlete.assessmentHistory || []).filter(ass => ass.id !== assessmentId);
    
    // Optimistic Update
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, assessmentHistory: newHistory } : a));

    if (db) {
      updateDoc(doc(db, "athletes", athleteId), sanitizeData({ assessmentHistory: newHistory }))
        .catch(err => console.error("Erro ao deletar avaliação:", err));
    }
  };

  const addWorkout = async (workout: Workout) => {
    // Optimistic Update
    setWorkouts(prev => [...prev, workout]);
    
    if (db) {
      setDoc(doc(db, "workouts", workout.id), sanitizeData(workout))
        .catch(err => console.error("Erro ao salvar treino na biblioteca:", err));
    }
  };

  const updateLibraryWorkout = async (id: string, data: Partial<Workout>) => {
    // Optimistic Update
    setWorkouts(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
    
    if (db) {
      updateDoc(doc(db, "workouts", id), sanitizeData(data))
        .catch(err => console.error("Erro ao atualizar treino na biblioteca:", err));
    }
  };

  const deleteLibraryWorkout = async (id: string) => {
    // Optimistic Update
    setWorkouts(prev => prev.filter(w => w.id !== id));
    
    if (db) {
      deleteDoc(doc(db, "workouts", id))
        .catch(err => console.error("Erro ao deletar treino da biblioteca:", err));
    }
  };

  const saveAthletePlan = async (athleteId: string, plan: AthletePlan) => {
    // Optimistic Update
    setAthletePlans(prev => ({ ...prev, [athleteId]: plan }));
    
    if (db) {
      setDoc(doc(db, "plans", athleteId), sanitizeData(plan))
        .catch(err => console.error("Erro ao salvar plano:", err));
    }
  };

  const updateWorkoutStatus = async (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string, rpe?: number) => {
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) throw new Error("Plano inexistente.");
    
    // Deep clone and update
    const updatedPlan = safeDeepClone(currentPlan);
    const workout = updatedPlan.weeks[weekIndex].workouts[dayIndex];
    
    workout.completed = completed;
    workout.feedback = feedback || "";
    workout.rpe = rpe !== undefined ? rpe : (workout.rpe || 0);
    
    // Optimistic Update: Atualiza o estado local imediatamente
    setAthletePlans(prev => ({
      ...prev,
      [athleteId]: updatedPlan
    }));

    // Background Sync: Não bloqueia a UI esperando o Firestore
    if (db) {
      setDoc(doc(db, "plans", athleteId), sanitizeData(updatedPlan))
        .catch(err => console.error("Erro ao sincronizar plano com Firestore:", err));
    }
  };

  const getAthleteMetrics = useCallback((athleteId: string) => {
    const plan = athletePlans[athleteId];
    const allWeeks = plan?.weeks || [];
    const visibleWeeks = allWeeks.filter(w => w.isVisible === true);
    let totalWorkouts = 0;
    let completedWorkouts = 0;
    let totalVolumePlanned = 0;
    let totalVolumeCompleted = 0;
    const history: HistoryEntry[] = visibleWeeks.map(week => {
      let weekPlanned = 0;
      let weekCompleted = 0;
      (week.workouts || []).forEach(w => {
        if (w.distance) {
          weekPlanned += w.distance;
          if (w.completed) weekCompleted += w.distance;
        }
        if (w.completed) completedWorkouts++;
        if (w.type !== 'Descanso') totalWorkouts++;
      });
      totalVolumePlanned += weekPlanned;
      totalVolumeCompleted += weekCompleted;
      return { label: `Sem ${week.weekNumber}`, planned: weekPlanned, completed: weekCompleted };
    });
    const completionRate = totalWorkouts === 0 ? 0 : Math.round((completedWorkouts / totalWorkouts) * 100);
    return { history, completionRate, totalVolumePlanned, totalVolumeCompleted };
  }, [athletePlans]);

  return (
    <AppContext.Provider value={{
      userRole, login, logout,
      athletes, addAthlete, updateAthlete, deleteAthlete, 
      addNewAssessment, updateAssessment, deleteAssessment,
      workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout,
      selectedAthleteId, setSelectedAthleteId,
      athletePlans, saveAthletePlan, updateWorkoutStatus,
      getAthleteMetrics, isLoading, isCloudConnected: !!db
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
