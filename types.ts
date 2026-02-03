
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

export interface Workout {
  id: string;
  title: string;
  type: 'Recovery' | 'Long Run' | 'Tempo' | 'Interval' | 'Speed';
  description: string;
  durationMinutes: number;
  distanceKm: number;
  rpe: number;
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
  };
  customZones?: TrainingPace[]; 
  assessmentHistory: Assessment[];
}

export type WorkoutType = 'Regenerativo' | 'Longão' | 'Limiar' | 'Intervalado' | 'Descanso' | 'Fortalecimento';

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
    type?: WorkoutType; 
    customDescription?: string;
    distance?: number;
    completed?: boolean;
    feedback?: string; 
  }[];
}

export interface AthletePlan {
  weeks: TrainingWeek[];
  raceStrategy?: string;
  motivationalMessage?: string;
  specificGoal?: string; // Armazena a meta definida no momento da geração
}

export interface HistoryEntry {
  label: string;
  planned: number;
  completed: number;
}
