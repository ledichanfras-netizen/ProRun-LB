import type {AthletePlan,TrainingWeek} from '../types';
import {getLocalDateString,getWorkoutDateString,parseDateString} from './time';
const valid=(date?:string):date is string=>!!date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&getLocalDateString(parseDateString(date))===date;
const addDay=(date:string,days:number)=>{const d=parseDateString(date);d.setDate(d.getDate()+days);return getLocalDateString(d);};
export type PortalScheduleState='available'|'unpublished'|'ended'|'no_today'|'no_plan'|'undated';
export type PortalWorkout={workout:TrainingWeek['workouts'][number];weekIndex:number;dayIndex:number;date:string;isDescanso:boolean};
/** Calendar dates and publication are the only selectors: never advance by completion. */
export function selectPortalSchedule(plan:AthletePlan|null|undefined,today:string){
 const weeks=plan?.weeks||[],dated:PortalWorkout[]=[];
 weeks.forEach((week,weekIndex)=>(week.workouts||[]).forEach((workout,dayIndex)=>{
  const anchor=plan?.startDate||(week as any).planStartDate;
  const date=workout.date?(valid(workout.date)?workout.date:null):valid(anchor)?getWorkoutDateString(anchor,weekIndex,dayIndex):null;
  if(date)dated.push({workout:{...workout,date},weekIndex,dayIndex,date,isDescanso:workout.type==='Descanso'});
 }));
 const visible=dated.filter(w=>weeks[w.weekIndex].isVisible===true);
 const inCycle=(date:string)=>(!valid(plan?.startDate)||date>=plan!.startDate!)&&(!valid(plan?.endDate)||date<=plan!.endDate!);
 const pick=(date:string)=>visible.filter(w=>w.date===date&&(inCycle(date)||w.workout.completed)).sort((a,b)=>Number(a.isDescanso)-Number(b.isDescanso)||Number(!!a.workout.completed)-Number(!!b.workout.completed))[0]||null;
 const todayWorkout=pick(today),tomorrowWorkout=pick(addDay(today,1)),yesterdayWorkout=pick(addDay(today,-1));
 const covers=(week:TrainingWeek,i:number)=>{const anchor=plan?.startDate||(week as any).planStartDate;return valid(anchor)?getWorkoutDateString(anchor,i,0)<=today&&getWorkoutDateString(anchor,i,6)>=today:dated.some(w=>w.weekIndex===i&&addDay(w.date,-((parseDateString(w.date).getDay()+6)%7))<=today&&addDay(w.date,6-((parseDateString(w.date).getDay()+6)%7))>=today);};
 const currentWeek=weeks.find((week,i)=>week.isVisible===true&&covers(week,i))||null;
 const latestCompleted=visible.filter(w=>w.date<today&&w.workout.completed&&!w.isDescanso).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
 const hiddenToday=inCycle(today)&&(dated.some(w=>w.date===today&&weeks[w.weekIndex].isVisible!==true)||weeks.some((w,i)=>w.isVisible!==true&&covers(w,i)));
 const lastDate=dated.map(w=>w.date).sort().slice(-1)[0];
 const futureHidden=dated.some(w=>w.date>=today&&weeks[w.weekIndex].isVisible!==true);
 let state:PortalScheduleState=todayWorkout?'available':!weeks.some(w=>w.workouts?.length)?'no_plan':!dated.length?'undated':valid(plan?.endDate)&&plan!.endDate!<today?'ended':hiddenToday?'unpublished':lastDate&&lastDate<today?'ended':!visible.some(w=>w.date>=today)&&futureHidden?'unpublished':'no_today';
 return {todayWorkout,tomorrowWorkout,yesterdayWorkout,currentWeek,latestCompleted,state,lastDate};
}
