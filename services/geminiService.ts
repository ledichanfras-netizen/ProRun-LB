
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google-ai/generativelanguage";
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
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    
    OBJETIVO DETALhado:
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

  const generationConfig = {
    temperature: 0.3,
    topK: 1,
    topP: 1,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    const textOutput = response.text();

    if (textOutput) {
      const cleanedJson = textOutput.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleanedJson) as TrainingWeek[];
    }
    return [];
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Unterminated string")) {
      throw new Error("O plano gerado foi muito longo para o limite de texto da IA. Tente reduzir o número de semanas.");
    }
    throw new Error("Falha na geração do plano via IA. Verifique sua conexão e tente novamente.");
  }
};
