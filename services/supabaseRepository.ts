import { Athlete, Workout, AthletePlan, Subscription, AppNotification } from '../types';
import { supabase } from '../lib/supabase';

export const fetchAthletesData = async () => {
  return supabase.from('athletes').select('data');
};

export const fetchWorkoutsLibraryData = async () => {
  return supabase.from('workouts_library').select('data');
};

export const fetchAthletePlansData = async () => {
  return supabase.from('athlete_plans').select('*');
};

export const fetchNotificationsData = async () => {
  return supabase.from('app_notifications').select('*').order('timestamp', { ascending: false }).limit(20);
};

export const fetchSubscriptionData = async () => {
  return supabase.from('subscriptions').select('*').limit(1);
};

export const upsertAthleteData = async (athlete: Athlete) => {
  return supabase.from('athletes').upsert({ id: athlete.id, data: athlete });
};

export const deleteAthleteData = async (id: string) => {
  return supabase.from('athletes').delete().eq('id', id);
};

export const upsertWorkoutData = async (workout: Workout) => {
  return supabase.from('workouts_library').upsert({ id: workout.id, data: workout });
};

export const deleteWorkoutData = async (id: string) => {
  return supabase.from('workouts_library').delete().eq('id', id);
};

export const upsertAthletePlanData = async (athleteId: string, plan: AthletePlan) => {
  return supabase.from('athlete_plans').upsert({
    id: athleteId,
    athlete_id: athleteId,
    plan_data: plan,
    weeks: plan.weeks,
    race_strategy: plan.raceStrategy,
    motivational_message: plan.motivationalMessage,
    specific_goal: plan.specificGoal,
    created_at: plan.created_at,
    updated_at: plan.updated_at
  });
};

export const deleteAthletePlanData = async (athleteId: string) => {
  return supabase.from('athlete_plans').delete().eq('athlete_id', athleteId);
};

export const upsertNotificationData = async (notification: AppNotification) => {
  return supabase.from('app_notifications').upsert(notification);
};

export const deleteNotificationData = async (id: string) => {
  return supabase.from('app_notifications').delete().eq('id', id);
};
