
import { TrainingPace } from '../types';

export const parseTime = (timeStr: string): number => {
  const [min, sec] = timeStr.split(':').map(Number);
  return min + sec / 60;
};

export const formatTime = (minutes: number): string => {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
};

const getVelocity = (distance: number, time: number) => distance / time;

const getVO2 = (velocity: number) => {
  return -4.6 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
};

const getPercentMax = (t: number) => {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
};

export const calculateVO2 = (timeStr: string, distanceKm: number = 3): number => {
  const minutes = parseTime(timeStr);
  const distanceMeters = distanceKm * 1000;
  const velocity = getVelocity(distanceMeters, minutes);
  const vo2 = getVO2(velocity);
  const percentMax = getPercentMax(minutes);
  return Math.round((vo2 / percentMax) * 10) / 10;
};

// Configurações de zonas de FC (Percentuais padrão)
export const ZONE_HR_CONFIGS = {
  Z1: { fclaMin: 0.65, fclaMax: 0.85, fcMaxMin: 0.60, fcMaxMax: 0.75 },
  Z2: { fclaMin: 0.86, fclaMax: 0.94, fcMaxMin: 0.76, fcMaxMax: 0.84 },
  Z3: { fclaMin: 0.95, fclaMax: 1.05, fcMaxMin: 0.85, fcMaxMax: 0.90 },
  Z4: { fclaMin: 1.06, fclaMax: 1.20, fcMaxMin: 0.91, fcMaxMax: 0.98 },
  Z5: { fclaMin: 0, fclaMax: 0, fcMaxMin: 0, fcMaxMax: 0 } 
};

export const getHrRangeString = (zone: string, fcThreshold?: number, fcMax?: number) => {
  const config = ZONE_HR_CONFIGS[zone as keyof typeof ZONE_HR_CONFIGS];
  if (!config || zone === 'Z5') return 'N/A';
  
  if (fcThreshold && fcThreshold > 0) {
    return `${Math.round(fcThreshold * config.fclaMin)} - ${Math.round(fcThreshold * config.fclaMax)} bpm`;
  }
  if (fcMax && fcMax > 0) {
    return `${Math.round(fcMax * config.fcMaxMin)} - ${Math.round(fcMax * config.fcMaxMax)} bpm`;
  }
  return '---'; 
};

export const calculatePaces = (vo2Score: number, fcThreshold?: number, fcMax?: number): TrainingPace[] => {
  const vdotToUse = vo2Score || 30; // Valor base mínimo para evitar cálculos nulos

  const getPaceFromIntensity = (intensity: number) => {
    const targetVO2 = vdotToUse * intensity;
    const a = 0.000104;
    const b = 0.182258;
    const c = -(targetVO2 + 4.6);
    const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    return 1000 / v;
  };

  const zones: { 
    zone: TrainingPace['zone']; 
    name: string; 
    desc: string; 
    minInt: number; 
    maxInt: number;
  }[] = [
    { zone: 'Z1', name: 'Leve / Regenerativo', desc: 'Rodagem leve, aquecimento e regeneração.', minInt: 0.65, maxInt: 0.78 },
    { zone: 'Z2', name: 'Ritmo de Maratona', desc: 'Ritmo moderado e estável para endurance.', minInt: 0.79, maxInt: 0.87 },
    { zone: 'Z3', name: 'Ritmo de Limiar (L)', desc: 'Esforço confortavelmente difícil, limiar anaeróbio.', minInt: 0.88, maxInt: 0.92 },
    { zone: 'Z4', name: 'Intervalado (I)', desc: 'Treino de tiros para desenvolvimento de VO2max.', minInt: 0.96, maxInt: 1.0 },
    { zone: 'Z5', name: 'Velocidade (V)', desc: 'Velocidade pura, economia e potência.', minInt: 1.05, maxInt: 1.15 },
  ];

  return zones.map((z) => {
    const p1 = getPaceFromIntensity(z.minInt);
    const p2 = getPaceFromIntensity(z.maxInt);
    const minPaceVal = p2; 
    const maxPaceVal = p1;
    const speedKmh = (60 / minPaceVal).toFixed(1) + ' - ' + (60 / maxPaceVal).toFixed(1);
    
    return {
      zone: z.zone,
      name: z.name,
      description: z.desc,
      minPace: formatTime(minPaceVal),
      maxPace: formatTime(maxPaceVal),
      speedKmh: speedKmh,
      heartRateRange: getHrRangeString(z.zone, fcThreshold, fcMax)
    };
  });
};

export interface RacePrediction {
  distanceName: string;
  distanceKm: number;
  estimatedTime: string;
  pace: string;
  speedKmh: string;
  level: string;
  levelColor: string;
  tip: string;
}

export const estimateTimeForDistance = (vdot: number, distanceMeters: number): number => {
  let low = 1;
  let high = 1500;
  for (let i = 0; i < 100; i++) {
    const t = (low + high) / 2;
    const velocity = distanceMeters / t;
    const cost = -4.6 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
    const supply = vdot * (0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t));
    if (cost < supply) {
      high = t;
    } else {
      low = t;
    }
    if (Math.abs(high - low) < 0.0001) break;
  }
  return (low + high) / 2;
};

export const calculateRacePredictions = (vdot: number): RacePrediction[] => {
  const distances = [
    { 
      name: '5K', 
      dist: 5.0, 
      meters: 5000,
      tip: 'Foco em treinos intervalados de alta intensidade (Z4/Z5) para elevar o teto aeróbico (VO2max).'
    },
    { 
      name: '10K', 
      dist: 10.0, 
      meters: 10000,
      tip: 'Foco em ritmo de limiar (Z3) e força geral para sustentar o ritmo forte por mais tempo.'
    },
    { 
      name: 'Meia Maratona (21K)', 
      dist: 21.0975, 
      meters: 21097.5,
      tip: 'Foco em rodagens longas progressivas e ritmo de maratona (Z2) para economia muscular.'
    },
    { 
      name: 'Maratona (42K)', 
      dist: 42.195, 
      meters: 42195,
      tip: 'Sessões estratégicas de volume e longos com blocos no Ritmo Alvo (Z2) para depleção controlada de glicogênio.'
    },
  ];

  let level = 'Iniciante';
  let levelColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  if (vdot >= 65) {
    level = 'Elite';
    levelColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  } else if (vdot >= 55) {
    level = 'Altamente Competitivo';
    levelColor = 'text-red-400 bg-red-500/10 border-red-500/20';
  } else if (vdot >= 45) {
    level = 'Avançado';
    levelColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (vdot >= 35) {
    level = 'Intermediário';
    levelColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }

  return distances.map(item => {
    const timeInMinutes = estimateTimeForDistance(vdot, item.meters);
    const h = Math.floor(timeInMinutes / 60);
    const m = Math.floor(timeInMinutes % 60);
    const s = Math.round((timeInMinutes % 1) * 60);
    
    let timeStr = '';
    if (h > 0) {
      timeStr = `${h}h ${m < 10 ? '0' + m : m}m ${s < 10 ? '0' + s : s}s`;
    } else {
      timeStr = `${m}m ${s < 10 ? '0' + s : s}s`;
    }

    const paceInMinutes = timeInMinutes / item.dist;
    const paceM = Math.floor(paceInMinutes);
    const paceS = Math.floor((paceInMinutes - paceM) * 60);
    const paceStr = `${paceM}:${paceS < 10 ? '0' + paceS : paceS}/km`;
    
    const speed = (60 / paceInMinutes).toFixed(1);

    return {
      distanceName: item.name,
      distanceKm: item.dist,
      estimatedTime: timeStr,
      pace: paceStr,
      speedKmh: `${speed} km/h`,
      level: level,
      levelColor: levelColor,
      tip: item.tip
    };
  });
};

export const parsePaceToMinPerKm = (paceStr: string): number => {
  if (!paceStr) return 0;
  const cleanPace = paceStr.replace('/km', '').trim();
  if (!cleanPace.includes(':')) return 0;
  const [m, s] = cleanPace.split(':').map(Number);
  return m + (s / 60);
};

export const formatDistanceTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s < 10 ? '0' + s : s}s`;
};

export interface DanielsSprintPrediction {
  distanceName: string;
  distanceMeters: number;
  repTime: string;
  repSpeed: string;
  repPace: string;
  intTime: string;
  intSpeed: string;
  intPace: string;
}

export const calculateDanielsSprintsByPaces = (
  paces: TrainingPace[],
  vdot: number = 30
): DanielsSprintPrediction[] => {
  const z4 = (paces || []).find(p => p.zone === 'Z4');
  const z5 = (paces || []).find(p => p.zone === 'Z5');

  let z4PaceMin = 0;
  let z5PaceMin = 0;

  if (z4) {
    const minVal = parsePaceToMinPerKm(z4.minPace);
    const maxVal = parsePaceToMinPerKm(z4.maxPace);
    z4PaceMin = (minVal + maxVal) / 2;
  }
  if (z5) {
    const minVal = parsePaceToMinPerKm(z5.minPace);
    const maxVal = parsePaceToMinPerKm(z5.maxPace);
    z5PaceMin = (minVal + maxVal) / 2;
  }

  // Fallback to direct calculation using VDOT
  if (!z4PaceMin || !z5PaceMin) {
    const vdotToUse = vdot || 30;
    const getPaceFromIntensity = (intensity: number) => {
      const targetVO2 = vdotToUse * intensity;
      const a = 0.000104;
      const b = 0.182258;
      const c = -(targetVO2 + 4.6);
      const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      return 1000 / v;
    };
    if (!z4PaceMin) z4PaceMin = getPaceFromIntensity(0.98);
    if (!z5PaceMin) z5PaceMin = getPaceFromIntensity(1.10);
  }

  const formatPaceStr = (paceMin: number): string => {
    const m = Math.floor(paceMin);
    const s = Math.floor((paceMin - m) * 60);
    return `${m}:${s < 10 ? '0' + s : s}/km`;
  };

  const distances = [100, 200, 400, 600, 800];

  return distances.map((dist) => {
    const rTimeSeconds = (z5PaceMin / 1000) * dist * 60;
    const iTimeSeconds = (z4PaceMin / 1000) * dist * 60;

    const rSpeedKmh = 60 / z5PaceMin;
    const iSpeedKmh = 60 / z4PaceMin;

    return {
      distanceName: `${dist}m`,
      distanceMeters: dist,
      repTime: formatDistanceTime(rTimeSeconds),
      repSpeed: `${rSpeedKmh.toFixed(1)} km/h`,
      repPace: formatPaceStr(z5PaceMin),
      intTime: formatDistanceTime(iTimeSeconds),
      intSpeed: `${iSpeedKmh.toFixed(1)} km/h`,
      intPace: formatPaceStr(z4PaceMin),
    };
  });
};

export const formatPartialSpeedTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  
  const formattedSecs = remainingSecs.toFixed(1);
  const [secInt, secDec] = formattedSecs.split('.');
  const paddedSecs = parseInt(secInt) < 10 ? `0${secInt}` : secInt;
  
  if (secDec && secDec !== '0') {
    return `${minutes}:${paddedSecs}.${secDec}`;
  }
  return `${minutes}:${paddedSecs}`;
};

export interface VelocidadeParcialDistance {
  distanceName: string;
  distanceMeters: number;
  intensities: {
    percentage: string;
    value: number;
    speedKmh: string;
    timeStr: string;
  }[];
}

export const calculateVelocidadesParciais = (vdot: number): VelocidadeParcialDistance[] => {
  const vdotToUse = vdot || 30;
  
  // Resolução da equação quadrática para obter velocidade aeróbica máxima (vVO2max)
  const a = 0.000104;
  const b = 0.182258;
  const c = -(vdotToUse + 4.60);
  const delta = b * b - 4 * a * c;
  
  // V em metros por minuto
  const vMin = (-b + Math.sqrt(delta)) / (2 * a);
  const baseSpeedKmh = (vMin * 60) / 1000; // Velocidade base a 100% (VMA / MAS)

  const distances = [100, 200, 300, 400, 500, 600, 800, 1000];
  const percentages = [
    { label: '120%', multiplier: 1.20 },
    { label: '110%', multiplier: 1.10 },
    { label: '100%', multiplier: 1.00 },
    { label: '90%', multiplier: 0.90 },
    { label: '80%', multiplier: 0.80 },
    { label: '70%', multiplier: 0.70 },
    { label: '60%', multiplier: 0.60 }
  ];

  return distances.map(dist => {
    return {
      distanceName: `${dist}m`,
      distanceMeters: dist,
      intensities: percentages.map(p => {
        const speedKmh = baseSpeedKmh * p.multiplier;
        const speedMs = speedKmh / 3.6;
        const timeSeconds = dist / speedMs;

        return {
          percentage: p.label,
          value: p.multiplier,
          speedKmh: `${speedKmh.toFixed(1)}km/h`,
          timeStr: formatPartialSpeedTime(timeSeconds)
        };
      })
    };
  });
};
