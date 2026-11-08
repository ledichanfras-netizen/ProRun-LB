import {requestAI} from '../lib/access';

import { Type, ThinkingLevel } from "@google/genai";
import { withRetry } from "../utils/helpers";

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
    const prompt = `Crie um plano de exercícios de fortalecimento funcional para o corredor ${params.studentName}. Nível: ${params.fitnessLevel}. Objetivo: ${params.primaryGoal}. Tempo disponível: ${params.sessionTime} minutos por sessão.`;
    
    try {
      const response = await requestAI('strength', {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              workoutName: { type: Type.STRING },
              sessions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          sets: { type: Type.INTEGER },
                          reps: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) throw new Error("Sem resposta da IA.");
      return JSON.parse(textOutput) as WorkoutPlan;
    } catch (error: any) {
      console.error("AIService Error:", error?.message || "Erro desconhecido");
      let userMessage = "Erro ao gerar fortalecimento.";
      if (error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE")) {
        userMessage = "O servidor da IA está sobrecarregado no momento. Por favor, tente novamente em alguns instantes.";
      }
      throw new Error(userMessage);
    }
  }
}

export const aiService = new AIService();
