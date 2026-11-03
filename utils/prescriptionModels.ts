/** Stable production models. Never fall back on authentication or billing failures. */
export const prescriptionModels = ['gemini-3.8-flash', 'gemini-3.6-flash'] as const;

export function modelFailureKind(error: unknown): 'temporary' | 'missing-model' | 'quota' | 'other' {
  const e = error as {status?: number|string; code?:number|string; message?:string};
  const message = String(e?.message || '');
  const status = Number(e?.status || e?.code || message.match(/\b(400|401|402|403|404|408|429|500|502|503|504)\b/)?.[1]);
  if ([400,401,402,403].includes(status) || /PERMISSION_DENIED|UNAUTHENTICATED|API_KEY_INVALID|billing|payment|credits|API key/i.test(message)) return 'other';
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) return 'quota';
  if (status === 404 || /NOT_FOUND|model.*(?:not found|not supported|not available|retired|deprecated)/i.test(message)) return 'missing-model';
  if ([408,500,502,503,504].includes(status) || /UNAVAILABLE|INTERNAL|overloaded|high demand|timeout|timed out/i.test(message)) return 'temporary';
  return 'other';
}

export async function withPrescriptionModelFallback<T>(
  generate: (model: string) => Promise<T>,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  random: () => number = Math.random
): Promise<T> {
  let lastError: unknown;
  for (const model of prescriptionModels) {
    for (let attempt=0; attempt<2; attempt++) {
      try { return await generate(model); }
      catch(error) {
        lastError=error;
        const kind=modelFailureKind(error);
        if(kind==='other'||kind==='quota')throw error;
        if(kind==='missing-model'||attempt===1)break;
        await wait(2000+Math.floor(random()*1000));
      }
    }
  }
  throw lastError;
}
