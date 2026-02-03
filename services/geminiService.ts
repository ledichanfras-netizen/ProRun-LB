
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
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-flash-preview";

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

  const raceInfo = raceDate 
    ? `A prova de ${raceDistance} será no dia ${new Date(raceDate).toLocaleDateString('pt-BR')}. O plano deve terminar exatamente nesta data com a estratégia para o dia.` 
    : `Objetivo: ${raceDistance}.`;

  const prompt = `
    Aja como um Treinador de Corrida de Elite.
    ATLETA: ${athlete.name} | NÍVEL: ${athlete.experience} | VDOT: ${athlete.metrics.vdot}.
    REFERÊNCIA DE RITMOS: ${pacesContext}.

    OBJETIVO: ${goalDescription}. ${raceInfo}.
    DURAÇÃO: ${weeks} semanas.

    REGRAS DE NOMENCLATURA:
    1. Use: "[Distância] em Ritmo [Sigla] ([Nome])".
    2. Siglas: F (Fácil), M (Moderado), L (Limiar), I (Intervalado), V (Velocidade).

    ESTRATÉGIA DE PERIODIZAÇÃO:
    - Termine o ciclo na data da prova com Polimento.
    - No final do JSON, crie uma "raceStrategy" (como ele deve correr a prova baseada nos paces) e uma "motivationalMessage" curta.

    Gere o JSON conforme o esquema definido.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Você é um treinador focado em performance e ciência. Use terminologia F, M, L, I, V.",
        responseMimeType: "application/json",
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
                        type: { type: Type.STRING },
                        customDescription: { type: Type.STRING },
                        distance: { type: Type.NUMBER }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return parsed as AthletePlan;
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw new Error(`IA Error: ${error?.message}`);
  }
};
