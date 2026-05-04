import { Athlete, GamificationData, UserAchievement, UserGoal, TrainingWeek } from "../types";
import { getAppNow } from "../utils/time";

const XP_PER_WORKOUT = 100;
const XP_FOR_LONG_RUN = 150;
const XP_FOR_INTERVAL = 120;
const XP_PER_LEVEL = 1000;

export const calculateLevel = (totalXp: number): number => {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
};

export const getProgressToNextLevel = (totalXp: number): number => {
  return (totalXp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
};

export const updateGamificationData = (
  currentData: GamificationData | undefined,
  workout: TrainingWeek['workouts'][0],
  allPlans: Record<string, any>,
  athleteId: string
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

  if (workout.completed) {
    // XP Logic
    let xpGain = XP_PER_WORKOUT;
    if (workout.type === 'Longão') xpGain = XP_FOR_LONG_RUN;
    if (workout.type === 'Intervalado') xpGain = XP_FOR_INTERVAL;
    
    updatedData.xp += xpGain;
    updatedData.level = calculateLevel(updatedData.xp);
    updatedData.totalWorkouts += 1;

    // Streak Logic
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
    if (plan) {
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
        newCurrentValue += workout.distance || 0;
      } else if (goal.type === 'frequency') {
        newCurrentValue += 1;
      } else if (goal.type === 'consistency') {
        // Implementation of consistency logic could be more complex, 
        // here we just increment for every completed workout for simplicity in this demo
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
