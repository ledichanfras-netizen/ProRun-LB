
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Athlete, Workout, HistoryEntry, TrainingWeek, UserRole, Assessment, AthletePlan, Subscription, TrainingTemplate, AppNotification, UserGoal, Exercise } from '../types';
import { getHrRangeString } from '../utils/calculations';
import { safeDeepClone } from '../utils/helpers';
import { analyzeAthletePerformance } from '../services/performanceService';
import { updateGamificationData, countCompletedWorkouts, calculateAthleteGamification } from '../services/gamificationService';
import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../utils/sanitization';
import { getAppNow, getTodayDateString } from '../utils/time';
import { DEFAULT_WORKOUTS } from '../data/defaultWorkouts';

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
  seedDefaultWorkouts: () => Promise<void>;
  
  selectedAthleteId: string | null;
  setSelectedAthleteId: (id: string | null) => void;
  
  athletePlans: Record<string, AthletePlan>;
  saveAthletePlan: (athleteId: string, plan: AthletePlan) => Promise<void>;
  clearAthletePlan: (athleteId: string) => Promise<void>;
  rescheduleWorkout: (
    athleteId: string,
    fromWeekIndex: number,
    fromDayIndex: number,
    toWeekIndex: number,
    toDayIndex: number,
    newDateStr?: string
  ) => Promise<AthletePlan>;
  updateWorkoutStatus: (
    athleteId: string, 
    weekIndex: number, 
    dayIndex: number, 
    completed: boolean, 
    feedback: string, 
    rpe?: number, 
    exercises?: Exercise[], 
    actualDistance?: number,
    sleepScore?: number,
    stressScore?: number,
    sorenessScore?: number,
    moodScore?: number,
    menstrualPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none',
    readinessScore?: number,
    gpsRoute?: any,
    structuredSteps?: any[],
    actualDuration?: string,
    avgHeartRate?: number,
    workoutType?: string,
    customDescription?: string,
    workoutDate?: string
  ) => Promise<void>;
  
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
  addUserGoal: (athleteId: string, goal: Omit<UserGoal, 'id' | 'currentValue' | 'completed'>) => Promise<void>;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('proRun_userRole') as UserRole) || null;
  });
  
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(() => {
    return localStorage.getItem('proRun_selectedAthleteId') || null;
  });
  
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const cached = localStorage.getItem('proRun_cached_athletes');
    return cached ? JSON.parse(cached) : [];
  });
  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    const cached = localStorage.getItem('proRun_cached_workouts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing cached workouts', e);
      }
    }
    return DEFAULT_WORKOUTS;
  });
  const [athletePlans, setAthletePlans] = useState<Record<string, AthletePlan>>(() => {
    const cached = localStorage.getItem('proRun_cached_athletePlans');
    return cached ? JSON.parse(cached) : {};
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [templates, setTemplates] = useState<TrainingTemplate[]>(() => {
    const saved = localStorage.getItem('proRun_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('proRun_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('proRun_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('proRun_theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('proRun_theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  const logout = useCallback(() => {
    // Guard: Only proceed if actually logged in to prevent infinite reload loops
    if (!localStorage.getItem('proRun_userRole') && !userRole) {
      return;
    }
    setUserRole(null);
    setSelectedAthleteId(null);
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("localStorage.clear failed:", e);
    }
    
    try {
      supabase.auth.signOut();
    } catch (e) {
      console.warn("supabase.auth.signOut failed:", e);
    }

    // Clean redirection to the login view and reload the browser tab 
    // to cleanly sweep memory/context without lingering dark screen states.
    setTimeout(() => {
      window.location.hash = '#/login';
      window.location.reload();
    }, 100);
  }, [userRole]);

  // Listen to Supabase Auth Changes for future expansion
  useEffect(() => {
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        console.log(`Supabase Auth Event: ${event}`);
        if (event === 'SIGNED_OUT') {
          if (localStorage.getItem('proRun_userRole') || userRole) {
            logout();
          }
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe?.();
      };
    } catch (e) {
      console.warn("Supabase auth listener setup skipped:", e);
    }
  }, [logout, userRole]);

  useEffect(() => {
    localStorage.setItem('proRun_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: crypto.randomUUID(),
      timestamp: getAppNow().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    
    try {
      // Omit icon from DB insert payload to prevent "column icon of relation app_notifications does not exist"
      await supabase.from('app_notifications').insert({
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type || null,
        category: newNotif.category || null,
        link: newNotif.link || null,
        timestamp: newNotif.timestamp
      });
    } catch (e) {
      console.warn("Could not sync notification to cloud", e);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await supabase.from('app_notifications').update({ read: true }).eq('id', id);
    } catch (e) {}
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await supabase.from('app_notifications').delete().eq('id', id);
    } catch (e) {}
  }, []);

  const addUserGoal = async (athleteId: string, goalData: any) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return;

    const newGoal = {
      ...goalData,
      id: crypto.randomUUID(),
      currentValue: 0,
      completed: false
    };

    const updatedGamification = {
      ...(athlete.gamification || {
        xp: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
        achievements: [],
        goals: []
      }),
      goals: [...(athlete.gamification?.goals || []), newGoal]
    };

    await updateAthlete(athleteId, { gamification: updatedGamification });
  };

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

  const hasActiveSubscription = useMemo(() => {
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
        category: 'system',
        link: '/subscription'
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

    if (cachedAthletes) {
      try { setAthletes(JSON.parse(cachedAthletes)); } catch (e) {}
    }
    if (cachedWorkouts) {
      try { setWorkouts(JSON.parse(cachedWorkouts)); } catch (e) {}
    }
    if (cachedPlans) {
      try { setAthletePlans(JSON.parse(cachedPlans)); } catch (e) {}
    }
    
    setIsLoading(true);
    try {
      console.log("[Sync] Tentando sincronização de dados com Supabase...");
      
      const safeQuery = async (queryPromise: PromiseLike<any>) => {
        try {
          const res = await queryPromise;
          return res;
        } catch (err: any) {
          return { data: null, error: err };
        }
      };

      const [athletesRes, workoutsRes, plansRes, notifsRes] = await Promise.all([
        safeQuery(supabase.from('athletes').select('data')),
        safeQuery(supabase.from('workouts_library').select('data')),
        safeQuery(supabase.from('athlete_plans').select('*')),
        safeQuery(supabase.from('app_notifications').select('*').order('timestamp', { ascending: false }).limit(20))
      ]);

      if (athletesRes.error) {
        console.warn("[Sync] Informação: Nuvem inacessível para atletas. Usando armazenamento local.", athletesRes.error?.message || athletesRes.error);
      }
      if (workoutsRes.error) {
        console.warn("[Sync] Informação: Nuvem inacessível para biblioteca de treinos. Usando armazenamento local.", workoutsRes.error?.message || workoutsRes.error);
      }
      if (plansRes.error) {
        console.warn("[Sync] Informação: Nuvem inacessível para planos. Usando armazenamento local.", plansRes.error?.message || plansRes.error);
      }
      if (notifsRes.data) {
        setNotifications(notifsRes.data as any);
      }

      const hasError = !!(athletesRes.error || workoutsRes.error || plansRes.error);
      setIsCloudConnected(!hasError);

      if (athletesRes.data && athletesRes.data.length > 0) {
        console.log(`[Sync] ${athletesRes.data.length} atletas sincronizados.`);
        const fetchedAthletes = athletesRes.data.map((row: any) => row.data);
        setAthletes(fetchedAthletes);
        localStorage.setItem('proRun_cached_athletes', JSON.stringify(fetchedAthletes));
      }
      
      if (workoutsRes.data && workoutsRes.data.length > 0) {
        console.log(`[Sync] ${workoutsRes.data.length} treinos sincronizados.`);
        const fetchedWorkouts = workoutsRes.data.map((row: any) => row.data);
        setWorkouts(fetchedWorkouts);
        localStorage.setItem('proRun_cached_workouts', JSON.stringify(fetchedWorkouts));
      }
      
      if (plansRes.data && plansRes.data.length > 0) {
        console.log(`[Sync] ${plansRes.data.length} planos sincronizados.`);
        const plans: Record<string, any> = {};
        plansRes.data.forEach((row: any) => {
          const athleteId = row.athlete_id || row.id;
          if (athleteId) {
            if (row.plan_data) {
              // Priority 1: Match hosted DB schema with nested plan_data JSONB column
              const pd = row.plan_data;
              const weeks = pd.weeks || [];
              const firstWeek = weeks[0];
              let startDate = pd.startDate || pd.start_date || null;
              let trainingDays = pd.trainingDays || pd.training_days || null;

              if (!startDate && firstWeek) {
                startDate = firstWeek.planStartDate || firstWeek.startDate || null;
              }
              if (!trainingDays && firstWeek) {
                trainingDays = firstWeek.planTrainingDays || firstWeek.trainingDays || null;
              }

              plans[athleteId] = {
                weeks: weeks,
                raceStrategy: pd.raceStrategy || pd.race_strategy || null,
                motivationalMessage: pd.motivationalMessage || pd.motivational_message || null,
                specificGoal: pd.specificGoal || pd.specific_goal || null,
                startDate: startDate,
                trainingDays: trainingDays
              };
            } else {
              // Priority 2: Fallback to single table columns
              const weeks = row.weeks || [];
              const firstWeek = weeks[0];
              let startDate = row.start_date || row.startDate || null;
              let trainingDays = row.training_days || row.trainingDays || null;

              if (!startDate && firstWeek) {
                startDate = firstWeek.planStartDate || firstWeek.startDate || null;
              }
              if (!trainingDays && firstWeek) {
                trainingDays = firstWeek.planTrainingDays || firstWeek.trainingDays || null;
              }

              plans[athleteId] = {
                weeks: weeks,
                raceStrategy: row.race_strategy || row.raceStrategy || null,
                motivationalMessage: row.motivational_message || row.motivationalMessage || null,
                specificGoal: row.specific_goal || row.specificGoal || null,
                startDate: startDate,
                trainingDays: trainingDays
              };
            }
          }
        });
        setAthletePlans(plans);
        localStorage.setItem('proRun_cached_athletePlans', JSON.stringify(plans));

        // Auto-heal and reconcile athlete gamification (streaks, KM real, total workouts, level)
        setAthletes(prevAthletes => {
          let hasChanges = false;
          const reconciled = prevAthletes.map(ath => {
            const { updatedData } = calculateAthleteGamification(plans, ath.id, ath.gamification, ath.archivedPlans);
            if (JSON.stringify(updatedData) !== JSON.stringify(ath.gamification)) {
              hasChanges = true;
              return {
                ...ath,
                gamification: updatedData
              };
            }
            return ath;
          });
          if (hasChanges) {
            localStorage.setItem('proRun_cached_athletes', JSON.stringify(reconciled));
          }
          return hasChanges ? reconciled : prevAthletes;
        });
      }
      
    } catch (err: any) {
      console.warn("[Sync] Operando em modo offline/local:", err?.message || err);
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

  useEffect(() => {
    if (athletes && athletes.length > 0) {
      localStorage.setItem('proRun_cached_athletes', JSON.stringify(athletes));
    }
  }, [athletes]);

  useEffect(() => {
    if (workouts && workouts.length > 0) {
      localStorage.setItem('proRun_cached_workouts', JSON.stringify(workouts));
    }
  }, [workouts]);

  useEffect(() => {
    if (athletePlans && Object.keys(athletePlans).length > 0) {
      localStorage.setItem('proRun_cached_athletePlans', JSON.stringify(athletePlans));
    }
  }, [athletePlans]);

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

  const addAthlete = async (athlete: Athlete) => {
    setAthletes(prev => [athlete, ...prev]);
    try {
      await supabase.from('athletes').upsert({ id: athlete.id, data: athlete });
    } catch (err) {
      console.warn("Could not sync added athlete to cloud (stored locally):", err);
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
        console.warn("Could not sync updated athlete to cloud (stored locally):", err);
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
      try {
        await supabase.from('athlete_plans').delete().eq('athlete_id', id);
      } catch (e) {}
      try {
        await supabase.from('athlete_plans').delete().eq('id', id);
      } catch (e) {}
    } catch (err) {
      console.warn("Could not sync deleted athlete to cloud (removed locally):", err);
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
      console.warn("Could not sync assessment to cloud (stored locally):", err);
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
      console.warn("Could not sync assessment update to cloud (stored locally):", err);
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
      console.warn("Could not sync assessment deletion to cloud (removed locally):", err);
    }
  };

  const addWorkout = async (workout: Workout) => {
    setWorkouts(prev => [workout, ...prev]);
    try {
      await supabase.from('workouts_library').upsert({ id: workout.id, data: workout });
    } catch (err) {
      console.warn("Could not sync workout to cloud (stored locally):", err);
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
        console.warn("Could not sync workout update to cloud (stored locally):", err);
      }
    }
  };

  const deleteLibraryWorkout = async (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
    try {
      await supabase.from('workouts_library').delete().eq('id', id);
    } catch (err) {
      console.warn("Could not sync workout deletion to cloud (removed locally):", err);
    }
  };

  const seedDefaultWorkouts = async () => {
    setWorkouts(prev => {
      const existingIds = new Set(prev.map(w => w.id));
      const newItems = DEFAULT_WORKOUTS.filter(w => !existingIds.has(w.id));
      const combined = [...prev, ...newItems];
      const result = combined.length > 0 ? combined : DEFAULT_WORKOUTS;
      localStorage.setItem('proRun_cached_workouts', JSON.stringify(result));
      return result;
    });

    try {
      for (const w of DEFAULT_WORKOUTS) {
        await supabase.from('workouts_library').upsert({ id: w.id, data: w });
      }
    } catch (err) {
      console.warn("Could not sync default workouts to cloud (stored locally):", err);
    }
  };

  const saveAthletePlan = async (athleteId: string, plan: AthletePlan) => {
    // Recalculate planned totalVolume and actualVolume for all weeks
    const weeksWithMetadata = (plan.weeks || []).map((w: any, index: number) => {
      const plannedTotal = (w.workouts || []).reduce(
        (acc: number, curr: any) => acc + (Number(curr.distance) || 0),
        0
      );
      const realTotal = (w.workouts || []).reduce(
        (acc: number, curr: any) => {
          if (curr.completed) {
            const d = curr.actualDistance !== undefined && curr.actualDistance !== null && curr.actualDistance !== ''
              ? Number(String(curr.actualDistance).replace(',', '.'))
              : (Number(curr.distance) || 0);
            return acc + (isNaN(d) ? 0 : d);
          }
          return acc;
        },
        0
      );
      const weekObj = {
        ...w,
        totalVolume: Math.round(plannedTotal * 10) / 10,
        actualVolume: Math.round(realTotal * 10) / 10
      };
      if (index === 0) {
        return {
          ...weekObj,
          planStartDate: plan.startDate,
          planTrainingDays: plan.trainingDays
        };
      }
      return weekObj;
    });

    const planWithMetadata = {
      ...plan,
      weeks: weeksWithMetadata
    };

    setAthletePlans(prev => ({ ...prev, [athleteId]: planWithMetadata }));

    // Reconcile athlete gamification (streaks, real volume, total workouts)
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete) {
      const simulatedPlans = { ...athletePlans, [athleteId]: planWithMetadata };
      const { updatedData } = calculateAthleteGamification(simulatedPlans, athleteId, athlete.gamification, athlete.archivedPlans);
      await updateAthlete(athleteId, { gamification: updatedData });
    }
    try {
      // Upsert using the primary schema (athlete_id and plan_data)
      await supabase.from('athlete_plans').upsert({
        athlete_id: athleteId,
        plan_data: {
          weeks: weeksWithMetadata,
          raceStrategy: plan.raceStrategy || null,
          motivationalMessage: plan.motivationalMessage || null,
          specificGoal: plan.specificGoal || null,
          startDate: plan.startDate || null,
          trainingDays: plan.trainingDays || null
        }
      });

      // Fallback format for compatibility with alternate schemas
      try {
        await supabase.from('athlete_plans').upsert({
          id: athleteId,
          weeks: weeksWithMetadata,
          race_strategy: plan.raceStrategy || null,
          motivational_message: plan.motivationalMessage || null,
          specific_goal: plan.specificGoal || null
        });
      } catch (innerErr) {
        // Safe to ignore
      }
    } catch (err) {
      console.warn("Could not sync plan to cloud (stored locally):", err);
    }
  };

  const clearAthletePlan = async (athleteId: string) => {
    setAthletePlans(prev => {
      const next = { ...prev };
      delete next[athleteId];
      return next;
    });
    try {
      await supabase.from('athlete_plans').delete().eq('athlete_id', athleteId);
      try {
        await supabase.from('athlete_plans').delete().eq('id', athleteId);
      } catch (innerErr) {
        // Safe to ignore
      }
    } catch (err) {
      console.warn("Could not sync plan clearing to cloud (removed locally):", err);
    }
  };

  const rescheduleWorkout = async (
    athleteId: string,
    fromWeekIndex: number,
    fromDayIndex: number,
    toWeekIndex: number,
    toDayIndex: number,
    newDateStr?: string
  ): Promise<AthletePlan> => {
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan || !currentPlan.weeks) throw new Error("Plano inexistente.");

    const newPlan = safeDeepClone(currentPlan);
    if (!newPlan.weeks[fromWeekIndex]?.workouts?.[fromDayIndex] || !newPlan.weeks[toWeekIndex]?.workouts?.[toDayIndex]) {
      throw new Error("Posição de treino inválida.");
    }

    const fromWorkout = { ...newPlan.weeks[fromWeekIndex].workouts[fromDayIndex] };
    const toWorkout = { ...newPlan.weeks[toWeekIndex].workouts[toDayIndex] };

    const diasSemana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
    const fromDayName = diasSemana[fromDayIndex] || fromWorkout.day;
    const toDayName = diasSemana[toDayIndex] || toWorkout.day;

    if (newDateStr) {
      fromWorkout.date = newDateStr;
    }

    // Move fromWorkout to target slot, and toWorkout to origin slot (swapping)
    newPlan.weeks[fromWeekIndex].workouts[fromDayIndex] = {
      ...toWorkout,
      day: fromDayName
    };

    newPlan.weeks[toWeekIndex].workouts[toDayIndex] = {
      ...fromWorkout,
      day: toDayName
    };

    // Recalculate volume for affected weeks
    const affectedWeeks = Array.from(new Set([fromWeekIndex, toWeekIndex]));
    affectedWeeks.forEach(wIdx => {
      if (newPlan.weeks[wIdx]?.workouts) {
        const plannedKm = newPlan.weeks[wIdx].workouts.reduce(
          (acc: number, curr: any) => acc + (Number(curr.distance) || 0),
          0
        );
        const realKm = newPlan.weeks[wIdx].workouts.reduce(
          (acc: number, curr: any) => {
            if (curr.completed) {
              const d = curr.actualDistance !== undefined && curr.actualDistance !== null && curr.actualDistance !== ''
                ? Number(String(curr.actualDistance).replace(',', '.'))
                : (Number(curr.distance) || 0);
              return acc + (isNaN(d) ? 0 : d);
            }
            return acc;
          },
          0
        );
        newPlan.weeks[wIdx].totalVolume = Math.round(plannedKm * 10) / 10;
        newPlan.weeks[wIdx].actualVolume = Math.round(realKm * 10) / 10;
      }
    });

    await saveAthletePlan(athleteId, newPlan);
    return newPlan;
  };

  const updateWorkoutStatus = async (
    athleteId: string, 
    weekIndex: number, 
    dayIndex: number, 
    completed: boolean, 
    feedback: string, 
    rpe?: number, 
    exercises?: Exercise[], 
    actualDistance?: number,
    sleepScore?: number,
    stressScore?: number,
    sorenessScore?: number,
    moodScore?: number,
    menstrualPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none',
    readinessScore?: number,
    gpsRoute?: any,
    structuredSteps?: any[],
    actualDuration?: string,
    avgHeartRate?: number,
    workoutType?: string,
    customDescription?: string,
    workoutDate?: string
  ) => {
    const sFeedback = sanitizeInput(feedback);
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) throw new Error("Plano inexistente.");
    
    const updatedPlan = safeDeepClone(currentPlan);
    const validWeekIndex = Math.max(0, Math.min(weekIndex, (updatedPlan.weeks?.length || 1) - 1));
    const validWeek = updatedPlan.weeks?.[validWeekIndex];
    if (!validWeek || !validWeek.workouts) throw new Error("Semana inexistente no plano.");
    
    const validDayIndex = Math.max(0, Math.min(dayIndex, validWeek.workouts.length - 1));
    const workout = validWeek.workouts[validDayIndex];
    if (!workout) throw new Error("Treino inexistente no plano.");
    
    const wasAlreadyCompleted = Boolean(workout.completed);
    
    workout.completed = completed;
    workout.feedback = sFeedback || "";
    workout.rpe = rpe !== undefined ? rpe : (workout.rpe || 0);
    if (exercises) workout.exercises = exercises;
    if (actualDistance !== undefined) {
      workout.actualDistance = actualDistance;
    }
    if (actualDuration !== undefined) {
      workout.actualDuration = actualDuration;
    }
    if (avgHeartRate !== undefined) {
      workout.avgHeartRate = avgHeartRate;
    }
    if (workoutType !== undefined && workoutType.trim() !== "") {
      workout.type = workoutType;
      if (workout.structuredWorkout) {
        workout.structuredWorkout.name = workoutType;
      }
    }
    if (customDescription !== undefined) {
      workout.customDescription = customDescription;
    }
    if (workoutDate !== undefined) {
      workout.date = workoutDate;
    }
    
    if (structuredSteps !== undefined) {
      if (!workout.structuredWorkout) {
        workout.structuredWorkout = {
          id: Math.random().toString(36).substring(2, 11),
          name: workout.type || "Treino",
          steps: []
        };
      }
      workout.structuredWorkout.steps = structuredSteps;
    }
    
    if (sleepScore !== undefined) workout.sleepScore = sleepScore;
    if (stressScore !== undefined) workout.stressScore = stressScore;
    if (sorenessScore !== undefined) workout.sorenessScore = sorenessScore;
    if (moodScore !== undefined) workout.moodScore = moodScore;
    if (menstrualPhase !== undefined) workout.menstrualPhase = menstrualPhase;
    if (readinessScore !== undefined) workout.readinessScore = readinessScore;
    if (gpsRoute !== undefined) workout.gpsRoute = gpsRoute;

    // Recalculate planned totalVolume and actualVolume for all weeks in the plan
    const weeksWithMetadata = updatedPlan.weeks.map((w: any, index: number) => {
      const plannedTotal = (w.workouts || []).reduce(
        (acc: number, curr: any) => acc + (Number(curr.distance) || 0),
        0
      );
      const realTotal = (w.workouts || []).reduce(
        (acc: number, curr: any) => {
          if (curr.completed) {
            const d = curr.actualDistance !== undefined && curr.actualDistance !== null && curr.actualDistance !== ''
              ? Number(String(curr.actualDistance).replace(',', '.'))
              : (Number(curr.distance) || 0);
            return acc + (isNaN(d) ? 0 : d);
          }
          return acc;
        },
        0
      );
      const weekObj = {
        ...w,
        totalVolume: Math.round(plannedTotal * 10) / 10,
        actualVolume: Math.round(realTotal * 10) / 10
      };
      if (index === 0) {
        return {
          ...weekObj,
          planStartDate: currentPlan.startDate,
          planTrainingDays: currentPlan.trainingDays
        };
      }
      return weekObj;
    });

    const planWithMetadata = {
      ...updatedPlan,
      weeks: weeksWithMetadata
    };
    
    // Gamification Integration (handles new completion, edits, or unmarking without inflating counts)
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete) {
      const simulatedPlans = {
        ...athletePlans,
        [athleteId]: planWithMetadata
      };

      const { updatedData, newAchievements } = calculateAthleteGamification(
        simulatedPlans,
        athleteId,
        athlete.gamification,
        athlete.archivedPlans
      );
      
      const updateData: Partial<Athlete> = { gamification: updatedData };
      
      if (readinessScore !== undefined && readinessScore !== null && !isNaN(readinessScore)) {
        const clampedScore = Math.min(100, Math.max(0, Math.round(readinessScore)));
        const todayStr = getTodayDateString();
        const existingHistory = athlete.readinessHistory ? [...athlete.readinessHistory] : [];
        const existingIdx = existingHistory.findIndex(h => h.date === todayStr);
        const readinessEntry = {
          id: existingIdx >= 0 ? existingHistory[existingIdx].id : Math.random().toString(36).substring(2, 9),
          date: todayStr,
          sleepScore: sleepScore !== undefined ? sleepScore : 8,
          stressScore: stressScore !== undefined ? stressScore : 2,
          sorenessScore: sorenessScore !== undefined ? sorenessScore : 2,
          moodScore: moodScore !== undefined ? moodScore : 8,
          menstrualPhase: menstrualPhase || 'none',
          readinessScore: clampedScore,
          energyLevel: clampedScore
        };

        if (existingIdx >= 0) {
          existingHistory[existingIdx] = { ...existingHistory[existingIdx], ...readinessEntry };
        } else {
          existingHistory.push(readinessEntry);
        }
        existingHistory.sort((a, b) => b.date.localeCompare(a.date));

        updateData.readinessHistory = existingHistory;
        updateData.lastReadiness = existingHistory[0];
        
        // Also set the simple backward compatible readiness field for dashboard filters
        if (clampedScore >= 70) {
          updateData.readiness = 'ready';
        } else if (clampedScore >= 40) {
          updateData.readiness = 'recovering';
        } else {
          updateData.readiness = 'fatigued';
        }
      }
      
      // Update athlete state with new gamification and readiness data
      await updateAthlete(athleteId, updateData);
      
      // Notify new achievements only if newly earned
      if (newAchievements && newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
          addNotification({
            title: `Nova Conquista: ${achievement.name}`,
            message: achievement.description,
            type: 'success',
            icon: achievement.icon,
            category: 'system',
            link: '/athlete-portal'
          } as any);
        });
      }
    }

    setAthletePlans(prev => ({
      ...prev,
      [athleteId]: planWithMetadata
    }));

    try {
      // Upsert using the primary schema (athlete_id and plan_data)
      await supabase.from('athlete_plans').upsert({
        athlete_id: athleteId,
        plan_data: {
          weeks: weeksWithMetadata,
          raceStrategy: updatedPlan.raceStrategy || null,
          motivationalMessage: updatedPlan.motivationalMessage || null,
          specificGoal: updatedPlan.specificGoal || null,
          startDate: currentPlan.startDate || null,
          trainingDays: currentPlan.trainingDays || null
        }
      });

      // Fallback format for compatibility with alternate schemas
      try {
        await supabase.from('athlete_plans').upsert({
          id: athleteId,
          weeks: weeksWithMetadata,
          race_strategy: updatedPlan.raceStrategy || null,
          motivational_message: updatedPlan.motivationalMessage || null,
          specific_goal: updatedPlan.specificGoal || null
        });
      } catch (innerErr) {
        // Safe to ignore
      }
    } catch (err) {
      console.warn("Could not sync workout status update to cloud (stored locally):", err);
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
        }
        if (w.completed) {
          weekCompleted += w.actualDistance !== undefined ? w.actualDistance : (w.distance || 0);
        }
        if (w.type !== 'Descanso') {
          totalWorkouts++;
          if (w.completed) completedWorkouts++;
        }
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
      workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout, seedDefaultWorkouts,
      selectedAthleteId, setSelectedAthleteId,
      athletePlans, saveAthletePlan, clearAthletePlan, rescheduleWorkout, updateWorkoutStatus,
      getAthleteMetrics, runAIAnalysis, isLoading, isCloudConnected,
      isFirebaseConfigured: true, 
      subscription, hasActiveSubscription, refreshSubscription,
      templates, saveTemplate, deleteTemplate,
      notifications, addNotification, markAsRead, removeNotification,
      addUserGoal,
      theme, setTheme, toggleTheme
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

