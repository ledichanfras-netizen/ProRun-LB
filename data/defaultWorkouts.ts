import { Workout } from '../types';

export const DEFAULT_WORKOUTS: Workout[] = [
  // ==========================================
  // 1. REGENERATIVO (5 TREINOS)
  // ==========================================
  {
    id: 'rec-01-educativos-5k-10k',
    title: 'Regenerativo Z1 + Educativos de Passada (5k/10k)',
    type: 'Regenerativo',
    description: '5km rodagem regenerativa ritmo Z1 (muito leve, conversacional) + 10min de educativos técnicos de corrida (Anfersen, Skipping Baixo e Drible). Foco em soltar a musculatura e aprimorar a biomecânica.',
    durationMinutes: 35,
    distanceKm: 5,
    rpe: 2,
    exercises: [
      { id: 'ex-rec-1', name: 'Skipping Baixo (Frequência)', sets: '3', reps: '30s', load: 'Peso Corporal', order: 1 },
      { id: 'ex-rec-2', name: 'Anfersen (Calcanhar ao Glúteo)', sets: '3', reps: '30s', load: 'Peso Corporal', order: 2 },
      { id: 'ex-rec-3', name: 'Drible de Tornozelo / Ponta de Pé', sets: '3', reps: '30s', load: 'Peso Corporal', order: 3 },
      { id: 'ex-rec-4', name: 'Mobilidade de Quadril e Tornozelo', sets: '2', reps: '10 cada lado', load: 'Livre', order: 4 }
    ]
  },
  {
    id: 'rec-02-flush-pos-tiros',
    title: 'Recuperação Ativa & Flush Pós-Tiros (Geral)',
    type: 'Regenerativo',
    description: '6km rodagem regenerativa ritmo Z1 (trotinho contínuo muito confortável). Ideal para o dia seguinte a treinos intervalados ou de alta intensidade, auxiliando no clearance de lactato e oxigenação tecidual.',
    durationMinutes: 38,
    distanceKm: 6,
    rpe: 2,
    exercises: [
      { id: 'ex-rec-5', name: 'Liberação Miofascial (Foam Roller)', sets: '1', reps: '10min', load: 'Livre', order: 1 },
      { id: 'ex-rec-6', name: 'Alongamento Dinâmico Isquiotibiais', sets: '2', reps: '45s', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'rec-03-cadencia-21k',
    title: 'Regenerativo Z1 c/ Foco em Alta Cadência (21k)',
    type: 'Regenerativo',
    description: '7km rodagem Z1 leve e fluida, focando estritamente em manter a cadência entre 175 e 180 passos/minuto sem aumentar o esforço cardiovascular. Passada compacta e aterrissagem sob o centro de gravidade.',
    durationMinutes: 42,
    distanceKm: 7,
    rpe: 3,
    exercises: [
      { id: 'ex-rec-7', name: 'Elevação Pélvica Isométrica', sets: '3', reps: '30s', load: 'Peso Corporal', order: 1 },
      { id: 'ex-rec-8', name: 'Prancha Frontal com Apoio de Cotovelos', sets: '3', reps: '45s', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'rec-04-pre-prova-aceleracoes',
    title: 'Regenerativo Pré-Prova com Retas Soltas (5k a 42k)',
    type: 'Regenerativo',
    description: '4km rodagem regenerativa Z1 leve + 4x 80m acelerações progressivas e soltas (recuperação total caminhando). Ativação do sistema neuromuscular e sensibilidade ao ritmo de prova sem acumular fadiga.',
    durationMinutes: 25,
    distanceKm: 4,
    rpe: 2,
    exercises: [
      { id: 'ex-rec-9', name: 'Passadas Progressivas Soltas 80m', sets: '4', reps: '80m', load: 'Sem peso', order: 1 },
      { id: 'ex-rec-10', name: 'Alongamentos Balísticos Leves', sets: '2', reps: '10 reps', load: 'Livre', order: 2 }
    ]
  },
  {
    id: 'rec-05-pos-maratona-recovery',
    title: 'Recovery de Limpeza Muscular Pós-Longão (42k Maratona)',
    type: 'Regenerativo',
    description: '8km rodagem regenerativa Z1 super leve em terreno plano e macio (grama ou asfalto plano). Hidratação constante durante o percurso e foco em circulação sanguínea restauradora.',
    durationMinutes: 50,
    distanceKm: 8,
    rpe: 3,
    exercises: [
      { id: 'ex-rec-11', name: 'Crioterapia / Banho de Gelo ou Contraste', sets: '1', reps: '12min', load: 'Livre', order: 1 },
      { id: 'ex-rec-12', name: 'Alongamento Suave de Cadeia Posterior', sets: '3', reps: '30s', load: 'Peso Corporal', order: 2 }
    ]
  },

  // ==========================================
  // 2. MARATONA (5 TREINOS - RITMO ESPECÍFICO)
  // ==========================================
  {
    id: 'mar-01-blocos-3x4km',
    title: 'Blocos de Ritmo de Maratona 3x 4km c/ 1km Float (21k/42k)',
    type: 'Maratona',
    description: '2km aq + 3x 4000m no Ritmo Alvo de Maratona (Z2 Alta / Sub-Limiar) rec 1000m em ritmo moderado flutuante (sem caminhar) + 1km des. Total: 18km de alta especificidade aeróbica e gestão glicogênica.',
    durationMinutes: 90,
    distanceKm: 18,
    rpe: 7,
    exercises: [
      { id: 'ex-mar-1', name: 'Treino de Ingestão de Gel/Carboidrato no km 8 e 14', sets: '2', reps: '1 dose', load: 'Gel Isotônico', order: 1 },
      { id: 'ex-mar-2', name: 'Agachamento Búlgaro Unilateral', sets: '3', reps: '10 cada perna', load: 'Halteres Leves', order: 2 }
    ]
  },
  {
    id: 'mar-02-tempo-run-12km',
    title: 'Tempo Run Contínuo de Maratona 12km (Maratona 42k)',
    type: 'Maratona',
    description: '2km aq + 12km contínuos no Ritmo Específico de Maratona c/ controle estrito de frequência cardíaca (80-85% da FCmax) + 1km des. Treino fundamental para calibrar a percepção de ritmo de prova.',
    durationMinutes: 75,
    distanceKm: 15,
    rpe: 7,
    exercises: [
      { id: 'ex-mar-3', name: 'Fortalecimento de Glúteo Médio com Miniband', sets: '3', reps: '15 reps', load: 'Banda Elástica', order: 1 },
      { id: 'ex-mar-4', name: 'Prancha Lateral Isométrica', sets: '3', reps: '40s cada lado', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'mar-03-simulado-18km-nutricao',
    title: 'Simulado de Ritmo de Prova com Gel e Hidratação 18km (Maratona)',
    type: 'Maratona',
    description: '2km aq + 14km ritmo de maratona consumindo carboidrato aos 35min e 70min simulando os postos de hidratação oficiais + 2km desaquecimento regenerativo.',
    durationMinutes: 95,
    distanceKm: 18,
    rpe: 8,
    exercises: [
      { id: 'ex-mar-5', name: 'Teste de Equipamento (Tênis de Placa + Meia de Prova)', sets: '1', reps: '18km', load: 'Oficial', order: 1 },
      { id: 'ex-mar-6', name: 'Panturrilha Unilateral no Degrau', sets: '3', reps: '15 reps', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'mar-04-fartlek-especifico-4x3km',
    title: 'Fartlek Específico de Maratona 4x 3km (Maratona 42k)',
    type: 'Maratona',
    description: '2km aq + 4x 3000m no ritmo alvo de maratona rec 1000m em ritmo regenerativo Z1 + 1km des. Trabalho de eficiência oxidativa e adaptação neuromuscular para resistir à perda de rendimento na segunda metade da prova.',
    durationMinutes: 90,
    distanceKm: 17,
    rpe: 7,
    exercises: [
      { id: 'ex-mar-7', name: 'Stiff Unilateral c/ Kettlebell', sets: '3', reps: '10 reps', load: '8-12kg', order: 1 },
      { id: 'ex-mar-8', name: 'Abdominal Deadbug (Controle de Core)', sets: '3', reps: '12 reps cada', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'mar-05-bloco-duplo-2x6km',
    title: 'Bloco Duplo Específico 2x 6km Sub-Limiar (Maratona 42k)',
    type: 'Maratona',
    description: '2km aq + 2x 6000m ritmo específico de maratona rec 1500m trote leve + 1.5km des. Foco em estabilidade de ritmo sem oscilações e consistência biomecânica na fadiga.',
    durationMinutes: 85,
    distanceKm: 16,
    rpe: 8,
    exercises: [
      { id: 'ex-mar-9', name: 'Afundo com Rotação de Tronco', sets: '3', reps: '10 reps', load: 'Medicine Ball', order: 1 },
      { id: 'ex-mar-10', name: 'Ponte de Glúteos com Elevação Unilateral', sets: '3', reps: '12 reps', load: 'Peso Corporal', order: 2 }
    ]
  },

  // ==========================================
  // 3. INTERVALADO (5 TREINOS - VO2 MAX)
  // ==========================================
  {
    id: 'int-01-tiros-classicos-1000m',
    title: 'Tiros Clássicos de 1000m VO2max Z4 (5k/10k)',
    type: 'Intervalado',
    description: '2km aq + 6x 1000m rec 2min trote ritmo Z4 (Intervalado / 95-100% VO2max) + 1km des. O treino padrão ouro da Metodologia Jack Daniels para elevação do consumo máximo de oxigênio e velocidade sustentável.',
    durationMinutes: 55,
    distanceKm: 10,
    rpe: 9,
    exercises: [
      { id: 'ex-int-1', name: 'Acelerações Progressivas Pré-Tiro (80m)', sets: '3', reps: '80m', load: 'Livre', order: 1 },
      { id: 'ex-int-2', name: 'Mobilidade Torácica e de Quadril', sets: '2', reps: '10 reps', load: 'Livre', order: 2 }
    ]
  },
  {
    id: 'int-02-tiros-800m-pista',
    title: 'Tiros de 800m Pista / Asfalto Z4 (5k/10k)',
    type: 'Intervalado',
    description: '2km aq + 8x 800m rec 90s trote ritmo Z4 (Intervalado forte) + 1km des. Excelente para tolerância ao lactato e capacidade de sustentar cadência veloz nos quilômetros finais de provas curtas.',
    durationMinutes: 50,
    distanceKm: 9,
    rpe: 9,
    exercises: [
      { id: 'ex-int-3', name: 'Salto Vertical com Estabilização Unilateral', sets: '3', reps: '6 reps', load: 'Peso Corporal', order: 1 },
      { id: 'ex-int-4', name: 'Abdominal Canivete Alternado', sets: '3', reps: '15 reps', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'int-03-piramide-vo2-400-1600',
    title: 'Pirâmide de Volume VO2 400-800-1200-1600-1200-800-400 (10k/21k)',
    type: 'Intervalado',
    description: '2km aq + Pirâmide: 400m (rec 60s) + 800m (rec 90s) + 1200m (rec 2min) + 1600m (rec 2min30) + 1200m (rec 2min) + 800m (rec 90s) + 400m (rec 60s) no ritmo Z4 + 1.5km des.',
    durationMinutes: 65,
    distanceKm: 12,
    rpe: 9,
    exercises: [
      { id: 'ex-int-5', name: 'Skipping Alto com Tração', sets: '3', reps: '20m', load: 'Elástico', order: 1 },
      { id: 'ex-int-6', name: 'Prancha com Toque nos Ombros', sets: '3', reps: '20 toques', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'int-04-tiros-longos-1600m-meia',
    title: 'Tiros Longos de 1600m c/ Intervalo Médio (21k Meia Maratona)',
    type: 'Intervalado',
    description: '2km aq + 5x 1600m (1 milha) rec 2min30 trote ritmo Z4 (potência aeróbica sustentada) + 1km des. Treino essencial para a fase de construção e pico para Meia Maratona.',
    durationMinutes: 70,
    distanceKm: 13,
    rpe: 9,
    exercises: [
      { id: 'ex-int-7', name: 'Agachamento com Salto (Pliometria)', sets: '3', reps: '8 reps', load: 'Peso Corporal', order: 1 },
      { id: 'ex-int-8', name: 'Elevação de Gêmeos Unilateral', sets: '3', reps: '15 reps', load: 'Halter 10kg', order: 2 }
    ]
  },
  {
    id: 'int-05-intervalado-curto-12x400m',
    title: 'Intervalado Curto de Alta Densidade 12x 400m (5k)',
    type: 'Intervalado',
    description: '2km aq + 12x 400m rec 60s trote leve ritmo Z4 alto / Z5 + 1.5km des. Treino de alta densidade metabólica para ganho rápido de VO2max e velocidade terminal de 5k.',
    durationMinutes: 48,
    distanceKm: 9,
    rpe: 9,
    exercises: [
      { id: 'ex-int-9', name: 'Passada com Afundo Dinâmico', sets: '3', reps: '10 cada perna', load: 'Peso Corporal', order: 1 },
      { id: 'ex-int-10', name: 'Abdominal Prancha Estrela', sets: '3', reps: '30s', load: 'Peso Corporal', order: 2 }
    ]
  },

  // ==========================================
  // 4. LIMIAR (5 TREINOS - THRESHOLD / T-PACE)
  // ==========================================
  {
    id: 'lim-01-tempo-run-classico-6km',
    title: 'Tempo Run Clássico de Limiar 6km Contínuo (5k/10k)',
    type: 'Limiar',
    description: '2km aq + 6km contínuos no ritmo de Limiar Z3 (T-Pace / Ritmo de 1h de esforço máximo, confortavelmente duro) + 2km des. Eleva a velocidade no limiar de lactato reduzindo o acúmulo de íons H+.',
    durationMinutes: 50,
    distanceKm: 10,
    rpe: 8,
    exercises: [
      { id: 'ex-lim-1', name: 'Abdominal Hollow Hold (Canoa)', sets: '3', reps: '35s', load: 'Peso Corporal', order: 1 },
      { id: 'ex-lim-2', name: 'Abdução de Quadril em Decúbito Lateral', sets: '3', reps: '15 reps cada', load: 'Caneleira 2kg', order: 2 }
    ]
  },
  {
    id: 'lim-02-cruise-intervals-4x2000m',
    title: 'Cruise Intervals 4x 2000m Limiar Z3 (10k/21k)',
    type: 'Limiar',
    description: '2km aq + 4x 2000m rec 90s trote leve ritmo Limiar Z3 (T-Pace) + 1km des. Permite acumular 8km de volume total no limiar com menor sobrecarga psicológica e metabólica.',
    durationMinutes: 65,
    distanceKm: 12,
    rpe: 8,
    exercises: [
      { id: 'ex-lim-3', name: 'Agachamento Isométrico na Parede', sets: '3', reps: '45s', load: 'Peso Corporal', order: 1 },
      { id: 'ex-lim-4', name: 'Elevação Pélvica com Miniband', sets: '3', reps: '15 reps', load: 'Banda Elástica', order: 2 }
    ]
  },
  {
    id: 'lim-03-limiar-fracionado-3x3000m',
    title: 'Limiar Fracionado 3x 3000m (21k Meia Maratona)',
    type: 'Limiar',
    description: '2km aq + 3x 3000m rec 2min trote ritmo Z3 Limiar + 1km des. Treino chave para meia maratona, ensinando o organismo a reciclar o lactato em velocidade elevada.',
    durationMinutes: 70,
    distanceKm: 13,
    rpe: 8,
    exercises: [
      { id: 'ex-lim-5', name: 'Flexão Nórdica Reversa para Quadríceps', sets: '3', reps: '8 reps', load: 'Peso Corporal', order: 1 },
      { id: 'ex-lim-6', name: 'Prancha Dinâmica com Elevação de Perna', sets: '3', reps: '10 cada perna', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'lim-04-alternado-lactato-10x800-200',
    title: 'Alternado de Lactato 10x 800m Limiar / 200m Forte (10k/21k)',
    type: 'Limiar',
    description: '2km aq + 10x (800m ritmo Z3 Limiar + 200m ritmo Z4 forte sem pausa) + 1km des. Treino de sobrecarga de lactato e depuração dinâmica em corrida contínua.',
    durationMinutes: 60,
    distanceKm: 12,
    rpe: 9,
    exercises: [
      { id: 'ex-lim-7', name: 'Passada com Halteres', sets: '3', reps: '10 cada perna', load: 'Halteres 8kg', order: 1 },
      { id: 'ex-lim-8', name: 'Bird-Dog (Perdigueiro) Isométrico', sets: '3', reps: '10 cada lado', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'lim-05-progressao-limiar-10km',
    title: 'Progressão Aeróbica até o Limiar Anaeróbico 10km (21k/42k)',
    type: 'Limiar',
    description: '2km aq + 8km progressivos (km 1-3 em Z2, km 4-6 em Z2 alta, km 7-8 em Z3 Limiar firme) + 1km des. Ensina a progressão tática de ritmo e o controle de esforço.',
    durationMinutes: 62,
    distanceKm: 12,
    rpe: 8,
    exercises: [
      { id: 'ex-lim-9', name: 'Prancha Lateral com Abdução de Quadril', sets: '3', reps: '10 cada lado', load: 'Peso Corporal', order: 1 },
      { id: 'ex-lim-10', name: 'Alongamento de Flexores de Quadril (Psoas)', sets: '3', reps: '30s', load: 'Livre', order: 2 }
    ]
  },

  // ==========================================
  // 5. VELOCIDADE (5 TREINOS - R-PACE / Z5)
  // ==========================================
  {
    id: 'vel-01-reta-curva-15x200m',
    title: 'Reta e Curva 15x 200m R-Pace Z5 (5k/10k)',
    type: 'Velocidade',
    description: '2km aq + 15x 200m rec 200m trote e caminhada lenta ritmo Z5 (Velocidade / R-Pace rápido, solto e potente com excelente mecânica de braços e joelhos) + 1.5km des.',
    durationMinutes: 45,
    distanceKm: 8,
    rpe: 9,
    exercises: [
      { id: 'ex-vel-1', name: 'Educativo Hop Unilateral (Impulsão)', sets: '3', reps: '15m cada perna', load: 'Peso Corporal', order: 1 },
      { id: 'ex-vel-2', name: 'Corrida com Joelhos Altos (High Knees)', sets: '3', reps: '25m', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'vel-02-repeticoes-400m-pausa-total',
    title: 'Repetições de 400m com Pausa Completa (5k)',
    type: 'Velocidade',
    description: '2km aq + 10x 400m rec 2min passivo / caminhada ritmo Z5 (velocidade máxima com forma biomecânica impecável) + 1.5km des. Foco em potência neuromuscular e economia de corrida.',
    durationMinutes: 50,
    distanceKm: 8.5,
    rpe: 9,
    exercises: [
      { id: 'ex-vel-3', name: 'Salto Horizontal em Caixa / Degrau', sets: '3', reps: '6 saltos', load: 'Peso Corporal', order: 1 },
      { id: 'ex-vel-4', name: 'Prancha com Remada Unilateral (Renegade Row)', sets: '3', reps: '8 cada braço', load: 'Halter 6kg', order: 2 }
    ]
  },
  {
    id: 'vel-03-tiros-rampa-subida-12x150m',
    title: 'Tiros Curtos em Rampa / Subida 12x 150m (Geral/Força Rápida)',
    type: 'Velocidade',
    description: '2km aq + 12x 150m em subida com inclinação moderada (6-8%) na velocidade máxima explosiva rec descida caminhando devagar + 1.5km des. Fortalece panturrilha, glúteos e tendão de Aquiles.',
    durationMinutes: 45,
    distanceKm: 7,
    rpe: 9,
    exercises: [
      { id: 'ex-vel-5', name: 'Saltos Verticais Unilaterais', sets: '3', reps: '8 reps cada lado', load: 'Peso Corporal', order: 1 },
      { id: 'ex-vel-6', name: 'Ponte Unilateral para Posteriores', sets: '3', reps: '12 reps cada', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'vel-04-fartlek-sueco-15x1min',
    title: 'Fartlek Sueco de Velocidade 15x 1min Rápido / 1min Trote (5k/10k)',
    type: 'Velocidade',
    description: '2km aq + 15x (1min ritmo Z5 rápido e solto + 1min trote regenerativo Z1) + 1.5km des. Estimula troca rápida de ritmo e desenvolve agilidade e resposta motora.',
    durationMinutes: 48,
    distanceKm: 9,
    rpe: 9,
    exercises: [
      { id: 'ex-vel-7', name: 'Acelerações com Saída em Três Apoios', sets: '4', reps: '30m', load: 'Livre', order: 1 },
      { id: 'ex-vel-8', name: 'Russian Twist com Bola Medicinal', sets: '3', reps: '20 giros', load: '4kg', order: 2 }
    ]
  },
  {
    id: 'vel-05-tiros-mistos-300-150m',
    title: 'Tiros Mistos de Velocidade 6x 300m + 6x 150m (5k/10k)',
    type: 'Velocidade',
    description: '2km aq + 6x 300m rec 90s ritmo Z5 + 6x 150m rec 60s ritmo Z5 sprint controlado + 1.5km des. Desenvolve aceleração final (sprint de chegada) para competições de 5k e 10k.',
    durationMinutes: 45,
    distanceKm: 8,
    rpe: 9,
    exercises: [
      { id: 'ex-vel-9', name: 'Pliometria com Bounds Longos', sets: '3', reps: '20m', load: 'Peso Corporal', order: 1 },
      { id: 'ex-vel-10', name: 'Flexão de Braços com Toque no Peito', sets: '3', reps: '12 reps', load: 'Peso Corporal', order: 2 }
    ]
  },

  // ==========================================
  // 6. LONGÃO (5 TREINOS - CONSTRUÇÃO & RESISTÊNCIA)
  // ==========================================
  {
    id: 'lon-01-construcao-base-16km',
    title: 'Longão Contínuo de Construção de Base Z2 16km (10k/21k)',
    type: 'Longão',
    description: '16km rodagem contínua uniforme em Z2 aeróbico confortável (65-75% da FCmax). Hidratação a cada 20 minutos. Foco na densidade mitocondrial e aumento da rede capilar muscular.',
    durationMinutes: 90,
    distanceKm: 16,
    rpe: 5,
    exercises: [
      { id: 'ex-lon-1', name: 'Hidratação com Eletrólitos a cada 4km', sets: '4', reps: '150ml', load: 'Isotônico', order: 1 },
      { id: 'ex-lon-2', name: 'Alongamento Estático Suave Pós-Treino', sets: '3', reps: '30s por grupo muscular', load: 'Livre', order: 2 }
    ]
  },
  {
    id: 'lon-02-progressivo-22km-final-forte',
    title: 'Longão Progressivo 22km com Final em Ritmo de Prova (21k/42k)',
    type: 'Longão',
    description: '22km estruturado: 14km ritmo Z2 confortável + 6km ritmo Z3/Maratona acelerando de forma progressiva + 2km desaquecimento regenerativo Z1. Simulação real de final de prova com fadiga acumulada.',
    durationMinutes: 120,
    distanceKm: 22,
    rpe: 7,
    exercises: [
      { id: 'ex-lon-3', name: 'Suplementação de Carboidrato no km 7, 14 e 19', sets: '3', reps: '1 gel', load: 'Gel com Cafeína', order: 1 },
      { id: 'ex-lon-4', name: 'Liberação Miofascial de Panturrilha e Fáscia Plantar', sets: '1', reps: '10min', load: 'Bolinha/Rolo', order: 2 }
    ]
  },
  {
    id: 'lon-03-fracionado-24km-blocos',
    title: 'Longão Fracionado 24km com Blocos de Ritmo (42k Maratona)',
    type: 'Longão',
    description: '4km Z2 de aquecimento + 3x (5km no ritmo específico de maratona + 1km trote leve de recuperação) + 2km desaquecimento leve. Total: 24km de altíssima qualidade aeróbica.',
    durationMinutes: 130,
    distanceKm: 24,
    rpe: 8,
    exercises: [
      { id: 'ex-lon-5', name: 'Controle de Frequência Cardíaca por Zona (Cardio)', sets: '1', reps: 'Monitoramento contínuo', load: 'Cinta Cardíaca', order: 1 },
      { id: 'ex-lon-6', name: 'Alongamento de Isquiotibiais e Glúteos', sets: '3', reps: '40s', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'lon-04-ondulado-subidas-18km',
    title: 'Longão com Ondulação e Subidas 18km (Trail / Resistência Geral)',
    type: 'Longão',
    description: '18km em percurso ondulado (altimetria variada com subidas e descidas). Manter o esforço cardíaco estável em Z2 nas subidas encurtando a passada e soltando nas descidas com boa postura.',
    durationMinutes: 105,
    distanceKm: 18,
    rpe: 7,
    exercises: [
      { id: 'ex-lon-7', name: 'Técnica de Subida (Tronco Inclinado e Braços Ativos)', sets: '1', reps: 'Durante as subidas', load: 'Livre', order: 1 },
      { id: 'ex-lon-8', name: 'Fortalecimento Excêntrico de Quadríceps pós-corrida', sets: '3', reps: '10 reps', load: 'Peso Corporal', order: 2 }
    ]
  },
  {
    id: 'lon-05-rei-maratona-30km-simulado',
    title: 'Longão Rei de Maratona 30km Simulado Oficial (42k Maratona)',
    type: 'Longão',
    description: '30km o treino mais importante da preparação: 10km Z2 fácil de construção + 15km no ritmo exato alvo de maratona + 5km Z2 final sustentando a postura. Teste completo de suplementação, vestuário e hidratação.',
    durationMinutes: 160,
    distanceKm: 30,
    rpe: 8,
    exercises: [
      { id: 'ex-lon-9', name: 'Plano de Nutrição Oficial: 4x Géis (km 7, 14, 21, 26)', sets: '4', reps: '30g CHO', load: 'Gel Isotônico', order: 1 },
      { id: 'ex-lon-10', name: 'Imersão em Gelo e Recuperação Pós-Treino', sets: '1', reps: '15min', load: 'Crioterapia', order: 2 }
    ]
  }
];
