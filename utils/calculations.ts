
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

export const calculatePaces = (vo2Score: number, fcThreshold?: number, fcMax?: number): TrainingPace[] => {
  const getPaceFromIntensity = (intensity: number) => {
    const targetVO2 = vo2Score * intensity;
    const a = 0.000104;
    const b = 0.182258;
    const c = -(targetVO2 + 4.6);
    const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    return 1000 / v;
  };

  const getHrRange = (minPctFcla: number, maxPctFcla: number, minPctMax: number, maxPctMax: number) => {
    if (fcThreshold) return `${Math.round(fcThreshold * minPctFcla)} - ${Math.round(fcThreshold * maxPctFcla)} bpm`;
    if (fcMax) return `${Math.round(fcMax * minPctMax)} - ${Math.round(fcMax * maxPctMax)} bpm`;
    return '-';
  };

  const zones: { 
    zone: TrainingPace['zone']; 
    name: string; 
    desc: string; 
    minInt: number; 
    maxInt: number;
    fclaMin: number; fclaMax: number;
    fcMaxMin: number; fcMaxMax: number;
  }[] = [
    { 
      zone: 'Z1', name: 'Leve / Regenerativo', desc: 'Rodagem leve, aquecimento e regeneração.',
      minInt: 0.65, maxInt: 0.78,
      fclaMin: 0.65, fclaMax: 0.85,
      fcMaxMin: 0.60, fcMaxMax: 0.75
    },
    { 
      zone: 'Z2', name: 'Ritmo de Maratona', desc: 'Ritmo moderado e estável para endurance.', 
      minInt: 0.79, maxInt: 0.87,
      fclaMin: 0.86, fclaMax: 0.94,
      fcMaxMin: 0.76, fcMaxMax: 0.84
    },
    { 
      zone: 'Z3', name: 'Ritmo de Limiar (T)', desc: 'Esforço confortavelmente difícil, limiar anaeróbio.', 
      minInt: 0.88, maxInt: 0.92,
      fclaMin: 0.95, fclaMax: 1.05,
      fcMaxMin: 0.85, fcMaxMax: 0.90
    },
    { 
      zone: 'Z4', name: 'Intervalado (V)', desc: 'Treino de tiros para desenvolvimento de VO2max.', 
      minInt: 0.96, maxInt: 1.0,
      fclaMin: 1.06, fclaMax: 1.20,
      fcMaxMin: 0.91, fcMaxMax: 0.98
    },
    { 
      zone: 'Z5', name: 'Velocidade (S)', desc: 'Velocidade pura, economia e potência.', 
      minInt: 1.05, maxInt: 1.15,
      fclaMin: 0, fclaMax: 0,
      fcMaxMin: 0, fcMaxMax: 0
    },
  ];

  return zones.map((z) => {
    const p1 = getPaceFromIntensity(z.minInt);
    const p2 = getPaceFromIntensity(z.maxInt);
    const minPaceVal = p2; 
    const maxPaceVal = p1;
    const speedKmh = (60 / minPaceVal).toFixed(1) + ' - ' + (60 / maxPaceVal).toFixed(1);
    const hrRange = z.zone === 'Z5' ? 'N/A' : getHrRange(z.fclaMin, z.fclaMax, z.fcMaxMin, z.fcMaxMax);

    return {
      zone: z.zone,
      name: z.name,
      description: z.desc,
      minPace: formatTime(minPaceVal),
      maxPace: formatTime(maxPaceVal),
      speedKmh: speedKmh,
      heartRateRange: hrRange
    };
  });
};
