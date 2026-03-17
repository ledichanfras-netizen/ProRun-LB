
import { Athlete, AthletePlan, TrainingWeek } from '../types';

export interface PerformanceMetrics {
  performanceScore: number;
  fatigue: number;
  readiness: number;
  injuryRisk: number;
  radarData: {
    subject: string;
    A: number;
    fullMark: number;
  }[];
}

export const calculatePerformanceMetrics = (
  athlete: Athlete,
  plan: AthletePlan | null
): PerformanceMetrics => {
  if (!plan) {
    return {
      performanceScore: 0,
      fatigue: 0,
      readiness: 0,
      injuryRisk: 0,
      radarData: [],
    };
  }

  const allWorkouts = plan.weeks.flatMap(w => w.workouts || []);
  const completedWorkouts = allWorkouts.filter(w => w.completed);
  
  // 1. Performance Score (0-100)
  // Based on VDOT (normalized to a max of 85 for elite) and completion rate
  const vdotScore = Math.min((athlete.metrics.vdot / 70) * 100, 100);
  const completionRate = allWorkouts.length > 0 ? (completedWorkouts.length / allWorkouts.length) * 100 : 0;
  const performanceScore = Math.round((vdotScore * 0.4) + (completionRate * 0.6));

  // 2. Fatigue & Readiness (Simplified ACWR - Acute:Chronic Workload Ratio)
  // Acute: Last 7 days. Chronic: Last 28 days.
  // We'll use the workouts from the plan to estimate this.
  
  const now = new Date();
  // Since we don't have real timestamps for workouts (only "day" like "Segunda-feira"), 
  // we'll assume the current week is the one with the most recent completed workouts.
  
  const acuteWorkload = completedWorkouts.slice(-7).reduce((acc, w) => acc + (w.distance || 0) * (w.rpe || 5), 0);
  const chronicWorkload = completedWorkouts.slice(-28).reduce((acc, w) => acc + (w.distance || 0) * (w.rpe || 5), 0) / 4;
  
  const acwr = chronicWorkload > 0 ? acuteWorkload / chronicWorkload : 1;
  
  // Fatigue (0-100)
  const fatigue = Math.min(Math.max((acwr - 0.5) * 50, 0), 100);
  
  // Readiness (0-100)
  const readiness = Math.max(100 - fatigue, 0);

  // 3. Injury Risk (0-100)
  // ACWR 0.8-1.3 is "sweet spot". > 1.5 is high risk.
  let injuryRisk = 0;
  if (acwr > 1.5) injuryRisk = 90;
  else if (acwr > 1.3) injuryRisk = 60;
  else if (acwr < 0.8) injuryRisk = 30;
  else injuryRisk = 10;

  // 4. Radar Data
  // Endurance: Long Run completion
  const longRuns = allWorkouts.filter(w => w.type === 'Longão');
  const longRunComp = longRuns.length > 0 ? (longRuns.filter(w => w.completed).length / longRuns.length) * 100 : 0;
  
  // Speed: Interval/Speed completion
  const speedWorkouts = allWorkouts.filter(w => w.type === 'Intervalado' || w.type === 'Velocidade');
  const speedComp = speedWorkouts.length > 0 ? (speedWorkouts.filter(w => w.completed).length / speedWorkouts.length) * 100 : 0;
  
  // Strength: Fortalecimento completion
  const strengthWorkouts = allWorkouts.filter(w => w.type === 'Fortalecimento');
  const strengthComp = strengthWorkouts.length > 0 ? (strengthWorkouts.filter(w => w.completed).length / strengthWorkouts.length) * 100 : 0;

  // Recovery: Regenerativo completion
  const recoveryWorkouts = allWorkouts.filter(w => w.type === 'Regenerativo');
  const recoveryComp = recoveryWorkouts.length > 0 ? (recoveryWorkouts.filter(w => w.completed).length / recoveryWorkouts.length) * 100 : 0;

  const radarData = [
    { subject: 'Resistência', A: Math.round(longRunComp), fullMark: 100 },
    { subject: 'Velocidade', A: Math.round(speedComp), fullMark: 100 },
    { subject: 'Força', A: Math.round(strengthComp), fullMark: 100 },
    { subject: 'Recuperação', A: Math.round(recoveryComp), fullMark: 100 },
    { subject: 'Consistência', A: Math.round(completionRate), fullMark: 100 },
    { subject: 'Performance', A: Math.round(vdotScore), fullMark: 100 },
  ];

  return {
    performanceScore,
    fatigue: Math.round(fatigue),
    readiness: Math.round(readiness),
    injuryRisk,
    radarData,
  };
};
