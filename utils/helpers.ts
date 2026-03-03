
/**
 * Deep clones an object safely, handling circular references and undefined values.
 */
export const safeDeepClone = (obj: any): any => {
  const seen = new WeakSet();
  
  const clone = (val: any): any => {
    if (val === null || typeof val !== 'object') {
      return val;
    }
    
    if (seen.has(val)) {
      return undefined; // Discard circular reference
    }
    
    seen.add(val);
    
    if (Array.isArray(val)) {
      return val.map(item => clone(item));
    }
    
    const result: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const clonedVal = clone(val[key]);
        if (clonedVal !== undefined) {
          result[key] = clonedVal;
        }
      }
    }
    return result;
  };
  
  return clone(obj);
};

/**
 * Executes an async function with a maximum timeout.
 * Useful for Firestore operations that might stall.
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  errorMsg: string = "Operação expirou (timeout)"
): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
