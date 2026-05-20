import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'Informe usuário válido'),
  password: z.string().min(4, 'Senha muito curta')
});

export const analyzeRequestSchema = z.object({
  athleteId: z.string().min(1),
  athlete: z.any(),
  plan: z.any().nullable()
});

export const generatePlanRequestSchema = z.object({
  athlete: z.any(),
  planDetails: z.object({
    goalDescription: z.string().max(1000).nullable(),
    weeks: z.number().min(1).max(24),
    runningDays: z.number().min(1).max(7),
    gymDays: z.number().min(0).max(7),
    raceDistance: z.string().min(2),
    raceDate: z.string().nullable(),
    raceGoal: z.string().nullable(),
    startDate: z.string().nullable(),
    trainingDays: z.array(z.number().min(0).max(6)).nonempty()
  })
});
