
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
