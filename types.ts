
export type ExperienceLevel = 'Iniciante' | 'Intermediário' | 'Avançado' | 'Elite';
export type UserRole = 'coach' | 'athlete' | null;

export interface Assessment {
  id: string;
  date: string;
  type: '3k' | 'VO2_Lab' | 'TRF'; 
  resultValue: string; 
  calculatedVdot: number;
  vo2Max?: number;
  fcMax?: number; 
  fcThreshold?: number; 
  distanceKm?: number; 
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  load: string;
  order: number;
}

export interface Workout {
  id: string;
  title: string;
  type: WorkoutType;
  description: string;
  durationMinutes: number;
  distanceKm: number;
  rpe: number;
  exercises?: Exercise[];
}

export interface TrainingPace {
  zone: 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5'; 
  name: string;
  description: string;
  minPace: string; 
  maxPace: string; 
  speedKmh: string; 
  heartRateRange?: string; 
}

export interface Athlete {
  id: string;
  name: string;
  age: number;
  birthDate?: string; 
  weight: number; 
  height: number; 
  experience: ExperienceLevel;
  email: string;
  metrics: {
    vo2Max?: number; 
    test3kTime?: string; 
    vdot: number;
    fcMax?: number;
    fcThreshold?: number;
    performanceScore?: number;
    fatigueScore?: number;
    readinessScore?: number;
    injuryRiskScore?: number;
    physicalCapabilities?: {
      aerobic: number;
      anaerobic: number;
      strength: number;
      speed: number;
      flexibility: number;
      endurance: number;
    };
    aiAnalysis?: string;
  };
  injuryHistory?: string;
  gender?: 'male' | 'female';
  trackMenstrual?: boolean;
  readiness?: 'ready' | 'fatigued' | 'recovering';
  lastReadiness?: {
    date: string;
    sleepScore: number;
    sleepHours?: number;
    bedTime?: string;
    wakeTime?: string;
    pse?: number;
    stressScore: number;
    sorenessScore: number;
    moodScore: number;
    menstrualPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none';
    readinessScore: number;
  };
  readinessHistory?: {
    id: string;
    date: string;
    sleepScore: number;
    sleepHours?: number;
    bedTime?: string;
    wakeTime?: string;
    pse?: number;
    stressScore: number;
    sorenessScore: number;
    moodScore: number;
    menstrualPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none';
    readinessScore: number;
  }[];
  customZones?: TrainingPace[]; 
  assessmentHistory: Assessment[];
  gamification?: GamificationData;
  archivedPlans?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    specificGoal: string;
    weeks: TrainingWeek[];
    archivedAt: string;
  }[];
}

export interface GamificationData {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  lastWorkoutDate?: string;
  achievements: UserAchievement[];
  goals: UserGoal[];
}

export interface UserAchievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  dateEarned: string;
}

export interface UserGoal {
  id: string;
  title: string;
  type: 'distance' | 'vo2' | 'frequency' | 'consistency';
  targetValue: number;
  currentValue: number;
  deadline: string;
  completed: boolean;
}

export type WorkoutType = 'Regenerativo' | 'Longão' | 'Limiar' | 'Intervalado' | 'Maratona' | 'Descanso' | 'Fortalecimento' | 'Velocidade' | 'Natação' | 'Ciclismo' | 'Transição' | 'Prova';

export type StepType = 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'steady';
export type StepTargetType = 'distance' | 'time' | 'lap_button';

export interface WorkoutStep {
  id: string;
  name: string; // Ex: "Aquecimento", "Tiro 1/5", "Recuperação 1/5", "Desaquecimento"
  type: StepType;
  targetType: StepTargetType;
  targetValue: number; // Metros (ex: 1000) se 'distance', Segundos (ex: 120) se 'time'
  targetPaceMin?: string; // Ex: "04:10"
  targetPaceMax?: string; // Ex: "04:20"
  notes?: string;
  repeatIndex?: number; // 1 a repeatTotal
  repeatTotal?: number; // Ex: 5
}

export interface StructuredWorkout {
  title?: string;
  description?: string;
  steps: WorkoutStep[];
  totalDistanceEstimatedKm?: number;
  totalDurationEstimatedSeconds?: number;
}

export interface TrainingWeek {
  id: string;
  phase: 'Base' | 'Construção' | 'Pico' | 'Polimento';
  weekNumber: number;
  totalVolume: number;
  isVisible?: boolean; 
  coachNotes?: string; 
    workouts: {
      day: string; 
      workoutId?: string;
      type: WorkoutType; 
      customDescription?: string;
      distance?: number;
      actualDistance?: number;
      actualDuration?: string;
      avgHeartRate?: number;
      completed?: boolean;
      feedback?: string; 
      rpe?: number;
      exercises?: Exercise[];
      structuredWorkout?: StructuredWorkout;
      sleepScore?: number;
      stressScore?: number;
      sorenessScore?: number;
      moodScore?: number;
      menstrualPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none';
      readinessScore?: number;
      gpsRoute?: {
        polyline?: string;
        points?: [number, number][]; // [lat, lng] array
        totalDistanceKm: number;
        totalDurationSeconds: number;
        avgPace: string; // "05:15" min/km
        maxSpeedKmh?: number;
        elevationGainMeters?: number;
        avgHeartRate?: number;
        source: 'live_gps' | 'gpx_file' | 'manual_or_indoor';
        recordedAt: string;
        completedSteps?: {
          stepId: string;
          name: string;
          type: StepType;
          targetType: StepTargetType;
          targetValue: number;
          completedDistanceMeters: number;
          completedDurationSeconds: number;
          avgPace: string;
        }[];
      };
    }[];
}

export interface AthletePlan {
  weeks: TrainingWeek[];
  raceStrategy?: string;
  motivationalMessage?: string;
  specificGoal?: string; 
  startDate?: string;
  endDate?: string;
  trainingDays?: number[];
  runningDaysOfWeek?: number[];
  gymDaysOfWeek?: number[];
  longRunDayOfWeek?: number;
  runningDaysCount?: number;
  gymDaysCount?: number;
}

export interface HistoryEntry {
  label: string;
  planned: number;
  completed: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  status: 'active' | 'expired';
  startDate: string;
  endDate: string;
}

export interface TrainingTemplate {
  id: string;
  name: string;
  description: string;
  workouts: TrainingWeek['workouts']; // Reutiliza a estrutura de treinos da semana
  category: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'critical';
  icon?: string;
  timestamp: string;
  read: boolean;
  link: string; // Rota para onde o usuário será levado
  category: 'workout' | 'plan' | 'payment' | 'chat' | 'system';
}
