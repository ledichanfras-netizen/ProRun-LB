
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Athlete, Workout, HistoryEntry, TrainingWeek, UserRole, Assessment, AthletePlan, Subscription, TrainingTemplate, AppNotification, UserGoal, Exercise } from '../types';
import { getHrRangeString } from '../utils/calculations';
import { safeDeepClone } from '../utils/helpers';
import { analyzeAthletePerformance } from '../services/performanceService';
import { updateGamificationData } from '../services/gamificationService';
import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../utils/sanitization';
import { getAppNow } from '../utils/time';

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
  updateWorkoutStatus: (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string, rpe?: number, exercises?: Exercise[]) => Promise<void>;
  
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
    return cached ? JSON.parse(cached) : [];
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

  const logout = useCallback(() => {
    setUserRole(null);
    setSelectedAthleteId(null);
    localStorage.clear();
    supabase.auth.signOut();
  }, []);

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
  }, [logout]);

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

    if (cachedAthletes) setAthletes(JSON.parse(cachedAthletes));
    if (cachedWorkouts) setWorkouts(JSON.parse(cachedWorkouts));
    if (cachedPlans) setAthletePlans(JSON.parse(cachedPlans));
    
    setIsLoading(true);
    try {
      console.log("[Sync] Iniciando sincronização com Supabase...");
      
      // Simple select without order to avoid 400 errors if columns don't exist
      const [athletesRes, workoutsRes, plansRes, notifsRes] = await Promise.all([
        supabase.from('athletes').select('data'),
        supabase.from('workouts_library').select('data'),
        supabase.from('athlete_plans').select('*'),
        supabase.from('app_notifications').select('*').order('timestamp', { ascending: false }).limit(20)
      ]);

      if (athletesRes.error) {
        console.error("[Sync] Erro ao buscar atletas:", athletesRes.error);
      }
      if (workoutsRes.error) {
        console.error("[Sync] Erro ao buscar biblioteca de treinos:", workoutsRes.error);
      }
      if (plansRes.error) {
        console.error("[Sync] Erro ao buscar planos:", plansRes.error);
      }
      if (notifsRes.data) {
        setNotifications(notifsRes.data as any);
      }

      const hasCriticalError = (athletesRes.error && athletesRes.status === 404) || 
                               (workoutsRes.error && workoutsRes.status === 404);

      if (hasCriticalError) {
         console.warn("[Sync] Tabelas não encontradas. O App usará armazenamento local temporário.");
         setIsCloudConnected(false);
      } else {
         setIsCloudConnected(athletesRes.error || workoutsRes.error ? false : true);
      }

      if (athletesRes.data && athletesRes.data.length > 0) {
        console.log(`[Sync] ${athletesRes.data.length} atletas sincronizados.`);
        const fetchedAthletes = athletesRes.data.map(row => row.data);
        setAthletes(fetchedAthletes);
        localStorage.setItem('proRun_cached_athletes', JSON.stringify(fetchedAthletes));
      }
      
      if (workoutsRes.data && workoutsRes.data.length > 0) {
        console.log(`[Sync] ${workoutsRes.data.length} treinos sincronizados.`);
        const fetchedWorkouts = workoutsRes.data.map(row => row.data);
        setWorkouts(fetchedWorkouts);
        localStorage.setItem('proRun_cached_workouts', JSON.stringify(fetchedWorkouts));
      }
      
      if (plansRes.data && plansRes.data.length > 0) {
        console.log(`[Sync] ${plansRes.data.length} planos sincronizados.`);
        const plans: Record<string, any> = {};
        plansRes.data.forEach(row => {
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
      }
      
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
      try {
        await supabase.from('athlete_plans').delete().eq('athlete_id', id);
      } catch (e) {}
      try {
        await supabase.from('athlete_plans').delete().eq('id', id);
      } catch (e) {}
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
    // Inject metadata under the first week so it is persisted in the weeks JSONB column
    const weeksWithMetadata = plan.weeks.map((w: any, index: number) => {
      if (index === 0) {
        return {
          ...w,
          planStartDate: plan.startDate,
          planTrainingDays: plan.trainingDays
        };
      }
      return w;
    });

    const planWithMetadata = {
      ...plan,
      weeks: weeksWithMetadata
    };

    setAthletePlans(prev => ({ ...prev, [athleteId]: planWithMetadata }));
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
      console.error("Error saving plan:", err);
    }
  };

  const updateWorkoutStatus = async (athleteId: string, weekIndex: number, dayIndex: number, completed: boolean, feedback: string, rpe?: number, exercises?: Exercise[]) => {
    const sFeedback = sanitizeInput(feedback);
    const currentPlan = athletePlans[athleteId];
    if (!currentPlan) throw new Error("Plano inexistente.");
    
    const updatedPlan = safeDeepClone(currentPlan);
    const workout = updatedPlan.weeks[weekIndex].workouts[dayIndex];
    
    workout.completed = completed;
    workout.feedback = sFeedback || "";
    workout.rpe = rpe !== undefined ? rpe : (workout.rpe || 0);
    if (exercises) workout.exercises = exercises;
    
    // Gamification Integration
    if (completed) {
      const athlete = athletes.find(a => a.id === athleteId);
      if (athlete) {
        const { updatedData, newAchievements } = updateGamificationData(
          athlete.gamification,
          workout,
          athletePlans,
          athleteId
        );
        
        // Update athlete state with new gamification data
        await updateAthlete(athleteId, { gamification: updatedData });
        
        // Notify new achievements
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
    
    const weeksWithMetadata = updatedPlan.weeks.map((w: any, index: number) => {
      if (index === 0) {
        return {
          ...w,
          planStartDate: currentPlan.startDate,
          planTrainingDays: currentPlan.trainingDays
        };
      }
      return w;
    });

    const planWithMetadata = {
      ...updatedPlan,
      weeks: weeksWithMetadata
    };

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
      workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout,
      selectedAthleteId, setSelectedAthleteId,
      athletePlans, saveAthletePlan, updateWorkoutStatus,
      getAthleteMetrics, runAIAnalysis, isLoading, isCloudConnected,
      isFirebaseConfigured: true, 
      subscription, hasActiveSubscription, refreshSubscription,
      templates, saveTemplate, deleteTemplate,
      notifications, addNotification, markAsRead, removeNotification,
      addUserGoal
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

