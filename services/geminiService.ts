
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
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";

  if (!process.env.API_KEY) {
    throw new Error("Chave de API não configurada.");
  }

  const raceInfo = raceDate 
    ? `PROVA ALVO: ${raceDistance} em ${new Date(raceDate).toLocaleDateString('pt-BR')}.` 
    : `Distância Alvo: ${raceDistance}`;

  const prompt = `
    Atue como um Treinador de Corrida de Elite brasileiro (Metodologia Jack Daniels / VDOT / Periodização Linear e Ondulatória).
    Idioma: PORTUGUÊS (BRASIL) - Use terminologia técnica local (ex: "rodagem", "tiros", "fortalecimento", "soltura").

    CONTEXTO DO ATLETA:
    Nome: ${athlete.name} | VDOT Atual: ${athlete.metrics.vdot} | Nível: ${athlete.experience}
    Disponibilidade: ${runningDays} dias de corrida e ${gymDays} dias de fortalecimento por semana.
    
    DADOS DA PROVA:
    - Distância: ${raceDistance}
    - ${raceInfo}
    
    OBJETIVO DETALHADO:
    "${goalDescription}"

    NOMENCLATURA OBRIGATÓRIA DE ZONAS E RITMOS:
    Ao prescrever os treinos e descrever intensidades, use EXCLUSIVAMENTE estas siglas:
    - Z1: Leve / Regenerativo
    - Z2: Ritmo de Maratona
    - Z3: Ritmo de Limiar (L)
    - Z4: Intervalado (I)
    - Z5: Velocidade (V)

    INSTRUÇÕES TÉCNICAS:
    1. GERAR: ${weeks} semanas de treinamento terminando exatamente na data da prova.
    2. PERIODIZAÇÃO: Divida o ciclo em 'Base', 'Construção', 'Pico' e 'Polimento'.
    3. FOCO ESTRATÉGICO: Use o "Objetivo Detalhado" para personalizar a planilha.
    4. VOLUME: Ajuste o volume semanal médio de acordo com o VDOT ${athlete.metrics.vdot}.
    5. DESCRIÇÕES: Seja específico. Ex: "15min Z1 + 5x 1000m Ritmo de Limiar (L) + 10min Z1".

    REGRAS DE RETORNO (JSON):
    - fases: 'Base', 'Construção', 'Pico', 'Polimento'.
    - tipos: 'Regenerativo', 'Longão', 'Limiar', 'Intervalado', 'Descanso', 'Fortalecimento'.
    - descriptions: Use a terminologia de corrida brasileira e as siglas (L), (I), (V).
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
    throw new Error("Falha na geração do plano via IA. Verifique sua conexão e tente novamente.");
  }
};
