import type {AthletePlan} from '../types';
import {getWorkoutDateString,parseDateString,getLocalDateString} from './time';
const calendarMonday=(date:string)=>{const day=parseDateString(date);day.setDate(day.getDate()-(day.getDay()+6)%7);return getLocalDateString(day);};
/** Use saved session dates first; a cycle may begin in the middle of a calendar week. */
export function currentPublicationWeeks(plan:AthletePlan,today:string):number[]{
 const monday=calendarMonday(today);
 return plan.weeks.flatMap((week,index)=>{
  const anchor=plan.startDate||(week as any).planStartDate;
  const dates=week.workouts.map((workout,day)=>workout.date||(anchor?getWorkoutDateString(anchor,index,day):''));
  return dates.some(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&calendarMonday(date)===monday)?[index]:[];
 });
}
export function publishTrainingWeek(plan:AthletePlan,index:number):AthletePlan{
 if(!Number.isInteger(index)||!plan.weeks[index])throw new Error('Semana não encontrada. Atualize a programação.');
 return {...plan,weeks:plan.weeks.map((week,i)=>i===index?{...week,isVisible:true}:week)};
}
