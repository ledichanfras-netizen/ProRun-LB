import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { withRetry } from "../utils/helpers";
import { Athlete, AthletePlan, PerformanceMetrics, PhysicalCapacities } from "../types";

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

export const analyzeAthletePerformance = async (athlete: Athlete, plan: AthletePlan): Promise<{
  performance: PerformanceMetrics;
  capacities: PhysicalCapacities;
}> => {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || (import.meta.env.VITE_API_KEY as string);
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Aja como um Cientista do Esporte e Analista de Performance de Elite.
    Analise os dados do atleta e seu plano de treinamento atual para gerar métricas de performance e capacidades físicas.

    ATLETA: ${athlete.name} | VDOT: ${athlete.metrics.vdot} | EXPERIÊNCIA: ${athlete.experience}
    HISTÓRICO DE BEM-ESTAR: ${JSON.stringify(athlete.wellnessHistory || [])}
    PLANO DE TREINAMENTO: ${JSON.stringify(plan)}

    Gere uma análise técnica precisa baseada em ciência do esporte.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            performance: {
              type: Type.OBJECT,
              properties: {
                readiness: { type: Type.INTEGER },
                injuryRisk: { type: Type.STRING, enum: ["Baixo", "Moderado", "Alto"] },
                performanceScore: { type: Type.INTEGER },
                acuteLoad: { type: Type.NUMBER },
                chronicLoad: { type: Type.NUMBER },
                ratio: { type: Type.NUMBER }
              },
              required: ["readiness", "injuryRisk", "performanceScore", "acuteLoad", "chronicLoad", "ratio"]
            },
            capacities: {
              type: Type.OBJECT,
              properties: {
                aerobic: { type: Type.INTEGER },
                anaerobic: { type: Type.INTEGER },
                strength: { type: Type.INTEGER },
                speed: { type: Type.INTEGER },
                endurance: { type: Type.INTEGER },
                flexibility: { type: Type.INTEGER }
              },
              required: ["aerobic", "anaerobic", "strength", "speed", "endurance", "flexibility"]
            }
          },
          required: ["performance", "capacities"]
        }
      }
    }));

    const textOutput = response.text;
    if (!textOutput) throw new Error("Sem resposta da IA.");
    return JSON.parse(textOutput);
  } catch (error: any) {
    console.error("Analysis Error:", error?.message || "Erro desconhecido");
    throw new Error("Erro ao analisar performance do atleta.");
  }
};

class AIService {
  async generateWorkout(params: WorkoutParams): Promise<WorkoutPlan> {
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || (import.meta.env.VITE_API_KEY as string);
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Crie um plano de exercícios de fortalecimento funcional para o corredor ${params.studentName}. Nível: ${params.fitnessLevel}. Objetivo: ${params.primaryGoal}. Tempo disponível: ${params.sessionTime} minutos por sessão.`;
    
    try {
      const response = await withRetry(() => ai.models.generateContent({
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
      }));

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
