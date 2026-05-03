
import { GoogleGenAI, Type } from "@google/genai";
import { Athlete, AthletePlan, TrainingWeek } from "../types";

export async function analyzeAthletePerformance(athlete: Athlete, plan: AthletePlan | null) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-3-flash-preview";
  
  const recentWorkouts = plan?.weeks.flatMap((w: TrainingWeek) => w.workouts.filter((work: any) => work.completed)) || [];
  const recentRPEs = recentWorkouts.map((w: any) => w.rpe || 0);
  const avgRPE = recentRPEs.length > 0 ? recentRPEs.reduce((a: number, b: number) => a + b, 0) / recentRPEs.length : 0;
  
  const prompt = `
    Como um especialista em fisiologia do exercício e treinador de elite, analise os dados deste atleta e forneça uma avaliação técnica detalhada.
    
    DADOS DO ATLETA:
    Nome: ${athlete.name}
    Idade: ${athlete.age}
    Peso: ${athlete.weight}kg
    Experiência: ${athlete.experience}
    VDOT Atual: ${athlete.metrics.vdot}
    VO2 Máx Estimado: ${athlete.metrics.vo2Max || 'N/A'}
    FC Máx: ${athlete.metrics.fcMax || 'N/A'}
    
    HISTÓRICO RECENTE:
    Treinos concluídos: ${recentWorkouts.length}
    PSE (RPE) Média: ${avgRPE.toFixed(1)}
    Metas: ${plan?.specificGoal || 'Não definida'}
    
    FORNEÇA:
    1. Score de Performance (0-100): Baseado no VDOT e consistência.
    2. Score de Fadiga (0-100): Baseado na PSE média e volume recente.
    3. Score de Prontidão (0-100): O inverso da fadiga ajustado pela experiência.
    4. Score de Risco de Lesão (0-100): Baseado em picos de carga ou PSE muito alta.
    5. Radar de Capacidades (0-100 para cada): Aeróbica, Anaeróbica, Força, Velocidade, Flexibilidade, Resistência.
    6. Uma análise textual curta e direta em Português.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            performanceScore: { type: Type.NUMBER },
            fatigueScore: { type: Type.NUMBER },
            readinessScore: { type: Type.NUMBER },
            injuryRiskScore: { type: Type.NUMBER },
            physicalCapabilities: {
              type: Type.OBJECT,
              properties: {
                aerobic: { type: Type.NUMBER },
                anaerobic: { type: Type.NUMBER },
                strength: { type: Type.NUMBER },
                speed: { type: Type.NUMBER },
                flexibility: { type: Type.NUMBER },
                endurance: { type: Type.NUMBER },
              },
              required: ["aerobic", "anaerobic", "strength", "speed", "flexibility", "endurance"]
            },
            analysis: { type: Type.STRING }
          },
          required: ["performanceScore", "fatigueScore", "readinessScore", "injuryRiskScore", "physicalCapabilities", "analysis"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Erro na análise de IA:", error);
    return null;
  }
}
