
import { Athlete, AthletePlan } from '../types';

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  runningDays: number,
  gymDays: number,
  raceDistance: string,
  raceDate?: string,
  raceGoal?: string,
  startDate?: string,
  trainingDays?: number[]
): Promise<AthletePlan> => {
  try {
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        athlete,
        planDetails: {
          goalDescription,
          weeks,
          runningDays,
          gymDays,
          raceDistance,
          raceDate: raceDate || null,
          raceGoal: raceGoal || null,
          startDate: startDate || null,
          trainingDays: trainingDays || [0, 1, 2, 3, 4, 5, 6]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[geminiService] generate-plan failed:', errorText);
      throw new Error('Falha ao gerar plano de treinamento.');
    }

    const result = await response.json();
    return result as AthletePlan;
  } catch (error: any) {
    console.error('Erro ao gerar plano de treinamento:', error);
    throw new Error(error?.message || 'Erro interno ao solicitar o plano de treinamento.');
  }
};
