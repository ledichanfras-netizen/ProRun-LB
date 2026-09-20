import { Athlete, GamificationData, UserAchievement, UserGoal, TrainingWeek } from "../types";
import { getAppNow } from "../utils/time";

const XP_PER_WORKOUT = 100;
const XP_FOR_LONG_RUN = 150;
const XP_FOR_INTERVAL = 120;
const XP_PER_LEVEL = 1000;

export const calculateLevel = (totalXp: number): number => {
  return Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
};

export const getProgressToNextLevel = (totalXp: number): number => {
  return (Math.max(0, totalXp) % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
};

export const countCompletedWorkouts = (
  allPlans: Record<string, any>,
  athleteId: string,
  extraArchivedPlans?: any[]
): number => {
  let count = 0;
  const plan = allPlans[athleteId];
  if (plan?.weeks && Array.isArray(plan.weeks)) {
    plan.weeks.forEach((w: any) => {
      (w.workouts || []).forEach((tw: any) => {
        if (tw.completed && tw.type !== 'Descanso') {
          count++;
        }
      });
    });
  }
  if (extraArchivedPlans && Array.isArray(extraArchivedPlans)) {
    extraArchivedPlans.forEach((ap: any) => {
      (ap.weeks || []).forEach((w: any) => {
        (w.workouts || []).forEach((tw: any) => {
          if (tw.completed && tw.type !== 'Descanso') {
            count++;
          }
        });
      });
    });
  }
  return count;
};

export interface GamificationOptions {
  wasAlreadyCompleted?: boolean;
  isUncompleting?: boolean;
  archivedPlans?: any[];
}

export const updateGamificationData = (
  currentData: GamificationData | undefined,
  workout: TrainingWeek['workouts'][0],
  allPlans: Record<string, any>,
  athleteId: string,
  options?: GamificationOptions
): { updatedData: GamificationData; newAchievements: UserAchievement[] } => {
  const today = getAppNow();
  const todayStr = today.toISOString().split('T')[0];
  
  const initialData: GamificationData = currentData || {
    xp: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    achievements: [],
    goals: []
  };

  const newAchievements: UserAchievement[] = [];
  const updatedData = { ...initialData };

  // Calculate the true count of completed workouts across plans
  const trueCount = countCompletedWorkouts(allPlans, athleteId, options?.archivedPlans);

  // Helper for XP per workout type
  const getXpForWorkout = (type?: string) => {
    if (type === 'Longão') return XP_FOR_LONG_RUN;
    if (type === 'Intervalado') return XP_FOR_INTERVAL;
    if (type === 'Maratona') return 120;
    if (type === 'Prova') return 250;
    if (type === 'Descanso') return 20;
    return XP_PER_WORKOUT;
  };

  // CASE 1: UNMARKING A WORKOUT (was completed, now marked incomplete)
  if (options?.isUncompleting) {
    const xpToDeduct = getXpForWorkout(workout.type);
    updatedData.xp = Math.max(0, updatedData.xp - xpToDeduct);
    updatedData.level = calculateLevel(updatedData.xp);
    updatedData.totalWorkouts = trueCount;
    return { updatedData, newAchievements: [] };
  }

  // CASE 2: EDITING AN ALREADY COMPLETED WORKOUT (was already completed, still completed)
  // "Quando eu Editar um Treino, não computar novamente os Dados"
  if (options?.wasAlreadyCompleted && workout.completed) {
    // Keep exact true count, do NOT re-award XP, do NOT re-increment streaks or goals
    updatedData.totalWorkouts = trueCount;
    return { updatedData, newAchievements: [] };
  }

  // CASE 3: NEW WORKOUT COMPLETION
  if (workout.completed) {
    const xpGain = getXpForWorkout(workout.type);
    updatedData.xp += xpGain;
    updatedData.level = calculateLevel(updatedData.xp);
    updatedData.totalWorkouts = trueCount > 0 ? trueCount : (updatedData.totalWorkouts + (workout.type !== 'Descanso' ? 1 : 0));

    // Streak Logic (Descanso também mantém streak se for parte do plano)
    if (updatedData.lastWorkoutDate) {
      const lastDate = new Date(updatedData.lastWorkoutDate);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        updatedData.streak += 1;
      } else if (diffDays > 1) {
        updatedData.streak = 1;
      }
    } else {
      updatedData.streak = 1;
    }

    if (updatedData.streak > updatedData.longestStreak) {
      updatedData.longestStreak = updatedData.streak;
    }

    updatedData.lastWorkoutDate = todayStr;

    // Achievement Checks
    const checkAchievement = (id: string, name: string, description: string, icon: string) => {
      if (!updatedData.achievements.find(a => a.id === id)) {
        const achievement: UserAchievement = {
          id,
          type: 'milestone',
          name,
          description,
          icon,
          dateEarned: todayStr
        };
        updatedData.achievements.push(achievement);
        newAchievements.push(achievement);
      }
    };

    if (updatedData.totalWorkouts === 1) checkAchievement('first_workout', 'Primeiro Passo', 'Completou o primeiro treino na plataforma!', '🎉');
    if (updatedData.totalWorkouts === 10) checkAchievement('ten_workouts', 'Foco Mantido', 'Completou 10 treinos!', '🔥');
    if (updatedData.streak === 3) checkAchievement('streak_3', 'Consistência', '3 dias seguidos de treino!', '💪');
    if (updatedData.streak === 7) checkAchievement('streak_7', 'Atleta do Mês', 'Uma semana inteira de consistência!', '🏆');
    if (updatedData.level >= 5) checkAchievement('level_5', 'Veterano', 'Chegou ao nível 5!', '🎖️');
    
    // Total Volume Checked from Plan
    const plan = allPlans[athleteId];
    if (plan && plan.weeks) {
      let totalKm = 0;
      plan.weeks.forEach((w: any) => {
        w.workouts.forEach((tw: any) => {
          if (tw.completed && tw.distance) totalKm += tw.distance;
        });
      });
      if (totalKm >= 42.195) checkAchievement('marathon_volume', 'Maratonista no Volume', 'Acumulou mais de 42km em treinos!', '🗺️');
      if (totalKm >= 100) checkAchievement('ultra_volume', 'Centenário', 'Acumulou mais de 100km em treinos!', '🚀');
    }

    // Goal Updates
    updatedData.goals = updatedData.goals.map(goal => {
      if (goal.completed) return goal;

      let newCurrentValue = goal.currentValue;
      if (goal.type === 'distance') {
        newCurrentValue += workout.actualDistance || workout.distance || 0;
      } else if (goal.type === 'frequency') {
        newCurrentValue += 1;
      } else if (goal.type === 'consistency') {
        newCurrentValue += 1;
      }

      const completed = newCurrentValue >= goal.targetValue;
      if (completed && !goal.completed) {
        checkAchievement(`goal_${goal.id}`, `Meta Alcançada: ${goal.title}`, 'Completou um objetivo pessoal!', '⭐');
      }

      return {
        ...goal,
        currentValue: newCurrentValue,
        completed
      };
    });
  }

  return { updatedData, newAchievements };
};
