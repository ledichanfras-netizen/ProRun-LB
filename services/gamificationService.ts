import { Athlete, GamificationData, UserAchievement, UserGoal, TrainingWeek } from "../types";
import { uniqueTrainingActivities } from '../utils/uniqueTrainingActivities';
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
  return uniqueTrainingActivities(allPlans[athleteId],extraArchivedPlans).filter(w=>w.completed&&w.type!=='Descanso').length;
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

  const activities=uniqueTrainingActivities(allPlans[athleteId],archivedPlans);
  const orderedWorkouts=activities.filter(w=>w.type!=='Descanso');
  const completed=activities.filter(w=>w.completed);
  const totalWorkouts=completed.filter(w=>w.type!=='Descanso').length;
  const totalRealKm=completed.reduce((sum,w)=>{
    const value=w.actualDistance!==undefined&&w.actualDistance!==null&&String(w.actualDistance)!==''?w.actualDistance:w.distance;
    const distance=Number(String(value??0).replace(',','.'));
    return sum+(Number.isFinite(distance)?Math.max(0,distance):0);
  },0);
  const latestCompletedDate=orderedWorkouts.filter(w=>w.completed).slice(-1)[0]?.date;
  let lastCompletedIdx=-1;
  for(let i=orderedWorkouts.length-1;i>=0;i--)if(orderedWorkouts[i].completed){lastCompletedIdx=i;break;}
  let streak=0;
  for(let i=lastCompletedIdx;i>=0&&orderedWorkouts[i].completed;i--)streak++;

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

  let totalXp = completed.reduce((sum,w)=>sum+getXpForWorkout(w.type),0);

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

  updatedData.xp = completed.reduce((sum,w)=>sum+getXpForWorkout(w.type),0)+updatedData.achievements.length*50;
  updatedData.level = calculateLevel(updatedData.xp);
  if(updatedData.level>=5)checkAchievement('level_5','Veterano','Chegou ao nível 5!','🎖️');
  updatedData.xp = completed.reduce((sum,w)=>sum+getXpForWorkout(w.type),0)+updatedData.achievements.length*50;
  updatedData.level = calculateLevel(updatedData.xp);
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
