import { GoogleGenAI, Type } from "@google/genai";
import { Athlete, AthletePlan } from "../types";
import { calculatePaces } from "../utils/calculations";

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  runningDays: number,
  gymDays: number,
  raceDistance: string,
  raceDate?: string
): Promise<AthletePlan> => {
  
  // Fix: Use import.meta.env for Vite environment variables
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("Erro na IA: Chave de API (GEMINI_API_KEY) não configurada no ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });
  // Fix: Use a valid model name
  const modelName = 'gemini-1.5-flash';

  const paces = athlete.customZones || calculatePaces(athlete.metrics.vdot, athlete.metrics.fcThreshold, athlete.metrics.fcMax);
  const pacesContext = paces.map(p => {
    let sigla: string = p.zone;
    if (p.zone === 'Z1') sigla = 'F (Fácil)';
    if (p.zone === 'Z2') sigla = 'M (Moderado)';
    if (p.zone === 'Z3') sigla = 'L (Limiar)';
    if (p.zone === 'Z4') sigla = 'I (Intervalado)';
    if (p.zone === 'Z5') sigla = 'V (Velocidade)';
    return `${sigla}: Pace ${p.minPace}-${p.maxPace}`;
  }).join(", ");

  const raceWeekday = raceDate 
    ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(raceDate))
    : 'Domingo';

  const prompt = `
    Aja como um Treinador de Corrida de Elite (Metodologia VDOT).
    ATLETA: ${athlete.name} | NÍVEL: ${athlete.experience} | VDOT: ${athlete.metrics.vdot}.
    RITMOS ALVO: ${pacesContext}.

    DISTRIBUIÇÃO DE CALENDÁRIO:
    1. O treino do tipo "Longão" deve ser realizado OBRIGATORIAMENTE aos DOMINGOS.
    2. A PROVA ALVO de ${raceDistance} deve ser o último evento da última semana, preferencialmente no domingo (ou na data: ${raceWeekday}).

    INSTRUÇÕES DE FINAL DE CICLO (POLIMENTO / TAPERING):
    1. ÚLTIMA SEMANA: Redução drástica de volume (60%). Foco em frescor físico e ativações neurais curtas.
    2. ORIENTAÇÃO DE FEEDBACK FINAL: No treino da PROVA ALVO, encerre a descrição com: "PARABÉNS! Após cruzar a linha de chegada, use o campo de feedback para descrever como foi sua prova, se atingiu seus objetivos de tempo e como se sentiu. Isso é essencial para planejarmos seu próximo desafio!"

    ESTRATÉGIA DE PROVA (campo raceStrategy):
    - Detalhe a divisão de esforço para ${raceDistance} (Ex: Split Negativo, hidratação a cada 3km, ritmo inicial e final).
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: `Você é o Treinador Leandro Barbosa. Especialista em Periodização. O objetivo é levar o atleta ao pico de forma no domingo da prova. Priorize Longões aos domingos.`,
        responseMimeType: "application/json",
        // remove thinkingConfig as gemini-1.5-flash doesn't support it or it's not needed here
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            raceStrategy: { type: Type.STRING },
            motivationalMessage: { type: Type.STRING },
            weeks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  weekNumber: { type: Type.INTEGER },
                  totalVolume: { type: Type.INTEGER },
                  coachNotes: { type: Type.STRING },
                  workouts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["Regenerativo", "Longão", "Limiar", "Intervalado", "Fortalecimento", "Descanso"] },
                        customDescription: { type: Type.STRING },
                        distance: { type: Type.NUMBER }
                      },
                      required: ["day", "type", "customDescription"]
                    }
                  }
                },
                required: ["phase", "weekNumber", "workouts"]
              }
            }
          },
          required: ["weeks", "raceStrategy"]
        }
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return parsed as AthletePlan;
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw new Error(`Falha na IA: ${error?.message || "Erro desconhecido"}`);
  }
};
