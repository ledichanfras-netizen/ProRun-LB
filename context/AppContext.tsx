
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Athlete, Workout, HistoryEntry, TrainingWeek, UserRole, Assessment } from '../types';
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

interface AppContextType {
  userRole: UserRole;
  login: (username: string, password:string) => Promise<{ success: boolean; message?: string }>;
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
  
  athletePlans: Record<string, TrainingWeek[]>;
  saveAthletePlan: (athleteId: string, plan: TrainingWeek[]) => Promise<void>;
  updateWorkoutStatus: (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string) => Promise<void>;
  
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
  return JSON.parse(JSON.stringify(data, (key, value) =>
    value === undefined ? null : value
  ));
};

// Timeout aumentado para 15 segundos para evitar erros em conexões oscilantes
const withTimeout = (promise: Promise<any>, ms: number = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de conexão")), ms))
  ]);
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
  const [athletePlans, setAthletePlans] = useState<Record<string, TrainingWeek[]>>({});
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
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, "athletes"), (snapshot) => {
      const athletesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Athlete));
      setAthletes(athletesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao carregar atletas:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "workouts"), (snapshot) => {
      const workoutsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Workout));
      setWorkouts(workoutsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedAthleteId) return;
    const unsubscribe = onSnapshot(doc(db, "plans", selectedAthleteId), (doc) => {
      const data = doc.data();
      setAthletePlans(prev => ({...prev, [selectedAthleteId]: (data?.weeks || []) as TrainingWeek[]}));
    });
    return () => unsubscribe();
  }, [selectedAthleteId]);

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
    await withTimeout(setDoc(doc(db, "athletes", athlete.id), sanitizeData(athlete)));
  };
  
  const updateAthlete = async (id: string, data: Partial<Athlete>) => {
    await withTimeout(updateDoc(doc(db, "athletes", id), sanitizeData(data)));
  };

  const deleteAthlete = async (id: string) => {
    await withTimeout(deleteDoc(doc(db, "athletes", id)));
    await withTimeout(deleteDoc(doc(db, "plans", id)));
  };

  const addNewAssessment = async (athleteId: string, assessment: Assessment) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;

    const newHistory = [assessment, ...(athlete.assessmentHistory || [])];
    const newFcMax = assessment.fcMax || athlete.metrics.fcMax;
    const newFcThreshold = assessment.fcThreshold || athlete.metrics.fcThreshold;

    const updatedMetrics = {
      ...athlete.metrics,
      vdot: assessment.calculatedVdot,
      fcMax: newFcMax,
      fcThreshold: newFcThreshold
    };

    let updatedCustomZones = athlete.customZones;
    if (updatedCustomZones && updatedCustomZones.length > 0) {
      updatedCustomZones = updatedCustomZones.map(zone => ({
        ...zone,
        heartRateRange: getHrRangeString(zone.zone, newFcThreshold, newFcMax)
      }));
    }

    const updatePayload = {
      assessmentHistory: newHistory,
      metrics: updatedMetrics,
      customZones: updatedCustomZones
    };

    await withTimeout(updateDoc(doc(db, "athletes", athleteId), sanitizeData(updatePayload)));
  };

  const updateAssessment = async (athleteId: string, updatedAssessment: Assessment) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;

    const newHistory = (athlete.assessmentHistory || []).map(ass => 
      ass.id === updatedAssessment.id ? updatedAssessment : ass
    );

    const isMostRecent = athlete.assessmentHistory?.[0]?.id === updatedAssessment.id;
    const updatePayload: any = { assessmentHistory: newHistory };

    if (isMostRecent) {
      const newFcMax = updatedAssessment.fcMax || athlete.metrics.fcMax;
      const newFcThreshold = updatedAssessment.fcThreshold || athlete.metrics.fcThreshold;

      updatePayload.metrics = {
        ...athlete.metrics,
        vdot: updatedAssessment.calculatedVdot,
        fcMax: newFcMax,
        fcThreshold: newFcThreshold
      };

      if (athlete.customZones && athlete.customZones.length > 0) {
        updatePayload.customZones = athlete.customZones.map(zone => ({
          ...zone,
          heartRateRange: getHrRangeString(zone.zone, newFcThreshold, newFcMax)
        }));
      }
    }

    await withTimeout(updateDoc(doc(db, "athletes", athleteId), sanitizeData(updatePayload)));
  };

  const deleteAssessment = async (athleteId: string, assessmentId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;

    const originalHistory = athlete.assessmentHistory || [];
    const wasMostRecent = originalHistory.length > 0 && originalHistory[0].id === assessmentId;

    const newHistory = originalHistory.filter(ass => ass.id !== assessmentId);

    const updatePayload: any = { assessmentHistory: newHistory };

    // If the deleted assessment was the most recent, we must recalculate metrics
    if (wasMostRecent) {
      const newMostRecent = newHistory[0]; // Can be undefined if history is now empty

      const newVdot = newMostRecent ? newMostRecent.calculatedVdot : athlete.metrics.vdot; // Keep old VDOT or reset
      const newFcMax = newMostRecent?.fcMax || athlete.metrics.fcMax;
      const newFcThreshold = newMostRecent?.fcThreshold || athlete.metrics.fcThreshold;

      updatePayload.metrics = {
        ...athlete.metrics,
        vdot: newVdot,
        fcMax: newFcMax,
        fcThreshold: newFcThreshold,
      };

      if (athlete.customZones && athlete.customZones.length > 0) {
        updatePayload.customZones = athlete.customZones.map(zone => ({
          ...zone,
          heartRateRange: getHrRangeString(zone.zone, newFcThreshold, newFcMax)
        }));
      }
    }

    await withTimeout(updateDoc(doc(db, "athletes", athleteId), sanitizeData(updatePayload)));
  };

  const addWorkout = async (workout: Workout) => {
    await withTimeout(setDoc(doc(db, "workouts", workout.id), sanitizeData(workout)));
  };

  const updateLibraryWorkout = async (id: string, data: Partial<Workout>) => {
    await withTimeout(updateDoc(doc(db, "workouts", id), sanitizeData(data)));
  };

  const deleteLibraryWorkout = async (id: string) => {
    await withTimeout(deleteDoc(doc(db, "workouts", id)));
  };

  const saveAthletePlan = async (athleteId: string, plan: TrainingWeek[]) => {
    await withTimeout(setDoc(doc(db, "plans", athleteId), { weeks: sanitizeData(plan) }));
  };

  const updateWorkoutStatus = async (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string) => {
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) throw new Error("Plano inexistente.");
    
    const updatedPlan = [...currentPlan];
    if(updatedPlan.length > weekIndex && updatedPlan[weekIndex].workouts.length > dayIndex) {
        updatedPlan[weekIndex].workouts[dayIndex] = {
            ...updatedPlan[weekIndex].workouts[dayIndex],
            completed,
            feedback: feedback || ""
        };
        const docRef = doc(db, "plans", athleteId);
        const dataToSave = { weeks: sanitizeData(updatedPlan) };
        await withTimeout(setDoc(docRef, dataToSave, { merge: true }), 15000);
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
    alert("Atleta de teste criado!");
  };

  const getAthleteMetrics = (athleteId: string) => {
    const allWeeks = athletePlans[athleteId] || [];
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
