
import { GoogleGenAI, Type } from "@google/genai";

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
    // Fix: Use import.meta.env for Vite compatibility
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || "";
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Crie um plano de exercícios de fortalecimento funcional para o corredor ${params.studentName}. Nível: ${params.fitnessLevel}. Objetivo: ${params.primaryGoal}. Tempo disponível: ${params.sessionTime} minutos por sessão.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash', // Updated to a more stable model name
        contents: prompt,
        config: {
          responseMimeType: "application/json",
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
      console.error("AIService Error:", error);
      throw new Error(`Erro ao gerar fortalecimento: ${error.message}`);
    }
  }
}

export const aiService = new AIService();
