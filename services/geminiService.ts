
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
  
  // Use a API key diretamente conforme as diretrizes do SDK @google/genai
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Mudança para Flash: Mais estável para JSON e menos propenso a erros de cota
  const modelName = "gemini-3-flash-preview";

  const raceInfo = raceDate 
    ? `PROVA ALVO: ${raceDistance} em ${new Date(raceDate).toLocaleDateString('pt-BR')}.` 
    : `Distância Alvo: ${raceDistance}`;

  const prompt = `
    Aja como um Treinador de Corrida de Elite (Metodologia VDOT).
    Gere uma periodização para o atleta ${athlete.name} com VDOT ${athlete.metrics.vdot}.
    Objetivo: ${goalDescription}. ${raceInfo}.
    Disponibilidade: ${runningDays} dias de corrida e ${gymDays} dias de fortalecimento por semana.
    Instrução: Gere exatamente ${weeks} semanas de treino detalhadas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Você é um especialista em fisiologia do exercício focado em corrida de rua.",
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
        }
        // Removido thinkingConfig para evitar conflitos com responseSchema em chaves free
      },
    });

    const text = response.text;
    if (!text) throw new Error("A IA retornou uma resposta vazia.");
    
    return JSON.parse(text) as TrainingWeek[];
  } catch (error: any) {
    console.error("Erro Detalhado Gemini:", error);
    // Exibe o erro real para facilitar o diagnóstico
    const errorMessage = error?.message || "Erro desconhecido";
    throw new Error(`Falha na IA: ${errorMessage}. Verifique se sua chave tem acesso ao modelo Gemini 3 Flash.`);
  }
};
