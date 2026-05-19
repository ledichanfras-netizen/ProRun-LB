
import { Athlete, AthletePlan } from '../types';

export async function analyzeAthletePerformance(athlete: Athlete, plan: AthletePlan | null) {
  try {
    const response = await fetch('/api/ai-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ athlete, plan })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[performanceService] AI analysis failed:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na análise de IA:', error);
    return null;
  }
}
