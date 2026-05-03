
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Athlete, Workout, HistoryEntry, TrainingWeek, UserRole, Assessment, AthletePlan, Subscription, TrainingTemplate, AppNotification } from '../types';
import { getHrRangeString } from '../utils/calculations';
import { safeDeepClone } from '../utils/helpers';
import { analyzeAthletePerformance } from '../services/performanceService';
import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../utils/sanitization';

interface AppContextType {
// ... existing types ...
  userRole: UserRole;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  
  athletes: Athlete[];
// ... existing types ...
  addAthlete: (athlete: Athlete) => Promise<void>;
  updateAthlete: (id: string, data: Partial<Athlete>) => Promise<void>;
  updateAthleteReadiness: (id: string, readiness: Athlete['readiness']) => Promise<void>;
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
  runAIAnalysis: (athleteId: string) => Promise<void>;
  isLoading: boolean;
  isCloudConnected: boolean;
  isFirebaseConfigured: boolean;
  
  subscription: Subscription | null;
  hasActiveSubscription: boolean;
  refreshSubscription: () => Promise<void>;

  templates: TrainingTemplate[];
  saveTemplate: (template: Omit<TrainingTemplate, 'id'>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = React.useState<UserRole>(() => {
    return (localStorage.getItem('proRun_userRole') as UserRole) || null;
  });
  
  const [selectedAthleteId, setSelectedAthleteId] = React.useState<string | null>(() => {
    return localStorage.getItem('proRun_selectedAthleteId') || null;
  });
  
  const [athletes, setAthletes] = React.useState<Athlete[]>(() => {
    const cached = localStorage.getItem('proRun_cached_athletes');
    return cached ? JSON.parse(cached) : [];
  });
  const [workouts, setWorkouts] = React.useState<Workout[]>(() => {
    const cached = localStorage.getItem('proRun_cached_workouts');
    return cached ? JSON.parse(cached) : [];
  });
  const [athletePlans, setAthletePlans] = React.useState<Record<string, AthletePlan>>(() => {
    const cached = localStorage.getItem('proRun_cached_athletePlans');
    return cached ? JSON.parse(cached) : {};
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCloudConnected, setIsCloudConnected] = React.useState(true);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [templates, setTemplates] = React.useState<TrainingTemplate[]>(() => {
    const saved = localStorage.getItem('proRun_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifications, setNotifications] = React.useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('proRun_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Listen to Supabase Auth Changes for future expansion
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase Auth Event: ${event}`);
      if (event === 'SIGNED_OUT') {
        logout();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('proRun_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    localStorage.setItem('proRun_templates', JSON.stringify(templates));
  }, [templates]);

  const saveTemplate = async (templateData: Omit<TrainingTemplate, 'id'>) => {
    const newTemplate = { ...templateData, id: crypto.randomUUID() };
    setTemplates(prev => [...prev, newTemplate]);
  };

  const deleteTemplate = async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const hasActiveSubscription = React.useMemo(() => {
    if (userRole === 'coach') return true; 
    return subscription?.status === 'active';
  }, [subscription, userRole]);

  const refreshSubscription = async () => {
    try {
       const { data, error } = await supabase.from('subscriptions').select('*').limit(1);
       if (!error && data && data.length > 0) {
         setSubscription(data[0] as Subscription);
       }
    } catch (e) {
      // Silence table not found errors
    }
  };

  const runAIAnalysis = async (athleteId: string) => {
    if (!hasActiveSubscription) {
      addNotification({
        title: 'Assinatura Necessária',
        message: 'Esta funcionalidade requer uma assinatura ProRun Ativa.',
        type: 'warning',
        category: 'system'
      });
      return;
    }
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;
    
    const plan = athletePlans[athleteId] || null;
    const result = await analyzeAthletePerformance(athlete, plan);
    
    if (result) {
      const updatedAthlete = {
        ...athlete,
        metrics: {
          ...athlete.metrics,
          performanceScore: result.performanceScore,
          fatigueScore: result.fatigueScore,
          readinessScore: result.readinessScore,
          injuryRiskScore: result.injuryRiskScore,
          physicalCapabilities: result.physicalCapabilities,
          aiAnalysis: result.analysis
        }
      };
      
      await updateAthlete(athleteId, updatedAthlete);
    }
  };

  const fetchData = async () => {
    // Check cache first to avoid flickering
    const cachedAthletes = localStorage.getItem('proRun_cached_athletes');
    const cachedWorkouts = localStorage.getItem('proRun_cached_workouts');
    const cachedPlans = localStorage.getItem('proRun_cached_athletePlans');

    if (cachedAthletes) setAthletes(JSON.parse(cachedAthletes));
    if (cachedWorkouts) setWorkouts(JSON.parse(cachedWorkouts));
    if (cachedPlans) setAthletePlans(JSON.parse(cachedPlans));
    
    setIsLoading(true);
    try {
      const [athletesRes, workoutsRes, plansRes] = await Promise.all([
        supabase.from('athletes').select('data').order('created_at', { ascending: false }),
        supabase.from('workouts_library').select('data').order('created_at', { ascending: false }),
        supabase.from('athlete_plans').select('*')
      ]);

      if (athletesRes.data) {
        const fetchedAthletes = athletesRes.data.map(row => row.data);
        setAthletes(fetchedAthletes);
        localStorage.setItem('proRun_cached_athletes', JSON.stringify(fetchedAthletes));
      }
      
      if (workoutsRes.data) {
        const fetchedWorkouts = workoutsRes.data.map(row => row.data);
        setWorkouts(fetchedWorkouts);
        localStorage.setItem('proRun_cached_workouts', JSON.stringify(fetchedWorkouts));
      }
      
      if (plansRes.data) {
        const plans: Record<string, any> = {};
        plansRes.data.forEach(row => {
          plans[row.athlete_id] = row.plan_data;
        });
        setAthletePlans(plans);
        localStorage.setItem('proRun_cached_athletePlans', JSON.stringify(plans));
      }
      
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
    refreshSubscription();
  }, []);

  useEffect(() => {
    if (userRole) {
      localStorage.setItem('proRun_userRole', userRole);
    } else {
      localStorage.removeItem('proRun_userRole');
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedAthleteId) {
      localStorage.setItem('proRun_selectedAthleteId', selectedAthleteId);
    } else {
      localStorage.removeItem('proRun_selectedAthleteId');
    }
  }, [selectedAthleteId]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const sUsername = sanitizeInput(username);
    const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedUsername = normalize(sUsername);

    // Hardcoded coach login (can be migrated to Supabase Auth tables later)
    if (normalizedUsername === 'leandro' && password === '1234') {
      setUserRole('coach');
      setSelectedAthleteId(null);
      return { success: true };
    }

    const athlete = athletes.find(a => normalize(a.name) === normalizedUsername);
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
    return { success: false, message: 'Usuário não encontrado.' };
  };

  const logout = useCallback(() => {
    setUserRole(null);
    setSelectedAthleteId(null);
    localStorage.clear();
    supabase.auth.signOut();
  }, []);

  const addAthlete = async (athlete: Athlete) => {
    setAthletes(prev => [athlete, ...prev]);
    try {
      await supabase.from('athletes').upsert({ id: athlete.id, data: athlete });
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
        await supabase.from('athletes').upsert({ id: athlete.id, data: athlete });
      } catch (err) {
        console.error("Error updating athlete:", err);
      }
    }
  };

  const updateAthleteReadiness = async (id: string, readiness: Athlete['readiness']) => {
    const athlete = athletes.find(a => a.id === id);
    if (!athlete) return;

    await updateAthlete(id, { readiness });

    const statusMap = {
      ready: 'PRONTO ⚡',
      fatigued: 'FADIGADO 😴',
      recovering: 'EM RECUPERAÇÃO 🧘'
    };

    addNotification({
      title: 'Feedback de Prontidão',
      message: `${athlete.name} informou que está ${statusMap[readiness || 'ready']}.`,
      type: readiness === 'fatigued' ? 'warning' : 'info',
      link: '/dashboard',
      category: 'workout'
    });
  };

  const deleteAthlete = async (id: string) => {
    setAthletes(prev => prev.filter(a => a.id !== id));
    try {
      await supabase.from('athletes').delete().eq('id', id);
      await supabase.from('athlete_plans').delete().eq('athlete_id', id);
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
      await supabase.from('athletes').upsert({ id: updatePayload.id, data: updatePayload });
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
      await supabase.from('athletes').upsert({ id: updatePayload.id, data: updatePayload });
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
      await supabase.from('athletes').upsert({ id: updatePayload.id, data: updatePayload });
    } catch (err) {
      console.error("Error deleting assessment:", err);
    }
  };

  const addWorkout = async (workout: Workout) => {
    setWorkouts(prev => [workout, ...prev]);
    try {
      await supabase.from('workouts_library').upsert({ id: workout.id, data: workout });
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
        await supabase.from('workouts_library').upsert({ id: workout.id, data: workout });
      } catch (err) {
        console.error("Error updating workout:", err);
      }
    }
  };

  const deleteLibraryWorkout = async (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
    try {
      await supabase.from('workouts_library').delete().eq('id', id);
    } catch (err) {
      console.error("Error deleting workout:", err);
    }
  };

  const saveAthletePlan = async (athleteId: string, plan: AthletePlan) => {
    setAthletePlans(prev => ({ ...prev, [athleteId]: plan }));
    try {
      await supabase.from('athlete_plans').upsert({ athlete_id: athleteId, plan_data: plan });
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  const updateWorkoutStatus = async (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string, rpe?: number) => {
    const sFeedback = sanitizeInput(feedback);
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) throw new Error("Plano inexistente.");
    
    const updatedPlan = safeDeepClone(currentPlan);
    const workout = updatedPlan.weeks[weekIndex].workouts[dayIndex];
    
    workout.completed = completed;
    workout.feedback = sFeedback || "";
    workout.rpe = rpe !== undefined ? rpe : (workout.rpe || 0);
    
    setAthletePlans(prev => ({
      ...prev,
      [athleteId]: updatedPlan
    }));

    try {
      await supabase.from('athlete_plans').upsert({ athlete_id: athleteId, plan_data: updatedPlan });
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
      athletes, addAthlete, updateAthlete, updateAthleteReadiness, deleteAthlete, 
      addNewAssessment, updateAssessment, deleteAssessment,
      workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout,
      selectedAthleteId, setSelectedAthleteId,
      athletePlans, saveAthletePlan, updateWorkoutStatus,
      getAthleteMetrics, runAIAnalysis, isLoading, isCloudConnected,
      isFirebaseConfigured: true, 
      subscription, hasActiveSubscription, refreshSubscription,
      templates, saveTemplate, deleteTemplate,
      notifications, addNotification, markAsRead, removeNotification
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

