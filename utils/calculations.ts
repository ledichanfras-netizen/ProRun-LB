
import { TrainingPace } from '../types';

// Convert "MM:SS" to minutes (float)
export const parseTime = (timeStr: string): number => {
  const [min, sec] = timeStr.split(':').map(Number);
  return min + sec / 60;
};

// Convert minutes (float) to "MM:SS"
export const formatTime = (minutes: number): string => {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
};

// Calculate Velocity (m/min) from distance (m) and time (min)
const getVelocity = (distance: number, time: number) => distance / time;

// Estimate VO2 Cost of running at a certain velocity (Jack Daniels formula approx)
const getVO2 = (velocity: number) => {
  return -4.6 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
};

// Estimate %VO2max sustained for a duration (t in mins)
const getPercentMax = (t: number) => {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
};

// Calculate VDOT from a race time and distance
// Defaults to 3km (3000m) if distance not provided
export const calculateVDOT = (timeStr: string, distanceKm: number = 3): number => {
  const minutes = parseTime(timeStr);
  const distanceMeters = distanceKm * 1000;
  const velocity = getVelocity(distanceMeters, minutes); // m/min
  const vo2 = getVO2(velocity);
  const percentMax = getPercentMax(minutes);
  return Math.round((vo2 / percentMax) * 10) / 10;
};

// Calculate Training Paces based on VDOT and optional Heart Rate data
export const calculatePaces = (vdot: number, fcThreshold?: number, fcMax?: number): TrainingPace[] => {
  
  // Helper to get pace (min/km) from intensity % of VDOT
  const getPaceFromIntensity = (intensity: number) => {
    // Reversing the VO2 formula slightly to find Velocity for a given VO2 (VDOT * intensity)
    const targetVO2 = vdot * intensity;
    // Quadratic formula approximation to solve for Velocity v: 0.000104v^2 + 0.182258v - (targetVO2 + 4.6) = 0
    const a = 0.000104;
    const b = 0.182258;
    const c = -(targetVO2 + 4.6);
    const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); // meters per min
    return 1000 / v; // min per km
  };

  // Helper to get HR range string
  const getHrRange = (minPctFcla: number, maxPctFcla: number, minPctMax: number, maxPctMax: number) => {
    if (fcThreshold) {
      return `${Math.round(fcThreshold * minPctFcla)} - ${Math.round(fcThreshold * maxPctFcla)} bpm`;
    }
    if (fcMax) {
      return `${Math.round(fcMax * minPctMax)} - ${Math.round(fcMax * maxPctMax)} bpm`;
    }
    return '-';
  };

  const zones: { 
    zone: TrainingPace['zone']; 
    name: string; 
    desc: string; 
    minInt: number; 
    maxInt: number;
    // HR Zones based on Joe Friel (FCLA) and Classic (FCMax)
    fclaMin: number; fclaMax: number;
    fcMaxMin: number; fcMaxMax: number;
  }[] = [
    { 
      zone: 'F', name: 'Fácil / Longo', desc: 'Aeróbico extensivo, aquecimento, regenerativo.', // E -> F
      minInt: 0.65, maxInt: 0.78,
      fclaMin: 0.65, fclaMax: 0.85,
      fcMaxMin: 0.60, fcMaxMax: 0.75
    },
    { 
      zone: 'M', name: 'Maratona', desc: 'Ritmo moderado, estado estável aeróbico.', 
      minInt: 0.79, maxInt: 0.87,
      fclaMin: 0.86, fclaMax: 0.94,
      fcMaxMin: 0.76, fcMaxMax: 0.84
    },
    { 
      zone: 'L', name: 'Limiar (Threshold)', desc: 'Limiar anaeróbio, esforço confortavelmente difícil.', // T -> L
      minInt: 0.88, maxInt: 0.92,
      fclaMin: 0.95, fclaMax: 1.05, // Threshold is centered around FCLA
      fcMaxMin: 0.85, fcMaxMax: 0.90
    },
    { 
      zone: 'I', name: 'Intervalado', desc: 'Desenvolvimento de VO2max, ofegante.', 
      minInt: 0.96, maxInt: 1.0,
      fclaMin: 1.06, fclaMax: 1.20, // Above Threshold
      fcMaxMin: 0.91, fcMaxMax: 0.98
    },
    { 
      zone: 'R', name: 'Repetição', desc: 'Anaeróbico lático, economia e velocidade.', 
      minInt: 1.05, maxInt: 1.15,
      fclaMin: 0, fclaMax: 0, // N/A for HR (Too short/intense)
      fcMaxMin: 0, fcMaxMax: 0
    },
  ];

  return zones.map((z) => {
    const p1 = getPaceFromIntensity(z.minInt); // SLOWER pace
    const p2 = getPaceFromIntensity(z.maxInt); // FASTER pace
    
    const minPaceVal = p2; 
    const maxPaceVal = p1;

    const speedKmh = (60 / minPaceVal).toFixed(1) + ' - ' + (60 / maxPaceVal).toFixed(1);

    const hrRange = z.zone === 'R' ? 'N/A' : getHrRange(z.fclaMin, z.fclaMax, z.fcMaxMin, z.fcMaxMax);

    return {
      zone: z.zone,
      name: z.name,
      description: z.desc,
      minPace: formatTime(minPaceVal), // Fast end
      maxPace: formatTime(maxPaceVal), // Slow end
      speedKmh: speedKmh,
      heartRateRange: hrRange
    };
  });
};
