
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
  
  if (!process.env.API_KEY) {
    throw new Error("Chave de API do Gemini não encontrada nas variáveis de ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-pro-preview";

  const todayStr = new Date().toLocaleDateString('pt-BR');
  const raceInfo = raceDate 
    ? `PROVA ALVO: ${raceDistance} em ${new Date(raceDate).toLocaleDateString('pt-BR')}.` 
    : `Distância Alvo: ${raceDistance}`;

  const prompt = `
    Atue como um Treinador de Corrida de Elite brasileiro (Metodologia Jack Daniels / VDOT).
    Idioma: PORTUGUÊS (BRASIL).
    Data de Início (Hoje): ${todayStr}.

    CONTEXTO DO ATLETA:
    Nome: ${athlete.name} | VDOT Atual: ${athlete.metrics.vdot} | Nível: ${athlete.experience}
    Disponibilidade: ${runningDays} dias de corrida e ${gymDays} dias de fortalecimento por semana.
    
    DADOS DA PROVA:
    - Distância: ${raceDistance}
    - ${raceInfo}
    
    OBJETIVO: "${goalDescription}"

    REGRAS DE TERMINOLOGIA OBRIGATÓRIAS:
    Nas descrições das sessões, você deve usar obrigatoriamente estas siglas para intensidades:
    - 'Ritmo L' para treinos de Limiar (Threshold).
    - 'Ritmo I' para treinos Intervalados de VO2Max.
    - 'Ritmo V' para treinos de Velocidade (Repetition).
    - 'Z1' ou 'Ritmo Leve' para regeneração.
    - 'Z2' para rodagens e maratona.

    Exemplo de formato: "8x1000m em Ritmo L c/ 2min descanso" ou "10x400m em Ritmo I".

    ESTRUTURA OBRIGATÓRIA DA SEMANA (7 DIAS):
    Retorne exatamente 7 registros para cada uma das ${weeks} semanas.
    - O plano termina exatamente no evento.
    - Use 'Descanso' para dias OFF.
  `;

  const schema = {
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
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 10000,
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    const textOutput = response.text;
    if (textOutput) {
      return JSON.parse(textOutput) as TrainingWeek[];
    }
    return [];
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Unterminated string")) {
      throw new Error("O plano gerado foi muito longo para o limite de texto da IA. Tente reduzir o número de semanas.");
    }
    throw new Error(`Falha na geração do plano via IA: ${error.message}`);
  }
};
