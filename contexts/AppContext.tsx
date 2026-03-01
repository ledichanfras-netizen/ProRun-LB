
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  
  generateTestAthletes: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const sanitizeData = (data: any): any => {
  const seen = new WeakMap();
  
  const clean = (val: any): any => {
    if (val === null || typeof val !== 'object') {
      return val === undefined ? null : val;
    }
    
    if (seen.has(val)) return null; // Circular reference found
    seen.set(val, true);
    
    if (Array.isArray(val)) {
      return val.map(clean);
    }
    
    const result: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const cleaned = clean(val[key]);
        if (cleaned !== undefined) {
          result[key] = cleaned;
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
  
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const saved = localStorage.getItem('proRun_athletes');
    return saved ? JSON.parse(saved) : [];
  });

  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    const saved = localStorage.getItem('proRun_workouts');
    return saved ? JSON.parse(saved) : [];
  });

  const [athletePlans, setAthletePlans] = useState<Record<string, AthletePlan>>(() => {
    const saved = localStorage.getItem('proRun_athletePlans');
    return saved ? JSON.parse(saved) : {};
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userRole) localStorage.setItem('proRun_userRole', userRole);
    else localStorage.removeItem('proRun_userRole');
  }, [userRole]);

  useEffect(() => {
    if (selectedAthleteId) localStorage.setItem('proRun_selectedAthleteId', selectedAthleteId);
    else localStorage.removeItem('proRun_selectedAthleteId');
  }, [selectedAthleteId]);

  useEffect(() => {
    localStorage.setItem('proRun_athletes', JSON.stringify(athletes));
  }, [athletes]);

  useEffect(() => {
    localStorage.setItem('proRun_workouts', JSON.stringify(workouts));
  }, [workouts]);

  useEffect(() => {
    localStorage.setItem('proRun_athletePlans', JSON.stringify(athletePlans));
  }, [athletePlans]);

  useEffect(() => {
    // Failsafe para o estado de loading caso o Firestore demore muito
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 4000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, "athletes"), (snapshot) => {
      const athletesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Athlete));
      setAthletes(athletesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error (Athletes):", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "workouts"), (snapshot) => {
      const workoutsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Workout));
      setWorkouts(workoutsData);
    }, (error) => console.error("Firestore Error (Workouts):", error));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "plans"), (snapshot) => {
      const plansMap: Record<string, AthletePlan> = {};
      snapshot.docs.forEach(doc => {
        plansMap[doc.id] = doc.data() as AthletePlan;
      });
      setAthletePlans(plansMap);
    }, (error) => console.error("Firestore Error (Plans):", error));
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
    // Atualização Otimista Local
    setAthletes(prev => [...prev, athlete]);

    if (db) {
      try {
        await setDoc(doc(db, "athletes", athlete.id), sanitizeData(athlete));
      } catch (error) {
        console.error("Erro ao salvar atleta no Firestore:", error);
        throw error;
      }
    }
  };
  
  const updateAthlete = async (id: string, data: Partial<Athlete>) => {
    // Atualização Otimista Local
    setAthletes(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));

    if (db) {
      try {
        await updateDoc(doc(db, "athletes", id), sanitizeData(data));
      } catch (error) {
        console.error("Erro ao atualizar atleta no Firestore:", error);
        throw error;
      }
    }
  };

  const deleteAthlete = async (id: string) => {
    // Atualização Otimista Local
    setAthletes(prev => prev.filter(a => a.id !== id));
    setAthletePlans(prev => {
      const newPlans = { ...prev };
      delete newPlans[id];
      return newPlans;
    });

    if (db) {
      try {
        await deleteDoc(doc(db, "athletes", id));
        await deleteDoc(doc(db, "plans", id));
      } catch (error) {
        console.error("Erro ao remover atleta do Firestore:", error);
        throw error;
      }
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

    // Atualização Otimista Local
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, ...updatePayload } : a));

    if (db) {
      try {
        await updateDoc(doc(db, "athletes", athleteId), sanitizeData(updatePayload));
      } catch (error) {
        console.error("Erro ao salvar avaliação no Firestore:", error);
        throw error;
      }
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

    // Atualização Otimista Local
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, ...updatePayload } : a));

    if (db) {
      try {
        await updateDoc(doc(db, "athletes", athleteId), sanitizeData(updatePayload));
      } catch (error) {
        console.error("Erro ao atualizar avaliação no Firestore:", error);
        throw error;
      }
    }
  };

  const deleteAssessment = async (athleteId: string, assessmentId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    const newHistory = (athlete.assessmentHistory || []).filter(ass => ass.id !== assessmentId);

    // Atualização Otimista Local
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, assessmentHistory: newHistory } : a));

    if (db) {
      try {
        await updateDoc(doc(db, "athletes", athleteId), sanitizeData({ assessmentHistory: newHistory }));
      } catch (error) {
        console.error("Erro ao remover avaliação no Firestore:", error);
        throw error;
      }
    }
  };

  const addWorkout = async (workout: Workout) => {
    // Atualização Otimista Local
    setWorkouts(prev => [...prev, workout]);

    if (db) {
      try {
        await setDoc(doc(db, "workouts", workout.id), sanitizeData(workout));
      } catch (error) {
        console.error("Erro ao salvar treino no Firestore:", error);
        throw error;
      }
    }
  };

  const updateLibraryWorkout = async (id: string, data: Partial<Workout>) => {
    // Atualização Otimista Local
    setWorkouts(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));

    if (db) {
      try {
        await updateDoc(doc(db, "workouts", id), sanitizeData(data));
      } catch (error) {
        console.error("Erro ao atualizar treino no Firestore:", error);
        throw error;
      }
    }
  };

  const deleteLibraryWorkout = async (id: string) => {
    // Atualização Otimista Local
    setWorkouts(prev => prev.filter(w => w.id !== id));

    if (db) {
      try {
        await deleteDoc(doc(db, "workouts", id));
      } catch (error) {
        console.error("Erro ao remover treino do Firestore:", error);
        throw error;
      }
    }
  };

  const saveAthletePlan = async (athleteId: string, plan: AthletePlan) => {
    // Atualização Otimista Local
    setAthletePlans(prev => ({ ...prev, [athleteId]: plan }));

    if (db) {
      try {
        await setDoc(doc(db, "plans", athleteId), sanitizeData(plan));
      } catch (error) {
        console.error("Erro ao salvar plano no Firestore:", error);
        throw error;
      }
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

  const generateTestAthletes = async () => {
    const testAthlete: Athlete = {
      id: "test-athlete-1",
      name: "Marcos Silva",
      age: 32,
      birthDate: "1992-05-15",
      weight: 78,
      height: 180,
      experience: "Avançado",
      email: "marcos@teste.com",
      metrics: { vdot: 48.5, test3kTime: "11:45", fcMax: 192, fcThreshold: 172 },
      assessmentHistory: []
    };
    await addAthlete(testAthlete);
  };

  const getAthleteMetrics = (athleteId: string) => {
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
  };

  return (
    <AppContext.Provider value={{
      userRole, login, logout,
      athletes, addAthlete, updateAthlete, deleteAthlete, 
      addNewAssessment, updateAssessment, deleteAssessment,
      workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout,
      selectedAthleteId, setSelectedAthleteId,
      athletePlans, saveAthletePlan, updateWorkoutStatus,
      getAthleteMetrics, generateTestAthletes, isLoading
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
