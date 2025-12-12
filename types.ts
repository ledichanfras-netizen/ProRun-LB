
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
export type UserRole = 'coach' | 'athlete' | null;

export interface Assessment {
  id: string;
  date: string;
  type: '3k' | 'VO2_Lab' | 'TRF'; // Updated to support TRF (Reference Test)
  resultValue: string; // "12:30" (Time) or "54" (VO2 Value)
  calculatedVdot: number;
  // New Physiological Data
  vo2Max?: number;
  fcMax?: number; // Max Heart Rate
  fcThreshold?: number; // Anaerobic Threshold Heart Rate
  distanceKm?: number; // Distance for TRF (e.g., 5km, 10km)
  notes?: string;
}

export interface TrainingPace {
  zone: 'F' | 'M' | 'L' | 'I' | 'R'; // Updated: E->F, T->L
  name: string;
  description: string;
  minPace: string; // min/km
  maxPace: string; // min/km
  speedKmh: string; // km/h
  heartRateRange?: string; // e.g., "140-155 bpm"
}

export interface Athlete {
  id: string;
  name: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  experience: ExperienceLevel;
  email: string;
  metrics: {
    vo2Max?: number; // Measured or Estimated
    test3kTime?: string; // MM:SS
    vdot: number;
    fcMax?: number;
    fcThreshold?: number;
  };
  customZones?: TrainingPace[]; // Allow manual override of zones
  assessmentHistory: Assessment[];
}

export interface Workout {
  id: string;
  title: string;
  type: 'Recovery' | 'Long Run' | 'Tempo' | 'Interval' | 'Speed' | 'Strength';
  description: string;
  durationMinutes: number;
  distanceKm: number;
  rpe: number; // 1-10
}

export type WorkoutType = 'Recovery' | 'Long' | 'Tempo' | 'Interval' | 'Rest' | 'Strength';

export interface TrainingWeek {
  id: string;
  phase: 'Base' | 'Build' | 'Peak' | 'Taper';
  weekNumber: number;
  totalVolume: number;
  isVisible?: boolean; // Controls visibility for the athlete
  coachNotes?: string; // New: Observations specific to this week
  workouts: {
    day: string; // Segunda, Terça...
    workoutId?: string;
    type?: WorkoutType; // For color coding
    customDescription?: string;
    distance?: number;
    completed?: boolean;
    feedback?: string; // Observation from athlete
  }[];
}

export interface HistoryEntry {
  label: string;
  planned: number;
  completed: number;
}
