
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

interface AppContextType {
  userRole: UserRole;
  login: (role: UserRole, athleteId?: string) => void;
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
  
  // Plan Management
  athletePlans: Record<string, TrainingWeek[]>;
  saveAthletePlan: (athleteId: string, plan: TrainingWeek[]) => Promise<void>;
  toggleWorkoutCompletion: (athleteId: string, weekIndex: number, dayIndex: number) => Promise<void>;
  updateWorkoutFeedback: (athleteId: string, weekIndex: number, dayIndex: number, feedback: string) => Promise<void>;
  
  getAthleteMetrics: (athleteId: string) => { 
    history: HistoryEntry[], 
    completionRate: number, 
    totalVolumeCompleted: number,
    totalVolumePlanned: number 
  };
  
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Utility to remove undefined values for Firestore
const sanitizeForFirestore = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      if (value !== undefined) {
        acc[key] = sanitizeForFirestore(value);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // PERSISTENCE: Load initial state from localStorage to handle page refreshes
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('proRun_userRole') as UserRole) || null;
  });
  
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(() => {
    return localStorage.getItem('proRun_selectedAthleteId') || null;
  });
  
  // Data States (Synced with Firebase)
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [athletePlans, setAthletePlans] = useState<Record<string, TrainingWeek[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => {
    if (userRole) localStorage.setItem('proRun_userRole', userRole);
    else localStorage.removeItem('proRun_userRole');
  }, [userRole]);

  useEffect(() => {
    if (selectedAthleteId) localStorage.setItem('proRun_selectedAthleteId', selectedAthleteId);
    else localStorage.removeItem('proRun_selectedAthleteId');
  }, [selectedAthleteId]);


  // --- FIREBASE LISTENERS (REAL-TIME SYNC) ---

  // 1. Sync Athletes
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "athletes"), (snapshot) => {
      const athletesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Athlete));
      setAthletes(athletesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase Athletes Error:", error);
      setIsLoading(false); // Stop loading even on error
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync Library Workouts
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "workouts"), (snapshot) => {
      const workoutsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Workout));
      setWorkouts(workoutsData);
    });
    return () => unsubscribe();
  }, []);

  // 3. Sync Training Plans
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "plans"), (snapshot) => {
      const plansMap: Record<string, TrainingWeek[]> = {};
      snapshot.docs.forEach(doc => {
        plansMap[doc.id] = doc.data().weeks as TrainingWeek[];
      });
      setAthletePlans(plansMap);
    });
    return () => unsubscribe();
  }, []);


  // --- AUTH & NAVIGATION ---
  const login = (role: UserRole, athleteId?: string) => {
    setUserRole(role);
    if (role === 'athlete' && athleteId) {
      setSelectedAthleteId(athleteId);
    }
  };

  const logout = () => {
    setUserRole(null);
    setSelectedAthleteId(null);
    localStorage.clear();
  };

  // --- ACTIONS (WRITE TO FIREBASE) ---

  const addAthlete = async (athlete: Athlete) => {
    try {
      await setDoc(doc(db, "athletes", athlete.id), sanitizeForFirestore(athlete));
    } catch (e) {
      console.error("Erro ao adicionar atleta", e);
      alert("Erro ao salvar no banco de dados. Verifique a conexão.");
    }
  };
  
  const updateAthlete = async (id: string, data: Partial<Athlete>) => {
    try {
      await updateDoc(doc(db, "athletes", id), sanitizeForFirestore(data));
    } catch (e) {
      console.error("Erro ao atualizar atleta", e);
    }
  };

  const deleteAthlete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "athletes", id));
      await deleteDoc(doc(db, "plans", id));
      if (selectedAthleteId === id) setSelectedAthleteId(null);
    } catch (e) {
      console.error("Erro ao excluir atleta", e);
    }
  };

  // --- LOGIC HELPERS ---
  const recalculateAthleteMetrics = (athlete: Athlete, history: Assessment[]): Athlete => {
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sortedHistory[0];

    const newMetrics = { ...athlete.metrics };

    if (latest) {
      newMetrics.vdot = latest.calculatedVdot;
      if (latest.type === '3k') newMetrics.test3kTime = latest.resultValue;
      else if (latest.type === 'VO2_Lab' && latest.vo2Max) newMetrics.vo2Max = latest.vo2Max;

      if (latest.fcMax) newMetrics.fcMax = latest.fcMax;
      if (latest.fcThreshold) newMetrics.fcThreshold = latest.fcThreshold;
    } else {
      newMetrics.vdot = 30;
      newMetrics.test3kTime = '00:00';
    }

    return { ...athlete, metrics: newMetrics, assessmentHistory: sortedHistory };
  };

  const addNewAssessment = async (athleteId: string, assessment: Assessment) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;

    const newHistory = [assessment, ...(athlete.assessmentHistory || [])];
    const updatedAthlete = recalculateAthleteMetrics(athlete, newHistory);
    
    await updateDoc(doc(db, "athletes", athleteId), sanitizeForFirestore(updatedAthlete));
  };

  const updateAssessment = async (athleteId: string, updatedAssessment: Assessment) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;

    const newHistory = (athlete.assessmentHistory || []).map(ass => 
      ass.id === updatedAssessment.id ? updatedAssessment : ass
    );
    const updatedAthlete = recalculateAthleteMetrics(athlete, newHistory);

    await updateDoc(doc(db, "athletes", athleteId), sanitizeForFirestore(updatedAthlete));
  };

  const deleteAssessment = async (athleteId: string, assessmentId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;

    const newHistory = (athlete.assessmentHistory || []).filter(ass => ass.id !== assessmentId);
    const updatedAthlete = recalculateAthleteMetrics(athlete, newHistory);

    await updateDoc(doc(db, "athletes", athleteId), sanitizeForFirestore(updatedAthlete));
  };

  const addWorkout = async (workout: Workout) => {
    await setDoc(doc(db, "workouts", workout.id), sanitizeForFirestore(workout));
  };

  const updateLibraryWorkout = async (id: string, data: Partial<Workout>) => {
    await updateDoc(doc(db, "workouts", id), sanitizeForFirestore(data));
  };

  const deleteLibraryWorkout = async (id: string) => {
    await deleteDoc(doc(db, "workouts", id));
  };

  const saveAthletePlan = async (athleteId: string, plan: TrainingWeek[]) => {
    await setDoc(doc(db, "plans", athleteId), { weeks: sanitizeForFirestore(plan) });
  };

  const toggleWorkoutCompletion = async (athleteId: string, weekIndex: number, dayIndex: number) => {
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) return;

    const updatedPlan = [...currentPlan];
    const workout = { ...updatedPlan[weekIndex].workouts[dayIndex] };
    workout.completed = !workout.completed;
    
    updatedPlan[weekIndex] = {
      ...updatedPlan[weekIndex],
      workouts: [
        ...updatedPlan[weekIndex].workouts.slice(0, dayIndex),
        workout,
        ...updatedPlan[weekIndex].workouts.slice(dayIndex + 1)
      ]
    };

    await setDoc(doc(db, "plans", athleteId), { weeks: sanitizeForFirestore(updatedPlan) });
  };

  const updateWorkoutFeedback = async (athleteId: string, weekIndex: number, dayIndex: number, feedback: string) => {
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) return;

    const updatedPlan = [...currentPlan];
    const workout = { ...updatedPlan[weekIndex].workouts[dayIndex] };
    workout.feedback = feedback;
    
    updatedPlan[weekIndex] = {
      ...updatedPlan[weekIndex],
      workouts: [
        ...updatedPlan[weekIndex].workouts.slice(0, dayIndex),
        workout,
        ...updatedPlan[weekIndex].workouts.slice(dayIndex + 1)
      ]
    };

    await setDoc(doc(db, "plans", athleteId), { weeks: sanitizeForFirestore(updatedPlan) });
  };

  const getAthleteMetrics = (athleteId: string) => {
    const plans = athletePlans[athleteId] || [];
    let totalWorkouts = 0;
    let completedWorkouts = 0;
    let totalVolumePlanned = 0;
    let totalVolumeCompleted = 0;

    const history: HistoryEntry[] = plans.map(week => {
      let weekPlanned = 0;
      let weekCompleted = 0;

      week.workouts.forEach(w => {
        if (w.distance) {
          weekPlanned += w.distance;
          if (w.completed) {
            weekCompleted += w.distance;
            completedWorkouts++;
            totalVolumeCompleted += w.distance;
          }
        }
        totalWorkouts++;
      });
      totalVolumePlanned += weekPlanned;

      return {
        label: `Sem ${week.weekNumber}`,
        planned: weekPlanned,
        completed: weekCompleted
      };
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
      athletePlans, saveAthletePlan, toggleWorkoutCompletion, updateWorkoutFeedback,
      getAthleteMetrics, isLoading
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
