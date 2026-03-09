
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Athlete, Workout, HistoryEntry, TrainingWeek, UserRole, Assessment, AthletePlan } from '../types';
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
  isFirebaseConfigured: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [athletesRes, workoutsRes, plansRes] = await Promise.all([
        fetch('/api/athletes'),
        fetch('/api/workouts'),
        fetch('/api/plans')
      ]);

      if (athletesRes.ok) setAthletes(await athletesRes.json());
      if (workoutsRes.ok) setWorkouts(await workoutsRes.json());
      if (plansRes.ok) setAthletePlans(await plansRes.json());
      
      setIsCloudConnected(true);
    } catch (err) {
      console.error("Error fetching data:", err);
      setIsCloudConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (userRole) localStorage.setItem('proRun_userRole', userRole);
    else localStorage.removeItem('proRun_userRole');
  }, [userRole]);

  useEffect(() => {
    if (selectedAthleteId) localStorage.setItem('proRun_selectedAthleteId', selectedAthleteId);
    else localStorage.removeItem('proRun_selectedAthleteId');
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
    setAthletes(prev => [...prev, athlete]);
    try {
      await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(athlete)
      });
    } catch (err) {
      console.error("Error adding athlete:", err);
    }
  };
  
  const updateAthlete = async (id: string, data: Partial<Athlete>) => {
    const updatedAthletes = athletes.map(a => a.id === id ? { ...a, ...data } : a);
    setAthletes(updatedAthletes);
    const athlete = updatedAthletes.find(a => a.id === id);
    if (athlete) {
      try {
        await fetch('/api/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(athlete)
        });
      } catch (err) {
        console.error("Error updating athlete:", err);
      }
    }
  };

  const deleteAthlete = async (id: string) => {
    setAthletes(prev => prev.filter(a => a.id !== id));
    try {
      await fetch(`/api/athletes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Error deleting athlete:", err);
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
    const updatePayload = { ...athlete, assessmentHistory: newHistory, metrics: updatedMetrics, customZones: updatedCustomZones };
    
    setAthletes(prev => prev.map(a => a.id === athleteId ? updatePayload : a));

    try {
      await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
    } catch (err) {
      console.error("Error saving assessment:", err);
    }
  };

  const updateAssessment = async (athleteId: string, updatedAssessment: Assessment) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    const newHistory = (athlete.assessmentHistory || []).map(ass => ass.id === updatedAssessment.id ? updatedAssessment : ass);
    const isMostRecent = athlete.assessmentHistory?.[0]?.id === updatedAssessment.id;
    const updatePayload: any = { ...athlete, assessmentHistory: newHistory };
    if (isMostRecent) {
      const newFcMax = updatedAssessment.fcMax || athlete.metrics.fcMax;
      const newFcThreshold = updatedAssessment.fcThreshold || athlete.metrics.fcThreshold;
      updatePayload.metrics = { ...athlete.metrics, vdot: updatedAssessment.calculatedVdot, fcMax: newFcMax, fcThreshold: newFcThreshold };
      if (athlete.customZones && athlete.customZones.length > 0) {
        updatePayload.customZones = athlete.customZones.map(zone => ({ ...zone, heartRateRange: getHrRangeString(zone.zone, newFcThreshold, newFcMax) }));
      }
    }
    
    setAthletes(prev => prev.map(a => a.id === athleteId ? updatePayload : a));

    try {
      await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
    } catch (err) {
      console.error("Error updating assessment:", err);
    }
  };

  const deleteAssessment = async (athleteId: string, assessmentId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    const newHistory = (athlete.assessmentHistory || []).filter(ass => ass.id !== assessmentId);
    const updatePayload = { ...athlete, assessmentHistory: newHistory };
    
    setAthletes(prev => prev.map(a => a.id === athleteId ? updatePayload : a));

    try {
      await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
    } catch (err) {
      console.error("Error deleting assessment:", err);
    }
  };

  const addWorkout = async (workout: Workout) => {
    setWorkouts(prev => [...prev, workout]);
    try {
      await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workout)
      });
    } catch (err) {
      console.error("Error adding workout:", err);
    }
  };

  const updateLibraryWorkout = async (id: string, data: Partial<Workout>) => {
    const updatedWorkouts = workouts.map(w => w.id === id ? { ...w, ...data } : w);
    setWorkouts(updatedWorkouts);
    const workout = updatedWorkouts.find(w => w.id === id);
    if (workout) {
      try {
        await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workout)
        });
      } catch (err) {
        console.error("Error updating workout:", err);
      }
    }
  };

  const deleteLibraryWorkout = async (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
    try {
      await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Error deleting workout:", err);
    }
  };

  const saveAthletePlan = async (athleteId: string, plan: AthletePlan) => {
    setAthletePlans(prev => ({ ...prev, [athleteId]: plan }));
    try {
      await fetch(`/api/plans/${athleteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan)
      });
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  const updateWorkoutStatus = async (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string, rpe?: number) => {
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) throw new Error("Plano inexistente.");
    
    const updatedPlan = safeDeepClone(currentPlan);
    const workout = updatedPlan.weeks[weekIndex].workouts[dayIndex];
    
    workout.completed = completed;
    workout.feedback = feedback || "";
    workout.rpe = rpe !== undefined ? rpe : (workout.rpe || 0);
    
    setAthletePlans(prev => ({
      ...prev,
      [athleteId]: updatedPlan
    }));

    try {
      await fetch(`/api/plans/${athleteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPlan)
      });
    } catch (err) {
      console.error("Error updating workout status:", err);
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
      getAthleteMetrics, isLoading, isCloudConnected,
      isFirebaseConfigured: true // Always true now as we use PostgreSQL
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
