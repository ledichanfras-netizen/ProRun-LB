import {buildPrescriptionContext,inspectPrescription,prescriptionPrinciples,prescriptionDays,type PrescriptionConstraints} from '../utils/prescriptionIntelligence';
import {withoutMenstrualData} from '../utils/menstrualReadiness';

import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Athlete, AthletePlan } from "../types";
import { calculatePaces } from "../utils/calculations";
import { withPrescriptionModelFallback, modelFailureKind } from "../utils/prescriptionModels";

import { getAppNow, getLocalDateString, getWorkoutDateString } from "../utils/time";

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
  trainingDays?: number[],
  runningDaysOfWeek?: number[],
  gymDaysOfWeek?: number[],
  longRunDayOfWeek?: number,
  currentPlan?: AthletePlan | null
): Promise<AthletePlan> => {
  
  athlete = withoutMenstrualData(athlete);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const asOf=getLocalDateString(getAppNow());
  const context=buildPrescriptionContext(athlete,currentPlan,asOf);
  const constraints:PrescriptionConstraints={weeks,startDate:startDate||asOf,raceDate,runningDays:runningDaysOfWeek||[],gymDays:gymDaysOfWeek||[],longRunDay:longRunDayOfWeek??6,multisport:/triat|duat|triath|duath/i.test(`${raceDistance} ${raceGoal||''} ${goalDescription}`)};
  if(!Number.isInteger(weeks)||weeks<1)throw new Error('Informe uma duração válida para o ciclo.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(constraints.startDate))throw new Error('Informe a data de início do ciclo.');
  const expectedRaceWeek=Array.from({length:7},(_,i)=>getWorkoutDateString(constraints.startDate,weeks-1,i));
  if(raceDate&&!expectedRaceWeek.includes(raceDate))throw new Error('A data da prova não está na última semana do ciclo. Ajuste a duração ou a data de início antes de gerar.');
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

  const diasSemanaNome = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

  const longRunDayName = (longRunDayOfWeek !== undefined && longRunDayOfWeek >= 0 && longRunDayOfWeek < 7)
    ? diasSemanaNome[longRunDayOfWeek]
    : 'Domingo';

  const runningDaysNames = runningDaysOfWeek && runningDaysOfWeek.length > 0 
    ? runningDaysOfWeek.map(d => diasSemanaNome[d]).join(", ") 
    : `${runningDays} dias/semana (livre escolha nos dias de treino)`;

  const gymDaysNames = gymDaysOfWeek && gymDaysOfWeek.length > 0 
    ? gymDaysOfWeek.map(d => diasSemanaNome[d]).join(", ") 
    : gymDays > 0 ? `${gymDays} dias/semana` : "Nenhum";

  const preferredDaysText = trainingDays && trainingDays.length > 0 
    ? trainingDays.map(d => diasSemanaNome[d]).join(", ")
    : "Não especificado (use seu critério)";

  const prompt = `
    Aja como um Treinador de Elite especializado em Corrida (Metodologia VDOT - Jack Daniels) e Multiesporte (Triathlon e Duathlon).
    
    ${prescriptionPrinciples}
    HISTÓRICO EXECUTADO E QUALIDADE DOS DADOS (não extrapolar lacunas):
    ${JSON.stringify(context)}
    CALENDÁRIO OBRIGATÓRIO: ${JSON.stringify(constraints)}.
    As regras desta base de raciocínio prevalecem sobre exemplos genéricos abaixo.
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
    - DIAS DE CORRIDA SELECIONADOS (${runningDays}x/semana): ${runningDaysNames}.
    - DIA DO LONGÃO DEFINIDO: ${longRunDayName} (Treino de maior volume/rodagem longa da semana).
    - DIAS DE ACADEMIA / FORTALECIMENTO SELECIONADOS (${gymDays}x/semana): ${gymDaysNames}.
    - DIAS TOTAIS DISPONÍVEIS: ${preferredDaysText}. 
    - CONTEXTO ADICIONAL: ${goalDescription}.
    - RITMOS ALVO: ${pacesContext}.
 
    REGRAS OBRIGATÓRIAS DE PRESCRIÇÃO E DISTRIBUIÇÃO DOS DIAS:
    1. ALOCAÇÃO DO LONGÃO: O treino de "Longão" (rodagem longa, construção aeróbica e maior volume da semana) DEVE ser prescrito OBRIGATORIAMENTE no dia ${longRunDayName}. Nas semanas de desenvolvimento, respeitando recuperação e dias anteriores ao início do ciclo, marque ${longRunDayName} como tipo "Longão". Na semana ${weeks} (semana final da prova), caso a prova aconteça no dia ${raceWeekday}, ela terá o papel principal.
    2. ALOCAÇÃO DE OUTRAS CORRIDAS (DIAS EXATOS): Aloque os outros treinos de corrida (Regenerativo, Limiar, Intervalado, Maratona, Velocidade) ESTRITAMENTE nos outros dias de corrida selecionados (${runningDaysNames}), sem colocá-los nos dias de descanso.
    3. ALOCAÇÃO DE ACADEMIA / FORTALECIMENTO (DIAS EXATOS): Você DEVE prescrever os treinos de "Fortalecimento" (musculação/funcional/força) ESTRITAMENTE nos DIAS DE ACADEMIA SELECIONADOS: ${gymDaysNames}.
    4. DIAS DE DESCANSO: Qualquer dia que NÃO for dia de corrida nem de academia DEVE ser preenchido como tipo "Descanso", com distance: 0 e customDescription detalhando descanso/recuperação passiva.
    5. DIAS COMBINADOS: Se o mesmo dia foi selecionado para Corrida E Academia, prescreva a sessão de corrida combinada com o fortalecimento complementar (ex: Rodagem Z1/Z2 + Fortalecimento funcional).
    6. CADA SEMANA DEVE CONTER OS 7 DIAS: "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo".
    7. A PROVA deve ser o treino principal do dia ${raceWeekday} na Semana ${weeks}.
    8. No caso de lesões reportadas, inclua notas específicas do Coach orientando o cuidado.
    9. Use a nomenclatura exata: "Regenerativo", "Longão", "Limiar", "Intervalado", "Maratona", "Descanso", "Fortalecimento", "Velocidade", "Natação", "Ciclismo", "Transição", "Prova".
    10. INDIVIDUALIZAÇÃO: fundamente o volume na execução recente e qualidade dos dados. Nível, idade e peso contextualizam, mas não determinam uma dose ou faixa de quilômetros. Em caso de lacunas, explicite as hipóteses a confirmar com o treinador.

    PADRÃO OBRIGATÓRIO DE SINTAXE PARA O CONVERSOR DE TREINOS ESTRUTURADOS (GPS / PARSER):
    Para que o sistema e o GPS convertam automaticamente as sessões em etapas estruturadas de áudio e ritmo para o atleta, você DEVE formatar o campo "customDescription" seguindo rigorosamente os padrões abaixo:

    A) TREINOS INTERVALADOS / TIROS / VELOCIDADE (Tipos: "Intervalado", "Velocidade", "Limiar"):
       Formato padrão: [Aquecimento] + [N]x [Distância ou Tempo] rec [Recuperação] ritmo [Pace Min a Pace Max ou Pace Exato] + [Desaquecimento]
       Exemplos que o conversor reconhece perfeitamente:
       - "2km aq + 6x 1000m rec 2min ritmo 04:15 a 04:25 + 1km des"
       - "15min aq + 8x 400m rec 90s ritmo 03:40 + 10min des"
       - "10min aq + 5x 1km rec 2min ritmo 04:10 + 10min des"
       - "2km aq + 10x 200m rec 60s ritmo 03:20 + 1km des"
       - "15min aq + 4x 2000m rec 3min ritmo 04:30 a 04:40 + 10min des"
       - "10min aq + 10x 1min rec 1min ritmo 03:30 + 10min des"
       (Use sempre os ritmos reais do atleta calculados em ${pacesContext}: Intervalado = Z4, Velocidade = Z5, Limiar = Z3).

    B) TREINOS CONTÍNUOS / RODAGENS / LONGÃO (Tipos: "Regenerativo", "Longão", "Maratona"):
       - "Rodagem regenerativa 6km ritmo 05:40 a 06:10 (Z1 leve/recuperação)."
       - "Rodagem aeróbica 10km ritmo 05:05 a 05:30 (Z2 confortável)."
       - "Longão 20km ritmo 05:10 a 05:35 (Z2 construção de base)."
       - "Longão progressivo 22km: 14km ritmo 05:15 (Z2) + 8km ritmo 04:45 (Z3/ritmo de prova)."
       - "Treino de ritmo Maratona 16km ritmo 04:50 (Z2 alta / ritmo alvo de maratona)."

    C) FORTALECIMENTO:
       - "Treino de força funcional: foco em membros inferiores, core e estabilização de quadril/glúteo médio."

    D) DESCANSO:
       - "Descanso total / Recuperação passiva."

    ESTRATÉGIA DE PROVA (raceStrategy):
    - Detalhe o plano de ritmos e tática para atingir a meta "${raceGoal}".
  `;

  try {
    const response = await withPrescriptionModelFallback(modelName => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: prescriptionPrinciples + " Você é um assistente de planejamento do Treinador Leandro Barbosa. Especialista em Performance Humana, Triathlon e Duathlon. Suas planilhas são baseadas nas metodologias de Joe Friel (Training Bible), Jack Daniels (VDOT) e 80/20 Training. Suas prescrições são precisas e formatadas com sintaxe padronizada para reconhecimento automático pelo conversor de treinos estruturados GPS (ex: '2km aq + 6x 1000m rec 2min ritmo 04:15 + 1km des'). Você sempre termina a periodização no dia da prova.",
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
                  phase: { type: Type.STRING, enum: ["Base","Construção","Pico","Polimento"] },
                  weekNumber: { type: Type.INTEGER },
                  totalVolume: { type: Type.NUMBER },
                  coachNotes: { type: Type.STRING },
                  workouts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        objective: { type: Type.STRING },
                        capacity: { type: Type.STRING },
                        method: { type: Type.STRING },
                        day: { type: Type.STRING, enum: prescriptionDays },
                        type: { type: Type.STRING, enum: ["Regenerativo", "Longão", "Limiar", "Intervalado", "Maratona", "Fortalecimento", "Descanso", "Velocidade", "Natação", "Ciclismo", "Transição", "Prova"] },
                        customDescription: { type: Type.STRING },
                        distance: { type: Type.NUMBER }
                      },
                      required: ["day", "type", "customDescription", "objective", "capacity", "method", "distance"]
                    }
                  }
                },
                required: ["phase", "weekNumber", "workouts", "coachNotes"]
              }
            }
          },
          required: ["weeks", "raceStrategy"]
        }
      },
    }));

    const parsed = JSON.parse(response.text || "{}");
    if(!Array.isArray(parsed.weeks)||parsed.weeks.length!==weeks||parsed.weeks.some((w:any)=>!Array.isArray(w.workouts)))throw new Error('REVIEW: A resposta não contém as semanas e sessões solicitadas. Gere novamente.');
    // Whitelist model output: generated sessions cannot arrive as completed or published.
    const plan:AthletePlan={raceStrategy:String(parsed.raceStrategy||''),motivationalMessage:String(parsed.motivationalMessage||''),startDate:constraints.startDate,endDate:raceDate,weeks:parsed.weeks.map((w:any,i:number)=>({id:crypto.randomUUID(),phase:w.phase,weekNumber:i+1,isVisible:false,totalVolume:0,coachNotes:String(w.coachNotes||''),workouts:w.workouts.map((s:any)=>({day:s.day,type:s.type,distance:s.distance,customDescription:String(s.customDescription||''),objective:String(s.objective||''),capacity:String(s.capacity||''),method:String(s.method||'')}))}))};
    const review=inspectPrescription(plan,constraints,context);
    if(review.errors.length)throw new Error('REVIEW: '+review.errors.slice(0,5).join(' '));
    plan.weeks=plan.weeks.map((week,i)=>({...week,totalVolume:review.totals[i].runningKm,workouts:prescriptionDays.map((day,di)=>({...week.workouts.find(w=>w.day===day)!,date:getWorkoutDateString(constraints.startDate,i,di)}))}));
    plan.prescriptionReview={version:1,generatedAt:new Date().toISOString(),constraints,context};
    return plan;
  } catch (error: any) {
    console.error("Erro Gemini:", error?.message || "Erro desconhecido");
    if(error?.message?.startsWith('REVIEW:'))throw new Error('Revisão da prescrição: '+error.message.slice(7));
    let userMessage = "A IA falhou ao gerar o plano.";
    if (['temporary', 'missing-model'].includes(modelFailureKind(error))) {
      userMessage = "Os modelos de IA não responderam após as tentativas automáticas. Seus parâmetros foram mantidos. Tente novamente em alguns minutos.";
    }
    if(modelFailureKind(error)==='quota') userMessage="O limite de uso da API de IA foi atingido. Confira a cota no Google AI Studio antes de tentar novamente.";
    if(/API key|API_KEY|PERMISSION_DENIED|UNAUTHENTICATED|billing|payment|credits/i.test(String(error?.message||''))) userMessage="A API de IA precisa de verificação da chave, permissão ou faturamento. A assinatura do Gemini não substitui o acesso pela API.";
    throw new Error(userMessage);
  }
};
