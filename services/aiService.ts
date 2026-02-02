
import { GoogleGenAI, Type } from "@google/genai";

export interface WorkoutParams {
  studentName: string;
  studentId: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  primaryGoal: string;
  secondaryGoal?: string;
  daysPerWeek: number;
  sessionTime: number;
  fitnessLevel: string;
  equipment: string[];
  restrictions?: string;
}

export interface WorkoutPlan {
  workoutName: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  sessions: {
    day: string;
    week: number;
    focus: string;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      rest: string;
      technique: string;
      muscleGroup: string;
    }[];
    duration: string;
    intensity: string;
  }[];
  progression: string;
  nutritionTips: string[];
  supplementation: string[];
}

class AIService {
  async generateWorkout(params: WorkoutParams): Promise<WorkoutPlan> {
    // Fix: Always use process.env.API_KEY directly in the GoogleGenAI constructor
    if (!process.env.API_KEY) {
      throw new Error("Configuração de API pendente no servidor (Render).");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Crie um treino de fortalecimento específico para corredor: ${params.studentName}. Nível: ${params.fitnessLevel}. Foco: ${params.primaryGoal}. Disponibilidade: ${params.sessionTime}min.`;
    
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
              durationWeeks: { type: Type.INTEGER },
              sessionsPerWeek: { type: Type.INTEGER },
              sessions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    week: { type: Type.INTEGER },
                    focus: { type: Type.STRING },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          sets: { type: Type.INTEGER },
                          reps: { type: Type.STRING },
                          rest: { type: Type.STRING },
                          technique: { type: Type.STRING },
                          muscleGroup: { type: Type.STRING }
                        }
                      }
                    },
                    duration: { type: Type.STRING },
                    intensity: { type: Type.STRING }
                  }
                }
              },
              progression: { type: Type.STRING },
              nutritionTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              supplementation: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) throw new Error("Resposta vazia da IA.");
      return JSON.parse(textOutput) as WorkoutPlan;
    } catch (error: any) {
      console.error("Erro no AIService:", error);
      throw new Error("Falha na geração do treino. Verifique a chave de API.");
    }
  }
}

export const aiService = new AIService();
