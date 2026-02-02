
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
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("Configuração de API pendente.");

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Crie um treino de fortalecimento para corredor: ${params.studentName}. Nível: ${params.fitnessLevel}. Foco: ${params.primaryGoal}. Tempo: ${params.sessionTime}min.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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
      if (!textOutput) throw new Error("IA não retornou conteúdo.");
      return JSON.parse(textOutput) as WorkoutPlan;
    } catch (error: any) {
      console.error("AIService Error:", error);
      throw new Error("Falha ao gerar treino de fortalecimento.");
    }
  }
}

export const aiService = new AIService();
