
import { withRetry } from '../utils/helpers';

export interface WorkoutParams {
  studentName: string;
  studentId: string;
  fitnessLevel: string;
  primaryGoal: string;
  sessionTime: number;
}

export interface WorkoutPlan {
  workoutName: string;
  sessions: any[];
}

class AIService {
  async generateWorkout(params: WorkoutParams): Promise<WorkoutPlan> {
    try {
      const response = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ params })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIService] generateWorkout failed:', errorText);
        throw new Error('Erro ao gerar plano de treino.');
      }

      return await response.json();
    } catch (error: any) {
      console.error('AIService Error:', error?.message || 'Erro desconhecido');
      throw new Error(error?.message || 'Erro ao gerar plano de treino.');
    }
  }
}

export const aiService = new AIService();
