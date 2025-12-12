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
  goal: string,
  weeks: number,
  daysPerWeek: number
): Promise<TrainingWeek[]> => {
  
  const model = "gemini-2.5-flash";
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("API KEY não encontrada. Verifique as variáveis de ambiente (VITE_GOOGLE_API_KEY).");
    throw new Error("Chave de API não configurada.");
  }

  const prompt = `
    Crie uma periodização de treinamento de corrida de ${weeks} semanas para um atleta com o seguinte perfil:
    Nome: ${athlete.name}
    Nível: ${athlete.experience}
    VDOT: ${athlete.metrics.vdot}
    Objetivo: ${goal}
    Disponibilidade: ${daysPerWeek} dias/semana.

    O plano deve incluir fases (Base, Build [Construção], Peak [Pico], Taper [Polimento]).
    Para cada treino, defina um 'type' entre: 'Recovery' (Recuperação/Leve), 'Long' (Longo), 'Tempo' (Ritmo), 'Interval' (Tiros), 'Rest' (Descanso) ou 'Strength' (Fortalecimento).
    Retorne um JSON estruturado.
    
    IMPORTANTE - NOMENCLATURA DE ZONAS (Jack Daniels Adaptado):
    1. Ao descrever a intensidade, use "Zona F" (Fácil) em vez de "Zona E".
    2. Use "Zona L" (Limiar/Threshold) em vez de "Zona T".
    3. Use "Zona M" (Maratona), "Zona I" (Intervalado) e "Zona R" (Repetição) normalmente.
    
    Exemplo de descrição: "Rodagem leve na Zona F" ou "Tiros de 1km na Zona L".
    Todos os textos descritivos (customDescription, day) devem estar em PORTUGUÊS DO BRASIL.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        phase: { type: Type.STRING, enum: ['Base', 'Build', 'Peak', 'Taper'] },
        weekNumber: { type: Type.INTEGER },
        totalVolume: { type: Type.INTEGER, description: "Distância total em km" },
        workouts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING, description: "Dia da semana (ex: Segunda, Terça)" },
              type: { type: Type.STRING, enum: ['Recovery', 'Long', 'Tempo', 'Interval', 'Rest', 'Strength'] },
              customDescription: { type: Type.STRING, description: "Detalhes do treino ex: '10km Leve na Zona F'" },
              distance: { type: Type.NUMBER, description: "Distância em km" },
            }
          }
        }
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
        systemInstruction: "Você é um treinador de corrida de elite. Crie planos progressivos. Use Zona F (Fácil) e Zona L (Limiar)."
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