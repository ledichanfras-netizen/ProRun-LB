
import { GoogleGenerativeAI, GenerationConfig, GenerateContentRequest } from "@google/generative-ai";
import { Athlete, TrainingWeek } from "../types";

// Helper function to create a deep copy
const deepCopy = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  runningDays: number,
  gymDays: number,
  raceDistance: string,
  raceDate?: string
): Promise<TrainingWeek[]> => {

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("DEBUG: Chave da API do Gemini não encontrada nas variáveis de ambiente.");
    throw new Error("A chave da API para o serviço de IA não foi configurada. Por favor, adicione VITE_GEMINI_API_KEY às suas variáveis de ambiente.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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
    - 'Ritmo R' para treinos de Repetição/Velocidade (Z5/Repetition).
    - 'Ritmo Leve' para Z1/Z2 (Regenerativo e Rodagem).

    EXEMPLO DE FORMATO DE PRESCRIÇÃO:
    - "10x400m em Ritmo R c/ 1min descanso"
    - "5x1000m em Ritmo I c/ 2min trote leve"
    - "Rodagem 40min em Ritmo Leve"

    ESTRUTURA:
    Gere exatamente ${weeks} semanas, começando hoje (${todayStr}).
    Cada semana deve ter 7 dias (Segunda a Domingo).
    Use 'Descanso' para dias sem treino. Retorne o JSON em uma única linha, sem newlines.
  `;

  const trainingPlanSchema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        phase: { type: "STRING", enum: ['Base', 'Construção', 'Pico', 'Polimento'] },
        weekNumber: { type: "INTEGER" },
        totalVolume: { type: "NUMBER" },
        coachNotes: { type: "STRING" },
        workouts: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              day: { type: "STRING" },
              type: { type: "STRING", enum: ['Regenerativo', 'Longão', 'Limiar', 'Intervalado', 'Descanso', 'Fortalecimento', 'Ritmo de Prova'] },
              customDescription: { type: "STRING" },
              distance: { type: "NUMBER" },
              isVisible: { type: "BOOLEAN", description: "Sempre true para novos treinos."}
            },
            required: ["day", "type", "customDescription", "isVisible"]
          }
        },
      },
      required: ["phase", "weekNumber", "workouts"],
    }
  };

  // FIX: Corrected property names to camelCase to match the SDK's type definition.
  const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
    // @ts-ignore - The SDK's type for responseSchema is generic, but this structure is correct for the API.
    responseSchema: deepCopy(trainingPlanSchema),
  };

  try {
    // FIX: Pass a single GenerateContentRequest object to the generateContent method.
    const request: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    };

    const result = await model.generateContent(request);
    const response = result.response;
    const text = response.text();

    if (text) {
      // Adicionar IDs únicos para cada semana para uso no React
      return JSON.parse(text).map((week: TrainingWeek) => ({ ...week, id: `week_${week.weekNumber}_${Date.now()}` }));
    }
    return [];

  } catch (error: any) {
    console.error("Gemini API Error:", error);

    if (error.message?.includes('SAFETY')) {
      throw new Error("O conteúdo gerado foi bloqueado por políticas de segurança. Tente reformular seu objetivo.");
    }
    if (error.message?.includes('SCHEMA_VIOLATION') || error.message?.includes('Unterminated string')) {
      throw new Error("A IA gerou uma resposta com formato inválido. Isso pode ser um bug. Tente novamente ou ajuste o número de semanas.");
    }
    throw new Error(`Falha na geração do plano via IA. Causa: ${error.message || 'Erro desconhecido'}`);
  }
};
