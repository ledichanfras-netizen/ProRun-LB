
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
  
  // Fix: Always use process.env.API_KEY directly in the GoogleGenAI constructor
  if (!process.env.API_KEY || process.env.API_KEY === "") {
    console.error("DEBUG: API_KEY não detectada no ambiente.");
    throw new Error("Chave de API do Gemini não encontrada. Verifique se você adicionou a variável API_KEY no painel Environment do Render e fez um novo Deploy.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-pro-preview";

  const todayStr = new Date().toLocaleDateString('pt-BR');
  const raceInfo = raceDate 
    ? `PROVA ALVO: ${raceDistance} em ${new Date(raceDate).toLocaleDateString('pt-BR')}.` 
    : `Distância Alvo: ${raceDistance}`;

  const prompt = `
    Atue como um Treinador de Corrida de Elite (Metodologia Jack Daniels / VDOT).
    Idioma: PORTUGUÊS (BRASIL).

    CONTEXTO DO ATLETA:
    Nome: ${athlete.name} | VDOT Atual: ${athlete.metrics.vdot} | Nível: ${athlete.experience}
    Disponibilidade: ${runningDays} dias de corrida e ${gymDays} dias de fortalecimento por semana.
    
    DADOS DA PROVA:
    - Distância: ${raceDistance}
    - ${raceInfo}
    - OBJETIVO DO CICLO: "${goalDescription}"

    REGRAS DE TERMINOLOGIA TÉCNICA (OBRIGATÓRIO):
    Nas descrições das sessões, você deve usar obrigatoriamente estas siglas:
    - 'Ritmo L' para treinos de Limiar (Z3/Threshold).
    - 'Ritmo I' para treinos Intervalados (Z4/VO2Max).
    - 'Ritmo V' para treinos de Velocidade (Z5/Repetition).
    - 'Ritmo Leve' para Z1/Z2 (Regenerativo e Rodagem).

    EXEMPLO DE FORMATO DE PRESCRIÇÃO:
    - "10x400m em Ritmo L c/ 1min descanso"
    - "5x1000m em Ritmo I c/ 2min trote leve"
    - "Rodagem 40min em Ritmo Leve"

    ESTRUTURA:
    Gere exatamente ${weeks} semanas, começando hoje (${todayStr}).
    Cada semana deve ter 7 dias (Segunda a Domingo).
    Use 'Descanso' para dias sem treino.
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
    throw new Error("Erro ao gerar plano. Verifique se a API_KEY no Render é válida e se você tem créditos no Google AI Studio.");
  }
};
