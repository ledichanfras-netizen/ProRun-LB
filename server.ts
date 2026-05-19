
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { analyzeRequestSchema, generatePlanRequestSchema } from './utils/validation';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const clientRequests = new Map<string, { count: number; resetAt: number }>();

const setSecurityHeaders = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
};

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = req.ip;
  const now = Date.now();
  const current = clientRequests.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  current.count += 1;
  clientRequests.set(key, current);

  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  next();
};

const createAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY on server environment.');
  }
  return new GoogleGenAI({ apiKey });
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(setSecurityHeaders);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '25mb' }));
  app.use(rateLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'supabase', version: '1.0.0' });
  });

  app.post('/api/ai-analysis', async (req, res) => {
    const parsed = analyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(err => err.message).join(' ') });
    }

    const { athlete, plan } = parsed.data;
    try {
      const ai = createAiClient();
      const recentWorkouts = plan?.weeks?.flatMap((w: any) => w.workouts.filter((work: any) => work.completed)) || [];
      const avgRPE = recentWorkouts.length > 0 ? recentWorkouts.reduce((a: number, b: any) => a + (b.rpe || 0), 0) / recentWorkouts.length : 0;

      const prompt = `Analise os dados do atleta e gere uma resposta JSON com performanceScore, fatigueScore, readinessScore, injuryRiskScore, physicalCapabilities e analysis.\nAtleta: ${athlete.name} - Idade: ${athlete.age} - Peso: ${athlete.weight} - Experiência: ${athlete.experience}\nVdot: ${athlete.metrics?.vdot || 'N/A'} - VO2Max: ${athlete.metrics?.vo2Max || 'N/A'} - FC Máx: ${athlete.metrics?.fcMax || 'N/A'}\nTreinos recentes: ${recentWorkouts.length} - PSE médio: ${avgRPE.toFixed(1)}\nMeta: ${plan?.specificGoal || 'Não definida'}.\nRetorno deve ser JSON válido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
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
                  endurance: { type: Type.NUMBER }
                }
              },
              analysis: { type: Type.STRING }
            },
            required: ['performanceScore', 'fatigueScore', 'readinessScore', 'injuryRiskScore', 'physicalCapabilities', 'analysis']
          }
        }
      });

      const result = response.text ? JSON.parse(response.text) : null;
      return res.json(result || {});
    } catch (error: any) {
      console.error('[API] ai-analysis error', error);
      return res.status(500).json({ error: error?.message || 'Erro interno ao analisar o atleta' });
    }
  });

  app.post('/api/generate-plan', async (req, res) => {
    const parsed = generatePlanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(err => err.message).join(' ') });
    }

    const { athlete, planDetails } = parsed.data;
    try {
      const ai = createAiClient();
      const prompt = `Gere um plano de treinamento de corrida estruturado em ${planDetails.weeks} semanas para o atleta ${athlete.name} (${athlete.experience}). Inclua fases, treinos, volumes, estratégia de prova e mensagem motivacional. O plano deve retornar JSON com raceStrategy, motivationalMessage e weeks.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
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
                    weekNumber: { type: Type.NUMBER },
                    totalVolume: { type: Type.NUMBER },
                    coachNotes: { type: Type.STRING },
                    workouts: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          day: { type: Type.STRING },
                          type: { type: Type.STRING },
                          customDescription: { type: Type.STRING },
                          distance: { type: Type.NUMBER }
                        },
                        required: ['day', 'type', 'customDescription']
                      }
                    }
                  }
                }
              }
            },
            required: ['weeks', 'raceStrategy']
          }
        }
      });

      return res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      console.error('[API] generate-plan error', error);
      return res.status(500).json({ error: error?.message || 'Erro interno ao gerar plano' });
    }
  });

  app.post('/api/generate-workout', async (req, res) => {
    const { params } = req.body;
    if (!params || typeof params !== 'object') {
      return res.status(400).json({ error: 'Parâmetros do treino não foram enviados corretamente.' });
    }

    try {
      const ai = createAiClient();
      const prompt = `Crie um plano de treino funcional para corrida com base nos seguintes parâmetros: ${JSON.stringify(params)}. Retorne um JSON com workoutName e sessions.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              workoutName: { type: Type.STRING },
              sessions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          sets: { type: Type.NUMBER },
                          reps: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      return res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      console.error('[API] generate-workout error', error);
      return res.status(500).json({ error: error?.message || 'Erro interno ao criar treino' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Mode: Development (using Vite middleware)');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    app.use((req, res, next) => {
      if (req.url.endsWith('.png')) {
        console.warn(`[Dev] PNG request not caught by Vite: ${req.url}`);
      }
      next();
    });
  } else {
    const rootPath = process.cwd();
    const distPath = path.join(rootPath, 'dist');

    console.log(`[Server] Mode: Production. Serving from: ${distPath}`);

    app.use(express.static(distPath, {
      redirect: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));

    app.get('*', (req, res) => {
      const isFile = req.path.includes('.');
      if (isFile && !req.path.endsWith('.html')) {
        console.warn(`[Production] 404 static file: ${req.path}`);
        return res.status(404).send('Not found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
