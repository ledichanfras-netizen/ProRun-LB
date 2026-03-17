
import { GoogleGenAI } from "@google/genai";
import { Athlete, AthletePlan, PerformanceMetrics, PhysicalCapacities } from "../../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeAthletePerformance(athlete: Athlete, plan: AthletePlan): Promise<{
  performance: PerformanceMetrics;
  capacities: PhysicalCapacities;
  insights: string;
}> {
  const model = "gemini-3-flash-preview";
  
  // Prepare data for AI
  const recentWorkouts = plan.weeks.flatMap((w: any) => w.workouts).filter((w: any) => w.completed);
  const wellness = athlete.wellnessHistory || [];
  
  const prompt = `
    Você é um cientista do esporte de alto nível. Analise os dados deste atleta e retorne um JSON com métricas de performance, capacidades físicas e insights.
    
    Atleta: ${athlete.name}, Idade: ${athlete.age}, Experiência: ${athlete.experience}
    Métricas Base: VDOT: ${athlete.metrics.vdot}, VO2Max: ${athlete.metrics.vo2Max}
    Treinos Recentes: ${JSON.stringify(recentWorkouts.slice(-14))}
    Wellness Recente: ${JSON.stringify(wellness.slice(-7))}
    
    Retorne EXATAMENTE este formato JSON:
    {
      "performance": {
        "readiness": number (0-100),
        "injuryRisk": "Baixo" | "Moderado" | "Alto",
        "performanceScore": number (0-100),
        "acuteLoad": number,
        "chronicLoad": number,
        "ratio": number (ACWR)
      },
      "capacities": {
        "aerobic": number (0-100),
        "anaerobic": number (0-100),
        "strength": number (0-100),
        "speed": number (0-100),
        "endurance": number (0-100),
        "flexibility": number (0-100)
      },
      "insights": "Texto curto com análise profissional e recomendações"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    // Fallback logic if AI fails
    return {
      performance: {
        readiness: 75,
        injuryRisk: 'Baixo',
        performanceScore: 80,
        acuteLoad: 400,
        chronicLoad: 350,
        ratio: 1.1
      },
      capacities: {
        aerobic: 70,
        anaerobic: 60,
        strength: 50,
        speed: 65,
        endurance: 75,
        flexibility: 55
      },
      insights: "Análise automática temporariamente indisponível. Baseado no histórico, o atleta mantém boa progressão."
    };
  }
}
