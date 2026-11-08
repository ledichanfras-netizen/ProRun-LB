import {requestAI} from '../lib/access';
import type {Athlete,AthletePlan} from '../types';
export async function analyzeAthletePerformance(athlete:Athlete,_plan:AthletePlan|null){return (await requestAI('analysis',{athleteId:athlete.id})).result;}
