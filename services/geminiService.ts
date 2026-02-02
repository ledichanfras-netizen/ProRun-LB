
import { GoogleGenAI, Type } from "@google/genai";
import { Athlete, TrainingWeek } from "../types";

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  runningDays: number,
  gymDays: number,
  raceDistance: string,
  raceDate?: string
): Promise<TrainingWeek[]> => {
  
  // No Vite, process.env.API_KEY será injetado pelo define do vite.config.ts
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY não encontrada. Certifique-se de configurar a variável de ambiente no Render ANTES de fazer o deploy.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-3-pro-preview";

  const todayStr = new Date().toLocaleDateString('pt-BR');
  const raceInfo = raceDate 
    ? `PROVA ALVO: ${raceDistance} em ${new Date(raceDate).toLocaleDateString('pt-BR')}.` 
    : `Distância Alvo: ${raceDistance}`;

  const prompt = `
    Você é um Treinador de Corrida de Elite (Metodologia VDOT).
    Gere uma periodização para o atleta ${athlete.name} (VDOT: ${athlete.metrics.vdot}).
    Objetivo: ${goalDescription}. ${raceInfo}.
    Disponibilidade: ${runningDays} dias de corrida e ${gymDays} dias de fortalecimento.
    Gere exatamente ${weeks} semanas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              phase: { type: Type.STRING, enum: ['Base', 'Construção', 'Pico', 'Polimento'] },
              weekNumber: { type: Type.INTEGER },
              totalVolume: { type: Type.INTEGER },
              coachNotes: { type: Type.STRING },
              workouts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Regenerativo', 'Longão', 'Limiar', 'Intervalado', 'Descanso', 'Fortalecimento'] },
                    customDescription: { type: Type.STRING },
                    distance: { type: Type.NUMBER },
                  },
                  required: ["day", "type", "customDescription"]
                }
              },
            },
            required: ["phase", "weekNumber", "workouts"],
          }
        },
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Resposta da IA vazia.");
    return JSON.parse(text) as TrainingWeek[];
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error("Erro na comunicação com a IA. Verifique as quotas e a chave de API.");
  }
};
