import type {AthletePlan} from '../types';
import {getTrainingActivities,type TrainingActivity} from './trainingActivities';
/** Current records take precedence over archive snapshots, including manual uncompletion. */
export function uniqueTrainingActivities(current?:AthletePlan|null,archives:AthletePlan[]=[]):TrainingActivity[]{
 const unique=new Map<string,TrainingActivity>();
 for(const plan of [current,...archives]){
  for(const activity of getTrainingActivities(plan)){
   // A prescription has one slot per calendar day. Free sessions have independent IDs.
   const key=activity.isFreeRun?activity.activityId:`scheduled:${activity.date}:${activity.dayIndex}`;
   if(!unique.has(key))unique.set(key,activity);
  }
 }
 return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||Number(a.isFreeRun)-Number(b.isFreeRun));
}
