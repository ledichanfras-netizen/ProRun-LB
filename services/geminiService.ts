
import { GoogleGenAI, Type } from "@google/genai";
import { Athlete, TrainingWeek } from "../types";

// Helper to get API Key safely in Vite/Vercel environment
const getApiKey = () => {
  let key = "";
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      key = (import.meta as any).env.VITE_GOOGLE_API_KEY || (import.meta as any).env.VITE_API_KEY;
    }
  } catch (e) {}

  if (!key) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        key = process.env.VITE_GOOGLE_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || "";
      }
    } catch (e) {}
  }
  
  return key || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  daysPerWeek: number,
  raceDistance?: string,
  raceDate?: string
): Promise<TrainingWeek[]> => {
  
  const model = "gemini-2.5-flash";
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("API KEY não encontrada. Verifique as variáveis de ambiente (VITE_GOOGLE_API_KEY).");
    throw new Error("Chave de API não configurada.");
  }

  const raceInfo = raceDate 
    ? `A PROVA ALVO é no dia ${new Date(raceDate).toLocaleDateString('pt-BR')} (${raceDistance}).` 
    : `Distância Alvo: ${raceDistance}`;

  const prompt = `
    Atue como um Treinador de Corrida Especialista seguindo a metodologia de **José Cassidori Junior**.

    PERFIL DO ATLETA:
    Nome: ${athlete.name}
    Nível: ${athlete.experience}
    VDOT: ${athlete.metrics.vdot}
    Disponibilidade: ${daysPerWeek} dias/semana.

    OBJETIVO PRINCIPAL:
    ${raceInfo}
    Meta de Tempo/Detalhes: ${goalDescription}
    
    DURAÇÃO DO PLANO:
    Você deve gerar EXATAMENTE ${weeks} semanas de treino, começando da semana atual até a semana da prova.
    A última semana (Semana ${weeks}) deve ser a semana da prova (Polimento final + Dia da Prova).

    DIRETRIZES METODOLÓGICAS (CASSIDORI):
    Organize a periodização utilizando os seguintes tipos de treinamento específicos do autor:
    
    1. **Débito Cardíaco (Base/Rodagem):** Corridas contínuas de baixa intensidade (Zona F/M) para aumentar a câmara cardíaca e o volume de ejeção. Fundamental na fase de base.
    2. **Treino Antiglicolítico (Potência Alática):** Esforços curtos e muito intensos (6 a 10 segundos) com recuperação total, visando potência sem acúmulo de lactato.
    3. **Repetições (Economia de Corrida):** Tiros curtos (200m a 400m) em ritmo de prova ou superior (Zona R), com foco na técnica e economia de movimento.
    4. **VO2max (Potência Aeróbia):** Intervalados clássicos (Zona I) de 2 a 5 minutos de duração.
    5. **Força Geral e Especial:**
       - *Geral:* Musculação ou calistenia (Core, Agachamentos).
       - *Especial:* Educativos de corrida (Skipping, Anfersen), Saltos e pliometria leve aplicada à corrida.

    ESTRUTURA DE CARGA (Microciclos):
    Distribua as fases (Base, Construção, Pico, Polimento) proporcionalmente dentro das ${weeks} semanas disponíveis.
    
    REGRAS DE FORMATAÇÃO (CRÍTICO):
    1. O campo 'customDescription' deve ser a prescrição técnica direta.
    2. **NÃO** use frases como "Segundo Cassidori". Apenas prescreva.
    3. Exemplo de descrição: "Débito Cardíaco: 10km em Zona F (Ritmo confortável) + 4x Acelerações 100m."
    4. Exemplo de descrição: "Antiglicolítico: 15' Aq. + 8x 80m subida forte (recupera 3' total caminhando) + 10' Solto."
    5. Exemplo de Força: "Força Especial: 20' Educativos (Skipping/Hopserlauf) + 4x10 Saltos no caixote."
    6. Se houver uma prova na última semana, o treino de Domingo (ou Sábado) deve ser "PROVA ALVO: ${raceDistance}".

    Retorne um JSON estruturado com ${weeks} semanas.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        phase: { type: Type.STRING, enum: ['Base', 'Build', 'Peak', 'Taper'], description: "Fase do macrociclo" },
        weekNumber: { type: Type.INTEGER },
        totalVolume: { type: Type.INTEGER, description: "Volume total planejado (km)" },
        workouts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING, description: "Dia da semana (Segunda, Terça...)" },
              type: { type: Type.STRING, enum: ['Recovery', 'Long', 'Tempo', 'Interval', 'Rest', 'Strength'] },
              customDescription: { type: Type.STRING, description: "Prescrição técnica EXATA do treino." },
              distance: { type: Type.NUMBER, description: "Distância estimada em km (0 se for força/descanso)" },
            }
          }
        },
        coachNotes: { type: Type.STRING, description: "Foco do Microciclo (Ex: Choque - Ênfase em VO2max)" }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TrainingWeek[];
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Falha ao gerar o plano de treinamento. Verifique a API Key.");
  }
};
