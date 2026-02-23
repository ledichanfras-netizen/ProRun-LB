
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Athlete, AthletePlan } from "../types";
import { calculatePaces } from "../utils/calculations";

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  runningDays: number,
  gymDays: number,
  raceDistance: string,
  raceDate?: string,
  raceGoal?: string
): Promise<AthletePlan> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

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
    META ESPECÍFICA: ${raceGoal || raceDistance} na distância de ${raceDistance}.
    DURAÇÃO DO CICLO: ${weeks} semanas.
    FREQUÊNCIA: ${runningDays} dias de corrida e ${gymDays} dias de fortalecimento/academia por semana.
    CONTEXTO ADICIONAL: ${goalDescription}.
    RITMOS ALVO: ${pacesContext}.

    REGRAS DE OURO DA PERIODIZAÇÃO:
    1. A PROVA ALVO (${raceDistance}) é o evento FINAL absoluto do plano, na semana ${weeks}, no dia: ${raceWeekday}.
    2. O treino "Longão" deve ser OBRIGATORIAMENTE aos DOMINGOS.
    3. RESTRIÇÃO DE TEMPO: Se o treinador descreveu "máximo 50 minutos" ou algo similar para a semana, limite os treinos de segunda a sábado a volumes que caibam nesse tempo (ex: 6km a 8km). O volume total maior deve ser concentrado no Longão de Domingo.
    4. DISTRIBUIÇÃO: Distribua os ${runningDays} treinos de corrida e ${gymDays} de academia de forma equilibrada. Não coloque treinos intensos em dias seguidos.
    5. POLIMENTO: A última semana deve ter uma redução drástica de volume (Tapering) para chegar descansado na prova.

    ESTRATÉGIA DE PROVA (raceStrategy):
    - Detalhe o plano de ritmos e tática para atingir a meta "${raceGoal}".
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Você é o Treinador Leandro Barbosa. Especialista em Performance Humana. Suas planilhas são precisas e respeitam as restrições de tempo de vida do atleta. Você sempre termina a periodização no dia da prova.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
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
    throw new Error(`IA Falhou: ${error?.message || "Erro desconhecido"}`);
  }
};
