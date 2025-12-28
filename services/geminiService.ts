
import { GoogleGenAI, Type } from "@google/genai";
import { Athlete, TrainingWeek } from "../types";

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  runningDays: number,
  gymDays: number,
  raceDistance: string,
  raceDate?: string,
  periodizationObjective?: string
): Promise<TrainingWeek[]> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";

  if (!process.env.API_KEY) {
    throw new Error("Chave de API não configurada.");
  }

  const raceInfo = raceDate 
    ? `PROVA ALVO: ${raceDistance} em ${new Date(raceDate).toLocaleDateString('pt-BR')}.` 
    : `Distância Alvo: ${raceDistance}`;

  const prompt = `
    Atue como um Treinador de Corrida de Elite (Metodologia Jack Daniels / VDOT / Periodização Linear e Ondulatória).
    Idioma: PORTUGUÊS (BRASIL).

    CONTEXTO DO ATLETA:
    Nome: ${athlete.name} | VDOT Atual: ${athlete.metrics.vdot} | Nível: ${athlete.experience}
    Disponibilidade: ${runningDays} dias de corrida e ${gymDays} dias de fortalecimento por semana.
    
    DADOS DA PROVA:
    - Distância: ${raceDistance}
    - ${raceInfo}
    
    OBJETIVO DETALHADO (CONTEXTO LIVRE PARA PRESCRIÇÃO - PRIORIDADE MÁXIMA):
    "${goalDescription}"

    INSTRUÇÕES TÉCNICAS PARA A IA:
    1. GERAR: ${weeks} semanas de treinamento terminando exatamente na data da prova.
    2. PERIODIZAÇÃO: Divida o ciclo proporcionalmente em 'Base', 'Construção', 'Pico' e 'Polimento'.
    3. AJUSTE POR DISTÂNCIA:
       - 42k (Maratona): O volume deve ser a prioridade, com rodagens longas progressivas.
       - 21k: Foco em resistência de limiar anaeróbio.
       - 5k/10k: Foco em economia de corrida e potência aeróbica (Z4/Z5).
    4. CUSTOMIZAÇÃO POR OBJETIVO: Interprete a descrição livre acima de forma inteligente. 
       - Se o atleta mencionou "subidas" ou "trail", adicione treinos de ladeira. 
       - Se mencionou "lesão" ou "retorno", seja conservador no volume e adicione notas de cuidado.
       - Se mencionou um tempo alvo (ex: sub 4h), ajuste os paces sugeridos nas descrições.

    REGRAS DE RETORNO (JSON):
    - fases: 'Base', 'Construção', 'Pico', 'Polimento'.
    - tipos: 'Regenerativo', 'Longão', 'Limiar', 'Intervalado', 'Descanso', 'Fortalecimento'.
    - descriptions: Inclua orientações de pace (Z1-Z5) baseadas no VDOT ${athlete.metrics.vdot}.
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
      propertyOrdering: ["id", "phase", "weekNumber", "totalVolume", "workouts", "coachNotes"],
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const textOutput = response.text;
    if (textOutput) {
      return JSON.parse(textOutput.trim()) as TrainingWeek[];
    }
    return [];
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error("Falha na geração do plano via IA. Verifique os dados e tente novamente.");
  }
};
