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

export const calculateAthleteGamification = (
  allPlans: Record<string, any>,
  athleteId: string,
  currentData?: GamificationData,
  archivedPlans?: any[]
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
  const updatedData: GamificationData = {
    ...initialData,
    achievements: [...(initialData.achievements || [])],
    goals: [...(initialData.goals || [])]
  };

  const plan = allPlans[athleteId];

  // 1. Gather all non-rest scheduled workouts in chronological order
  const orderedWorkouts: {
    type: string;
    completed: boolean;
    distance: number;
    actualDistance?: number;
    date?: string;
  }[] = [];

  let totalRealKm = 0;
  let totalWorkouts = 0;
  let latestCompletedDate: string | undefined = undefined;

  // Process current plan weeks
  if (plan?.weeks && Array.isArray(plan.weeks)) {
    plan.weeks.forEach((w: any) => {
      (w.workouts || []).forEach((tw: any) => {
        const isCompleted = Boolean(tw.completed);
        const dist = tw.actualDistance !== undefined && tw.actualDistance !== null && tw.actualDistance !== ''
          ? Number(String(tw.actualDistance).replace(',', '.'))
          : (Number(tw.distance) || 0);

        if (isCompleted) {
          totalRealKm += isNaN(dist) ? 0 : dist;
          if (tw.type !== 'Descanso') {
            totalWorkouts++;
            if (tw.date) latestCompletedDate = tw.date;
          }
        }

        if (tw.type !== 'Descanso') {
          orderedWorkouts.push({
            type: tw.type,
            completed: isCompleted,
            distance: Number(tw.distance) || 0,
            actualDistance: tw.actualDistance !== undefined ? Number(tw.actualDistance) : undefined,
            date: tw.date
          });
        }
      });
    });
  }

  // Also include extra archived plans for true count and total volume
  if (archivedPlans && Array.isArray(archivedPlans)) {
    archivedPlans.forEach((ap: any) => {
      (ap.weeks || []).forEach((w: any) => {
        (w.workouts || []).forEach((tw: any) => {
          if (tw.completed) {
            const dist = tw.actualDistance !== undefined && tw.actualDistance !== null && tw.actualDistance !== ''
              ? Number(String(tw.actualDistance).replace(',', '.'))
              : (Number(tw.distance) || 0);
            totalRealKm += isNaN(dist) ? 0 : dist;
            if (tw.type !== 'Descanso') {
              totalWorkouts++;
            }
          }
        });
      });
    });
  }

  // 2. Calculate Active Streak (Treinos da Labareda)
  // Find the index of the latest completed workout in chronological order
  let lastCompletedIdx = -1;
  for (let i = orderedWorkouts.length - 1; i >= 0; i--) {
    if (orderedWorkouts[i].completed) {
      lastCompletedIdx = i;
      break;
    }
  }

  let streak = 0;
  if (lastCompletedIdx >= 0) {
    // Count consecutive completed workouts backwards from the latest completed workout
    for (let i = lastCompletedIdx; i >= 0; i--) {
      if (orderedWorkouts[i].completed) {
        streak++;
      } else {
        // Uncompleted scheduled workout breaks the consecutive sequence
        break;
      }
    }

    // If streak reached the start of the current plan, continue checking recent archived plans
    if (lastCompletedIdx === streak - 1 && archivedPlans && archivedPlans.length > 0) {
      for (let p = archivedPlans.length - 1; p >= 0; p--) {
        const ap = archivedPlans[p];
        let breakOuter = false;
        if (ap?.weeks && Array.isArray(ap.weeks)) {
          for (let w = ap.weeks.length - 1; w >= 0; w--) {
            const wk = ap.weeks[w];
            if (wk?.workouts && Array.isArray(wk.workouts)) {
              for (let d = wk.workouts.length - 1; d >= 0; d--) {
                const atw = wk.workouts[d];
                if (atw.type !== 'Descanso') {
                  if (atw.completed) {
                    streak++;
                  } else {
                    breakOuter = true;
                    break;
                  }
                }
              }
            }
            if (breakOuter) break;
          }
        }
        if (breakOuter) break;
      }
    }
  }

  updatedData.streak = streak;
  updatedData.longestStreak = Math.max(streak, initialData.longestStreak || 0);
  updatedData.totalWorkouts = totalWorkouts;
  if (latestCompletedDate) {
    updatedData.lastWorkoutDate = latestCompletedDate;
  } else if (streak > 0 && !updatedData.lastWorkoutDate) {
    updatedData.lastWorkoutDate = todayStr;
  }

  // 3. XP calculation from all completed workouts
  const getXpForWorkout = (type?: string) => {
    if (type === 'Longão') return XP_FOR_LONG_RUN;
    if (type === 'Intervalado') return XP_FOR_INTERVAL;
    if (type === 'Maratona') return 120;
    if (type === 'Prova') return 250;
    if (type === 'Descanso') return 20;
    return XP_PER_WORKOUT;
  };

  let totalXp = 0;
  if (plan?.weeks && Array.isArray(plan.weeks)) {
    plan.weeks.forEach((w: any) => {
      (w.workouts || []).forEach((tw: any) => {
        if (tw.completed) {
          totalXp += getXpForWorkout(tw.type);
        }
      });
    });
  }
  if (archivedPlans && Array.isArray(archivedPlans)) {
    archivedPlans.forEach((ap: any) => {
      (ap.weeks || []).forEach((w: any) => {
        (w.workouts || []).forEach((tw: any) => {
          if (tw.completed) {
            totalXp += getXpForWorkout(tw.type);
          }
        });
      });
    });
  }

  // Add achievement bonuses
  totalXp += ((updatedData.achievements?.length || 0) * 50);

  updatedData.xp = totalXp;
  updatedData.level = calculateLevel(totalXp);

  // 4. Achievement checks
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

  if (totalWorkouts >= 1) checkAchievement('first_workout', 'Primeiro Passo', 'Completou o primeiro treino na plataforma!', '🎉');
  if (totalWorkouts >= 10) checkAchievement('ten_workouts', 'Foco Mantido', 'Completou 10 treinos!', '🔥');
  if (streak >= 3) checkAchievement('streak_3', 'Consistência', '3 treinos seguidos na Labareda!', '💪');
  if (streak >= 7) checkAchievement('streak_7', 'Atleta do Mês', '7 treinos seguidos na Labareda!', '🏆');
  if (updatedData.level >= 5) checkAchievement('level_5', 'Veterano', 'Chegou ao nível 5!', '🎖️');
  if (totalRealKm >= 42.195) checkAchievement('marathon_volume', 'Maratonista no Volume', 'Acumulou mais de 42km em treinos!', '🗺️');
  if (totalRealKm >= 100) checkAchievement('ultra_volume', 'Centenário', 'Acumulou mais de 100km em treinos!', '🚀');

  // 5. Goal updates
  updatedData.goals = updatedData.goals.map(goal => {
    let newCurrentValue = goal.currentValue;
    if (goal.type === 'distance') {
      newCurrentValue = Math.round(totalRealKm * 10) / 10;
    } else if (goal.type === 'frequency') {
      newCurrentValue = totalWorkouts;
    } else if (goal.type === 'consistency') {
      newCurrentValue = streak;
    }

    const isGoalCompleted = newCurrentValue >= goal.targetValue;
    if (isGoalCompleted && !goal.completed) {
      checkAchievement(`goal_${goal.id}`, `Meta Alcançada: ${goal.title}`, 'Completou um objetivo pessoal!', '⭐');
    }

    return {
      ...goal,
      currentValue: newCurrentValue,
      completed: isGoalCompleted
    };
  });

  return { updatedData, newAchievements };
};

export const updateGamificationData = (
  currentData: GamificationData | undefined,
  workout: TrainingWeek['workouts'][0],
  allPlans: Record<string, any>,
  athleteId: string,
  options?: GamificationOptions
): { updatedData: GamificationData; newAchievements: UserAchievement[] } => {
  return calculateAthleteGamification(allPlans, athleteId, currentData, options?.archivedPlans);
};
