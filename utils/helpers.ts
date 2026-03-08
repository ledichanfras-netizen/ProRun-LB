
/**
 * Deep clones an object safely, handling circular references and undefined values.
 */
export const safeDeepClone = (obj: any): any => {
  const seen = new WeakSet();
  
  const clone = (val: any): any => {
    // Basic types
    if (val === null || typeof val !== 'object') {
      return val;
    }
    
    // Handle Dates
    if (val instanceof Date) {
      return new Date(val.getTime());
    }

    // Handle Firestore Timestamps
    if (typeof val.toDate === 'function' && 'seconds' in val) {
      return val.toDate();
    }

    // Handle circular references
    if (seen.has(val)) return undefined;
    seen.add(val);

    // Detect Firestore internal objects (DocumentReference, Query, etc.)
    const isFirestoreInternal = 
      (val.firestore && val.id && typeof val.withConverter === 'function') ||
      (val.constructor && (
        val.constructor.name === 'DocumentReference' || 
        val.constructor.name === 'Query' || 
        val.constructor.name === 'Firestore' ||
        val.constructor.name === 'CollectionReference' ||
        val.constructor.name === 'Y2' || // Common minified names
        val.constructor.name === 'Ka'
      ));

    if (isFirestoreInternal) return null;

    // Only process plain objects and arrays
    const proto = Object.getPrototypeOf(val);
    const isPlainObject = proto === null || proto === Object.prototype;
    const isArray = Array.isArray(val);

    if (!isPlainObject && !isArray) {
      if (typeof val.toJSON === 'function') {
        try {
          const json = val.toJSON();
          if (json === val) return null;
          return clone(json);
        } catch (e) {
          return null;
        }
      }
      return null; 
    }
    
    if (isArray) {
      return val.map(item => clone(item));
    }
    
    const result: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        // Skip internal properties that often cause circularity
        if (key.startsWith('_') || key === 'firestore' || key === 'delegate' || key === 'src') continue;

        try {
          const clonedVal = clone(val[key]);
          if (clonedVal !== undefined) {
            result[key] = clonedVal;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return result;
  };
  
  return clone(obj);
};

/**
 * Retries a function with exponential backoff.
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoff = 2
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    
    // Check if it's a retryable error (like 503 or 429)
    const errorStr = error?.message || "";
    const isRetryable = 
      errorStr.includes("503") || 
      errorStr.includes("429") || 
      errorStr.includes("UNAVAILABLE") || 
      errorStr.includes("high demand") ||
      errorStr.includes("overloaded");
      
    if (!isRetryable) throw error;

    console.warn(`Retrying AI call... (${retries} left). Error: ${errorStr}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * backoff, backoff);
  }
};
