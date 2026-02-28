
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;

    if (!apiKey) {
      throw new Error("⚠️ VITE_GEMINI_API_KEY ou VITE_API_KEY não configurada. IA indisponível.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Crie um plano de exercícios de fortalecimento funcional para o corredor ${params.studentName}. Nível: ${params.fitnessLevel}. Objetivo: ${params.primaryGoal}. Tempo disponível: ${params.sessionTime} minutos por sessão.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
      console.error("AIService Error:", error);
      throw new Error(`Erro ao gerar fortalecimento: ${error.message}`);
    }
  }
}

export const aiService = new AIService();
