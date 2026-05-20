
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
  readiness?: 'ready' | 'fatigued' | 'recovering';
  customZones?: TrainingPace[]; 
  assessmentHistory: Assessment[];
  gamification?: GamificationData;
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

export type WorkoutType = 'Regenerativo' | 'Longão' | 'Limiar' | 'Intervalado' | 'Descanso' | 'Fortalecimento' | 'Velocidade' | 'Natação' | 'Ciclismo' | 'Transição';

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
    completed?: boolean;
    feedback?: string; 
    rpe?: number;
    exercises?: Exercise[];
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
  created_at?: string;
  updated_at?: string;
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
