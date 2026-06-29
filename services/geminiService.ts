
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Athlete, AthletePlan } from "../types";
import { calculatePaces } from "../utils/calculations";
import { withRetry } from "../utils/helpers";

import { getAppNow } from "../utils/time";

export const generateTrainingPlan = async (
  athlete: Athlete,
  goalDescription: string,
  weeks: number,
  runningDays: number,
  gymDays: number,
  raceDistance: string,
  raceDate?: string,
  raceGoal?: string,
  startDate?: string,
  trainingDays?: number[]
): Promise<AthletePlan> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

  const today = getAppNow().toLocaleDateString('pt-BR');
  const raceWeekday = raceDate 
    ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(raceDate + 'T00:00:00'))
    : 'Domingo';

  const preferredDaysText = trainingDays && trainingDays.length > 0 
    ? trainingDays.map(d => ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][d]).join(", ")
    : "Não especificado (use seu critério)";

  const prompt = `
    Aja como um Treinador de Elite especializado em Corrida (Metodologia VDOT - Jack Daniels) e Multiesporte (Triathlon e Duathlon).
    
    SUA BASE METODOLÓGICA:
    1. "A Bíblia do Treinamento para Triatletas/Ciclistas" (Joe Friel).
    2. "Fórmula de Daniels" (Jack Daniels).
    3. Princípio da Individualidade Biológica: Ajuste volumes para a idade, peso e experiência.
    4. Princípio da Continuidade e Reversibilidade.
    5. Periodização Linear e Não-Linear.

    DADOS DO ATLETA:
    - NOME: ${athlete.name}
    - NÍVEL: ${athlete.experience}
    - VDOT: ${athlete.metrics.vdot}
    - BIOMETRIA: ${athlete.age} anos, ${athlete.weight}kg, ${athlete.height}cm.
    - HISTÓRICO DE LESÕES (CRÍTICO): ${athlete.injuryHistory || 'Nenhum reportado'}. (Se houver lesão, seja mais conservador no volume e evite muitos treinos de impacto seguidos).

    PARÂMETROS DO CICLO:
    - DATA DE INÍCIO: ${startDate || today}.
    - DATA DA PROVA: ${raceDate} (${raceWeekday}).
    - META: ${raceGoal || raceDistance} (${raceDistance}).
    - DURAÇÃO: ${weeks} semanas.
    - DIAS DISPONÍVEIS: ${preferredDaysText}. 
    - FREQUÊNCIA ALVO: ${runningDays} corridas e ${gymDays} treinos de força por semana.
    - CONTEXTO ADICIONAL: ${goalDescription}.
    - RITMOS ALVO: ${pacesContext}.
 
    REGRAS OBRIGATÓRIAS:
    1. A PROVA deve ser o único treino do dia ${raceWeekday} na Semana ${weeks}.
    2. RESPEITE OS DIAS DISPONÍVEIS: Tente prescrever treinos APENAS nos dias selecionados (${preferredDaysText}). Se não houver dias suficientes selecionados para a frequência alvo, priorize os selecionados e complete onde for menos prejudicial.
    3. No caso de lesões reportadas, inclua notas específicas do Coach orientando o cuidado.
    4. Use a nomenclatura exata: "Regenerativo", "Longão", "Limiar", "Intervalado", "Descanso", "Fortalecimento", "Velocidade", "Natação", "Ciclismo", "Transição", "Prova".
    5. Para o "Fortalecimento", especifique se é funcional, hipertrofia ou resistência de força.
    6. INDIVIDUALIZAÇÃO: Se o atleta é "Elite", o volume deve ser condizente (ex: 70-120km/sem para maratona). Se é "Iniciante", comece com volumes baixos e caminhas/corridas intercaladas se necessário.

    ESTRATÉGIA DE PROVA (raceStrategy):
    - Detalhe o plano de ritmos e tática para atingir a meta "${raceGoal}".
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Você é o Treinador Leandro Barbosa. Especialista em Performance Humana, Triathlon e Duathlon. Suas planilhas são baseadas nas metodologias de Joe Friel (Training Bible), Jack Daniels (VDOT) e 80/20 Training. Suas prescrições são precisas e respeitam as restrições de tempo de vida do atleta. Você sempre termina a periodização no dia da prova.",
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
                        type: { type: Type.STRING, enum: ["Regenerativo", "Longão", "Limiar", "Intervalado", "Fortalecimento", "Descanso", "Velocidade", "Natação", "Ciclismo", "Transição", "Prova"] },
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
    }));

    const parsed = JSON.parse(response.text || "{}");
    return parsed as AthletePlan;
  } catch (error: any) {
    console.error("Erro Gemini:", error?.message || "Erro desconhecido");
    let userMessage = "A IA falhou ao gerar o plano.";
    if (error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE")) {
      userMessage = "O servidor da IA está sobrecarregado no momento. Por favor, tente novamente em alguns instantes.";
    }
    throw new Error(userMessage);
  }
};
