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

  const raceInfo = raceDate 
    ? `A prova de ${raceDistance} será no dia ${new Date(raceDate).toLocaleDateString('pt-BR')}.` 
    : `Objetivo: ${raceDistance}.`;

  const prompt = `
    Aja como um Treinador de Corrida de Elite (Metodologia VDOT).
    ATLETA: ${athlete.name} | NÍVEL: ${athlete.experience} | VDOT: ${athlete.metrics.vdot}.
    RITMOS ALVO PARA REFERÊNCIA: ${pacesContext}.

    ESTRUTURA SEMANAL OBRIGATÓRIA:
    - Dias de Corrida: ${runningDays} dias.
    - Dias de Academia (Fortalecimento): ${gymDays} dias.
    - Total de Semanas: ${weeks}.

    REGRAS DE PRESCRIÇÃO PARA O CAMPO 'customDescription':
    1. Para CORRIDA: O campo 'customDescription' deve detalhar: [Aquecimento] + [Parte Principal com repetições e ritmos F, M, L, I ou V] + [Desaquecimento].
    2. EXEMPLO CORRIDA: "15min F + 5x1000m em Ritmo I c/ 2min repouso caminhando + 10min F".
    3. Para ACADEMIA: O campo 'customDescription' deve detalhar o foco (ex: "Fortalecimento Funcional: Foco em estabilidade de core e potência de membros inferiores").
    4. Para DESCANSO: Use "Descanso Total (Day Off)".

    OBJETIVO ADICIONAL: ${goalDescription}. ${raceInfo}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Você é o Treinador Leandro Barbosa. Suas prescrições são técnicas e detalhadas.",
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
