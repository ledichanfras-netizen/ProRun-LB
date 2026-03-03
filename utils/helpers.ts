
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
    if (seen.has(val)) {
      return undefined; // Discard circular reference
    }
    
    // Only process plain objects and arrays
    const proto = Object.getPrototypeOf(val);
    const isPlainObject = proto === null || proto === Object.prototype;
    const isArray = Array.isArray(val);

    if (!isPlainObject && !isArray) {
      // If it's a complex object (like a Firebase class or DOM node), 
      // try to see if it has a toJSON method, otherwise return null
      if (typeof val.toJSON === 'function') {
        try {
          return clone(val.toJSON());
        } catch (e) {
          return null;
        }
      }
      return null; 
    }

    seen.add(val);
    
    if (isArray) {
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
